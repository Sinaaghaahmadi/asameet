import webpush, { type PushSubscription } from "web-push";
import { rpc } from "@/lib/server/api";

/**
 * Web Push fan-out.
 *
 * Subscription endpoints are handed to this server by the database over an
 * authenticated RPC. That is safe because an endpoint on its own is inert:
 * push services verify the VAPID signature, and the private key never leaves
 * the environment. With no key configured push is simply off — the app falls
 * back to the in-page notifications it already had.
 */

const PUBLIC_KEY =
  process.env.ASATALK_VAPID_PUBLIC_KEY ??
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
  "";
const PRIVATE_KEY = process.env.ASATALK_VAPID_PRIVATE_KEY ?? "";
const SUBJECT = process.env.ASATALK_VAPID_SUBJECT ?? "mailto:info@asatalk.app";

export const pushEnabled = Boolean(PUBLIC_KEY && PRIVATE_KEY);
export const pushPublicKey = pushEnabled ? PUBLIC_KEY : null;

if (pushEnabled) webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId: string;
}

export type PushBody =
  | {
      kind: "message";
      chatId: string;
      title: string;
      body: string;
      tag: string;
      badge?: number;
    }
  | {
      kind: "call";
      callId: string;
      chatId?: string | null;
      type: "audio" | "video";
      title: string;
      body: string;
    };

/** Deliver to every target; dead endpoints are pruned as we learn about them. */
export async function sendPush(
  token: string,
  targets: PushTarget[],
  payload: PushBody,
): Promise<void> {
  if (!pushEnabled || targets.length === 0) return;
  const json = JSON.stringify(payload);
  const ttl = payload.kind === "call" ? 30 : 60 * 60 * 12;
  await Promise.all(
    targets.map(async (t) => {
      const sub: PushSubscription = {
        endpoint: t.endpoint,
        keys: { p256dh: t.p256dh, auth: t.auth },
      };
      try {
        await webpush.sendNotification(sub, json, {
          TTL: ttl,
          urgency: payload.kind === "call" ? "high" : "normal",
        });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await rpc("api_push_prune", {
            p_token: token,
            p_endpoint: t.endpoint,
          }).catch(() => {});
        }
      }
    }),
  );
}

/** Everyone in a chat who is not looking at the app right now. */
export async function chatTargets(
  token: string,
  chatId: string,
): Promise<PushTarget[]> {
  const data = await rpc<{ targets: PushTarget[] }>("api_push_targets", {
    p_token: token,
    p_chat_id: chatId,
  }).catch(() => ({ targets: [] as PushTarget[] }));
  return data.targets ?? [];
}

/** Whoever this call is ringing — presence is irrelevant for a call. */
export async function callTargets(
  token: string,
  callId: string,
): Promise<PushTarget[]> {
  const data = await rpc<{ targets: PushTarget[] }>("api_push_call_targets", {
    p_token: token,
    p_call_id: callId,
  }).catch(() => ({ targets: [] as PushTarget[] }));
  return data.targets ?? [];
}
