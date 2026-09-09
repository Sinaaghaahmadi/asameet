"use client";

/**
 * Approval page for QR sign-in, reached by scanning the code shown on the
 * signed-out device — with the in-app scanner or the phone's own camera app.
 *
 * The ticket travels in the URL fragment so it never reaches a server log or
 * a Referer header; the approval itself is a normal authenticated request.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, MonitorSmartphone, X } from "lucide-react";
import { toast } from "sonner";
import { talkApi, TalkApiError } from "@/lib/talk/api";
import { useT } from "@/lib/i18n";
import { GBtn } from "@/components/asatalk/glass";
import { Mascot } from "@/components/asatalk/mascots";

type State =
  | { k: "loading" }
  | { k: "anon" }
  | { k: "bad" }
  | { k: "ask"; userAgent: string }
  | { k: "done"; approved: boolean };

export default function QrApprovalPage() {
  const t = useT();
  const [state, setState] = useState<State>({ k: "loading" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = (window.location.hash.replace(/^#/, "") || "").trim();
    if (!/^[a-f0-9]{32}$/i.test(c)) return setState({ k: "bad" });
    setCode(c.toLowerCase());
    talkApi
      .qrPeek(c.toLowerCase())
      .then((r) => setState({ k: "ask", userAgent: r.userAgent }))
      .catch((e: unknown) => {
        const err = e instanceof TalkApiError ? e.code : "";
        setState({ k: err === "unauthorized" ? "anon" : "bad" });
      });
  }, []);

  const decide = useCallback(
    async (approve: boolean) => {
      setBusy(true);
      try {
        await talkApi.qrApprove(code, approve);
        setState({ k: "done", approved: approve });
      } catch {
        toast.error(t("talk.errors.generic"));
      } finally {
        setBusy(false);
      }
    },
    [code, t],
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
      {state.k === "loading" && (
        <Loader2 className="text-talk size-8 animate-spin" />
      )}

      {state.k === "anon" && (
        <>
          <Mascot pose="wave" size={140} />
          <p className="mt-4 text-[17px] font-bold">
            {t("talk.onboard.qrNeedLogin")}
          </p>
          <Link
            href="/"
            className="tg-btn tg-btn-primary tg-ripple mt-6 grid h-[52px] w-full place-items-center text-sm font-semibold"
          >
            {t("talk.onboard.signinTitle")}
          </Link>
        </>
      )}

      {state.k === "bad" && (
        <>
          <Mascot pose="sad" size={140} />
          <p className="mt-4 text-[17px] font-bold">
            {t("talk.onboard.qrExpired")}
          </p>
          <Link
            href="/"
            className="tg-btn tg-ripple mt-6 grid h-[52px] w-full place-items-center text-sm font-semibold"
          >
            {t("common.back")}
          </Link>
        </>
      )}

      {state.k === "ask" && (
        <>
          <span className="tg-glass grid size-24 place-items-center rounded-3xl">
            <MonitorSmartphone className="text-talk size-10" />
          </span>
          <h1 className="mt-5 text-[22px] font-black">
            {t("talk.onboard.qrApproveTitle")}
          </h1>
          <p className="tg-muted mt-1 text-sm leading-6">
            {t("talk.onboard.qrApproveSub")}
          </p>
          <p
            className="tg-glass mt-4 w-full rounded-2xl px-4 py-3 text-[13px] break-words"
            dir="ltr"
          >
            {state.userAgent || "Unknown device"}
          </p>
          <GBtn
            variant="primary"
            size="lg"
            className="mt-6 h-[52px] w-full"
            disabled={busy}
            onClick={() => void decide(true)}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {t("talk.onboard.approve")}
          </GBtn>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-red-500"
            disabled={busy}
            onClick={() => void decide(false)}
          >
            <X className="me-1 inline size-4" />
            {t("talk.onboard.reject")}
          </button>
        </>
      )}

      {state.k === "done" && (
        <>
          <Mascot pose={state.approved ? "love" : "sad"} size={140} />
          <p className="mt-4 text-[17px] font-bold">
            {t(
              state.approved
                ? "talk.onboard.qrApproved"
                : "talk.onboard.qrRejected",
            )}
          </p>
          <Link
            href="/"
            className="tg-btn tg-ripple mt-6 grid h-[52px] w-full place-items-center text-sm font-semibold"
          >
            {t("common.back")}
          </Link>
        </>
      )}
    </div>
  );
}
