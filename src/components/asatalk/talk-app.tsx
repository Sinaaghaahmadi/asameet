"use client";

/**
 * Asatalk root: restores the cookie session, renders onboarding or the shell,
 * and wires multi-account switching. Everything under /talk mounts here.
 */
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { talkApi } from "@/lib/talk/api";
import { primeAudio } from "@/lib/talk/sounds";
import type { User } from "@/lib/types";
import { useTalkStore } from "@/stores/talk-store";
import { CallProvider } from "./calls/call-provider";
import { JoinDialog } from "./dialogs";
import { AsatalkLogo } from "./mascots";
import { Onboarding } from "./onboarding";
import { PinScreen } from "./pin-lock";
import { TalkShell } from "./shell";
import { TalkDataProvider, useTalk } from "./talk-data";

export function TalkApp({ joinRef }: { joinRef?: string }) {
  const qc = useQueryClient();
  const params = useSearchParams();
  const { user, setUser, setSettings, setAccounts, openChat, setPanel, settings } = useTalkStore();
  const [unlocked, setUnlocked] = useState<string | null>(() => (typeof window !== "undefined" ? window.sessionStorage.getItem("asatalk-unlocked") : null));
  const [ready, setReady] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const { accounts } = await talkApi.accounts();
      setAccounts(accounts);
    } catch {
      setAccounts([]);
    }
  }, [setAccounts]);

  const boot = useCallback(async () => {
    try {
      const me = await talkApi.me();
      setUser(me.user);
      setSettings(me.settings ?? {});
      void loadAccounts();
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, [setUser, setSettings, loadAccounts]);

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(() => {
    const unlock = () => primeAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // ?chat=<id> deep link
  useEffect(() => {
    const c = params.get("chat");
    if (c && user) openChat(c);
    if (params.get("panel") === "calls" && user) setPanel({ kind: "calls" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, user?.id]);

  const onLogin = useCallback(
    async (u: User) => {
      qc.clear();
      setAddingAccount(false);
      setUser(u);
      openChat(null);
      setPanel({ kind: "none" });
      await boot();
    },
    [qc, setUser, openChat, setPanel, boot]
  );

  const onLogout = useCallback(
    async (all?: boolean) => {
      const res = all ? await talkApi.logoutAll().catch(() => ({ user: null })) : await talkApi.logoutCurrent().catch(() => ({ user: null }));
      qc.clear();
      openChat(null);
      setPanel({ kind: "none" });
      if (res.user) await boot();
      else {
        setUser(null);
        setAccounts([]);
      }
    },
    [qc, openChat, setPanel, boot, setUser, setAccounts]
  );

  const onSwitch = useCallback(
    async (userId: string) => {
      try {
        await talkApi.switchAccount(userId);
        qc.clear();
        openChat(null);
        setPanel({ kind: "none" });
        await boot();
      } catch {
        /* the stored session may have expired */
        void loadAccounts();
      }
    },
    [qc, openChat, setPanel, boot, loadAccounts]
  );

  if (!ready) {
    return (
      <div className="talk flex min-h-dvh items-center justify-center">
        <AsatalkLogo size={72} className="tg-float" />
      </div>
    );
  }

  if (!user || addingAccount) {
    return <Onboarding onLogin={onLogin} addAccount={addingAccount} onCancel={addingAccount ? () => setAddingAccount(false) : undefined} />;
  }

  if (settings.pinLock && unlocked !== settings.pinLock) {
    return (
      <PinScreen
        mode="verify"
        hash={settings.pinLock}
        onDone={(h) => {
          try {
            window.sessionStorage.setItem("asatalk-unlocked", h);
          } catch {}
          setUnlocked(h);
        }}
        onForgot={() => void onLogout(true)}
      />
    );
  }

  return (
    <TalkDataProvider me={user}>
      <WithCalls me={user}>
        <TalkShell onLogout={(all) => void onLogout(all)} onAddAccount={() => setAddingAccount(true)} onSwitch={(id) => void onSwitch(id)} />
        {joinRef && <JoinRoute joinRef={joinRef} />}
      </WithCalls>
    </TalkDataProvider>
  );
}

function WithCalls({ me, children }: { me: User; children: React.ReactNode }) {
  const { users } = useTalk();
  return (
    <CallProvider me={me} users={users}>
      {children}
    </CallProvider>
  );
}

function JoinRoute({ joinRef }: { joinRef: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <JoinDialog
      initial={joinRef}
      onClose={() => {
        setOpen(false);
        window.history.replaceState(null, "", `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/talk`);
      }}
    />
  );
}
