"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Search,
  Video,
} from "lucide-react";
import { talkApi } from "@/lib/talk/api";
import { useLocale, useT } from "@/lib/i18n";
import {
  cn,
  formatDuration,
  formatRelativeDay,
  toLocaleDigits,
} from "@/lib/utils";
import type { Call } from "@/lib/types";
import { useCalls } from "./call-provider";
import { GBtn, GHeader, GSearch, TalkAvatar } from "../glass";
import { Mascot } from "../mascots";
import { useTalk } from "../talk-data";

export function CallsPage({ onBack }: { onBack: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const { me, users, userList } = useTalk();
  const { startCall } = useCalls();
  const [tab, setTab] = useState<"recent" | "contacts">("recent");
  const [q, setQ] = useState("");
  const callsQ = useQuery({
    queryKey: ["talk", "calls"],
    queryFn: () => talkApi.calls(),
    refetchInterval: 15_000,
  });
  const calls = callsQ.data?.calls ?? [];
  const contacts = useMemo(
    () =>
      userList.filter(
        (u) =>
          u.id !== me.id &&
          !u.isSuspended &&
          (!q || u.displayName.toLowerCase().includes(q.toLowerCase())),
      ),
    [userList, me.id, q],
  );

  const meta = (c: Call) =>
    c.direction === "missed"
      ? {
          Icon: PhoneMissed,
          cls: "text-red-500",
          label: t("talk.calls.missed"),
        }
      : c.direction === "incoming"
        ? {
            Icon: PhoneIncoming,
            cls: "text-emerald-500",
            label: t("talk.calls.incoming"),
          }
        : {
            Icon: PhoneOutgoing,
            cls: "text-talk",
            label:
              c.status === "declined"
                ? t("talk.calls.declined")
                : t("talk.calls.outgoing"),
          };

  return (
    <div className="flex h-full flex-col">
      <GHeader title={t("talk.calls.title")} onBack={onBack} />
      <div className="flex gap-1 px-3 pt-2">
        <button
          type="button"
          className="tg-chip"
          data-active={tab === "recent"}
          onClick={() => setTab("recent")}
        >
          {t("talk.calls.recent")}
        </button>
        <button
          type="button"
          className="tg-chip"
          data-active={tab === "contacts"}
          onClick={() => setTab("contacts")}
        >
          {t("talk.calls.contacts")}
        </button>
      </div>
      <div className="tg-scroll flex-1 p-2">
        {tab === "recent" ? (
          calls.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <Mascot pose="phone" size={150} />
              <p className="font-bold">{t("talk.calls.noCalls")}</p>
              <p className="tg-muted text-xs">{t("talk.calls.noCallsDesc")}</p>
              <GBtn
                variant="primary"
                size="sm"
                onClick={() => setTab("contacts")}
              >
                <Phone className="size-4" /> {t("talk.calls.contacts")}
              </GBtn>
            </div>
          ) : (
            calls.map((c) => {
              const peerId = c.initiatorId === me.id ? c.peerId : c.initiatorId;
              const peer = users.get(peerId);
              const { Icon, cls, label } = meta(c);
              return (
                <div key={c.id} className="tg-row cursor-default">
                  <TalkAvatar
                    name={peer?.displayName ?? "?"}
                    src={peer?.avatar}
                    size="md"
                    className="!size-12"
                    online={peer?.isOnline}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "text-name block truncate font-bold",
                        c.direction === "missed" && "text-red-500",
                      )}
                    >
                      {peer?.displayName ?? t("talk.deletedAccount")}
                    </span>
                    <span
                      className={cn("flex items-center gap-1 text-[12px]", cls)}
                    >
                      <Icon className="size-3.5" />
                      {c.type === "video"
                        ? t("talk.calls.videoCall")
                        : t("talk.calls.audioCall")}{" "}
                      ·{" "}
                      {c.direction === "missed" ? t("talk.conv.missed") : label}
                      {c.duration != null && c.duration > 0 && (
                        <span className="tg-muted" dir="ltr">
                          · {toLocaleDigits(formatDuration(c.duration), locale)}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="tg-time">
                    {formatRelativeDay(
                      c.createdAt,
                      locale,
                      t("common.today"),
                      t("common.yesterday"),
                    )}
                  </span>
                  {peer && (
                    <>
                      <button
                        type="button"
                        className="tg-btn tg-icon !h-9 !w-9"
                        onClick={() => void startCall(peer, "audio")}
                        aria-label={t("talk.calls.audioCall")}
                      >
                        <Phone className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="tg-btn tg-icon !h-9 !w-9"
                        onClick={() => void startCall(peer, "video")}
                        aria-label={t("talk.calls.videoCall")}
                      >
                        <Video className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              );
            })
          )
        ) : (
          <>
            <div className="px-1 pb-2">
              <GSearch
                value={q}
                onChange={setQ}
                placeholder={t("talk.contacts.search")}
                icon={<Search />}
              />
            </div>
            {contacts.map((u) => (
              <div key={u.id} className="tg-row cursor-default">
                <TalkAvatar
                  name={u.displayName}
                  src={u.avatar}
                  size="md"
                  online={u.isOnline}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {u.displayName}
                  </span>
                  <span
                    className={cn(
                      "block text-xs",
                      u.isOnline ? "text-talk" : "tg-muted",
                    )}
                  >
                    {u.isOnline ? t("common.online") : t("common.offline")}
                  </span>
                </span>
                <button
                  type="button"
                  className="tg-btn tg-icon"
                  onClick={() => void startCall(u, "audio")}
                  aria-label={t("talk.calls.audioCall")}
                >
                  <Phone className="size-4" />
                </button>
                <button
                  type="button"
                  className="tg-btn tg-icon"
                  onClick={() => void startCall(u, "video")}
                  aria-label={t("talk.calls.videoCall")}
                >
                  <Video className="size-4" />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
