"use client";

import { apiFetch } from "@/lib/client-api";

import { useState } from "react";
import { GraduationCap, Loader2, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/logo";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";
import type { User } from "@/lib/types";

const QUICK_ACCOUNTS = [
  { username: "user1", icon: UserIcon, titleKey: "login.quickUser", descKey: "login.quickUserDesc" },
  { username: "teacher1", icon: GraduationCap, titleKey: "login.quickTeacher", descKey: "login.quickTeacherDesc" },
  { username: "admin", icon: ShieldCheck, titleKey: "login.quickAdmin", descKey: "login.quickAdminDesc" },
] as const;

export function LoginModal() {
  const t = useT();
  const { showLoginModal, setShowLoginModal, login } = useAppStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function doLogin(user: string, pass?: string) {
    setLoading(user);
    try {
      const res = await apiFetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pass === undefined ? { username: user } : { username: user, password: pass }),
      });
      if (!res.ok) {
        toast.error(t("login.failed"));
        return;
      }
      const data = (await res.json()) as { user: User };
      login(data.user);
      toast.success(`${t("meta.name")} 👋 ${data.user.displayName}`);
    } catch {
      toast.error(t("login.networkError"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2">
            <Logo size={64} className="icon-3d animate-float" />
          </div>
          <DialogTitle className="text-center text-xl">{t("login.title")}</DialogTitle>
          <DialogDescription className="text-center">{t("login.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">{t("login.quickTitle")}</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                onClick={() => doLogin(acc.username)}
                disabled={loading !== null}
                className="glass-card group flex flex-col items-center gap-2 p-3 text-center transition-all hover:scale-[1.03] disabled:opacity-60 cursor-pointer"
              >
                <span className="icon-3d-wrap size-10">
                  {loading === acc.username ? (
                    <Loader2 className="size-5 animate-spin text-primary" />
                  ) : (
                    <acc.icon className="size-5 text-primary" />
                  )}
                </span>
                <span className="text-xs font-bold">{t(acc.titleKey)}</span>
                <span className="text-[10px] leading-tight text-muted-foreground">{t(acc.descKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-transparent px-2 text-muted-foreground backdrop-blur-sm">{t("login.or")}</span>
          </div>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (username.trim()) void doLogin(username.trim(), password);
          }}
        >
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("login.username")}
            autoComplete="username"
            aria-label={t("login.username")}
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("login.password")}
            autoComplete="current-password"
            aria-label={t("login.password")}
          />
          <Button className="w-full" disabled={loading !== null || !username.trim()}>
            {loading === username ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("login.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
