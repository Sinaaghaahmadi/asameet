-- 0005: polls, location and contact messages (Asatalk design hand-off)
alter table app.messages drop constraint if exists messages_type_check;
alter table app.messages add constraint messages_type_check
  check (type in ('text','image','file','voice','video','video_note','sticker','call','system','poll','location','contact'));

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
  if v_type not in ('text','image','file','voice','video','video_note','sticker','poll','location','contact') then
    raise exception 'bad_request';
  end if;
  if v_type = 'text' and char_length(v_content) < 1 then raise exception 'bad_request'; end if;
  if v_type = 'poll' then
    if char_length(v_content) < 1 or jsonb_typeof(p_meta->'options') <> 'array'
       or jsonb_array_length(p_meta->'options') < 2 or jsonb_array_length(p_meta->'options') > 10 then
      raise exception 'bad_request';
    end if;
    p_meta := jsonb_build_object('options', p_meta->'options', 'multi', coalesce((p_meta->>'multi')::boolean, false), 'votes', '{}'::jsonb);
  end if;
  if v_type = 'location' and (p_meta->>'lat' is null or p_meta->>'lng' is null) then raise exception 'bad_request'; end if;
  if v_type = 'contact' and (p_meta->>'userId' is null) then raise exception 'bad_request'; end if;
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

  elsif p_action = 'vote' then
    if v_msg.type <> 'poll' then raise exception 'bad_request'; end if;
    if p_text is null or p_text !~ '^[0-9]+$' or p_text::int >= jsonb_array_length(v_msg.meta->'options') then
      raise exception 'bad_request';
    end if;
    v_users := coalesce(v_msg.meta->'votes'->(v_me::text), '[]'::jsonb);
    if coalesce((v_msg.meta->>'multi')::boolean, false) then
      if v_users @> jsonb_build_array(p_text::int) then
        v_users := coalesce((select jsonb_agg(x) from jsonb_array_elements(v_users) x where x <> to_jsonb(p_text::int)), '[]'::jsonb);
      else
        v_users := v_users || to_jsonb(p_text::int);
      end if;
    else
      v_users := case when v_users @> jsonb_build_array(p_text::int) then '[]'::jsonb else jsonb_build_array(p_text::int) end;
    end if;
    update app.messages
      set meta = jsonb_set(coalesce(meta, '{}'::jsonb) || jsonb_build_object('votes', coalesce(meta->'votes', '{}'::jsonb)), array['votes', v_me::text], v_users)
      where id = p_message_id returning * into v_msg;

  else
    raise exception 'bad_request';
  end if;
  return jsonb_build_object('message', app.message_json(v_msg, v_me));
end
$$;
