"use client";

import { apiFetch } from "@/lib/client-api";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  Search,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale, useT } from "@/lib/i18n";
import type { Call, User } from "@/lib/types";
import { cn, formatDuration, formatRelativeDay, toLocaleDigits } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

interface ActiveCall {
  call: Call;
  peer: User;
}

export function CallsView() {
  const t = useT();
  const { locale } = useLocale();
  const { currentUser } = useAppStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await apiFetch("/api/users")).json() as Promise<{ users: User[] }>,
  });
  const users = useMemo(() => new Map((usersData?.users ?? []).map((u) => [u.id, u])), [usersData]);

  const { data: callsData } = useQuery({
    queryKey: ["calls", currentUser?.id],
    queryFn: async () =>
      (await apiFetch(`/api/calls?userId=${currentUser?.id}`)).json() as Promise<{ calls: Call[] }>,
    enabled: !!currentUser,
  });

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  const startCall = useMutation({
    mutationFn: async ({ peer, type }: { peer: User; type: "audio" | "video" }) => {
      const res = await apiFetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, initiatorId: currentUser?.id, peerId: peer.id }),
      });
      const data = (await res.json()) as { call: Call };
      return { call: data.call, peer };
    },
    onSuccess: (data) => {
      setSeconds(0);
      setMuted(false);
      setCameraOff(false);
      setActive(data);
    },
  });

  const endCall = useMutation({
    mutationFn: async () => {
      if (!active) return;
      await apiFetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: active.call.id, duration: seconds }),
      });
    },
    onSuccess: () => {
      setActive(null);
      void qc.invalidateQueries({ queryKey: ["calls"] });
    },
  });

  if (!currentUser) return null;

  const contacts = (usersData?.users ?? []).filter(
    (u) => u.id !== currentUser.id && u.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const dirMeta = (call: Call) => {
    if (call.direction === "missed")
      return { icon: PhoneMissed, cls: "text-red-500", label: t("calls.missed") };
    if (call.direction === "incoming")
      return { icon: PhoneIncoming, cls: "text-emerald-500", label: t("calls.incoming") };
    return { icon: PhoneOutgoing, cls: "text-primary", label: t("calls.outgoing") };
  };

  return (
    <div className="mesh-bg flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        <h1 className="mb-5 text-2xl font-black">{t("calls.title")}</h1>
        <Tabs defaultValue="recent">
          <TabsList>
            <TabsTrigger value="recent">{t("calls.recent")}</TabsTrigger>
            <TabsTrigger value="contacts">{t("calls.contacts")}</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-2">
            {(callsData?.calls ?? []).length === 0 && (
              <p className="glass-card p-8 text-center text-sm text-muted-foreground">{t("calls.noCalls")}</p>
            )}
            {(callsData?.calls ?? []).map((call) => {
              const peerId = call.initiatorId === currentUser.id ? call.peerId : call.initiatorId;
              const peer = users.get(peerId);
              const meta = dirMeta(call);
              return (
                <div key={call.id} className="glass-card slide-in flex items-center gap-3 p-3.5">
                  <Avatar name={peer?.displayName ?? "?"} online={peer?.isOnline} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{peer?.displayName}</p>
                    <p className={cn("flex items-center gap-1.5 text-xs", meta.cls)}>
                      <meta.icon className="size-3.5" />
                      {meta.label}
                      {call.type === "video" && <Video className="size-3.5" />}
                      {call.duration != null && (
                        <span className="text-muted-foreground">
                          • {toLocaleDigits(formatDuration(call.duration), locale)}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDay(call.createdAt, locale, t("common.today"), t("common.yesterday"))}
                  </span>
                  {peer && (
                    <div className="flex gap-1">
                      <Button variant="glass" size="iconSm" onClick={() => startCall.mutate({ peer, type: "audio" })} aria-label={t("calls.audioCall")}>
                        <Phone className="size-4 text-primary" />
                      </Button>
                      <Button variant="glass" size="iconSm" onClick={() => startCall.mutate({ peer, type: "video" })} aria-label={t("calls.videoCall")}>
                        <Video className="size-4 text-primary" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="contacts" className="space-y-3">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("calls.searchContacts")}
                className="ps-9"
                aria-label={t("calls.searchContacts")}
              />
            </div>
            <div className="space-y-2">
              {contacts.map((u) => (
                <div key={u.id} className="glass-card slide-in flex items-center gap-3 p-3.5">
                  <Avatar name={u.displayName} online={u.isOnline} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{u.displayName}</p>
                    <p className="text-xs text-muted-foreground">{u.isOnline ? t("common.online") : t("common.offline")}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="glass" size="iconSm" onClick={() => startCall.mutate({ peer: u, type: "audio" })} aria-label={t("calls.audioCall")}>
                      <Phone className="size-4 text-primary" />
                    </Button>
                    <Button variant="glass" size="iconSm" onClick={() => startCall.mutate({ peer: u, type: "video" })} aria-label={t("calls.videoCall")}>
                      <Video className="size-4 text-primary" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ============ Active call overlay ============ */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-zinc-900 via-teal-950 to-zinc-950 p-6"
            role="dialog"
            aria-label={active.call.type === "video" ? t("calls.videoCall") : t("calls.audioCall")}
          >
            <div className="dot-pattern absolute inset-0 opacity-10" />
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="relative flex flex-col items-center gap-4"
            >
              <div className="animate-pulse-ring rounded-full">
                <Avatar name={active.peer.displayName} size="xl" />
              </div>
              <h2 className="text-2xl font-black text-white">{active.peer.displayName}</h2>
              <p className="text-teal-200">
                {seconds < 3 ? t("calls.ringing") : toLocaleDigits(formatDuration(seconds), locale)}
              </p>
            </motion.div>

            {active.call.type === "video" && !cameraOff && (
              <div className="glass absolute bottom-32 end-6 hidden h-40 w-28 items-center justify-center rounded-2xl sm:flex">
                <Avatar name={currentUser.displayName} size="lg" />
              </div>
            )}

            <div className="relative flex items-center gap-3">
              <Button
                variant="glass"
                size="icon"
                className={cn("rounded-full !bg-white/10 text-white", muted && "!bg-red-500/80")}
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? t("calls.unmute") : t("calls.mute")}
              >
                {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
              </Button>
              {active.call.type === "video" && (
                <Button
                  variant="glass"
                  size="icon"
                  className={cn("rounded-full !bg-white/10 text-white", cameraOff && "!bg-red-500/80")}
                  onClick={() => setCameraOff((c) => !c)}
                  aria-label={cameraOff ? t("calls.cameraOn") : t("calls.cameraOff")}
                >
                  {cameraOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
                </Button>
              )}
              <Button variant="glass" size="icon" className="rounded-full !bg-white/10 text-white" aria-label={t("calls.speaker")}>
                <Volume2 className="size-5" />
              </Button>
              <Button
                size="icon"
                className="size-14 rounded-full !bg-red-500 !shadow-red-500/40 hover:!bg-red-600"
                onClick={() => endCall.mutate()}
                aria-label={t("calls.endCall")}
              >
                <PhoneOff className="size-6 text-white" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
