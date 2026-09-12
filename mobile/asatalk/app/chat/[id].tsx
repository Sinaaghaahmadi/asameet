/**
 * Conversation. Own messages on the right, the other side's on the left
 * regardless of UI language; long press opens the action sheet with
 * reactions, a horizontal drag replies, and the composer handles text,
 * photos and hold-to-record voice notes.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionSheetIOS, Alert, FlatList, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { mediaUrl, talkApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useChats, useInvalidate, useUsers } from "@/lib/data";
import { chatDisplayName, dayKey, dayLabel, digits, formatDuration, formatTime, hueOf, isSavedChat, lastSeenLabel, messagePreview, peerOf } from "@/lib/format";
import { t, errorText } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Chat, Message, User } from "@/lib/types";
import { useCalls } from "@/calls/provider";
import { Avatar, Empty, Header, IconBtn, Txt } from "@/ui/primitives";
import { useTheme } from "@/ui/theme";
import { toast } from "@/ui/toast";

const QUICK = ["❤️", "👍", "😂", "😮", "😢", "🔥"];
const MAX_UPLOAD = 3 * 1024 * 1024;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const th = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const { users } = useUsers();
  const { chats } = useChats();
  const inv = useInvalidate();
  const { startCall, startGroupCall } = useCalls();
  const { drafts, setDraft, settings } = useStore();
  const chat = chats.find((c) => c.id === id);
  const [text, setText] = useState(drafts[id] ?? "");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [menu, setMenu] = useState<Message | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recSec, setRecSec] = useState(0);
  const listRef = useRef<FlatList<Message>>(null);
  const typingAt = useRef(0);

  const msgQ = useQuery({ queryKey: ["messages", id], queryFn: () => talkApi.messages(id), refetchInterval: 2_500, enabled: !!id });
  const messages = useMemo(() => msgQ.data?.messages ?? [], [msgQ.data]);
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  useEffect(() => { if (chat && chat.unreadCount > 0) void talkApi.markRead(id).then(() => inv.chats()).catch(() => {}); }, [id, chat?.unreadCount, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setDraft(id, editing ? "" : text); }, [text, id, editing, setDraft]);
  useEffect(() => { if (!recording) return; const i = setInterval(() => setRecSec((s) => s + 1), 1000); return () => clearInterval(i); }, [recording]);

  const peerId = chat && me ? peerOf(chat, me.id) : null;
  const peer = peerId ? users.get(peerId) : undefined;
  const saved = chat && me ? isSavedChat(chat, me.id) : false;
  const title = chat && me ? chatDisplayName(chat, users, me.id) : "";
  const typing = chat && me ? (chat.typingUserIds ?? []).filter((u) => u !== me.id).map((u) => users.get(u)?.displayName).filter(Boolean) : [];
  const subtitle = typing.length ? t("list.typing") : chat?.type === "private" ? (saved ? "" : lastSeenLabel(peer)) : `${digits(chat?.memberIds.length ?? 0)} ${t(chat?.type === "channel" ? "chat.subscribers" : "chat.members")}`;
  const canPost = chat?.type !== "channel" || chat.myRole === "owner" || chat.myRole === "admin";
  const blocked = peerId ? (settings.blocked ?? []).includes(peerId) : false;

  const patchLocal = useCallback((m: Message) => qc.setQueryData<{ messages: Message[] }>(["messages", id], (old) => old ? { messages: old.messages.some((x) => x.id === m.id) ? old.messages.map((x) => (x.id === m.id ? m : x)) : [...old.messages, m] } : { messages: [m] }), [qc, id]);

  async function send(body: Parameters<typeof talkApi.send>[1]) {
    try {
      const { message } = await talkApi.send(id, { ...body, chatTitle: title });
      patchLocal(message); await inv.chats();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) { toast(errorText(e)); }
  }
  async function sendText() {
    const v = text.trim(); if (!v) return;
    setText("");
    if (editing) { const m = editing; setEditing(null); try { const r = await talkApi.messageAction(id, { messageId: m.id, action: "edit", text: v }); if (r.message) patchLocal(r.message); } catch (e) { toast(errorText(e)); } return; }
    const r = replyTo; setReplyTo(null);
    await send({ content: v, type: "text", replyToId: r?.id ?? null });
  }
  function onType(v: string) {
    setText(v);
    if (Date.now() - typingAt.current > 3000) { typingAt.current = Date.now(); void talkApi.typing(id).catch(() => {}); }
  }
  async function pickImage(camera: boolean) {
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.7, base64: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const isVideo = a.type === "video";
    let b64 = a.base64 ?? null;
    if (!b64) b64 = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
    if (b64.length * 0.75 > MAX_UPLOAD) return toast(t("msg.tooLarge"));
    try {
      const { id: mediaId } = await talkApi.uploadMedia(id, a.mimeType ?? (isVideo ? "video/mp4" : "image/jpeg"), b64);
      await send({ content: "", type: isVideo ? "video" : "image", mediaId, meta: { width: a.width, height: a.height }, replyToId: replyTo?.id ?? null });
      setReplyTo(null);
    } catch (e) { toast(errorText(e)); }
  }
  async function startRec() {
    try {
      const perm = await Audio.requestPermissionsAsync(); if (!perm.granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: r } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(r); setRecSec(0); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { toast(t("calls.permission")); }
  }
  async function stopRec(sendIt: boolean) {
    const r = recording; if (!r) return;
    setRecording(null);
    try {
      await r.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = r.getURI(); if (!sendIt || !uri || recSec < 1) return;
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const mime = Platform.OS === "ios" ? "audio/m4a" : "audio/mp4";
      const { id: mediaId } = await talkApi.uploadMedia(id, mime, b64);
      const waveform = Array.from({ length: 40 }, () => 0.3 + Math.random() * 0.7);
      await send({ content: "", type: "voice", mediaId, meta: { duration: recSec, waveform }, replyToId: replyTo?.id ?? null });
      setReplyTo(null);
    } catch (e) { toast(errorText(e)); }
  }
  async function act(m: Message, action: "delete" | "pin" | "unpin" | "react", emoji?: string) {
    try { const r = await talkApi.messageAction(id, { messageId: m.id, action, emoji }); if (action === "delete") qc.setQueryData<{ messages: Message[] }>(["messages", id], (o) => o ? { messages: o.messages.filter((x) => x.id !== m.id) } : o); else if (r.message) patchLocal(r.message); }
    catch (e) { toast(errorText(e)); }
  }
  function openMenu(m: Message) { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenu(m); }

  if (!chat || !me) return <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }}><Header title="" onBack={() => router.back()} /></SafeAreaView>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }} edges={["top", "bottom"]}>
      <Header title={title} subtitle={subtitle} onBack={() => router.back()}
        left={<Pressable onPress={() => router.back()}><Ionicons name="arrow-forward" size={24} color={th.fg} /></Pressable>}
        right={<View style={{ flexDirection: "row" }}>
          {peer && !saved && (<><IconBtn name="call-outline" onPress={() => void startCall(peer, "audio")} /><IconBtn name="videocam-outline" onPress={() => void startCall(peer, "video")} /></>)}
          {chat.type === "group" && (<><IconBtn name="call-outline" onPress={() => void startGroupCall(chat.id, title, "audio")} /><IconBtn name="videocam-outline" onPress={() => void startGroupCall(chat.id, title, "video")} /></>)}
        </View>} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <FlatList ref={listRef} data={messages} keyExtractor={(m) => m.id} contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 8, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={!msgQ.isLoading ? <Empty icon="chatbubble-ellipses-outline" title={t("chat.noMessages")} desc={t("chat.noMessagesDesc")} /> : null}
          renderItem={({ item: m, index }) => {
            const prev = messages[index - 1], next = messages[index + 1];
            const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
            const close = (a?: Message, b?: Message) => !!a && !!b && a.senderId === b.senderId && a.type !== "system" && b.type !== "system" && Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) < 5 * 60_000;
            return (
              <View>
                {newDay && <View style={{ alignItems: "center", marginVertical: 8 }}><View style={{ backgroundColor: th.glass, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}><Txt muted size={12}>{dayLabel(m.createdAt)}</Txt></View></View>}
                <Bubble m={m} me={me} chat={chat} users={users} repliedTo={m.replyToId ? byId.get(m.replyToId) : undefined} showSender={!close(prev, m) && !newDay} tail={!close(m, next)}
                  onLongPress={() => openMenu(m)} onReply={() => setReplyTo(m)} onReact={(e) => void act(m, "react", e)} onImage={(src) => setLightbox(src)} />
              </View>
            );
          }} />

        {/* composer */}
        {blocked ? <View style={{ padding: 14, alignItems: "center" }}><Txt muted>{t("chat.blocked")}</Txt></View>
        : !canPost ? <View style={{ padding: 14, alignItems: "center" }}><Txt muted>{t("chat.broadcast")}</Txt></View>
        : (
          <View style={{ backgroundColor: th.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: th.line }}>
            {(replyTo || editing) && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingTop: 8 }}>
                <View style={{ width: 3, height: 34, borderRadius: 2, backgroundColor: th.accent }} />
                <View style={{ flex: 1 }}>
                  <Txt size={12} style={{ color: th.accent, fontWeight: "700" }}>{editing ? t("msg.editing") : `${t("msg.replyingTo")} ${users.get(replyTo!.senderId)?.displayName ?? ""}`}</Txt>
                  <Txt muted size={13} numberOfLines={1}>{messagePreview(editing ?? replyTo!)}</Txt>
                </View>
                <IconBtn name="close" onPress={() => { setReplyTo(null); if (editing) { setEditing(null); setText(""); } }} />
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, padding: 8 }}>
              {recording ? (
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, height: 44, paddingHorizontal: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: th.danger }} />
                  <Txt bold>{digits(formatDuration(recSec))}</Txt>
                  <Txt muted size={12} style={{ flex: 1 }}>{t("msg.release")}</Txt>
                  <Pressable onPress={() => void stopRec(false)}><Txt style={{ color: th.danger, fontWeight: "700" }}>{t("msg.cancelRecord")}</Txt></Pressable>
                </View>
              ) : (<>
                <IconBtn name="attach" onPress={() => {
                  const opts = [t("msg.gallery"), t("msg.camera"), t("common.cancel")];
                  const run = (i: number) => { if (i === 0) void pickImage(false); if (i === 1) void pickImage(true); };
                  if (Platform.OS === "ios") ActionSheetIOS.showActionSheetWithOptions({ options: opts, cancelButtonIndex: 2 }, run);
                  else Alert.alert("", undefined, [{ text: opts[0], onPress: () => run(0) }, { text: opts[1], onPress: () => run(1) }, { text: opts[2], style: "cancel" }]);
                }} />
                <TextInput value={text} onChangeText={onType} placeholder={t("chat.placeholder")} placeholderTextColor={th.muted} multiline
                  style={{ flex: 1, minHeight: 44, maxHeight: 130, backgroundColor: th.surface2, color: th.fg, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: settings.fontSize ?? 15, textAlign: "right" }} />
              </>)}
              {text.trim() || recording ? (
                <Pressable onPress={recording ? () => void stopRec(true) : sendText} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: th.accent, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="send" size={20} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
                </Pressable>
              ) : (
                <Pressable onLongPress={startRec} delayLongPress={200} onPressOut={() => { if (recording) void stopRec(true); }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: th.glass, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="mic" size={22} color={th.fg} />
                </Pressable>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* long-press action sheet with quick reactions */}
      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} onPress={() => setMenu(null)}>
          <View style={{ backgroundColor: th.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 32 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 8 }}>
              {QUICK.map((e) => <Pressable key={e} onPress={() => { const m = menu!; setMenu(null); void act(m, "react", e); }} style={{ padding: 8 }}><Txt size={28}>{e}</Txt></Pressable>)}
            </View>
            {menu && (<>
              <MenuItem icon="arrow-undo-outline" label={t("msg.reply")} onPress={() => { setReplyTo(menu); setMenu(null); }} />
              {menu.type === "text" && <MenuItem icon="copy-outline" label={t("msg.copy")} onPress={async () => { await Clipboard.setStringAsync(menu.content); setMenu(null); toast(t("msg.copied")); }} />}
              {menu.senderId === me.id && menu.type === "text" && <MenuItem icon="pencil-outline" label={t("msg.edit")} onPress={() => { setEditing(menu); setText(menu.content); setMenu(null); }} />}
              {(chat.myRole === "owner" || chat.myRole === "admin" || chat.type === "private") && <MenuItem icon="pin-outline" label={menu.isPinned ? t("msg.unpin") : t("msg.pin")} onPress={() => { void act(menu, menu.isPinned ? "unpin" : "pin"); setMenu(null); }} />}
              {(menu.senderId === me.id || chat.myRole === "owner" || chat.myRole === "admin") && <MenuItem icon="trash-outline" label={t("msg.delete")} danger onPress={() => { const m = menu; setMenu(null); Alert.alert(t("msg.delete"), t("msg.deleteConfirm"), [{ text: t("common.cancel"), style: "cancel" }, { text: t("msg.delete"), style: "destructive", onPress: () => void act(m, "delete") }]); }} />}
            </>)}
          </View>
        </Pressable>
      </Modal>
      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }} onPress={() => setLightbox(null)}>
          {lightbox && <Image source={{ uri: lightbox }} style={{ width: "100%", height: "100%" }} contentFit="contain" />}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  const th = useTheme();
  return <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 8 }}><Ionicons name={icon} size={20} color={danger ? th.danger : th.fg} /><Txt style={danger ? { color: th.danger } : null}>{label}</Txt></Pressable>;
}

/** One message. `own` decides the physical side; RTL never flips it. */
function Bubble({ m, me, chat, users, repliedTo, showSender, tail, onLongPress, onReply, onReact, onImage }: { m: Message; me: User; chat: Chat; users: Map<string, User>; repliedTo?: Message; showSender: boolean; tail: boolean; onLongPress: () => void; onReply: () => void; onReact: (e: string) => void; onImage: (src: string) => void }) {
  const th = useTheme();
  const own = m.senderId === me.id;
  const sender = users.get(m.senderId);
  const x = useSharedValue(0);
  const pan = Gesture.Pan().activeOffsetX([-14, 14]).failOffsetY([-10, 10])
    .onUpdate((e) => { x.value = Math.max(-72, Math.min(72, e.translationX)); })
    .onEnd((e) => { if (Math.abs(e.translationX) > 56) runOnJS(onReply)(); x.value = withSpring(0); });
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  if (m.type === "system") return <View style={{ alignItems: "center", marginVertical: 4 }}><View style={{ backgroundColor: th.glass, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}><Txt muted size={12}>{m.content}</Txt></View></View>;

  const isMedia = m.type === "image" || m.type === "video";
  const bg = own ? th.bubbleOut : th.bubbleIn, fg = own ? th.bubbleOutFg : th.bubbleInFg;
  const meta = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end", marginTop: 2 }}>
      {m.editedAt && <Txt size={10} style={{ color: fg, opacity: 0.7 }}>{t("msg.edited")}</Txt>}
      <Txt size={10} style={{ color: fg, opacity: 0.7 }}>{formatTime(m.createdAt)}</Txt>
      {own && <Ionicons name={m.isRead ? "checkmark-done" : "checkmark"} size={14} color={m.isRead ? "#a5f3fc" : fg} style={{ opacity: 0.9 }} />}
    </View>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", marginVertical: 2, direction: "ltr", justifyContent: own ? "flex-end" : "flex-start" }}>
      {!own && chat.type !== "private" && <View style={{ width: 34, marginRight: 4 }}>{tail && <Avatar name={sender?.displayName ?? "?"} src={sender?.avatar} size={30} />}</View>}
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ maxWidth: "80%" }, anim]}>
          <Pressable onLongPress={onLongPress} delayLongPress={320} style={{ backgroundColor: bg, borderRadius: 18, borderBottomRightRadius: own && tail ? 4 : 18, borderBottomLeftRadius: !own && tail ? 4 : 18, padding: isMedia ? 4 : 10, paddingBottom: 6 }}>
            {m.forwardedFrom && <Txt size={11} style={{ color: fg, opacity: 0.8, fontWeight: "700", marginBottom: 2 }}>↪ {t("msg.forwardedFrom")} {m.forwardedFrom}</Txt>}
            {showSender && !own && chat.type !== "private" && <Txt size={12} style={{ color: `hsl(${hueOf(m.senderId)} 70% 65%)`, fontWeight: "800", marginBottom: 2 }}>{sender?.displayName}</Txt>}
            {repliedTo && (
              <View style={{ borderLeftWidth: 3, borderLeftColor: own ? "#fff" : th.accent, backgroundColor: "rgba(0,0,0,0.12)", borderRadius: 8, padding: 6, marginBottom: 6 }}>
                <Txt size={11} style={{ color: fg, fontWeight: "800" }}>{users.get(repliedTo.senderId)?.displayName}</Txt>
                <Txt size={12} numberOfLines={1} style={{ color: fg, opacity: 0.85 }}>{messagePreview(repliedTo)}</Txt>
              </View>
            )}
            {isMedia && m.mediaId && (
              <Pressable onPress={() => onImage(mediaUrl(m.mediaId!))}>
                <Image source={{ uri: mediaUrl(m.mediaId) }} style={{ width: 240, height: Math.min(320, 240 * ((m.meta?.height ?? 1) / (m.meta?.width ?? 1)) || 240), borderRadius: 14 }} contentFit="cover" transition={150} />
                {m.type === "video" && <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}><Ionicons name="play-circle" size={48} color="#fff" /></View>}
              </Pressable>
            )}
            {m.type === "voice" && m.mediaId && <VoiceBubble src={mediaUrl(m.mediaId)} duration={m.meta?.duration ?? 0} fg={fg} waveform={m.meta?.waveform} />}
            {m.type === "file" && <Pressable onPress={() => m.mediaId && Linking.openURL(mediaUrl(m.mediaId))} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name="document" size={28} color={fg} /><Txt style={{ color: fg }}>{m.meta?.fileName ?? t("msg.file")}</Txt></Pressable>}
            {m.type === "call" && <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name="call" size={18} color={fg} /><Txt style={{ color: fg }}>{t("msg.call")}{m.meta?.duration ? ` · ${digits(formatDuration(Number(m.meta.duration)))}` : ""}</Txt></View>}
            {m.type === "sticker" && <Txt size={64}>{m.meta?.sticker ?? m.content}</Txt>}
            {(m.type === "text" || (isMedia && m.content)) && m.content ? <Txt style={{ color: fg, fontSize: 15, lineHeight: 22, paddingHorizontal: isMedia ? 6 : 0 }}>{m.content}</Txt> : null}
            {meta}
          </Pressable>
          {m.reactions.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3, justifyContent: own ? "flex-end" : "flex-start" }}>
              {m.reactions.map((r) => (
                <Pressable key={r.emoji} onPress={() => onReact(r.emoji)} style={{ flexDirection: "row", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: r.userIds.includes(me.id) ? th.accent : th.surface2 }}>
                  <Txt size={13}>{r.emoji}</Txt>{r.userIds.length > 1 && <Txt size={12} bold style={{ color: r.userIds.includes(me.id) ? "#fff" : th.fg }}>{digits(r.userIds.length)}</Txt>}
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function VoiceBubble({ src, duration, fg, waveform }: { src: string; duration: number; fg: string; waveform?: number[] }) {
  const sound = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  useEffect(() => () => { void sound.current?.unloadAsync(); }, []);
  async function toggle() {
    if (!sound.current) {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: s } = await Audio.Sound.createAsync({ uri: src }, { shouldPlay: true }, (st) => { if (!st.isLoaded) return; setPos(st.positionMillis / 1000); setPlaying(st.isPlaying); if (st.didJustFinish) { setPos(0); setPlaying(false); void s.setPositionAsync(0); } });
      sound.current = s; return;
    }
    if (playing) await sound.current.pauseAsync(); else await sound.current.playAsync();
  }
  const bars = waveform?.length ? waveform : Array.from({ length: 30 }, () => 0.5);
  const frac = duration ? pos / duration : 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minWidth: 200 }}>
      <Pressable onPress={toggle} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}><Ionicons name={playing ? "pause" : "play"} size={20} color={fg} /></Pressable>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2, height: 26 }}>
          {bars.slice(0, 36).map((v, i) => <View key={i} style={{ width: 3, height: 4 + v * 20, borderRadius: 2, backgroundColor: fg, opacity: i / bars.length <= frac ? 1 : 0.45 }} />)}
        </View>
        <Txt size={11} style={{ color: fg, opacity: 0.8 }}>{digits(formatDuration(Math.round(playing ? pos : duration)))}</Txt>
      </View>
    </View>
  );
}
