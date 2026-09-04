-- Asatalk onboarding & polish:
--  * phone / email identities with one-time codes (password becomes optional)
--  * archived chats, 24-hour notes ("status") on profiles
--  * media uploads accept MIME parameters (audio/webm;codecs=opus) — this was
--    why voice and round-video messages failed to send

alter table app.users add column if not exists phone text unique
  check (phone is null or phone ~ '^\+[0-9]{7,15}$');
alter table app.users add column if not exists email extensions.citext unique
  check (email is null or email::text ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
alter table app.users add column if not exists note text
  check (note is null or char_length(note) <= 60);
alter table app.users add column if not exists note_at timestamptz;
alter table app.users alter column password_hash drop not null;

alter table app.chat_members add column if not exists archived boolean not null default false;

create table if not exists app.otp_codes (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  code_hash text not null,
  attempts integer not null default 0,
  client text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
create index if not exists otp_codes_idx on app.otp_codes(identifier, created_at);
alter table app.otp_codes enable row level security;

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
    'phone', u.phone,
    'email', u.email,
    'note', case when u.note_at > now() - interval '24 hours' then u.note else null end,
    'noteAt', case when u.note_at > now() - interval '24 hours' then to_jsonb(u.note_at) else null end,
    'hasPassword', u.password_hash is not null,
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
    'isArchived', coalesce((select cm.archived from app.chat_members cm
      where cm.chat_id = c.id and cm.user_id = p_viewer), false),
    'memberIds', coalesce((select jsonb_agg(cm.user_id order by cm.joined_at)
      from app.chat_members cm where cm.chat_id = c.id), '[]'::jsonb),
    'adminIds', coalesce((select jsonb_agg(cm.user_id)
      from app.chat_members cm where cm.chat_id = c.id and cm.role in ('owner','admin')), '[]'::jsonb),
    'typingUserIds', coalesce((select jsonb_agg(t.user_id)
      from app.typing t where t.chat_id = c.id and t.user_id <> p_viewer
        and t.at > now() - interval '6 seconds'), '[]'::jsonb),
    'readCount', (select count(*) from app.chat_members cm
      where cm.chat_id = c.id and cm.user_id <> p_viewer
        and cm.last_read_at >= coalesce((select max(m.created_at) from app.messages m
          where m.chat_id = c.id and m.sender_id = p_viewer), 'infinity'::timestamptz)),
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

-- ---------------------------------------------------------------- auth

-- Passwordless accounts must not be able to log in with any password.
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
  select * into v_user from app.users
    where username = v_username or email = v_username or phone = v_username::text;
  if v_user.id is null or v_user.password_hash is null then
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
  if v_user.password_hash is not null
     and v_user.password_hash <> extensions.crypt(coalesce(p_current, ''), v_user.password_hash) then
    raise exception 'invalid_credentials';
  end if;
  if p_new is null or char_length(p_new) < 8 or char_length(p_new) > 128 then
    raise exception 'weak_password';
  end if;
  update app.users set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10))
    where id = v_me;
  delete from app.sessions where user_id = v_me and token_hash <> app.hash_token(p_token);
  return '{}'::jsonb;
end
$$;

-- Request a one-time code for a phone number (+E.164) or email. The code is
-- returned to the trusted server layer, which delivers it (SMS / email
-- provider) — never to the browser directly.
create or replace function public.api_otp_request(p_identifier text, p_client text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_id text := lower(trim(coalesce(p_identifier, '')));
  v_code text;
  v_kind text;
begin
  if v_id ~ '^\+[0-9]{7,15}$' then
    v_kind := 'phone';
  elsif v_id ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    v_kind := 'email';
  else
    raise exception 'bad_request';
  end if;
  delete from app.otp_codes where expires_at < now() - interval '1 hour';
  if (select count(*) from app.otp_codes
      where identifier = v_id and created_at > now() - interval '15 minutes') >= 5 then
    raise exception 'too_many_attempts';
  end if;
  v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  insert into app.otp_codes (identifier, code_hash, client)
    values (v_id, app.hash_token(v_id || ':' || v_code), coalesce(p_client, ''));
  return jsonb_build_object('kind', v_kind, 'code', v_code, 'ttl', 600,
    'known', exists (select 1 from app.users where phone = v_id or email = v_id::extensions.citext));
end
$$;

-- Verify a code; signs the user in, creating the account on first use.
create or replace function public.api_otp_verify(
  p_identifier text, p_code text, p_display_name text default null, p_user_agent text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_id text := lower(trim(coalesce(p_identifier, '')));
  v_code text := regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g');
  v_row app.otp_codes;
  v_user app.users;
  v_new boolean := false;
  v_username text;
  v_display text := nullif(trim(coalesce(p_display_name, '')), '');
begin
  select * into v_row from app.otp_codes
    where identifier = v_id and expires_at > now()
    order by created_at desc limit 1 for update;
  if v_row.id is null then
    raise exception 'invalid_credentials';
  end if;
  if v_row.attempts >= 5 then
    raise exception 'too_many_attempts';
  end if;
  if v_row.code_hash <> app.hash_token(v_id || ':' || v_code) then
    update app.otp_codes set attempts = attempts + 1 where id = v_row.id;
    raise exception 'invalid_credentials';
  end if;
  delete from app.otp_codes where identifier = v_id;

  select * into v_user from app.users where phone = v_id or email = v_id::extensions.citext;
  if v_user.id is null then
    v_new := true;
    perform pg_advisory_xact_lock(hashtext('asameet_signup'));
    loop
      v_username := 'asa_' || encode(extensions.gen_random_bytes(4), 'hex');
      exit when not exists (select 1 from app.users where username = v_username::extensions.citext);
    end loop;
    insert into app.users (username, display_name, password_hash, role, phone, email)
    values (
      v_username,
      coalesce(v_display, case when v_id like '+%' then v_id else split_part(v_id, '@', 1) end),
      null,
      case when not exists (select 1 from app.users) then 'admin' else 'user' end,
      case when v_id like '+%' then v_id else null end,
      case when v_id like '+%' then null else v_id::extensions.citext end)
    returning * into v_user;
  elsif v_display is not null and v_user.display_name = coalesce(v_user.phone, v_user.email::text) then
    update app.users set display_name = v_display where id = v_user.id returning * into v_user;
  end if;
  if v_user.is_suspended then
    raise exception 'suspended';
  end if;
  update app.users set last_active_at = now() where id = v_user.id;
  return jsonb_build_object('user', app.user_json(v_user), 'isNew', v_new,
    'token', app.issue_session(v_user.id, p_user_agent));
end
$$;

-- Profile: add the 24-hour note.
create or replace function public.api_update_profile(
  p_token text, p_display_name text default null, p_username text default null,
  p_bio text default null, p_avatar text default null, p_clear_avatar boolean default false,
  p_note text default null, p_clear_note boolean default false)
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
    if char_length(p_bio) > 140 then raise exception 'bad_request'; end if;
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
  if p_clear_note then
    update app.users set note = null, note_at = null where id = v_me;
  elsif p_note is not null then
    if char_length(trim(p_note)) not between 1 and 60 then raise exception 'bad_request'; end if;
    update app.users set note = trim(p_note), note_at = now() where id = v_me;
  end if;
  select * into v_user from app.users where id = v_me;
  return jsonb_build_object('user', app.user_json(v_user));
end
$$;
drop function if exists public.api_update_profile(text, text, text, text, text, boolean);

-- Chat prefs: archive.
create or replace function public.api_chat_prefs(
  p_token text, p_chat_id uuid, p_pinned boolean default null, p_muted boolean default null,
  p_archived boolean default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  update app.chat_members
    set is_pinned = coalesce(p_pinned, is_pinned),
        muted = coalesce(p_muted, muted),
        archived = coalesce(p_archived, archived)
    where chat_id = p_chat_id and user_id = v_me;
  return '{}'::jsonb;
end
$$;
drop function if exists public.api_chat_prefs(text, uuid, boolean, boolean);

-- Media: accept MIME parameters ("audio/webm;codecs=opus").
create or replace function public.api_upload_media(
  p_token text, p_chat_id uuid, p_mime text, p_data text)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_id uuid;
  v_mime text := lower(trim(coalesce(p_mime, '')));
  v_size integer := (char_length(coalesce(p_data, '')) * 3) / 4;
begin
  if app.member_role(p_chat_id, v_me) is null then raise exception 'forbidden'; end if;
  if v_size < 1 or v_size > 6291456
     or v_mime !~ '^[a-z0-9.+-]+/[a-z0-9.+-]+(;[a-z0-9 .+=,_-]*)?$' then
    raise exception 'bad_request';
  end if;
  insert into app.media (chat_id, uploader_id, mime, size, data)
    values (p_chat_id, v_me, v_mime, v_size, p_data) returning id into v_id;
  return jsonb_build_object('id', v_id);
end
$$;
