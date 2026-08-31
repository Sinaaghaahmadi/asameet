-- Asameet production data layer.
--
-- Everything lives in the private `app` schema (invisible to PostgREST).
-- The only surface exposed to the web is the set of `public.api_*` functions,
-- each of which authenticates via an opaque session token and runs as
-- SECURITY DEFINER. The anon key therefore grants nothing beyond calling
-- these functions — safe to ship inside the client bundle.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists app;
revoke all on schema app from public, anon, authenticated;

-- ---------------------------------------------------------------- tables

create table app.users (
  id uuid primary key default gen_random_uuid(),
  username extensions.citext not null unique
    check (username ~ '^[a-z0-9_]{3,32}$'),
  display_name text not null check (char_length(display_name) between 1 and 64),
  password_hash text not null,
  avatar text,
  role text not null default 'user' check (role in ('user','teacher','host','admin')),
  is_suspended boolean not null default false,
  country text,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table app.sessions (
  token_hash text primary key,
  user_id uuid not null references app.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index sessions_user_idx on app.sessions(user_id);

create table app.login_attempts (
  username extensions.citext not null,
  at timestamptz not null default now()
);
create index login_attempts_idx on app.login_attempts(username, at);

create table app.chats (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('private','group','channel')),
  name text check (name is null or char_length(name) between 1 and 80),
  avatar text,
  created_by uuid references app.users(id) on delete set null,
  private_key text unique, -- canonical "<uuidA>_<uuidB>" for private-chat dedup
  created_at timestamptz not null default now()
);

create table app.chat_members (
  chat_id uuid not null references app.chats(id) on delete cascade,
  user_id uuid not null references app.users(id) on delete cascade,
  is_pinned boolean not null default false,
  last_read_at timestamptz not null default 'epoch',
  joined_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
create index chat_members_user_idx on app.chat_members(user_id);

create table app.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references app.chats(id) on delete cascade,
  sender_id uuid not null references app.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  type text not null default 'text' check (type in ('text','image','file','voice','system')),
  reply_to_id uuid references app.messages(id) on delete set null,
  forwarded_from text,
  is_pinned boolean not null default false,
  reactions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index messages_chat_idx on app.messages(chat_id, created_at);

create table app.calls (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('audio','video')),
  status text not null default 'active' check (status in ('ringing','active','ended')),
  initiator_id uuid not null references app.users(id) on delete cascade,
  peer_id uuid not null references app.users(id) on delete cascade,
  duration integer,
  created_at timestamptz not null default now()
);
create index calls_initiator_idx on app.calls(initiator_id, created_at);
create index calls_peer_idx on app.calls(peer_id, created_at);

create table app.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  type text not null default 'meeting' check (type in ('meeting','conference','class')),
  link text not null unique,
  status text not null default 'active' check (status in ('scheduled','active','ended')),
  host_id uuid not null references app.users(id) on delete cascade,
  max_participants integer not null default 100 check (max_participants between 2 and 1000),
  is_recording boolean not null default false,
  starts_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table app.meeting_participants (
  meeting_id uuid not null references app.meetings(id) on delete cascade,
  user_id uuid not null references app.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

create table app.class_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  teacher_id uuid not null references app.users(id) on delete cascade,
  status text not null default 'active' check (status in ('scheduled','active','ended')),
  starts_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table app.class_students (
  class_id uuid not null references app.class_sessions(id) on delete cascade,
  user_id uuid not null references app.users(id) on delete cascade,
  present boolean not null default false,
  primary key (class_id, user_id)
);

-- Belt and braces: the app schema is not exposed via PostgREST, and RLS
-- (with zero policies) blocks any residual non-owner access path.
alter table app.users enable row level security;
alter table app.sessions enable row level security;
alter table app.login_attempts enable row level security;
alter table app.chats enable row level security;
alter table app.chat_members enable row level security;
alter table app.messages enable row level security;
alter table app.calls enable row level security;
alter table app.meetings enable row level security;
alter table app.meeting_participants enable row level security;
alter table app.class_sessions enable row level security;
alter table app.class_students enable row level security;

-- ---------------------------------------------------------------- helpers

create or replace function app.hash_token(p_token text) returns text
language sql immutable
set search_path = app, extensions
as $$
  select encode(extensions.digest(convert_to(p_token, 'utf8'), 'sha256'), 'hex')
$$;

-- Resolve a session token to a user id; refresh presence. Raises on failure.
create or replace function app.uid(p_token text) returns uuid
language plpgsql volatile
set search_path = app, extensions
as $$
declare
  v_user uuid;
  v_suspended boolean;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'unauthorized';
  end if;
  select s.user_id into v_user
    from app.sessions s
    where s.token_hash = app.hash_token(p_token) and s.expires_at > now();
  if v_user is null then
    raise exception 'unauthorized';
  end if;
  select u.is_suspended into v_suspended from app.users u where u.id = v_user;
  if v_suspended then
    raise exception 'suspended';
  end if;
  update app.users set last_active_at = now() where id = v_user;
  return v_user;
end
$$;

create or replace function app.require_admin(p_token text) returns uuid
language plpgsql volatile
set search_path = app, extensions
as $$
declare
  v_user uuid := app.uid(p_token);
begin
  if not exists (select 1 from app.users where id = v_user and role = 'admin') then
    raise exception 'forbidden';
  end if;
  return v_user;
end
$$;

create or replace function app.user_json(u app.users) returns jsonb
language sql stable
set search_path = app, extensions
as $$
  select jsonb_build_object(
    'id', u.id,
    'username', u.username,
    'displayName', u.display_name,
    'avatar', u.avatar,
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
    'name', case
      when c.type = 'private' then null
      else c.name end,
    'type', c.type,
    'avatar', c.avatar,
    'isPinned', coalesce((select cm.is_pinned from app.chat_members cm
      where cm.chat_id = c.id and cm.user_id = p_viewer), false),
    'memberIds', coalesce((select jsonb_agg(cm.user_id order by cm.joined_at)
      from app.chat_members cm where cm.chat_id = c.id), '[]'::jsonb),
    'lastMessage', (select m.content from app.messages m
      where m.chat_id = c.id order by m.created_at desc limit 1),
    'lastMessageAt', (select to_jsonb(m.created_at) from app.messages m
      where m.chat_id = c.id order by m.created_at desc limit 1),
    'unreadCount', coalesce((select count(*) from app.messages m
      join app.chat_members cm on cm.chat_id = c.id and cm.user_id = p_viewer
      where m.chat_id = c.id and m.sender_id <> p_viewer
        and m.created_at > cm.last_read_at), 0)
  )
$$;

create or replace function app.meeting_json(m app.meetings) returns jsonb
language sql stable
set search_path = app, extensions
as $$
  select jsonb_build_object(
    'id', m.id,
    'title', m.title,
    'type', m.type,
    'link', m.link,
    'status', m.status,
    'hostId', m.host_id,
    'maxParticipants', m.max_participants,
    'isRecording', m.is_recording,
    'participantIds', coalesce((select jsonb_agg(mp.user_id order by mp.joined_at)
      from app.meeting_participants mp where mp.meeting_id = m.id), '[]'::jsonb),
    'startsAt', to_jsonb(m.starts_at),
    'createdAt', to_jsonb(m.created_at)
  )
$$;

create or replace function app.class_json(c app.class_sessions) returns jsonb
language sql stable
set search_path = app, extensions
as $$
  select jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'teacherId', c.teacher_id,
    'status', c.status,
    'studentIds', coalesce((select jsonb_agg(cs.user_id)
      from app.class_students cs where cs.class_id = c.id), '[]'::jsonb),
    'attendance', coalesce((select jsonb_object_agg(cs.user_id, cs.present)
      from app.class_students cs where cs.class_id = c.id), '{}'::jsonb),
    'startsAt', to_jsonb(c.starts_at)
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
      when c.status = 'ended' and c.duration is null and c.initiator_id <> p_viewer then 'missed'
      when c.initiator_id = p_viewer then 'outgoing'
      else 'incoming' end,
    'initiatorId', c.initiator_id,
    'peerId', c.peer_id,
    'duration', c.duration,
    'createdAt', to_jsonb(c.created_at)
  )
$$;

-- Issue a fresh session for a user; returns the raw token.
create or replace function app.issue_session(p_user uuid) returns text
language plpgsql volatile
set search_path = app, extensions
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  delete from app.sessions where user_id = p_user and expires_at < now();
  insert into app.sessions (token_hash, user_id) values (app.hash_token(v_token), p_user);
  return v_token;
end
$$;

-- ---------------------------------------------------------------- auth API

create or replace function public.api_signup(p_username text, p_password text, p_display_name text)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_username extensions.citext := lower(trim(p_username));
  v_display text := trim(p_display_name);
  v_user app.users;
  v_role text := 'user';
begin
  if v_username::text !~ '^[a-z0-9_]{3,32}$' then
    raise exception 'invalid_username';
  end if;
  if p_password is null or char_length(p_password) < 8 or char_length(p_password) > 128 then
    raise exception 'weak_password';
  end if;
  if v_display is null or char_length(v_display) < 1 or char_length(v_display) > 64 then
    raise exception 'invalid_display_name';
  end if;

  -- The very first account becomes the administrator.
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

  return jsonb_build_object('user', app.user_json(v_user), 'token', app.issue_session(v_user.id));
end
$$;

create or replace function public.api_login(p_username text, p_password text)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_username extensions.citext := lower(trim(p_username));
  v_user app.users;
begin
  delete from app.login_attempts where at < now() - interval '15 minutes';
  if (select count(*) from app.login_attempts where username = v_username) >= 15 then
    return jsonb_build_object('error', 'too_many_attempts');
  end if;

  select * into v_user from app.users where username = v_username;
  if v_user.id is null
     or v_user.password_hash <> extensions.crypt(coalesce(p_password, ''), v_user.password_hash) then
    -- Returned as data (not raised) so this transaction commits and the
    -- failed attempt above is actually recorded for rate limiting.
    insert into app.login_attempts (username) values (v_username);
    return jsonb_build_object('error', 'invalid_credentials');
  end if;
  if v_user.is_suspended then
    return jsonb_build_object('error', 'suspended');
  end if;

  delete from app.login_attempts where username = v_username;
  update app.users set last_active_at = now() where id = v_user.id;
  return jsonb_build_object('user', app.user_json(v_user), 'token', app.issue_session(v_user.id));
end
$$;

create or replace function public.api_logout(p_token text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
begin
  delete from app.sessions where token_hash = app.hash_token(p_token);
  return '{}'::jsonb;
end
$$;

create or replace function public.api_me(p_token text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  return jsonb_build_object('user',
    (select app.user_json(u) from app.users u where u.id = v_me));
end
$$;

create or replace function public.api_ping(p_token text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
begin
  perform app.uid(p_token);
  return '{}'::jsonb;
end
$$;

-- ---------------------------------------------------------------- users

create or replace function public.api_users(p_token text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
begin
  perform app.uid(p_token);
  return jsonb_build_object('users', coalesce(
    (select jsonb_agg(app.user_json(u) order by u.created_at) from app.users u),
    '[]'::jsonb));
end
$$;

-- ---------------------------------------------------------------- chats

create or replace function public.api_chats(p_token text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  return jsonb_build_object('chats', coalesce((
    select jsonb_agg(j order by (j->>'isPinned') desc, coalesce(j->>'lastMessageAt', '') desc)
    from (
      select app.chat_json(c, v_me) as j
      from app.chats c
      join app.chat_members cm on cm.chat_id = c.id and cm.user_id = v_me
    ) t), '[]'::jsonb));
end
$$;

create or replace function public.api_create_chat(
  p_token text, p_type text, p_name text, p_member_ids uuid[])
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_members uuid[];
  v_type text := coalesce(p_type, 'private');
  v_chat app.chats;
  v_key text;
  m uuid;
begin
  -- unique member set, always including the creator
  select array_agg(distinct x) into v_members
    from unnest(array_append(coalesce(p_member_ids, '{}'), v_me)) x;
  if array_length(v_members, 1) < 2 then
    raise exception 'bad_request';
  end if;
  if (select count(*) from app.users u where u.id = any(v_members)) <> array_length(v_members, 1) then
    raise exception 'not_found';
  end if;
  if v_type not in ('private','group','channel') then
    raise exception 'bad_request';
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
    if p_name is null or char_length(trim(p_name)) < 1 then
      raise exception 'bad_request';
    end if;
  end if;

  insert into app.chats (type, name, created_by, private_key)
  values (v_type, case when v_type = 'private' then null else trim(p_name) end, v_me, v_key)
  returning * into v_chat;

  foreach m in array v_members loop
    insert into app.chat_members (chat_id, user_id, last_read_at)
    values (v_chat.id, m, case when m = v_me then now() else 'epoch'::timestamptz end);
  end loop;

  return jsonb_build_object('chat', app.chat_json(v_chat, v_me));
end
$$;

create or replace function public.api_messages(p_token text, p_chat_id uuid, p_after timestamptz default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  if not exists (select 1 from app.chat_members
      where chat_id = p_chat_id and user_id = v_me) then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object('messages', coalesce((
    select jsonb_agg(app.message_json(m, v_me) order by m.created_at)
    from app.messages m
    where m.chat_id = p_chat_id
      and (p_after is null or m.created_at > p_after)), '[]'::jsonb));
end
$$;

create or replace function public.api_send_message(
  p_token text, p_chat_id uuid, p_content text,
  p_type text default 'text', p_reply_to uuid default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_chat app.chats;
  v_msg app.messages;
  v_content text := trim(coalesce(p_content, ''));
begin
  select * into v_chat from app.chats where id = p_chat_id;
  if v_chat.id is null then
    raise exception 'not_found';
  end if;
  if not exists (select 1 from app.chat_members
      where chat_id = p_chat_id and user_id = v_me) then
    raise exception 'forbidden';
  end if;
  if v_chat.type = 'channel' and v_chat.created_by is distinct from v_me
     and not exists (select 1 from app.users where id = v_me and role = 'admin') then
    raise exception 'forbidden';
  end if;
  if char_length(v_content) < 1 or char_length(v_content) > 4000 then
    raise exception 'bad_request';
  end if;
  if coalesce(p_type, 'text') not in ('text','image','file','voice') then
    raise exception 'bad_request';
  end if;
  if p_reply_to is not null and not exists (
      select 1 from app.messages where id = p_reply_to and chat_id = p_chat_id) then
    raise exception 'bad_request';
  end if;

  insert into app.messages (chat_id, sender_id, content, type, reply_to_id)
  values (p_chat_id, v_me, v_content, coalesce(p_type, 'text'), p_reply_to)
  returning * into v_msg;

  update app.chat_members set last_read_at = v_msg.created_at
    where chat_id = p_chat_id and user_id = v_me;

  return jsonb_build_object('message', app.message_json(v_msg, v_me));
end
$$;

create or replace function public.api_message_action(
  p_token text, p_chat_id uuid, p_message_id uuid,
  p_action text, p_emoji text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_msg app.messages;
  v_reactions jsonb;
  v_entry jsonb;
  v_users jsonb;
  v_idx int := -1;
  i int;
begin
  if not exists (select 1 from app.chat_members
      where chat_id = p_chat_id and user_id = v_me) then
    raise exception 'forbidden';
  end if;
  select * into v_msg from app.messages where id = p_message_id and chat_id = p_chat_id;
  if v_msg.id is null then
    raise exception 'not_found';
  end if;

  if p_action = 'pin' or p_action = 'unpin' then
    update app.messages set is_pinned = (p_action = 'pin')
      where id = p_message_id returning * into v_msg;

  elsif p_action = 'read' then
    update app.chat_members
      set last_read_at = greatest(last_read_at, v_msg.created_at)
      where chat_id = p_chat_id and user_id = v_me;

  elsif p_action = 'react' and p_emoji is not null and char_length(p_emoji) <= 16 then
    v_reactions := v_msg.reactions;
    for i in 0 .. coalesce(jsonb_array_length(v_reactions), 0) - 1 loop
      if v_reactions->i->>'emoji' = p_emoji then
        v_idx := i;
      end if;
    end loop;
    if v_idx = -1 then
      v_reactions := v_reactions || jsonb_build_array(
        jsonb_build_object('emoji', p_emoji, 'userIds', jsonb_build_array(v_me)));
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
    update app.messages set reactions = v_reactions
      where id = p_message_id returning * into v_msg;

  else
    raise exception 'bad_request';
  end if;

  return jsonb_build_object('message', app.message_json(v_msg, v_me));
end
$$;

create or replace function public.api_mark_read(p_token text, p_chat_id uuid) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  update app.chat_members set last_read_at = now()
    where chat_id = p_chat_id and user_id = v_me;
  return '{}'::jsonb;
end
$$;

create or replace function public.api_pin_chat(p_token text, p_chat_id uuid, p_pinned boolean)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  update app.chat_members set is_pinned = coalesce(p_pinned, false)
    where chat_id = p_chat_id and user_id = v_me;
  return '{}'::jsonb;
end
$$;

-- ---------------------------------------------------------------- calls

create or replace function public.api_calls(p_token text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  return jsonb_build_object('calls', coalesce((
    select jsonb_agg(app.call_json(c, v_me) order by c.created_at desc)
    from app.calls c
    where c.initiator_id = v_me or c.peer_id = v_me), '[]'::jsonb));
end
$$;

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
  insert into app.calls (type, status, initiator_id, peer_id)
  values (case when p_type = 'video' then 'video' else 'audio' end, 'active', v_me, p_peer_id)
  returning * into v_call;
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
  update app.calls
    set status = 'ended', duration = greatest(coalesce(p_duration, 0), 0)
    where id = p_call_id and (initiator_id = v_me or peer_id = v_me)
    returning * into v_call;
  if v_call.id is null then
    raise exception 'not_found';
  end if;
  return jsonb_build_object('call', app.call_json(v_call, v_me));
end
$$;

-- ---------------------------------------------------------------- meetings

create or replace function public.api_meetings(p_token text, p_type text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
begin
  perform app.uid(p_token);
  return jsonb_build_object('meetings', coalesce((
    select jsonb_agg(app.meeting_json(m) order by m.starts_at desc)
    from app.meetings m
    where p_type is null or m.type = p_type), '[]'::jsonb));
end
$$;

create or replace function public.api_meeting_create(
  p_token text, p_title text, p_type text default 'meeting', p_max_participants integer default 100)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_meeting app.meetings;
  v_title text := trim(coalesce(p_title, ''));
begin
  if char_length(v_title) < 1 or char_length(v_title) > 120 then
    raise exception 'bad_request';
  end if;
  if coalesce(p_type, 'meeting') not in ('meeting','conference','class') then
    raise exception 'bad_request';
  end if;
  insert into app.meetings (title, type, link, host_id, max_participants)
  values (v_title, coalesce(p_type, 'meeting'),
    'meet-' || substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10),
    v_me, least(greatest(coalesce(p_max_participants, 100), 2), 1000))
  returning * into v_meeting;
  insert into app.meeting_participants (meeting_id, user_id) values (v_meeting.id, v_me);
  return jsonb_build_object('meeting', app.meeting_json(v_meeting));
end
$$;

create or replace function public.api_meeting_get(p_token text, p_id_or_link text)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_meeting app.meetings;
begin
  perform app.uid(p_token);
  -- `case` guarantees the uuid cast only runs when the shape matches.
  select * into v_meeting from app.meetings
    where link = p_id_or_link
       or id = (case when p_id_or_link ~ '^[0-9a-f-]{36}$'
                     then p_id_or_link::uuid end)
    limit 1;
  if v_meeting.id is null then
    raise exception 'not_found';
  end if;
  return jsonb_build_object('meeting', app.meeting_json(v_meeting));
end
$$;

create or replace function public.api_meeting_action(p_token text, p_id_or_link text, p_action text)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_meeting app.meetings;
  v_count integer;
begin
  select * into v_meeting from app.meetings
    where link = p_id_or_link
       or id = (case when p_id_or_link ~ '^[0-9a-f-]{36}$'
                     then p_id_or_link::uuid end)
    limit 1;
  if v_meeting.id is null then
    raise exception 'not_found';
  end if;

  if p_action = 'join' then
    if v_meeting.status = 'ended' then
      raise exception 'bad_request';
    end if;
    select count(*) into v_count from app.meeting_participants where meeting_id = v_meeting.id;
    if v_count >= v_meeting.max_participants then
      raise exception 'meeting_full';
    end if;
    insert into app.meeting_participants (meeting_id, user_id)
      values (v_meeting.id, v_me) on conflict do nothing;
    if v_meeting.status = 'scheduled' then
      update app.meetings set status = 'active' where id = v_meeting.id;
    end if;
  elsif p_action = 'leave' then
    delete from app.meeting_participants where meeting_id = v_meeting.id and user_id = v_me;
  elsif p_action in ('start-recording','stop-recording','end') then
    if v_meeting.host_id <> v_me
       and not exists (select 1 from app.users where id = v_me and role = 'admin') then
      raise exception 'forbidden';
    end if;
    if p_action = 'start-recording' then
      update app.meetings set is_recording = true where id = v_meeting.id;
    elsif p_action = 'stop-recording' then
      update app.meetings set is_recording = false where id = v_meeting.id;
    else
      update app.meetings set status = 'ended', is_recording = false where id = v_meeting.id;
    end if;
  else
    raise exception 'bad_request';
  end if;

  select * into v_meeting from app.meetings where id = v_meeting.id;
  return jsonb_build_object('meeting', app.meeting_json(v_meeting));
end
$$;

-- ---------------------------------------------------------------- classes

create or replace function public.api_classes(p_token text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
begin
  perform app.uid(p_token);
  return jsonb_build_object('classes', coalesce((
    select jsonb_agg(app.class_json(c) order by c.starts_at desc)
    from app.class_sessions c), '[]'::jsonb));
end
$$;

create or replace function public.api_class_create(p_token text, p_title text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_class app.class_sessions;
  v_title text := trim(coalesce(p_title, ''));
begin
  if char_length(v_title) < 1 or char_length(v_title) > 120 then
    raise exception 'bad_request';
  end if;
  insert into app.class_sessions (title, teacher_id) values (v_title, v_me)
  returning * into v_class;
  return jsonb_build_object('class', app.class_json(v_class));
end
$$;

create or replace function public.api_class_action(
  p_token text, p_class_id uuid, p_action text,
  p_user_id uuid default null, p_present boolean default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_class app.class_sessions;
  v_is_teacher boolean;
begin
  select * into v_class from app.class_sessions where id = p_class_id;
  if v_class.id is null then
    raise exception 'not_found';
  end if;
  v_is_teacher := v_class.teacher_id = v_me
    or exists (select 1 from app.users where id = v_me and role = 'admin');

  if p_action = 'join' then
    if v_class.status = 'ended' then
      raise exception 'bad_request';
    end if;
    if v_me <> v_class.teacher_id then
      insert into app.class_students (class_id, user_id, present)
        values (p_class_id, v_me, true)
        on conflict (class_id, user_id) do update set present = true;
    end if;
    if v_class.status = 'scheduled' then
      update app.class_sessions set status = 'active' where id = p_class_id;
    end if;
  elsif p_action = 'leave' then
    update app.class_students set present = false
      where class_id = p_class_id and user_id = v_me;
  elsif p_action = 'attendance' then
    if not v_is_teacher then
      raise exception 'forbidden';
    end if;
    update app.class_students set present = coalesce(p_present, false)
      where class_id = p_class_id and user_id = p_user_id;
  elsif p_action = 'end' then
    if not v_is_teacher then
      raise exception 'forbidden';
    end if;
    update app.class_sessions set status = 'ended' where id = p_class_id;
  else
    raise exception 'bad_request';
  end if;

  select * into v_class from app.class_sessions where id = p_class_id;
  return jsonb_build_object('class', app.class_json(v_class));
end
$$;

-- ---------------------------------------------------------------- admin

create or replace function public.api_admin_stats(p_token text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_week jsonb;
begin
  perform app.require_admin(p_token);

  -- Saturday-first Iranian week; last 7 days of real activity.
  select jsonb_agg(jsonb_build_object(
      'day', d.key,
      'messages', coalesce((select count(*) from app.messages m
        where m.created_at >= now() - interval '7 days'
          and extract(dow from m.created_at) = d.dow), 0),
      'meetings', coalesce((select count(*) from app.meetings mt
        where mt.created_at >= now() - interval '7 days'
          and extract(dow from mt.created_at) = d.dow), 0),
      'calls', coalesce((select count(*) from app.calls c
        where c.created_at >= now() - interval '7 days'
          and extract(dow from c.created_at) = d.dow), 0)
    ) order by d.ord)
  into v_week
  from (values ('sat', 6, 1), ('sun', 0, 2), ('mon', 1, 3), ('tue', 2, 4),
               ('wed', 3, 5), ('thu', 4, 6), ('fri', 5, 7)) as d(key, dow, ord);

  return jsonb_build_object('stats', jsonb_build_object(
    'totalUsers', (select count(*) from app.users),
    'activeUsers', (select count(*) from app.users
      where not is_suspended and last_active_at > now() - interval '90 seconds'),
    'totalChats', (select count(*) from app.chats),
    'totalMeetings', (select count(*) from app.meetings),
    'activeCalls', (select count(*) from app.calls where status = 'active'),
    'totalMessages', (select count(*) from app.messages),
    'weeklyActivity', v_week,
    'roleDistribution', coalesce((select jsonb_agg(jsonb_build_object('role', role, 'count', n))
      from (select role, count(*) as n from app.users group by role) r), '[]'::jsonb)
  ));
end
$$;

create or replace function public.api_admin_user_action(
  p_token text, p_user_id uuid, p_action text, p_role text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_admin uuid := app.require_admin(p_token);
  v_user app.users;
begin
  select * into v_user from app.users where id = p_user_id;
  if v_user.id is null then
    raise exception 'not_found';
  end if;
  if p_user_id = v_admin and p_action in ('suspend','set-role') then
    raise exception 'bad_request'; -- an admin cannot lock themselves out
  end if;

  if p_action = 'suspend' then
    update app.users set is_suspended = true where id = p_user_id;
    delete from app.sessions where user_id = p_user_id;
  elsif p_action = 'activate' then
    update app.users set is_suspended = false where id = p_user_id;
  elsif p_action = 'set-role' and p_role in ('user','teacher','host','admin') then
    update app.users set role = p_role where id = p_user_id;
  else
    raise exception 'bad_request';
  end if;

  select * into v_user from app.users where id = p_user_id;
  return jsonb_build_object('user', app.user_json(v_user));
end
$$;

create or replace function public.api_admin_export(p_token text, p_kind text) returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
begin
  perform app.require_admin(p_token);
  if p_kind = 'meetings' then
    return jsonb_build_object('rows', coalesce((select jsonb_agg(
      jsonb_build_array(m.title, m.type, m.status, m.link,
        (select count(*) from app.meeting_participants mp where mp.meeting_id = m.id)::text,
        m.max_participants::text, m.is_recording::text, m.starts_at::text)
      order by m.starts_at desc) from app.meetings m), '[]'::jsonb),
      'header', jsonb_build_array('title', 'type', 'status', 'link',
        'participants', 'maxParticipants', 'isRecording', 'startsAt'));
  elsif p_kind = 'classes' then
    return jsonb_build_object('rows', coalesce((select jsonb_agg(
      jsonb_build_array(c.title,
        (select u.username::text from app.users u where u.id = c.teacher_id),
        c.status,
        (select count(*) from app.class_students cs where cs.class_id = c.id)::text,
        c.starts_at::text)
      order by c.starts_at desc) from app.class_sessions c), '[]'::jsonb),
      'header', jsonb_build_array('title', 'teacher', 'status', 'students', 'startsAt'));
  else
    return jsonb_build_object('rows', coalesce((select jsonb_agg(
      jsonb_build_array(u.username::text, u.display_name, u.role,
        case when u.is_suspended then 'suspended'
             when u.last_active_at > now() - interval '90 seconds' then 'online'
             else 'offline' end,
        (u.last_active_at > now() - interval '90 seconds')::text,
        u.last_active_at::text, coalesce(u.country, ''))
      order by u.created_at) from app.users u), '[]'::jsonb),
      'header', jsonb_build_array('username', 'displayName', 'role', 'status',
        'isOnline', 'lastSeen', 'country'));
  end if;
end
$$;
