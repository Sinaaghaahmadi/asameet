-- Asatalk 0006 — QR sign-in, explicit presence, group calls, web push.
--
-- PostgREST resolves overloads by parameter name, so every function whose
-- signature grows here drops its old shape first.

set search_path = app, extensions, public;

-- ================================================================ QR sign-in
--
-- A desktop shows a QR encoding a short-lived ticket code. A phone that is
-- already signed in scans it and approves; the approval mints a *new* session
-- for that account and parks its token on the ticket. The desktop polls, picks
-- the token up exactly once, and the ticket is destroyed.

create table if not exists app.login_tickets (
  code text primary key,
  client text not null default '',
  user_agent text not null default '',
  user_id uuid references app.users(id) on delete cascade,
  session_token text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'claimed', 'rejected')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 minutes'
);
create index if not exists login_tickets_expiry_idx on app.login_tickets(expires_at);
alter table app.login_tickets enable row level security;

-- Ticket for a signed-out device. `p_client` binds the poll to the browser
-- that asked, so a stolen code cannot be redeemed elsewhere.
create or replace function public.api_qr_create(p_client text, p_user_agent text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_code text := encode(extensions.gen_random_bytes(16), 'hex');
begin
  delete from app.login_tickets where expires_at < now() - interval '10 minutes';
  if (select count(*) from app.login_tickets
      where client = coalesce(p_client, '') and created_at > now() - interval '1 minute') > 10 then
    raise exception 'too_many_attempts';
  end if;
  insert into app.login_tickets (code, client, user_agent)
  values (v_code, coalesce(p_client, ''), left(coalesce(p_user_agent, ''), 200));
  return jsonb_build_object('code', v_code, 'ttl', 180);
end
$$;

-- What the scanning phone is about to authorise (shown before it confirms).
create or replace function public.api_qr_peek(p_token text, p_code text)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_ticket app.login_tickets;
begin
  select * into v_ticket from app.login_tickets
    where code = p_code and expires_at > now() and status = 'pending';
  if v_ticket.code is null then raise exception 'not_found'; end if;
  return jsonb_build_object('userAgent', v_ticket.user_agent,
    'createdAt', to_jsonb(v_ticket.created_at));
end
$$;

-- Approve (or reject) from a signed-in device.
create or replace function public.api_qr_approve(
  p_token text, p_code text, p_action text default 'approve')
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_ticket app.login_tickets;
  v_new text;
begin
  select * into v_ticket from app.login_tickets
    where code = p_code and expires_at > now() and status = 'pending' for update;
  if v_ticket.code is null then raise exception 'not_found'; end if;
  if p_action = 'reject' then
    update app.login_tickets set status = 'rejected' where code = p_code;
    return jsonb_build_object('status', 'rejected');
  end if;
  v_new := app.issue_session(v_me, v_ticket.user_agent);
  update app.login_tickets
    set status = 'approved', user_id = v_me, session_token = v_new
    where code = p_code;
  return jsonb_build_object('status', 'approved');
end
$$;

-- Desktop poll. The token leaves the database once and the ticket is spent.
create or replace function public.api_qr_poll(p_code text, p_client text)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_ticket app.login_tickets;
  v_user app.users;
begin
  select * into v_ticket from app.login_tickets
    where code = p_code and client = coalesce(p_client, '') for update;
  if v_ticket.code is null or v_ticket.expires_at < now() then
    return jsonb_build_object('status', 'expired');
  end if;
  if v_ticket.status = 'rejected' then
    delete from app.login_tickets where code = p_code;
    return jsonb_build_object('status', 'rejected');
  end if;
  if v_ticket.status <> 'approved' then
    return jsonb_build_object('status', 'pending');
  end if;
  select * into v_user from app.users where id = v_ticket.user_id;
  delete from app.login_tickets where code = p_code;
  if v_user.id is null then return jsonb_build_object('status', 'expired'); end if;
  update app.users set last_active_at = now() where id = v_user.id;
  return jsonb_build_object('status', 'approved',
    'user', app.user_json(v_user), 'token', v_ticket.session_token);
end
$$;

-- ================================================================ presence
--
-- Until now "online" meant "made any API call in the last 90 s", so a
-- background tab that only polls chats looked online forever and closing the
-- app took a minute and a half to show. Presence is now an explicit heartbeat
-- with a short lease: the client renews it while the page is visible and
-- releases it on hide/close, while `last_active_at` keeps meaning "last seen".

alter table app.users add column if not exists presence_until timestamptz;

create or replace function public.api_presence(p_token text, p_state text default 'online')
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  if p_state = 'offline' then
    -- Release the lease immediately; "last seen" stays truthful at now().
    update app.users set presence_until = now() - interval '1 second',
                         last_active_at = now()
      where id = v_me;
  else
    update app.users set presence_until = now() + interval '50 seconds',
                         last_active_at = now()
      where id = v_me;
  end if;
  return jsonb_build_object('ok', true);
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
    'bio', u.bio,
    'phone', u.phone,
    'email', u.email,
    'note', case when u.note_at > now() - interval '24 hours' then u.note else null end,
    'noteAt', case when u.note_at > now() - interval '24 hours' then to_jsonb(u.note_at) else null end,
    'hasPassword', u.password_hash is not null,
    'role', u.role,
    'status', case
      when u.is_suspended then 'offline'
      when u.presence_until > now() then 'online'
      else 'offline' end,
    'isOnline', (not u.is_suspended) and u.presence_until > now(),
    'isSuspended', u.is_suspended,
    'lastSeen', to_jsonb(greatest(u.last_active_at,
      coalesce(u.presence_until - interval '50 seconds', u.last_active_at))),
    'country', u.country
  )
$$;

-- ================================================================ group calls
--
-- A group call is one `calls` row bound to a chat with a participant roster;
-- media is a mesh, so signalling gains a recipient and the mailbox is filtered
-- per peer.

alter table app.calls add column if not exists chat_id uuid references app.chats(id) on delete cascade;
alter table app.calls alter column peer_id drop not null;
create index if not exists calls_chat_idx on app.calls(chat_id, created_at desc);

alter table app.call_signals add column if not exists target_id uuid references app.users(id) on delete cascade;
create index if not exists call_signals_target_idx on app.call_signals(call_id, target_id, id);

create table if not exists app.call_participants (
  call_id uuid not null references app.calls(id) on delete cascade,
  user_id uuid not null references app.users(id) on delete cascade,
  state text not null default 'ringing'
    check (state in ('ringing', 'joined', 'left', 'declined')),
  muted boolean not null default false,
  camera boolean not null default false,
  joined_at timestamptz,
  seen_at timestamptz not null default now(),
  primary key (call_id, user_id)
);
create index if not exists call_participants_user_idx on app.call_participants(user_id, state);
alter table app.call_participants enable row level security;

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
    'chatId', c.chat_id,
    'duration', c.duration,
    'createdAt', to_jsonb(c.created_at),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', p.user_id, 'state', p.state,
        'muted', p.muted, 'camera', p.camera) order by p.joined_at nulls last)
      from app.call_participants p
      where p.call_id = c.id and p.state in ('ringing', 'joined')
        and p.seen_at > now() - interval '45 seconds'), '[]'::jsonb)
  )
$$;

/* Anybody in the call: the 1:1 pair, or a live participant of a group call. */
create or replace function app.in_call(p_call app.calls, p_user uuid) returns boolean
language sql stable
set search_path = app, extensions
as $$
  select p_call.initiator_id = p_user
      or p_call.peer_id = p_user
      or (p_call.chat_id is not null
          and exists (select 1 from app.chat_members m
                      where m.chat_id = p_call.chat_id and m.user_id = p_user))
$$;

drop function if exists public.api_call_start(text, text, uuid);

create or replace function public.api_call_start(
  p_token text, p_type text, p_peer_id uuid default null, p_chat_id uuid default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_call app.calls;
begin
  update app.calls set status = 'ended'
    where status = 'ringing' and chat_id is null and created_at < now() - interval '60 seconds';
  update app.calls set status = 'ended'
    where status = 'active' and answered_at < now() - interval '12 hours';

  if p_chat_id is not null then
    if app.member_role(p_chat_id, v_me) is null then raise exception 'forbidden'; end if;
    -- Joining a call that is already up is the same button.
    select * into v_call from app.calls
      where chat_id = p_chat_id and status in ('ringing', 'active')
        and created_at > now() - interval '12 hours'
      order by created_at desc limit 1;
    if v_call.id is null then
      insert into app.calls (type, status, initiator_id, peer_id, chat_id, answered_at)
      values (case when p_type = 'video' then 'video' else 'audio' end,
              'active', v_me, null, p_chat_id, now())
      returning * into v_call;
      -- Everyone else in the chat starts ringing.
      insert into app.call_participants (call_id, user_id, state, camera)
        select v_call.id, m.user_id, 'ringing', false
          from app.chat_members m where m.chat_id = p_chat_id and m.user_id <> v_me;
    end if;
    insert into app.call_participants (call_id, user_id, state, joined_at, camera)
    values (v_call.id, v_me, 'joined', now(), p_type = 'video')
    on conflict (call_id, user_id) do update
      set state = 'joined', joined_at = coalesce(call_participants.joined_at, now()),
          seen_at = now();
    return jsonb_build_object('call', app.call_json(v_call, v_me));
  end if;

  if p_peer_id is null or p_peer_id = v_me
     or not exists (select 1 from app.users where id = p_peer_id) then
    raise exception 'bad_request';
  end if;
  if app.is_blocked(p_peer_id, v_me) or app.is_blocked(v_me, p_peer_id) then
    raise exception 'forbidden';
  end if;
  insert into app.calls (type, status, initiator_id, peer_id)
  values (case when p_type = 'video' then 'video' else 'audio' end, 'ringing', v_me, p_peer_id)
  returning * into v_call;
  return jsonb_build_object('call', app.call_json(v_call, v_me));
end
$$;

/* Roster heartbeat + local mute/camera state, folded into the poll. */
create or replace function public.api_call_presence(
  p_token text, p_call_id uuid, p_muted boolean default null, p_camera boolean default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  update app.call_participants
    set seen_at = now(),
        muted = coalesce(p_muted, muted),
        camera = coalesce(p_camera, camera)
    where call_id = p_call_id and user_id = v_me;
  return jsonb_build_object('ok', true);
end
$$;

create or replace function public.api_call_leave(p_token text, p_call_id uuid)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_call app.calls;
begin
  select * into v_call from app.calls where id = p_call_id for update;
  if v_call.id is null then raise exception 'not_found'; end if;
  update app.call_participants set state = 'left', seen_at = now()
    where call_id = p_call_id and user_id = v_me;
  delete from app.call_signals where call_id = p_call_id and (sender_id = v_me or target_id = v_me);
  -- The last one out closes the call.
  if not exists (select 1 from app.call_participants
                 where call_id = p_call_id and state = 'joined'
                   and seen_at > now() - interval '45 seconds') then
    update app.calls set status = 'ended',
      duration = case when v_call.answered_at is null then null
        else greatest(1, extract(epoch from now() - v_call.answered_at)::int) end
      where id = p_call_id and status <> 'ended' returning * into v_call;
    delete from app.call_signals where call_id = p_call_id;
  end if;
  select * into v_call from app.calls where id = p_call_id;
  return jsonb_build_object('call', app.call_json(v_call, v_me));
end
$$;

create or replace function public.api_call_decline_group(p_token text, p_call_id uuid)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  update app.call_participants set state = 'declined', seen_at = now()
    where call_id = p_call_id and user_id = v_me;
  return jsonb_build_object('ok', true);
end
$$;

drop function if exists public.api_call_signal(text, uuid, jsonb);

create or replace function public.api_call_signal(
  p_token text, p_call_id uuid, p_payload jsonb, p_to uuid default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_call app.calls;
begin
  select * into v_call from app.calls where id = p_call_id;
  if v_call.id is null or not app.in_call(v_call, v_me) then raise exception 'not_found'; end if;
  if v_call.status = 'ended' then raise exception 'not_found'; end if;
  delete from app.call_signals where created_at < now() - interval '10 minutes';
  insert into app.call_signals (call_id, sender_id, payload, target_id)
  values (p_call_id, v_me, p_payload, p_to);
  return jsonb_build_object('ok', true);
end
$$;

drop function if exists public.api_call_poll(text, uuid, bigint);

create or replace function public.api_call_poll(
  p_token text, p_call_id uuid, p_after bigint default 0)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_call app.calls;
begin
  select * into v_call from app.calls where id = p_call_id;
  if v_call.id is null or not app.in_call(v_call, v_me) then raise exception 'not_found'; end if;
  if v_call.chat_id is null and v_call.status = 'ringing'
     and v_call.created_at < now() - interval '60 seconds' then
    update app.calls set status = 'ended' where id = p_call_id returning * into v_call;
  end if;
  update app.call_participants set seen_at = now()
    where call_id = p_call_id and user_id = v_me and state = 'joined';
  return jsonb_build_object(
    'call', app.call_json(v_call, v_me),
    'signals', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'from', s.sender_id, 'payload', s.payload)
             order by s.id)
      from app.call_signals s
      where s.call_id = p_call_id and s.sender_id <> v_me
        and (s.target_id is null or s.target_id = v_me)
        and s.id > coalesce(p_after, 0)), '[]'::jsonb));
end
$$;

/* Incoming: a 1:1 ring, or a live group call in one of my chats. */
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
  if v_call.id is null then
    select c.* into v_call from app.calls c
      join app.call_participants p on p.call_id = c.id and p.user_id = v_me
      where c.chat_id is not null and c.status = 'active'
        and p.state = 'ringing'
        and c.created_at > now() - interval '30 minutes'
        and exists (select 1 from app.call_participants q
                    where q.call_id = c.id and q.state = 'joined'
                      and q.seen_at > now() - interval '45 seconds')
      order by c.created_at desc limit 1;
  end if;
  return jsonb_build_object('call',
    case when v_call.id is null then null else app.call_json(v_call, v_me) end);
end
$$;

drop function if exists public.api_call_end(text, uuid, integer);

create or replace function public.api_call_end(p_token text, p_call_id uuid, p_duration integer)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_call app.calls;
begin
  select * into v_call from app.calls where id = p_call_id for update;
  if v_call.id is null or not app.in_call(v_call, v_me) then raise exception 'not_found'; end if;
  if v_call.chat_id is not null then
    return public.api_call_leave(p_token, p_call_id);
  end if;
  if v_call.status in ('ended','declined') then
    return jsonb_build_object('call', app.call_json(v_call, v_me));
  end if;
  update app.calls
    set status = 'ended',
        duration = case
          when v_call.answered_at is null then null
          else greatest(1, least(coalesce(nullif(p_duration, 0),
            extract(epoch from now() - v_call.answered_at)::int), 60 * 60 * 24)) end
    where id = p_call_id returning * into v_call;
  delete from app.call_signals where call_id = p_call_id;
  return jsonb_build_object('call', app.call_json(v_call, v_me));
end
$$;

-- The 1:1 answer path has to tolerate the widened membership check too.
create or replace function public.api_call_answer(p_token text, p_call_id uuid, p_action text)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_call app.calls;
begin
  select * into v_call from app.calls where id = p_call_id for update;
  if v_call.id is null or not app.in_call(v_call, v_me) then raise exception 'not_found'; end if;
  if v_call.chat_id is not null then
    if p_action = 'accept' then
      insert into app.call_participants (call_id, user_id, state, joined_at)
      values (p_call_id, v_me, 'joined', now())
      on conflict (call_id, user_id) do update
        set state = 'joined', joined_at = coalesce(call_participants.joined_at, now()),
            seen_at = now();
    else
      perform public.api_call_decline_group(p_token, p_call_id);
    end if;
    return jsonb_build_object('call', app.call_json(v_call, v_me));
  end if;
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

-- ================================================================ web push
--
-- Endpoints are useless without our VAPID private key (push services verify
-- the signature), so handing them to the app server over an authenticated RPC
-- does not hand anyone the ability to push.

create table if not exists app.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references app.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  seen_at timestamptz not null default now()
);
create index if not exists push_subs_user_idx on app.push_subscriptions(user_id);
alter table app.push_subscriptions enable row level security;

create or replace function public.api_push_subscribe(
  p_token text, p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  if p_endpoint is null or p_p256dh is null or p_auth is null then
    raise exception 'bad_request';
  end if;
  insert into app.push_subscriptions (endpoint, user_id, p256dh, auth, user_agent)
  values (p_endpoint, v_me, p_p256dh, p_auth, left(coalesce(p_user_agent, ''), 200))
  on conflict (endpoint) do update
    set user_id = v_me, p256dh = excluded.p256dh, auth = excluded.auth, seen_at = now();
  return jsonb_build_object('ok', true);
end
$$;

create or replace function public.api_push_unsubscribe(p_token text, p_endpoint text)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  delete from app.push_subscriptions where endpoint = p_endpoint and user_id = v_me;
  return jsonb_build_object('ok', true);
end
$$;

/* Push targets for a chat I am in: members who are not muted, not me, and not
   currently holding a presence lease (an open tab already notifies itself). */
create or replace function public.api_push_targets(p_token text, p_chat_id uuid)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  if app.member_role(p_chat_id, v_me) is null then raise exception 'forbidden'; end if;
  return jsonb_build_object('targets', coalesce((
    select jsonb_agg(jsonb_build_object(
      'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth, 'userId', s.user_id))
    from app.push_subscriptions s
    join app.chat_members m on m.user_id = s.user_id and m.chat_id = p_chat_id
    join app.users u on u.id = s.user_id
    where s.user_id <> v_me
      and not m.muted
      and coalesce(u.presence_until, 'epoch'::timestamptz) < now()
      and not app.is_blocked(s.user_id, v_me)), '[]'::jsonb));
end
$$;

/* Push targets for a ringing call — the callee, whatever their presence. */
create or replace function public.api_push_call_targets(p_token text, p_call_id uuid)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
  v_call app.calls;
begin
  select * into v_call from app.calls where id = p_call_id;
  if v_call.id is null or not app.in_call(v_call, v_me) then raise exception 'not_found'; end if;
  return jsonb_build_object('targets', coalesce((
    select jsonb_agg(jsonb_build_object(
      'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth, 'userId', s.user_id))
    from app.push_subscriptions s
    where s.user_id <> v_me
      and (s.user_id = v_call.peer_id
           or exists (select 1 from app.call_participants p
                      where p.call_id = v_call.id and p.user_id = s.user_id and p.state = 'ringing'))
      and not app.is_blocked(s.user_id, v_me)), '[]'::jsonb));
end
$$;

/* A dead endpoint (410/404 from the push service) is pruned by the app server. */
create or replace function public.api_push_prune(p_token text, p_endpoint text)
returns jsonb
language plpgsql volatile security definer
set search_path = app, extensions
as $$
declare
  v_me uuid := app.uid(p_token);
begin
  delete from app.push_subscriptions where endpoint = p_endpoint;
  return jsonb_build_object('ok', true);
end
$$;

grant execute on function public.api_qr_create(text, text) to anon;
grant execute on function public.api_qr_peek(text, text) to anon;
grant execute on function public.api_qr_approve(text, text, text) to anon;
grant execute on function public.api_qr_poll(text, text) to anon;
grant execute on function public.api_presence(text, text) to anon;
grant execute on function public.api_call_start(text, text, uuid, uuid) to anon;
grant execute on function public.api_call_presence(text, uuid, boolean, boolean) to anon;
grant execute on function public.api_call_leave(text, uuid) to anon;
grant execute on function public.api_call_decline_group(text, uuid) to anon;
grant execute on function public.api_call_signal(text, uuid, jsonb, uuid) to anon;
grant execute on function public.api_call_poll(text, uuid, bigint) to anon;
grant execute on function public.api_call_end(text, uuid, integer) to anon;
grant execute on function public.api_push_subscribe(text, text, text, text, text) to anon;
grant execute on function public.api_push_unsubscribe(text, text) to anon;
grant execute on function public.api_push_targets(text, uuid) to anon;
grant execute on function public.api_push_call_targets(text, uuid) to anon;
grant execute on function public.api_push_prune(text, text) to anon;
