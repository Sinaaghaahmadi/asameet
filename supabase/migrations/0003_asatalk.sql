-- Asatalk: the Telegram-class messenger + calls product built on the Asameet
-- data layer. Everything here is additive and backward compatible with the
-- v1.1 client: old functions keep their signatures (new parameters carry
-- defaults) and every JSON payload only gains fields.
--
--  * media messages (photo / file / voice / video message / sticker) stored
--    as base64 in app.media and streamed through /api/media/:id
--  * edit / delete / forward, typing indicator, mute, saved messages
--  * profiles (bio, avatar, editable username) and a per-user settings blob
--  * group & channel management: roles, invite links, public usernames,
--    descriptions, add/remove/promote members, leave/delete
--  * device list (sessions) with remote sign-out
--  * real calls: ringing → accepted/declined, plus a WebRTC signalling
--    mailbox polled by both peers

-- ---------------------------------------------------------------- schema

alter table app.users add column if not exists bio text
  check (bio is null or char_length(bio) <= 140);
alter table app.users add column if not exists settings jsonb not null default '{}'::jsonb;

alter table app.sessions add column if not exists user_agent text;
alter table app.sessions add column if not exists last_used_at timestamptz not null default now();

alter table app.chats add column if not exists description text
  check (description is null or char_length(description) <= 255);
alter table app.chats add column if not exists username extensions.citext unique
  check (username is null or username ~ '^[a-z0-9_]{5,32}$');
alter table app.chats add column if not exists invite_code text unique
  default encode(extensions.gen_random_bytes(9), 'hex');
update app.chats set invite_code = encode(extensions.gen_random_bytes(9), 'hex')
  where invite_code is null;

alter table app.chat_members add column if not exists role text not null default 'member'
  check (role in ('owner','admin','member'));
alter table app.chat_members add column if not exists muted boolean not null default false;
-- Creators of existing groups/channels become owners.
update app.chat_members cm set role = 'owner'
  from app.chats c where c.id = cm.chat_id and c.created_by = cm.user_id and c.type <> 'private';

alter table app.messages drop constraint if exists messages_type_check;
alter table app.messages add constraint messages_type_check
  check (type in ('text','image','file','voice','video','video_note','sticker','call','system'));
alter table app.messages drop constraint if exists messages_content_check;
alter table app.messages add constraint messages_content_check
  check (char_length(content) <= 4000);
alter table app.messages add column if not exists media_id uuid;
alter table app.messages add column if not exists meta jsonb not null default '{}'::jsonb;
alter table app.messages add column if not exists edited_at timestamptz;

create table if not exists app.media (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references app.chats(id) on delete cascade,
  uploader_id uuid not null references app.users(id) on delete cascade,
  mime text not null,
  size integer not null check (size between 1 and 6291456),
  data text not null, -- base64
  created_at timestamptz not null default now()
);
create index if not exists media_chat_idx on app.media(chat_id);
alter table app.media enable row level security;

create table if not exists app.typing (
  chat_id uuid not null references app.chats(id) on delete cascade,
  user_id uuid not null references app.users(id) on delete cascade,
  at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
alter table app.typing enable row level security;

alter table app.calls drop constraint if exists calls_status_check;
alter table app.calls add constraint calls_status_check
  check (status in ('ringing','active','ended','declined'));
alter table app.calls add column if not exists answered_at timestamptz;

create table if not exists app.call_signals (
  id bigserial primary key,
  call_id uuid not null references app.calls(id) on delete cascade,
  sender_id uuid not null references app.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists call_signals_call_idx on app.call_signals(call_id, id);
alter table app.call_signals enable row level security;

-- Old overloads must go: PostgREST resolves functions by parameter names and
-- would otherwise find two candidates for the same JSON body.
drop function if exists public.api_signup(text, text, text);
drop function if exists public.api_login(text, text, text);
drop function if exists public.api_create_chat(text, text, text, uuid[]);
drop function if exists public.api_send_message(text, uuid, text, text, uuid);
drop function if exists public.api_message_action(text, uuid, uuid, text, text);
drop function if exists app.issue_session(uuid);

-- ---------------------------------------------------------------- json

create or replace function app.user_json(u app.users) returns jsonb
language sql stable
set search_path = app, extensions
as $$
  select jsonb_build_object(
    'id', u.id,
    'username', u.username,
    'displayName', u.display_name,
    'avatar', u.avatar,
    'bio', u.bio,
    'role', u.role,
    'status', case
      when u.is_suspended then 'offline'
      when u.last_active_at > now() - interval '90 seconds' then 'online'
      else 'offline' end,
    'isOnline', (not u.is_suspended) and u.last_active_at > now() - interval '90 seconds',
    'isSuspended', u.is_suspended,
    'lastSeen', to_jsonb(u.last_active_at),
    'country', u.country
  )
$$;

create or replace function app.message_json(m app.messages, p_viewer uuid) returns jsonb
language sql stable
set search_path = app, extensions
as $$
  select jsonb_build_object(
    'id', m.id,
    'chatId', m.chat_id,
    'senderId', m.sender_id,
    'content', m.content,
    'type', m.type,
    'mediaId', m.media_id,
    'meta', m.meta,
    'editedAt', to_jsonb(m.edited_at),
    'replyToId', m.reply_to_id,
    'forwardedFrom', m.forwarded_from,
    'isRead', exists (
      select 1 from app.chat_members cm
      where cm.chat_id = m.chat_id and cm.user_id <> m.sender_id
        and cm.last_read_at >= m.created_at),
    'isPinned', m.is_pinned,
    'reactions', m.reactions,
    'createdAt', to_jsonb(m.created_at)
  )
$$;

create or replace function app.chat_json(c app.chats, p_viewer uuid) returns jsonb
language sql stable
set search_path = app, extensions
as $$
  select jsonb_build_object(
    'id', c.id,
    'name', case when c.type = 'private' then null else c.name end,
    'type', c.type,
    'avatar', c.avatar,
    'description', c.description,
    'username', c.username,
    'inviteCode', case when c.type = 'private' then null else c.invite_code end,
    'createdBy', c.created_by,
    'myRole', coalesce((select cm.role from app.chat_members cm
      where cm.chat_id = c.id and cm.user_id = p_viewer), 'member'),
    'isPinned', coalesce((select cm.is_pinned from app.chat_members cm
      where cm.chat_id = c.id and cm.user_id = p_viewer), false),
    'isMuted', coalesce((select cm.muted from app.chat_members cm
      where cm.chat_id = c.id and cm.user_id = p_viewer), false),
    'memberIds', coalesce((select jsonb_agg(cm.user_id order by cm.joined_at)
      from app.chat_members cm where cm.chat_id = c.id), '[]'::jsonb),
    'adminIds', coalesce((select jsonb_agg(cm.user_id)
      from app.chat_members cm where cm.chat_id = c.id and cm.role in ('owner','admin')), '[]'::jsonb),
    'typingUserIds', coalesce((select jsonb_agg(t.user_id)
      from app.typing t where t.chat_id = c.id and t.user_id <> p_viewer
        and t.at > now() - interval '6 seconds'), '[]'::jsonb),
    'lastMessage', (select m.content from app.messages m
      where m.chat_id = c.id order by m.created_at desc limit 1),
    'lastMessageType', (select m.type from app.messages m
      where m.chat_id = c.id order by m.created_at desc limit 1),
    'lastMessageSenderId', (select m.sender_id from app.messages m
      where m.chat_id = c.id order by m.created_at desc limit 1),
    'lastMessageAt', (select to_jsonb(m.created_at) from app.messages m
      where m.chat_id = c.id order by m.created_at desc limit 1),
    'unreadCount', coalesce((select count(*) from app.messages m
      join app.chat_members cm on cm.chat_id = c.id and cm.user_id = p_viewer
      where m.chat_id = c.id and m.sender_id <> p_viewer
        and m.created_at > cm.last_read_at), 0)
  )
$$;

create or replace function app.call_json(c app.calls, p_viewer uuid) returns jsonb
language sql stable
set search_path = app, extensions
as $$
  select jsonb_build_object(
    'id', c.id,
    'type', c.type,
    'status', c.status,
    'direction', case
      when c.status in ('ended','declined') and c.duration is null and c.initiator_id <> p_viewer then 'missed'
      when c.initiator_id = p_viewer then 'outgoing'
      else 'incoming' end,
    'initiatorId', c.initiator_id,
    'peerId', c.peer_id,
    'duration', c.duration,
    'createdAt', to_jsonb(c.created_at)
  )
$$;

-- Session issuance now records the device so the user can review it.
create or replace function app.issue_session(p_user uuid, p_user_agent text default null) returns text
language plpgsql volatile
set search_path = app, extensions
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  delete from app.sessions where user_id = p_user and expires_at < now();
  insert into app.sessions (token_hash, user_id, user_agent)
  values (app.hash_token(v_token), p_user, left(p_user_agent, 200));
  return v_token;
end
$$;

create or replace function app.uid(p_token text) returns uuid
language plpgsql volatile
set search_path = app, extensions
as $$
declare
  v_user uuid;
  v_suspended boolean;
  v_hash text;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'unauthorized';
  end if;
  v_hash := app.hash_token(p_token);
  select s.user_id into v_user from app.sessions s
    where s.token_hash = v_hash and s.expires_at > now();
  if v_user is null then
    raise exception 'unauthorized';
  end if;
  select u.is_suspended into v_suspended from app.users u where u.id = v_user;
  if v_suspended then
    raise exception 'suspended';
  end if;
  update app.users set last_active_at = now() where id = v_user;
  update app.sessions set last_used_at = now()
    where token_hash = v_hash and last_used_at < now() - interval '1 minute';
  return v_user;
end
$$;

-- Membership helpers.
create or replace function app.member_role(p_chat uuid, p_user uuid) returns text
language sql stable
set search_path = app, extensions
as $$
  select cm.role from app.chat_members cm where cm.chat_id = p_chat and cm.user_id = p_user
$$;

create or replace function app.is_blocked(p_by uuid, p_user uuid) returns boolean
language sql stable
set search_path = app, extensions
as $$
  select coalesce((select u.settings->'blocked' @> to_jsonb(p_user::text)
    from app.users u where u.id = p_by), false)
$$;

-- ---------------------------------------------------------------- auth

create or replace function public.api_signup(
  p_username text, p_password text, p_display_name text, p_user_agent text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_username extensions.citext := lower(trim(coalesce(p_username, '')));
  v_display text := trim(coalesce(p_display_name, ''));
  v_user app.users;
  v_role text := 'user';
begin
  if v_username::text !~ '^[a-z0-9_]{3,32}$' then
    raise exception 'invalid_username';
  end if;
  if p_password is null or char_length(p_password) < 8 or char_length(p_password) > 128 then
    raise exception 'weak_password';
  end if;
  if char_length(v_display) < 1 or char_length(v_display) > 64 then
    raise exception 'invalid_display_name';
  end if;
  perform pg_advisory_xact_lock(hashtext('asameet_signup'));
  if not exists (select 1 from app.users) then
    v_role := 'admin';
  end if;
  begin
    insert into app.users (username, display_name, password_hash, role)
    values (v_username, v_display, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), v_role)
    returning * into v_user;
  exception when unique_violation then
    raise exception 'username_taken';
  end;
  return jsonb_build_object('user', app.user_json(v_user), 'token', app.issue_session(v_user.id, p_user_agent));
end
$$;

create or replace function public.api_login(
  p_username text, p_password text, p_client text default null, p_user_agent text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_username extensions.citext := lower(trim(coalesce(p_username, '')));
  v_client text := coalesce(p_client, '');
  v_user app.users;
  v_dummy text;
begin
  delete from app.login_attempts where at < now() - interval '15 minutes';
  if (select count(*) from app.login_attempts
      where username = v_username and client = v_client) >= 15 then
    return jsonb_build_object('error', 'too_many_attempts');
  end if;
  select * into v_user from app.users where username = v_username;
  if v_user.id is null then
    v_dummy := extensions.crypt(coalesce(p_password, ''), extensions.gen_salt('bf', 10));
    insert into app.login_attempts (username, client) values (v_username, v_client);
    return jsonb_build_object('error', 'invalid_credentials');
  end if;
  if v_user.password_hash <> extensions.crypt(coalesce(p_password, ''), v_user.password_hash) then
    insert into app.login_attempts (username, client) values (v_username, v_client);
    return jsonb_build_object('error', 'invalid_credentials');
  end if;
  if v_user.is_suspended then
    return jsonb_build_object('error', 'suspended');
  end if;
  delete from app.login_attempts where username = v_username and client = v_client;
  update app.users set last_active_at = now() where id = v_user.id;
  return jsonb_build_object('user', app.user_json(v_user), 'token', app.issue_session(v_user.id, p_user_agent));
end
$$;

create or replace function public.api_me(p_token text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  return jsonb_build_object(
    'user', (select app.user_json(u) from app.users u where u.id = v_me),
    'settings', (select u.settings from app.users u where u.id = v_me));
end
$$;

create or replace function public.api_update_profile(
  p_token text, p_display_name text default null, p_username text default null,
  p_bio text default null, p_avatar text default null, p_clear_avatar boolean default false)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_user app.users;
  v_username extensions.citext;
begin
  if p_display_name is not null then
    if char_length(trim(p_display_name)) not between 1 and 64 then
      raise exception 'invalid_display_name';
    end if;
    update app.users set display_name = trim(p_display_name) where id = v_me;
  end if;
  if p_username is not null then
    v_username := lower(trim(p_username));
    if v_username::text !~ '^[a-z0-9_]{3,32}$' then
      raise exception 'invalid_username';
    end if;
    begin
      update app.users set username = v_username where id = v_me;
    exception when unique_violation then
      raise exception 'username_taken';
    end;
  end if;
  if p_bio is not null then
    if char_length(p_bio) > 140 then
      raise exception 'bad_request';
    end if;
    update app.users set bio = nullif(trim(p_bio), '') where id = v_me;
  end if;
  if p_clear_avatar then
    update app.users set avatar = null where id = v_me;
  elsif p_avatar is not null then
    if char_length(p_avatar) > 400000 or p_avatar !~ '^data:image/(jpeg|png|webp);base64,' then
      raise exception 'bad_request';
    end if;
    update app.users set avatar = p_avatar where id = v_me;
  end if;
  select * into v_user from app.users where id = v_me;
  return jsonb_build_object('user', app.user_json(v_user));
end
$$;

create or replace function public.api_update_settings(p_token text, p_settings jsonb)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_settings jsonb;
begin
  if p_settings is null or jsonb_typeof(p_settings) <> 'object'
     or char_length(p_settings::text) > 16000 then
    raise exception 'bad_request';
  end if;
  update app.users set settings = settings || p_settings where id = v_me
    returning settings into v_settings;
  return jsonb_build_object('settings', v_settings);
end
$$;

create or replace function public.api_change_password(p_token text, p_current text, p_new text)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_user app.users;
begin
  select * into v_user from app.users where id = v_me;
  if v_user.password_hash <> extensions.crypt(coalesce(p_current, ''), v_user.password_hash) then
    raise exception 'invalid_credentials';
  end if;
  if p_new is null or char_length(p_new) < 8 or char_length(p_new) > 128 then
    raise exception 'weak_password';
  end if;
  update app.users set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10))
    where id = v_me;
  -- Every other device is signed out.
  delete from app.sessions where user_id = v_me and token_hash <> app.hash_token(p_token);
  return '{}'::jsonb;
end
$$;

create or replace function public.api_sessions(p_token text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_hash text := app.hash_token(p_token);
begin
  return jsonb_build_object('sessions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', left(s.token_hash, 16),
      'userAgent', s.user_agent,
      'createdAt', to_jsonb(s.created_at),
      'lastUsedAt', to_jsonb(s.last_used_at),
      'current', s.token_hash = v_hash) order by s.token_hash = v_hash desc, s.last_used_at desc)
    from app.sessions s where s.user_id = v_me and s.expires_at > now()), '[]'::jsonb));
end
$$;

create or replace function public.api_session_terminate(p_token text, p_id text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_hash text := app.hash_token(p_token);
begin
  if p_id is null then
    delete from app.sessions where user_id = v_me and token_hash <> v_hash;
  else
    delete from app.sessions where user_id = v_me and token_hash <> v_hash
      and left(token_hash, 16) = p_id;
  end if;
  return '{}'::jsonb;
end
$$;

-- ---------------------------------------------------------------- chats

create or replace function public.api_saved_chat(p_token text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_key text := v_me::text || '_' || v_me::text;
  v_chat app.chats;
begin
  select * into v_chat from app.chats where private_key = v_key;
  if v_chat.id is null then
    begin
      insert into app.chats (type, created_by, private_key) values ('private', v_me, v_key)
        returning * into v_chat;
      insert into app.chat_members (chat_id, user_id, last_read_at, role)
        values (v_chat.id, v_me, now(), 'owner');
    exception when unique_violation then
      select * into v_chat from app.chats where private_key = v_key;
    end;
  end if;
  return jsonb_build_object('chat', app.chat_json(v_chat, v_me));
end
$$;

create or replace function public.api_create_chat(
  p_token text, p_type text, p_name text, p_member_ids uuid[],
  p_description text default null, p_avatar text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_members uuid[];
  v_type text := coalesce(p_type, 'private');
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_chat app.chats;
  v_key text;
  m uuid;
begin
  select array_agg(distinct x) into v_members
    from unnest(array_append(coalesce(p_member_ids, '{}'), v_me)) x;
  if v_type not in ('private','group','channel') then
    raise exception 'bad_request';
  end if;
  if v_type = 'private' and array_length(v_members, 1) = 1 then
    return public.api_saved_chat(p_token);
  end if;
  if array_length(v_members, 1) < (case when v_type = 'channel' then 1 else 2 end)
     or array_length(v_members, 1) > 200 then
    raise exception 'bad_request';
  end if;
  if (select count(*) from app.users u where u.id = any(v_members)) <> array_length(v_members, 1) then
    raise exception 'not_found';
  end if;
  if v_type = 'private' then
    if array_length(v_members, 1) <> 2 then
      raise exception 'bad_request';
    end if;
    v_key := least(v_members[1]::text, v_members[2]::text) || '_' ||
             greatest(v_members[1]::text, v_members[2]::text);
    select * into v_chat from app.chats where private_key = v_key;
    if v_chat.id is not null then
      return jsonb_build_object('chat', app.chat_json(v_chat, v_me));
    end if;
  else
    if v_name is null or char_length(v_name) > 80 then
      raise exception 'bad_request';
    end if;
  end if;
  if p_avatar is not null and (char_length(p_avatar) > 400000
     or p_avatar !~ '^data:image/(jpeg|png|webp);base64,') then
    raise exception 'bad_request';
  end if;

  begin
    insert into app.chats (type, name, created_by, private_key, description, avatar)
    values (v_type, case when v_type = 'private' then null else v_name end, v_me, v_key,
            case when v_type = 'private' then null else left(p_description, 255) end,
            case when v_type = 'private' then null else p_avatar end)
    returning * into v_chat;
  exception when unique_violation then
    select * into v_chat from app.chats where private_key = v_key;
    return jsonb_build_object('chat', app.chat_json(v_chat, v_me));
  end;

  foreach m in array v_members loop
    insert into app.chat_members (chat_id, user_id, last_read_at, role)
    values (v_chat.id, m, case when m = v_me then now() else 'epoch'::timestamptz end,
            case when m = v_me and v_type <> 'private' then 'owner' else 'member' end);
  end loop;
  if v_type <> 'private' then
    insert into app.messages (chat_id, sender_id, content, type)
    values (v_chat.id, v_me, case when v_type = 'group' then 'group_created' else 'channel_created' end, 'system');
  end if;
  return jsonb_build_object('chat', app.chat_json(v_chat, v_me));
end
$$;

create or replace function public.api_chat_update(
  p_token text, p_chat_id uuid, p_name text default null, p_description text default null,
  p_username text default null, p_avatar text default null, p_clear_avatar boolean default false,
  p_reset_invite boolean default false)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_chat app.chats;
  v_username extensions.citext;
begin
  select * into v_chat from app.chats where id = p_chat_id;
  if v_chat.id is null then raise exception 'not_found'; end if;
  if v_chat.type = 'private' or app.member_role(p_chat_id, v_me) not in ('owner','admin') then
    raise exception 'forbidden';
  end if;
  if p_name is not null then
    if char_length(trim(p_name)) not between 1 and 80 then raise exception 'bad_request'; end if;
    update app.chats set name = trim(p_name) where id = p_chat_id;
  end if;
  if p_description is not null then
    update app.chats set description = nullif(left(trim(p_description), 255), '') where id = p_chat_id;
  end if;
  if p_username is not null then
    v_username := nullif(lower(trim(p_username)), '');
    if v_username is not null and v_username::text !~ '^[a-z0-9_]{5,32}$' then
      raise exception 'invalid_username';
    end if;
    begin
      update app.chats set username = v_username where id = p_chat_id;
    exception when unique_violation then
      raise exception 'username_taken';
    end;
  end if;
  if p_clear_avatar then
    update app.chats set avatar = null where id = p_chat_id;
  elsif p_avatar is not null then
    if char_length(p_avatar) > 400000 or p_avatar !~ '^data:image/(jpeg|png|webp);base64,' then
      raise exception 'bad_request';
    end if;
    update app.chats set avatar = p_avatar where id = p_chat_id;
  end if;
  if p_reset_invite then
    update app.chats set invite_code = encode(extensions.gen_random_bytes(9), 'hex') where id = p_chat_id;
  end if;
  select * into v_chat from app.chats where id = p_chat_id;
  return jsonb_build_object('chat', app.chat_json(v_chat, v_me));
end
$$;

create or replace function public.api_chat_members(
  p_token text, p_chat_id uuid, p_action text, p_user_id uuid default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_chat app.chats;
  v_my_role text := app.member_role(p_chat_id, v_me);
  v_target_role text;
begin
  select * into v_chat from app.chats where id = p_chat_id;
  if v_chat.id is null or v_my_role is null then raise exception 'not_found'; end if;
  if v_chat.type = 'private' then raise exception 'forbidden'; end if;

  if p_action = 'leave' then
    if v_my_role = 'owner' and exists (select 1 from app.chat_members
        where chat_id = p_chat_id and user_id <> v_me) then
      -- Hand ownership to the oldest admin, else the oldest member.
      update app.chat_members set role = 'owner'
        where chat_id = p_chat_id and user_id = (
          select user_id from app.chat_members where chat_id = p_chat_id and user_id <> v_me
          order by (role = 'admin') desc, joined_at limit 1);
    end if;
    delete from app.chat_members where chat_id = p_chat_id and user_id = v_me;
    if not exists (select 1 from app.chat_members where chat_id = p_chat_id) then
      delete from app.chats where id = p_chat_id;
    else
      insert into app.messages (chat_id, sender_id, content, type)
        values (p_chat_id, v_me, 'left', 'system');
    end if;
    return '{}'::jsonb;
  end if;

  if p_action = 'delete' then
    if v_my_role <> 'owner' and not exists (select 1 from app.users where id = v_me and role = 'admin') then
      raise exception 'forbidden';
    end if;
    delete from app.chats where id = p_chat_id;
    return '{}'::jsonb;
  end if;

  if p_user_id is null or not exists (select 1 from app.users where id = p_user_id) then
    raise exception 'bad_request';
  end if;
  v_target_role := app.member_role(p_chat_id, p_user_id);

  if p_action = 'add' then
    if v_my_role not in ('owner','admin') and v_chat.type = 'channel' then
      raise exception 'forbidden';
    end if;
    if v_target_role is not null then return jsonb_build_object('chat', app.chat_json(v_chat, v_me)); end if;
    if (select count(*) from app.chat_members where chat_id = p_chat_id) >= 200 then
      raise exception 'bad_request';
    end if;
    insert into app.chat_members (chat_id, user_id) values (p_chat_id, p_user_id);
    insert into app.messages (chat_id, sender_id, content, type, meta)
      values (p_chat_id, v_me, 'added', 'system', jsonb_build_object('userId', p_user_id));
  elsif p_action = 'remove' then
    if v_my_role not in ('owner','admin') or v_target_role = 'owner'
       or (v_target_role = 'admin' and v_my_role <> 'owner') then
      raise exception 'forbidden';
    end if;
    delete from app.chat_members where chat_id = p_chat_id and user_id = p_user_id;
    insert into app.messages (chat_id, sender_id, content, type, meta)
      values (p_chat_id, v_me, 'removed', 'system', jsonb_build_object('userId', p_user_id));
  elsif p_action = 'promote' then
    if v_my_role <> 'owner' or v_target_role is null then raise exception 'forbidden'; end if;
    update app.chat_members set role = 'admin' where chat_id = p_chat_id and user_id = p_user_id and role = 'member';
  elsif p_action = 'demote' then
    if v_my_role <> 'owner' or v_target_role is null then raise exception 'forbidden'; end if;
    update app.chat_members set role = 'member' where chat_id = p_chat_id and user_id = p_user_id and role = 'admin';
  else
    raise exception 'bad_request';
  end if;
  select * into v_chat from app.chats where id = p_chat_id;
  return jsonb_build_object('chat', app.chat_json(v_chat, v_me));
end
$$;

-- Join by public username or invite code; also used to preview a link.
create or replace function public.api_chat_join(p_token text, p_ref text, p_preview boolean default false)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_ref text := lower(trim(coalesce(p_ref, '')));
  v_chat app.chats;
begin
  v_ref := regexp_replace(v_ref, '^(https?://[^/]+/talk/)?(join/|@)?', '');
  select * into v_chat from app.chats
    where type <> 'private' and (invite_code = v_ref or username = v_ref::extensions.citext);
  if v_chat.id is null then raise exception 'not_found'; end if;
  if p_preview then
    return jsonb_build_object('preview', jsonb_build_object(
      'id', v_chat.id, 'name', v_chat.name, 'type', v_chat.type, 'avatar', v_chat.avatar,
      'description', v_chat.description,
      'memberCount', (select count(*) from app.chat_members where chat_id = v_chat.id),
      'joined', app.member_role(v_chat.id, v_me) is not null));
  end if;
  if app.member_role(v_chat.id, v_me) is null then
    if (select count(*) from app.chat_members where chat_id = v_chat.id) >= 200 then
      raise exception 'bad_request';
    end if;
    insert into app.chat_members (chat_id, user_id) values (v_chat.id, v_me);
    insert into app.messages (chat_id, sender_id, content, type)
      values (v_chat.id, v_me, 'joined', 'system');
  end if;
  return jsonb_build_object('chat', app.chat_json(v_chat, v_me));
end
$$;

create or replace function public.api_chat_prefs(
  p_token text, p_chat_id uuid, p_pinned boolean default null, p_muted boolean default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  update app.chat_members
    set is_pinned = coalesce(p_pinned, is_pinned), muted = coalesce(p_muted, muted)
    where chat_id = p_chat_id and user_id = v_me;
  return '{}'::jsonb;
end
$$;

create or replace function public.api_chat_clear(p_token text, p_chat_id uuid) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_chat app.chats;
begin
  select * into v_chat from app.chats where id = p_chat_id;
  if v_chat.id is null or app.member_role(p_chat_id, v_me) is null then raise exception 'not_found'; end if;
  if v_chat.type = 'private' then
    -- Deleting a private chat removes it for both sides (like Telegram's
    -- "delete for everyone" on a 1:1 chat).
    delete from app.chats where id = p_chat_id;
  elsif app.member_role(p_chat_id, v_me) in ('owner','admin') then
    delete from app.messages where chat_id = p_chat_id;
  else
    raise exception 'forbidden';
  end if;
  return '{}'::jsonb;
end
$$;

create or replace function public.api_typing(p_token text, p_chat_id uuid) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  if app.member_role(p_chat_id, v_me) is null then raise exception 'forbidden'; end if;
  insert into app.typing (chat_id, user_id, at) values (p_chat_id, v_me, now())
    on conflict (chat_id, user_id) do update set at = now();
  delete from app.typing where at < now() - interval '1 minute';
  return '{}'::jsonb;
end
$$;

-- ---------------------------------------------------------------- media

create or replace function public.api_upload_media(
  p_token text, p_chat_id uuid, p_mime text, p_data text)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_id uuid;
  v_size integer := (char_length(coalesce(p_data, '')) * 3) / 4;
begin
  if app.member_role(p_chat_id, v_me) is null then raise exception 'forbidden'; end if;
  if v_size < 1 or v_size > 6291456 or p_mime !~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$' then
    raise exception 'bad_request';
  end if;
  insert into app.media (chat_id, uploader_id, mime, size, data)
    values (p_chat_id, v_me, p_mime, v_size, p_data) returning id into v_id;
  return jsonb_build_object('id', v_id);
end
$$;

create or replace function public.api_media(p_token text, p_media_id uuid) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_media app.media;
begin
  select * into v_media from app.media where id = p_media_id;
  if v_media.id is null then raise exception 'not_found'; end if;
  if app.member_role(v_media.chat_id, v_me) is null
     and not exists (select 1 from app.users where id = v_me and role = 'admin') then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object('mime', v_media.mime, 'size', v_media.size, 'data', v_media.data);
end
$$;

-- ---------------------------------------------------------------- messages

create or replace function public.api_messages(p_token text, p_chat_id uuid, p_after timestamptz default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  if app.member_role(p_chat_id, v_me) is null then raise exception 'forbidden'; end if;
  return jsonb_build_object('messages', coalesce((
    select jsonb_agg(app.message_json(m, v_me) order by m.created_at)
    from (select * from app.messages m0 where m0.chat_id = p_chat_id
            and (p_after is null or m0.created_at > p_after)
          order by m0.created_at desc limit 400) m), '[]'::jsonb));
end
$$;

create or replace function public.api_send_message(
  p_token text, p_chat_id uuid, p_content text,
  p_type text default 'text', p_reply_to uuid default null,
  p_media_id uuid default null, p_meta jsonb default '{}'::jsonb)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_chat app.chats;
  v_msg app.messages;
  v_content text := trim(coalesce(p_content, ''));
  v_type text := coalesce(p_type, 'text');
  v_peer uuid;
begin
  select * into v_chat from app.chats where id = p_chat_id;
  if v_chat.id is null then raise exception 'not_found'; end if;
  if app.member_role(p_chat_id, v_me) is null then raise exception 'forbidden'; end if;
  if v_chat.type = 'channel' and app.member_role(p_chat_id, v_me) not in ('owner','admin')
     and not exists (select 1 from app.users where id = v_me and role = 'admin') then
    raise exception 'forbidden';
  end if;
  if v_chat.type = 'private' then
    select user_id into v_peer from app.chat_members where chat_id = p_chat_id and user_id <> v_me;
    if v_peer is not null and (app.is_blocked(v_peer, v_me) or app.is_blocked(v_me, v_peer)) then
      raise exception 'forbidden';
    end if;
  end if;
  if v_type not in ('text','image','file','voice','video','video_note','sticker') then
    raise exception 'bad_request';
  end if;
  if v_type = 'text' and char_length(v_content) < 1 then raise exception 'bad_request'; end if;
  if char_length(v_content) > 4000 then raise exception 'bad_request'; end if;
  if v_type in ('image','file','voice','video','video_note') then
    if p_media_id is null or not exists (select 1 from app.media
        where id = p_media_id and chat_id = p_chat_id and uploader_id = v_me) then
      raise exception 'bad_request';
    end if;
  end if;
  if p_reply_to is not null and not exists (
      select 1 from app.messages where id = p_reply_to and chat_id = p_chat_id) then
    raise exception 'bad_request';
  end if;
  if jsonb_typeof(coalesce(p_meta, '{}'::jsonb)) <> 'object' or char_length(p_meta::text) > 4000 then
    raise exception 'bad_request';
  end if;

  insert into app.messages (chat_id, sender_id, content, type, reply_to_id, media_id, meta)
  values (p_chat_id, v_me, v_content, v_type, p_reply_to, p_media_id, coalesce(p_meta, '{}'::jsonb))
  returning * into v_msg;
  update app.chat_members set last_read_at = v_msg.created_at
    where chat_id = p_chat_id and user_id = v_me;
  delete from app.typing where chat_id = p_chat_id and user_id = v_me;
  return jsonb_build_object('message', app.message_json(v_msg, v_me));
end
$$;

create or replace function public.api_message_action(
  p_token text, p_chat_id uuid, p_message_id uuid,
  p_action text, p_emoji text default null,
  p_text text default null, p_target_chat uuid default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_chat app.chats;
  v_msg app.messages;
  v_new app.messages;
  v_emoji text := trim(coalesce(p_emoji, ''));
  v_reactions jsonb;
  v_entry jsonb;
  v_users jsonb;
  v_idx int := -1;
  v_role text := app.member_role(p_chat_id, v_me);
  v_is_admin boolean := exists (select 1 from app.users where id = v_me and role = 'admin');
  v_sender_name text;
  v_media_id uuid;
  i int;
begin
  if v_role is null then raise exception 'forbidden'; end if;
  select * into v_msg from app.messages where id = p_message_id and chat_id = p_chat_id for update;
  if v_msg.id is null then raise exception 'not_found'; end if;
  select * into v_chat from app.chats where id = p_chat_id;

  if p_action = 'pin' or p_action = 'unpin' then
    if v_chat.type = 'channel' and v_role not in ('owner','admin') and not v_is_admin then
      raise exception 'forbidden';
    end if;
    update app.messages set is_pinned = (p_action = 'pin') where id = p_message_id returning * into v_msg;

  elsif p_action = 'read' then
    update app.chat_members set last_read_at = greatest(last_read_at, v_msg.created_at)
      where chat_id = p_chat_id and user_id = v_me;

  elsif p_action = 'edit' then
    if v_msg.sender_id <> v_me or v_msg.type not in ('text','image','file','video') then
      raise exception 'forbidden';
    end if;
    if p_text is null or char_length(trim(p_text)) > 4000
       or (v_msg.type = 'text' and char_length(trim(p_text)) < 1) then
      raise exception 'bad_request';
    end if;
    update app.messages set content = trim(p_text), edited_at = now()
      where id = p_message_id returning * into v_msg;

  elsif p_action = 'delete' then
    if v_msg.sender_id <> v_me and v_role not in ('owner','admin') and not v_is_admin then
      raise exception 'forbidden';
    end if;
    delete from app.messages where id = p_message_id;
    return '{}'::jsonb;

  elsif p_action = 'forward' then
    if p_target_chat is null or app.member_role(p_target_chat, v_me) is null then
      raise exception 'forbidden';
    end if;
    if (select type from app.chats where id = p_target_chat) = 'channel'
       and app.member_role(p_target_chat, v_me) not in ('owner','admin') and not v_is_admin then
      raise exception 'forbidden';
    end if;
    select display_name into v_sender_name from app.users where id = v_msg.sender_id;
    insert into app.messages (chat_id, sender_id, content, type, forwarded_from, media_id, meta)
    values (p_target_chat, v_me, v_msg.content, v_msg.type,
            coalesce(v_msg.forwarded_from, v_sender_name), v_msg.media_id, v_msg.meta)
    returning * into v_new;
    -- media rows are scoped by chat; forwarding shares the blob with the target
    if v_msg.media_id is not null then
      insert into app.media (chat_id, uploader_id, mime, size, data)
        select p_target_chat, v_me, md.mime, md.size, md.data
        from app.media md where md.id = v_msg.media_id
        returning id into v_media_id;
      update app.messages set media_id = v_media_id where id = v_new.id returning * into v_new;
    end if;
    update app.chat_members set last_read_at = v_new.created_at
      where chat_id = p_target_chat and user_id = v_me;
    return jsonb_build_object('message', app.message_json(v_new, v_me));

  elsif p_action = 'react' then
    if char_length(v_emoji) < 1 or char_length(v_emoji) > 16 then raise exception 'bad_request'; end if;
    v_reactions := v_msg.reactions;
    for i in 0 .. coalesce(jsonb_array_length(v_reactions), 0) - 1 loop
      if v_reactions->i->>'emoji' = v_emoji then v_idx := i; end if;
    end loop;
    if v_idx = -1 then
      if coalesce(jsonb_array_length(v_reactions), 0) >= 24 then raise exception 'bad_request'; end if;
      v_reactions := v_reactions || jsonb_build_array(
        jsonb_build_object('emoji', v_emoji, 'userIds', jsonb_build_array(v_me)));
    else
      v_entry := v_reactions->v_idx;
      v_users := v_entry->'userIds';
      if v_users @> to_jsonb(array[v_me]) then
        v_users := coalesce((select jsonb_agg(x) from jsonb_array_elements(v_users) x
          where x <> to_jsonb(v_me)), '[]'::jsonb);
      else
        v_users := v_users || to_jsonb(v_me);
      end if;
      if jsonb_array_length(v_users) = 0 then
        v_reactions := v_reactions - v_idx;
      else
        v_reactions := jsonb_set(v_reactions, array[v_idx::text, 'userIds'], v_users);
      end if;
    end if;
    update app.messages set reactions = v_reactions where id = p_message_id returning * into v_msg;

  else
    raise exception 'bad_request';
  end if;
  return jsonb_build_object('message', app.message_json(v_msg, v_me));
end
$$;

create or replace function public.api_search_messages(p_token text, p_query text, p_chat_id uuid default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_q text := trim(coalesce(p_query, ''));
begin
  if char_length(v_q) < 2 then return jsonb_build_object('messages', '[]'::jsonb); end if;
  return jsonb_build_object('messages', coalesce((
    select jsonb_agg(app.message_json(m, v_me) order by m.created_at desc)
    from (select m0.* from app.messages m0
          join app.chat_members cm on cm.chat_id = m0.chat_id and cm.user_id = v_me
          where (p_chat_id is null or m0.chat_id = p_chat_id)
            and m0.type <> 'system' and m0.content ilike '%' || v_q || '%'
          order by m0.created_at desc limit 60) m), '[]'::jsonb));
end
$$;

-- ---------------------------------------------------------------- calls

create or replace function public.api_call_start(p_token text, p_type text, p_peer_id uuid)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_call app.calls;
begin
  if p_peer_id is null or p_peer_id = v_me
     or not exists (select 1 from app.users where id = p_peer_id) then
    raise exception 'bad_request';
  end if;
  if app.is_blocked(p_peer_id, v_me) or app.is_blocked(v_me, p_peer_id) then
    raise exception 'forbidden';
  end if;
  -- Abandoned rings from earlier attempts are closed as missed.
  update app.calls set status = 'ended'
    where status = 'ringing' and created_at < now() - interval '60 seconds';
  update app.calls set status = 'ended'
    where status = 'active' and answered_at < now() - interval '12 hours';
  insert into app.calls (type, status, initiator_id, peer_id)
  values (case when p_type = 'video' then 'video' else 'audio' end, 'ringing', v_me, p_peer_id)
  returning * into v_call;
  return jsonb_build_object('call', app.call_json(v_call, v_me));
end
$$;

create or replace function public.api_call_answer(p_token text, p_call_id uuid, p_action text)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_call app.calls;
begin
  select * into v_call from app.calls where id = p_call_id and (initiator_id = v_me or peer_id = v_me) for update;
  if v_call.id is null then raise exception 'not_found'; end if;
  if p_action = 'accept' and v_call.peer_id = v_me and v_call.status = 'ringing' then
    update app.calls set status = 'active', answered_at = now() where id = p_call_id returning * into v_call;
  elsif p_action = 'decline' and v_call.status = 'ringing' then
    update app.calls set status = 'declined' where id = p_call_id returning * into v_call;
  else
    raise exception 'bad_request';
  end if;
  return jsonb_build_object('call', app.call_json(v_call, v_me));
end
$$;

create or replace function public.api_call_end(p_token text, p_call_id uuid, p_duration integer)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_call app.calls;
begin
  select * into v_call from app.calls
    where id = p_call_id and (initiator_id = v_me or peer_id = v_me) for update;
  if v_call.id is null then raise exception 'not_found'; end if;
  if v_call.status in ('ended','declined') then
    return jsonb_build_object('call', app.call_json(v_call, v_me));
  end if;
  update app.calls
    set status = 'ended',
        duration = case
          when v_call.answered_at is null then null
          else greatest(1, least(coalesce(p_duration,
            extract(epoch from now() - v_call.answered_at)::int), 60 * 60 * 24)) end
    where id = p_call_id returning * into v_call;
  delete from app.call_signals where call_id = p_call_id;
  return jsonb_build_object('call', app.call_json(v_call, v_me));
end
$$;

create or replace function public.api_call_signal(p_token text, p_call_id uuid, p_payload jsonb)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  if not exists (select 1 from app.calls where id = p_call_id
      and (initiator_id = v_me or peer_id = v_me) and status in ('ringing','active')) then
    raise exception 'forbidden';
  end if;
  if p_payload is null or char_length(p_payload::text) > 60000 then raise exception 'bad_request'; end if;
  insert into app.call_signals (call_id, sender_id, payload) values (p_call_id, v_me, p_payload);
  return '{}'::jsonb;
end
$$;

-- One poll returns the call state plus every signal from the other side
-- newer than p_after; the caller keeps the cursor.
create or replace function public.api_call_poll(p_token text, p_call_id uuid, p_after bigint default 0)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_call app.calls;
begin
  select * into v_call from app.calls where id = p_call_id and (initiator_id = v_me or peer_id = v_me);
  if v_call.id is null then raise exception 'not_found'; end if;
  if v_call.status = 'ringing' and v_call.created_at < now() - interval '60 seconds' then
    update app.calls set status = 'ended' where id = p_call_id returning * into v_call;
  end if;
  return jsonb_build_object(
    'call', app.call_json(v_call, v_me),
    'signals', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'payload', s.payload) order by s.id)
      from app.call_signals s where s.call_id = p_call_id and s.sender_id <> v_me and s.id > coalesce(p_after, 0)),
      '[]'::jsonb));
end
$$;

-- The one poll the client runs while idle: am I being called?
create or replace function public.api_call_incoming(p_token text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_call app.calls;
begin
  select * into v_call from app.calls
    where peer_id = v_me and status = 'ringing' and created_at > now() - interval '60 seconds'
    order by created_at desc limit 1;
  return jsonb_build_object('call', case when v_call.id is null then null else app.call_json(v_call, v_me) end);
end
$$;
