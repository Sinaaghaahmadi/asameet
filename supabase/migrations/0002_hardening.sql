-- Hardening pass after the adversarial review of v1.1.0:
--  * login rate limit is now keyed per (username, client) so a stranger
--    cannot lock a victim out, and a missing user costs a bcrypt hash too
--    (no timing oracle for username enumeration)
--  * NULL/empty inputs return stable error codes instead of raw constraint
--    violations
--  * private-chat dedup and meeting capacity survive concurrent requests
--  * reaction toggling locks the message row (no lost updates), rejects
--    empty emoji and caps distinct reactions per message
--  * channel messages: only the owner/admin may pin or unpin
--  * class creation requires the teacher/host/admin role (matches the UI)
--  * strict uuid shape before casting meeting ids
--  * calls that ended with no talk time count as missed for the callee

alter table app.login_attempts add column if not exists client text not null default '';
drop index if exists app.login_attempts_idx;
create index if not exists login_attempts_client_idx on app.login_attempts(username, client, at);

create or replace function public.api_signup(p_username text, p_password text, p_display_name text)
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
  if v_username::text is null or v_username::text !~ '^[a-z0-9_]{3,32}$' then
    raise exception 'invalid_username';
  end if;
  if p_password is null or char_length(p_password) < 8 or char_length(p_password) > 128 then
    raise exception 'weak_password';
  end if;
  if char_length(v_display) < 1 or char_length(v_display) > 64 then
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

drop function if exists public.api_login(text, text);

create or replace function public.api_login(p_username text, p_password text, p_client text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_username extensions.citext := lower(trim(coalesce(p_username, '')));
  v_client text := left(coalesce(p_client, ''), 64);
  v_user app.users;
begin
  if char_length(v_username::text) = 0 then
    return jsonb_build_object('error', 'invalid_credentials');
  end if;

  delete from app.login_attempts where at < now() - interval '15 minutes';
  if (select count(*) from app.login_attempts
      where username = v_username and client = v_client) >= 15 then
    return jsonb_build_object('error', 'too_many_attempts');
  end if;

  select * into v_user from app.users where username = v_username;
  if v_user.id is null then
    -- Unknown user costs the same bcrypt work as a wrong password, so
    -- response timing does not reveal whether the username exists.
    perform extensions.crypt(coalesce(p_password, ''), extensions.gen_salt('bf', 10));
    insert into app.login_attempts (username, client) values (v_username, v_client);
    return jsonb_build_object('error', 'invalid_credentials');
  end if;
  if v_user.password_hash <> extensions.crypt(coalesce(p_password, ''), v_user.password_hash) then
    -- Returned as data (not raised) so this transaction commits and the
    -- failed attempt is actually recorded for rate limiting.
    insert into app.login_attempts (username, client) values (v_username, v_client);
    return jsonb_build_object('error', 'invalid_credentials');
  end if;
  if v_user.is_suspended then
    return jsonb_build_object('error', 'suspended');
  end if;

  delete from app.login_attempts where username = v_username and client = v_client;
  update app.users set last_active_at = now() where id = v_user.id;
  return jsonb_build_object('user', app.user_json(v_user), 'token', app.issue_session(v_user.id));
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
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_chat app.chats;
  v_key text;
  m uuid;
begin
  -- unique member set, always including the creator
  select array_agg(distinct x) into v_members
    from unnest(array_append(coalesce(p_member_ids, '{}'), v_me)) x;
  if array_length(v_members, 1) < 2 or array_length(v_members, 1) > 200 then
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
    if v_name is null or char_length(v_name) > 80 then
      raise exception 'bad_request';
    end if;
  end if;

  begin
    insert into app.chats (type, name, created_by, private_key)
    values (v_type, case when v_type = 'private' then null else v_name end, v_me, v_key)
    returning * into v_chat;
  exception when unique_violation then
    -- Two people opened the same private chat at once — return the winner.
    select * into v_chat from app.chats where private_key = v_key;
    return jsonb_build_object('chat', app.chat_json(v_chat, v_me));
  end;

  foreach m in array v_members loop
    insert into app.chat_members (chat_id, user_id, last_read_at)
    values (v_chat.id, m, case when m = v_me then now() else 'epoch'::timestamptz end);
  end loop;

  return jsonb_build_object('chat', app.chat_json(v_chat, v_me));
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
  v_chat app.chats;
  v_msg app.messages;
  v_emoji text := trim(coalesce(p_emoji, ''));
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
  -- Row lock: concurrent reactions/pins must not overwrite each other.
  select * into v_msg from app.messages
    where id = p_message_id and chat_id = p_chat_id
    for update;
  if v_msg.id is null then
    raise exception 'not_found';
  end if;

  if p_action = 'pin' or p_action = 'unpin' then
    select * into v_chat from app.chats where id = p_chat_id;
    if v_chat.type = 'channel' and v_chat.created_by is distinct from v_me
       and not exists (select 1 from app.users where id = v_me and role = 'admin') then
      raise exception 'forbidden';
    end if;
    update app.messages set is_pinned = (p_action = 'pin')
      where id = p_message_id returning * into v_msg;

  elsif p_action = 'read' then
    update app.chat_members
      set last_read_at = greatest(last_read_at, v_msg.created_at)
      where chat_id = p_chat_id and user_id = v_me;

  elsif p_action = 'react' then
    if char_length(v_emoji) < 1 or char_length(v_emoji) > 16 then
      raise exception 'bad_request';
    end if;
    v_reactions := v_msg.reactions;
    for i in 0 .. coalesce(jsonb_array_length(v_reactions), 0) - 1 loop
      if v_reactions->i->>'emoji' = v_emoji then
        v_idx := i;
      end if;
    end loop;
    if v_idx = -1 then
      if coalesce(jsonb_array_length(v_reactions), 0) >= 24 then
        raise exception 'bad_request';
      end if;
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
    update app.messages set reactions = v_reactions
      where id = p_message_id returning * into v_msg;

  else
    raise exception 'bad_request';
  end if;

  return jsonb_build_object('message', app.message_json(v_msg, v_me));
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
  select * into v_meeting from app.meetings
    where link = p_id_or_link
       or id = (case when p_id_or_link ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
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
  -- Locked so a concurrent join cannot slip past the capacity check.
  select * into v_meeting from app.meetings
    where link = p_id_or_link
       or id = (case when p_id_or_link ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                     then p_id_or_link::uuid end)
    limit 1
    for update;
  if v_meeting.id is null then
    raise exception 'not_found';
  end if;

  if p_action = 'join' then
    if v_meeting.status = 'ended' then
      raise exception 'bad_request';
    end if;
    select count(*) into v_count from app.meeting_participants where meeting_id = v_meeting.id;
    if v_count >= v_meeting.max_participants
       and not exists (select 1 from app.meeting_participants
                       where meeting_id = v_meeting.id and user_id = v_me) then
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
    -- Zero talk time stays NULL so call_json renders it as a missed call.
    set status = 'ended',
        duration = case when coalesce(p_duration, 0) <= 0 then null
                        else least(p_duration, 60 * 60 * 24) end
    where id = p_call_id and (initiator_id = v_me or peer_id = v_me)
    returning * into v_call;
  if v_call.id is null then
    raise exception 'not_found';
  end if;
  return jsonb_build_object('call', app.call_json(v_call, v_me));
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
  -- The UI offers class creation to teachers/admins; enforce it server-side.
  if not exists (select 1 from app.users
      where id = v_me and role in ('teacher', 'host', 'admin')) then
    raise exception 'forbidden';
  end if;
  if char_length(v_title) < 1 or char_length(v_title) > 120 then
    raise exception 'bad_request';
  end if;
  insert into app.class_sessions (title, teacher_id) values (v_title, v_me)
  returning * into v_class;
  return jsonb_build_object('class', app.class_json(v_class));
end
$$;
