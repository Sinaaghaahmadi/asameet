"use client";

import { apiFetch } from "@/lib/client-api";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Circle,
  Copy,
  Hand,
  Lightbulb,
  ListChecks,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  Phone,
  Plus,
  ScrollText,
  Search,
  Send,
  Sparkles,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocale, useT } from "@/lib/i18n";
import type { Meeting, User } from "@/lib/types";
import { cn, formatDuration, formatTime, toLocaleDigits } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

type MeetingFilter = "all" | "scheduled" | "active";

export function MeetingsView() {
  const t = useT();
  const { locale } = useLocale();
  const { currentUser, activeMeetingId, setActiveMeetingId } = useAppStore();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<MeetingFilter>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"meeting" | "conference">("meeting");

  const { data: meetingsData } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => (await apiFetch("/api/meetings")).json() as Promise<{ meetings: Meeting[] }>,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await apiFetch("/api/users")).json() as Promise<{ users: User[] }>,
  });

  const createMeeting = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type }),
      });
      if (!res.ok) throw new Error("create failed");
      return res.json() as Promise<{ meeting: Meeting }>;
    },
    onSuccess: (data) => {
      setShowCreate(false);
      setTitle("");
      void qc.invalidateQueries({ queryKey: ["meetings"] });
      setActiveMeetingId(data.meeting.id);
    },
  });

  const joinMeeting = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join" }),
      });
      if (!res.ok) throw new Error("join failed");
      return id;
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: ["meetings"] });
      setActiveMeetingId(id);
    },
  });

  if (!currentUser) return null;

  const meetings = (meetingsData?.meetings ?? []).filter((m) => {
    if (m.type === "class") return false;
    if (filter !== "all" && m.status !== filter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeMeeting = (meetingsData?.meetings ?? []).find((m) => m.id === activeMeetingId) ?? null;

  if (activeMeeting) {
    return (
      <MeetingRoom
        meeting={activeMeeting}
        users={usersData?.users ?? []}
        onLeave={() => {
          void apiFetch(`/api/meetings/${activeMeeting.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "leave", userId: currentUser.id }),
          }).then(() => qc.invalidateQueries({ queryKey: ["meetings"] }));
          setActiveMeetingId(null);
        }}
      />
    );
  }

  const filters: { key: MeetingFilter; label: string }[] = [
    { key: "all", label: t("common.all") },
    { key: "scheduled", label: t("common.scheduled") },
    { key: "active", label: t("common.active") },
  ];

  return (
    <div className="mesh-bg flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black">{t("meetings.title")}</h1>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="size-4" /> {t("meetings.create")}
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.search")} className="ps-9" aria-label={t("common.search")} />
          </div>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-medium transition-all cursor-pointer",
                filter === f.key ? "bg-gradient-to-l from-teal-500 to-emerald-600 text-white shadow" : "bg-secondary hover:bg-accent"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {meetings.length === 0 && (
            <p className="glass-card col-span-full p-10 text-center text-sm text-muted-foreground">{t("meetings.noMeetings")}</p>
          )}
          {meetings.map((m) => (
            <article key={m.id} className="glass-card card-3d flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="icon-3d-wrap size-11">
                  <Video className="size-5 text-primary" />
                </span>
                <Badge variant={m.status === "active" ? "success" : m.status === "scheduled" ? "warning" : "secondary"}>
                  {m.status === "active" && <span className="me-0.5 inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" />}
                  {t(`common.${m.status}`)}
                </Badge>
              </div>
              <div>
                <h2 className="font-bold">{m.title}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{m.type === "conference" ? t("meetings.typeConference") : t("meetings.typeMeeting")}</span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" />
                    {toLocaleDigits(m.participantIds.length, locale)}/{toLocaleDigits(m.maxParticipants, locale)}
                  </span>
                  <span>{formatTime(m.startsAt, locale)}</span>
                  {m.isRecording && (
                    <span className="flex items-center gap-1 text-red-500">
                      <Circle className="size-2.5 animate-pulse fill-red-500" /> {t("meetings.recording")}
                    </span>
                  )}
                </p>
              </div>
              <div className="mt-auto flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => joinMeeting.mutate(m.id)} disabled={m.status === "ended"}>
                  {t("meetings.join")}
                </Button>
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => {
                    void navigator.clipboard.writeText(`https://asameet.online/meet/${m.link}`);
                    toast.success(t("meetings.linkCopied"));
                  }}
                  aria-label={t("meetings.copyLink")}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="size-5 text-primary" /> {t("meetings.create")}
            </DialogTitle>
          </DialogHeader>
          <label className="text-sm font-semibold" htmlFor="meeting-title">{t("meetings.meetingTitle")}</label>
          <Input id="meeting-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("meetings.titlePlaceholder")} />
          <p className="text-sm font-semibold">{t("meetings.type")}</p>
          <div className="flex gap-2">
            {(["meeting", "conference"] as const).map((tp) => (
              <button
                key={tp}
                onClick={() => setType(tp)}
                className={cn(
                  "flex-1 rounded-xl border-2 p-3 text-sm font-medium transition-all cursor-pointer",
                  type === tp ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
                )}
              >
                {tp === "meeting" ? t("meetings.typeMeeting") : t("meetings.typeConference")}
              </button>
            ))}
          </div>
          <Button disabled={!title.trim() || createMeeting.isPending} onClick={() => createMeeting.mutate()}>
            {createMeeting.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {t("meetings.now")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= Meeting Room ================= */

function MeetingRoom({ meeting, users, onLeave }: { meeting: Meeting; users: User[]; onLeave: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const { currentUser } = useAppStore();
  const qc = useQueryClient();
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [panel, setPanel] = useState<"none" | "chat" | "ai">("none");
  const [chatMessages, setChatMessages] = useState<{ id: number; sender: string; text: string; at: Date }[]>([]);
  const [chatDraft, setChatDraft] = useState("");

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const participants = meeting.participantIds.map((id) => userMap.get(id)).filter((u): u is User => !!u);
  const isHost = meeting.hostId === currentUser?.id;

  const toggleRecording = useMutation({
    mutationFn: async () => {
      await apiFetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: meeting.isRecording ? "stop-recording" : "start-recording" }),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["meetings"] });
      if (meeting.isRecording) toast.success(t("meetings.recordingSaved"));
    },
  });

  function sendChat() {
    const text = chatDraft.trim();
    if (!text) return;
    setChatMessages((m) => [...m, { id: Date.now(), sender: currentUser?.displayName ?? "", text, at: new Date() }]);
    setChatDraft("");
  }

  const cols = participants.length <= 1 ? "grid-cols-1" : participants.length <= 4 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3";

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-zinc-900 to-teal-950">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 text-white">
        <h1 className="truncate text-sm font-bold">{meeting.title}</h1>
        {meeting.isRecording && (
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <Circle className="size-2 fill-white" /> {t("meetings.recording")}
          </Badge>
        )}
        <span className="ms-auto rounded-full bg-white/10 px-3 py-1 text-xs tabular-nums">
          {toLocaleDigits(formatDuration(seconds), locale)}
        </span>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(`https://asameet.online/meet/${meeting.link}`);
            toast.success(t("meetings.linkCopied"));
          }}
          className="rounded-full bg-white/10 p-2 hover:bg-white/20 cursor-pointer"
          aria-label={t("meetings.copyLink")}
        >
          <Copy className="size-4" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Participant grid */}
        <div className={cn("grid flex-1 content-center gap-3 overflow-y-auto p-4", cols)}>
          {participants.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass relative flex aspect-video flex-col items-center justify-center gap-2 rounded-3xl !bg-white/5"
            >
              <Avatar name={p.displayName} size="xl" />
              <p className="text-sm font-bold text-white">{p.displayName}</p>
              <span className="absolute bottom-3 start-3 flex items-center gap-1.5">
                {p.id === meeting.hostId && <Badge className="bg-teal-500/30 text-teal-100">{t("meetings.host")}</Badge>}
                {p.id === currentUser?.id && muted && <MicOff className="size-4 text-red-400" />}
                {p.id === currentUser?.id && handRaised && <Hand className="size-4 text-amber-400" />}
              </span>
            </motion.div>
          ))}
          {sharing && (
            <div className="glass col-span-full flex aspect-video items-center justify-center rounded-3xl !bg-teal-500/10 text-teal-100">
              <MonitorUp className="me-2 size-6" /> {t("meetings.shareScreen")}…
            </div>
          )}
        </div>

        {/* Side panel */}
        <AnimatePresence>
          {panel !== "none" && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="glass-strong m-3 ms-0 flex flex-col overflow-hidden rounded-3xl"
            >
              {panel === "chat" ? (
                <>
                  <header className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                    <h2 className="text-sm font-bold">{t("meetings.chat")}</h2>
                    <button onClick={() => setPanel("none")} className="cursor-pointer text-muted-foreground hover:text-foreground" aria-label={t("common.close")}>
                      <X className="size-4" />
                    </button>
                  </header>
                  <div className="flex-1 space-y-2 overflow-y-auto p-3">
                    {chatMessages.map((m) => (
                      <div key={m.id} className="rounded-xl bg-card/70 p-2.5 text-xs">
                        <p className="font-bold text-primary">{m.sender}</p>
                        <p className="mt-0.5">{m.text}</p>
                        <p className="mt-1 text-end text-[10px] text-muted-foreground">{formatTime(m.at, locale)}</p>
                      </div>
                    ))}
                  </div>
                  <form
                    className="flex gap-2 border-t border-border/40 p-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendChat();
                    }}
                  >
                    <Input value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} placeholder={t("messenger.typeMessage")} className="h-9 text-xs" />
                    <Button size="iconSm" type="submit" aria-label={t("common.send")}>
                      <Send className="size-4 rtl:-scale-x-100" />
                    </Button>
                  </form>
                </>
              ) : (
                <AiAssistantPanel meeting={meeting} chatLog={chatMessages} onClose={() => setPanel("none")} />
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Control bar */}
      <footer className="safe-area-bottom flex items-center justify-center gap-2 p-4">
        <ControlButton active={!muted} danger={muted} onClick={() => setMuted((m) => !m)} label={muted ? t("calls.unmute") : t("calls.mute")}>
          {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </ControlButton>
        <ControlButton active={!cameraOff} danger={cameraOff} onClick={() => setCameraOff((c) => !c)} label={cameraOff ? t("calls.cameraOn") : t("calls.cameraOff")}>
          {cameraOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
        </ControlButton>
        <ControlButton active={sharing} onClick={() => setSharing((s) => !s)} label={sharing ? t("meetings.stopShare") : t("meetings.shareScreen")}>
          <MonitorUp className="size-5" />
        </ControlButton>
        <ControlButton
          active={handRaised}
          onClick={() => {
            setHandRaised((h) => !h);
            if (!handRaised) toast.info(`✋ ${currentUser?.displayName} ${t("meetings.handRaised")}`);
          }}
          label={handRaised ? t("meetings.lowerHand") : t("meetings.raiseHand")}
        >
          <Hand className="size-5" />
        </ControlButton>
        {isHost && (
          <ControlButton active={meeting.isRecording} onClick={() => toggleRecording.mutate()} label={meeting.isRecording ? t("meetings.stopRecording") : t("meetings.record")}>
            <Circle className={cn("size-5", meeting.isRecording && "animate-pulse fill-red-500 text-red-500")} />
          </ControlButton>
        )}
        <ControlButton active={panel === "chat"} onClick={() => setPanel(panel === "chat" ? "none" : "chat")} label={t("meetings.chat")}>
          <MessageSquare className="size-5" />
        </ControlButton>
        <ControlButton active={panel === "ai"} onClick={() => setPanel(panel === "ai" ? "none" : "ai")} label={t("ai.title")} highlight>
          <Bot className="size-5" />
        </ControlButton>
        <button
          onClick={onLeave}
          className="ms-2 flex h-12 items-center gap-2 rounded-full bg-red-500 px-6 font-bold text-white shadow-lg shadow-red-500/40 transition-all hover:bg-red-600 cursor-pointer"
          aria-label={t("meetings.leaveMeeting")}
        >
          <Phone className="size-5 rotate-[135deg]" />
          <span className="hidden sm:inline">{t("meetings.leaveMeeting")}</span>
        </button>
      </footer>
    </div>
  );
}

function ControlButton({
  children,
  active,
  danger,
  highlight,
  onClick,
  label,
}: {
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  highlight?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-12 items-center justify-center rounded-full transition-all cursor-pointer",
        danger
          ? "bg-red-500/90 text-white"
          : active
            ? highlight
              ? "bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-lg shadow-teal-500/40"
              : "bg-white/20 text-white"
            : "bg-white/10 text-zinc-300 hover:bg-white/20"
      )}
    >
      {children}
    </button>
  );
}

/* ================= AI Assistant ================= */

function AiAssistantPanel({
  meeting,
  chatLog,
  onClose,
}: {
  meeting: Meeting;
  chatLog: { sender: string; text: string }[];
  onClose: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [mode, setMode] = useState<"minutes" | "summary" | "brainstorm">("minutes");
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  const generate = useMutation({
    mutationFn: async () => {
      const transcript = chatLog.map((m) => `${m.sender}: ${m.text}`).join("\n");
      const res = await apiFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, meetingTitle: meeting.title, transcript, topic, locale }),
      });
      if (!res.ok) throw new Error("ai failed");
      return res.json() as Promise<{ result: string }>;
    },
    onSuccess: (data) => {
      setResult(data.result);
      setTimeout(() => resultRef.current?.scrollTo({ top: 0 }), 50);
    },
    onError: () => toast.error(t("common.error")),
  });

  const modes = [
    { key: "minutes" as const, icon: ScrollText, label: t("ai.minutes") },
    { key: "summary" as const, icon: ListChecks, label: t("ai.summary") },
    { key: "brainstorm" as const, icon: Lightbulb, label: t("ai.brainstorm") },
  ];

  return (
    <>
      <header className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Bot className="size-4 text-primary" /> {t("ai.title")}
        </h2>
        <button onClick={onClose} className="cursor-pointer text-muted-foreground hover:text-foreground" aria-label={t("common.close")}>
          <X className="size-4" />
        </button>
      </header>
      <div className="flex gap-1.5 p-3 pb-0">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl p-2 text-[10px] font-medium transition-all cursor-pointer",
              mode === m.key ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow" : "bg-secondary hover:bg-accent"
            )}
          >
            <m.icon className="size-4" />
            {m.label}
          </button>
        ))}
      </div>
      {mode === "brainstorm" && (
        <div className="p-3 pb-0">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t("ai.brainstormPlaceholder")} className="h-9 text-xs" />
        </div>
      )}
      <div className="p-3">
        <Button size="sm" className="w-full" onClick={() => generate.mutate()} disabled={generate.isPending}>
          {generate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {generate.isPending
            ? t("ai.thinking")
            : mode === "minutes"
              ? t("ai.generateMinutes")
              : mode === "summary"
                ? t("ai.generateSummary")
                : t("ai.brainstorm")}
        </Button>
      </div>
      <div ref={resultRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {result ? (
          <>
            <div className="whitespace-pre-wrap rounded-2xl bg-card/70 p-3 text-xs leading-6">{result}</div>
            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(result);
                  toast.success(t("common.copied"));
                }}
                className="flex items-center gap-1 text-[11px] text-primary cursor-pointer"
              >
                <Copy className="size-3" /> {t("ai.copyResult")}
              </button>
              <span className="text-[10px] text-muted-foreground">{t("ai.poweredBy")}</span>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{t("ai.disclaimer")}</p>
          </>
        ) : (
          <p className="pt-6 text-center text-xs leading-6 text-muted-foreground">
            🤖 {t("landing.features.ai.desc")}
          </p>
        )}
      </div>
    </>
  );
}
