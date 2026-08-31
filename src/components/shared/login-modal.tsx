"use client";

import { apiFetch } from "@/lib/client-api";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/logo";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";
import type { User } from "@/lib/types";

type Mode = "login" | "signup";

const KNOWN_ERRORS = new Set([
  "invalid_credentials",
  "username_taken",
  "invalid_username",
  "weak_password",
  "invalid_display_name",
  "too_many_attempts",
  "suspended",
  "server_error",
]);

export function LoginModal() {
  const t = useT();
  const { showLoginModal, setShowLoginModal, login } = useAppStore();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup"
            ? { mode: "signup", username: username.trim(), password, displayName: displayName.trim() || username.trim() }
            : { username: username.trim(), password }
        ),
      });
      const data = (await res.json().catch(() => ({}))) as { user?: User; error?: string };
      if (!res.ok || !data.user) {
        const code = data.error && KNOWN_ERRORS.has(data.error) ? data.error : "server_error";
        toast.error(t(`login.errors.${code}`));
        return;
      }
      login(data.user);
      toast.success(`${t("login.welcome")} 👋 ${data.user.displayName}`);
      setPassword("");
    } catch {
      toast.error(t("login.networkError"));
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = username.trim().length > 0 && password.length > 0 && !loading;

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

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label={t("login.title")}>
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors cursor-pointer ${
                mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(m === "login" ? "login.loginTab" : "login.signupTab")}
            </button>
          ))}
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) void submit();
          }}
        >
          {mode === "signup" ? (
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("login.displayName")}
              autoComplete="name"
              aria-label={t("login.displayName")}
              maxLength={64}
            />
          ) : null}
          <div className="space-y-1">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("login.username")}
              autoComplete="username"
              aria-label={t("login.username")}
              dir="ltr"
              className="text-left"
              maxLength={32}
            />
            {mode === "signup" ? (
              <p className="px-1 text-[11px] leading-5 text-muted-foreground">{t("login.usernameHint")}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("login.password")}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              aria-label={t("login.password")}
              dir="ltr"
              className="text-left"
              maxLength={128}
            />
            {mode === "signup" ? (
              <p className="px-1 text-[11px] leading-5 text-muted-foreground">{t("login.passwordHint")}</p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {t(mode === "signup" ? "login.signupSubmit" : "login.submit")}
          </Button>
          {mode === "signup" ? (
            <p className="text-center text-[11px] leading-5 text-muted-foreground">{t("login.firstAdminNote")}</p>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
