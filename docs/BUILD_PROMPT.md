# ASAMEET 2.0 — Design & Build Brief (master prompt)

> این پرامپت را به Claude Code (یا هر عامل برنامه‌نویس) بدهید تا نسخهٔ ۲٫۰ آسامیت را روی همین مخزن طراحی و بسازد. خودبسنده است: وضعیت دقیق فعلی کد، خطاهای شناخته‌شده و علت‌های محتمل، تصمیم‌های معماری، فهرست کارها با معیار پذیرش، مدل داده، قواعد کیفیت و فرایند تحویل — همه داخل آن است. متن اصلی انگلیسی است (دقیق‌ترین نتیجه از عامل‌های کدنویس)؛ همهٔ متن‌های داخل محصول فارسی می‌ماند.

---

## 0. Role, repository and operating rules

You are the principal engineer **and** product designer of **Asameet (آسامیت)** — "the intelligent conversation platform" (بستر هوشمند گفت‌وگو) by *A Programming Group (گروه برنامه‌نویسی آ)*. Your job: take the repository `Sinaaghaahmadi/asameet` from **v1.2.0** to **v2.0.0** — a product that institutions (schools, universities, companies, large organizations) can adopt — by delivering the milestones in §5 as reviewed, tested, released increments.

Before writing any code, read in this order: `CHANGELOG.md`, `docs/BRAND_BOOK.md`, `docs/DESIGN_SYSTEM.md`, `docs/DESIGN_PROMPT.md` (screen codes A01…I06 — the UI you are building), `docs/ASATALK.md`, `supabase/migrations/*.sql`, `src/lib/server/api.ts`, `src/lib/talk/*`, `.github/workflows/release.yml`.

Operating rules (non-negotiable):

1. **Work in vertical slices.** Each PR = one capability end-to-end: migration (`supabase/migrations/000N_*.sql`, additive, idempotent) + RPC functions + Next route + UI + i18n keys in all five locales (`src/lib/i18n/locales/{fa,en,fr,de,ar}.ts` — `fa.ts` is the type source) + tests + a `CHANGELOG.md` line under the next version. Persian PR titles/bodies, like the existing history.
2. **Keep the data-access pattern.** Every read/write goes through `public.api_*` `SECURITY DEFINER` functions that authenticate with the opaque session token; tables live in the private `app` schema with RLS deny-all; the anon key in `src/lib/server/api.ts` is public by design. Next routes stay thin adapters (`requireToken` → `rpc()` → JSON), with `assertSameOrigin` on every state-changing route. Never expose tables to PostgREST; never add a service-role key to the web app.
3. **Prove before you push.** `npx tsc --noEmit`, `npm run build`, the RPC smoke suite (§9) and the Playwright E2E flows (§9) must pass. Reset the test database afterwards (`truncate app.users cascade`) so the owner's first real signup still becomes the administrator.
4. **Secrets never enter the repo or the chat.** Optional runtime secrets are read from env: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_TURN_URL/USER/PASS`, SMS/email provider keys, LiveKit keys, VAPID keys. Document each in `.env.example` and `docs/DEPLOYMENT.md`; the app must degrade gracefully when one is missing.
5. **Brand and design are not optional.** Tokens from `DESIGN_SYSTEM.md`; screens from `DESIGN_PROMPT.md`; no blue; saffron only for assistant/decisions/recording; Persian RTL first-class; both themes; 44 px targets; AA contrast (white text on teal-700).
6. **Ship.** Versions in the three `package.json` files and `CHANGELOG.md` move together; releases are cut with the `release.yml` workflow (`workflow_dispatch`, inputs `version` and `app_url`), which stamps `versionName/versionCode` from the tag and signs both APKs with the repository's release key. v2.0.0 ⇒ `versionCode 20000`.

## 1. Product and brand DNA (compressed)

Asameet is where an institution talks and gets things done: messaging, calls, meetings with recording, online classes, and an **assistant** that turns conversations into minutes, decisions and action items. Big idea: **حرف، تصمیم می‌شود — Where talk becomes decisions.** Personality: the caring sage — calm, precise, warm; "شما"; no hype. Family: the "Asa" family (Asameet, Asatalk, Asaex) share one **Asa account** and the bubble-plus-آ mark. Colors: teal `#0D9488` (primary surface `#0F766E`), deep sea `#134E4A`, mist neutrals, saffron `#D97706` as the only signal color; dark ground `#0B1716`. Type: Vazirmatn (fa/ar), Manrope (Latin), JetBrains Mono (codes). Motion: 120/200/320 ms, signature "madda-dot pulse". Everything else is in `docs/BRAND_BOOK.md`.

## 2. Baseline — exactly what exists at v1.2.0

- **Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4, TanStack Query, Zustand, Framer Motion, Radix UI, Recharts, Lucide; Postgres on Supabase (project `asameet`, region eu-central-1) reached only through `public.api_*` RPCs; sessions = random tokens hashed in `app.sessions`, delivered in the `httpOnly` cookie `asameet_session` (30 days); bcrypt passwords; per-client login rate limit; CSRF origin check.
- **Two UIs share one database and one account system:**
  - **Asameet app** at `/` — landing + app shell with tabs Chats / Calls / Meetings / Classes / Admin (`src/components/{messenger,calls,meetings,admin,shared}`). Meetings, classes and the old calls tab are **UI simulations** over persisted records (no media). Admin: dashboard with real stats, users table with suspend/activate, CSV export, server metrics.
  - **Asatalk** at `/talk` — the Telegram-grade messenger and calling client (`src/app/talk`, `src/components/asatalk`, `src/lib/talk`, `src/stores/talk-store.ts`, `supabase/migrations/0003_asatalk.sql`): private/group (≤200)/channel chats with owner/admin/member roles, invite links and public usernames, saved messages, photo/file/video, **voice messages with waveform**, round video messages, stickers ("Asa" mascot pack), reply/forward/edit/delete/pin/reactions/multi-select, read ticks, typing, chat folders, pin/mute, drafts, search, block; **real 1:1 WebRTC audio/video calls** (public STUN, optional TURN via `NEXT_PUBLIC_TURN_*`, signaling through `api_call_signal`/`api_call_poll` polled every second), incoming ring, mute/camera/flip/screen-share/speaker/PiP, call history; up to 5 accounts per browser; full settings (profile, notifications, privacy & security incl. change password and active sessions, chat appearance with 7 accent hues and 6 wallpapers, folders, data, language, about); its own PWA manifest and icons; OKLCH-driven design in `src/app/talk/talk.css`.
- **RPC surface (43):** `api_signup login logout me ping users update_profile update_settings change_password sessions session_terminate chats create_chat chat_update chat_members chat_prefs chat_join chat_clear saved_chat messages send_message message_action mark_read pin_chat typing search_messages media upload_media calls call_start call_incoming call_answer call_signal call_poll call_end meetings meeting_create meeting_get meeting_action classes class_create class_action admin_stats admin_user_action admin_export`. Routes mirror them under `src/app/api/**`.
- **Media today:** blobs are uploaded as **base64 JSON** to `/api/media` (client cap `MAX_UPLOAD_BYTES = 6 MB`) and stored **inside Postgres** (`app.media.data text`), streamed back through `/api/media/:id`.
- **Realtime today:** polling only (chats 5 s, messages 3 s, typing/presence via `api_typing`/`api_ping`, calls 1 s).
- **Identity today:** username + password; first account = admin; no phone/email, no OTP, no organizations, no roles beyond user/teacher/host/admin.
- **PWA:** manifest with screenshots and `display_override`, hand-written `public/sw.js` (v3). **Android:** two Capacitor wrappers — `mobile/asameet` → `https://asameet.vercel.app/`, `mobile/asameet-messenger` → `https://asameet.vercel.app/talk` — built and signed by `release.yml`. **Hosting:** Vercel (auto-deploy from `main`); Docker/`nginx.conf.example` for self-hosting.
- **Docs:** `BRAND_BOOK.md`, `DESIGN_SYSTEM.md`, `DESIGN_PROMPT.md`, `ASATALK.md`, `ANDROID.md`, `DEPLOYMENT.md`, `ASAMEET_PROMPT.md` (the original v1 brief — historical).

## 3. Known failures — fix these first (Milestone 0)

Both failed in the owner's real-device tests. Reproduce on a mid-range Android (Chrome + the Capacitor wrapper) and on iOS Safari before changing anything, keep a written diagnosis in the PR, and add regression tests.

### 3.1 Video calls do not connect

Probable root causes, in order of likelihood — verify each with `chrome://webrtc-internals` and a diagnostics overlay you add to the call screen (ICE gathering/connection state, selected candidate pair type, signaling round-trip):

1. **No TURN.** Public STUN alone fails behind carrier-grade NAT (typical for mobile networks in Iran). Make a TURN relay **mandatory in production**: self-host coturn (Docker, TLS on 443, static-auth-secret, time-limited credentials minted by a Next route `/api/calls/ice` that reads `TURN_SECRET` — never ship long-lived TURN passwords in `NEXT_PUBLIC_*`), or a managed TURN as fallback. Add `iceTransportPolicy: "relay"` as a runtime toggle for diagnostics.
2. **Signaling race and loss over 1-second polling.** Implement the *perfect negotiation* pattern (polite/impolite peer), buffer remote ICE candidates until `setRemoteDescription` resolves, handle glare, and add ICE restart on `failed`/`disconnected`. Replace DB polling with **Supabase Realtime broadcast channels** per call (`call:<id>`) with the polling path kept as automatic fallback when the socket cannot connect; target signaling latency < 300 ms.
3. **Media permissions and secure context.** Pre-flight `navigator.permissions` + a clear permission-denied screen (C12); confirm the Capacitor webview runs the site from `https://asameet.vercel.app` (it does) and add `Permissions-Policy: camera=(self), microphone=(self)` headers; on iOS require a user gesture before `getUserMedia`; fall back to audio-only when the camera fails and say so in the UI.
4. **Codec/constraints.** Prefer H.264 on iOS and VP8 elsewhere via `setCodecPreferences`; cap video at 720p/24 fps on mobile; degrade to 360p on poor RTT (use `getStats`).
5. **Group and meeting calls are not P2P work.** For anything beyond 1:1 use an SFU: integrate **LiveKit** (open-source, self-hostable; LiveKit Cloud acceptable to start) behind a Next route that mints room tokens from the session; meetings (D-screens), classes (E-screens) and group calls (C07) all run on LiveKit rooms; recording via LiveKit Egress into the media storage of §4.3.

Acceptance: two real phones on different mobile networks complete a 1:1 video call within 5 s, survive a 10 s network drop (ICE restart), switch camera, share screen from desktop, minimize to PiP while chatting, and the call log shows correct duration and missed states. Three or more participants join a LiveKit room from mobile and desktop with gallery/speaker views.

### 3.2 Voice messages fail to send

Probable root causes — verify with device logs and network traces:

1. **Payload too large for the platform.** Base64-in-JSON inflates by 33 % and Vercel serverless request bodies are capped at ~4.5 MB, so a recording near the 6 MB client cap fails with 413 and no useful error. **Move media out of Postgres into Supabase Storage** (private bucket `media`, path `org/<orgId>/chat/<chatId>/<mediaId>`): upload from the client with a short-lived signed upload URL minted by `/api/media/sign` (falls back to chunked upload through Next, ≤ 3 MB per chunk, when the direct route is unreachable), keep metadata only in `app.media` (`storage_path`, `mime`, `bytes`, `duration`, `waveform jsonb`, `width/height`), and serve through signed download URLs. Migrate existing base64 rows with a one-off script.
2. **Recorder mime negotiation.** iOS Safari records only `audio/mp4` (AAC); some Android webviews support none of the preferred types. Keep the `pickMimeType` cascade but ensure the *chosen* mime is what gets uploaded and what the `<audio>` element is told; add an Opus re-encode step on the server (ffmpeg via a lightweight worker or LiveKit Egress) so every voice bubble plays everywhere; show the real failure reason to the user («ضبط در این مرورگر پشتیبانی نمی‌شود» vs «ارسال ناموفق — دوباره تلاش کنید»).
3. **Gesture and lifecycle.** Hold-to-record must start `MediaRecorder` inside the pointer-down handler; handle `visibilitychange` (pause on background), release the mic track on cancel, and cap recordings at 10 minutes with a visible timer.
4. **Playback UX per `DESIGN_PROMPT.md` B08:** play button, waveform progress, duration, 1×/1.5×/2× speed, listened state, background mini-bar, optional assistant transcript.

Acceptance: a 3-minute voice message recorded on Android Chrome, the Android wrapper and iOS Safari uploads, appears with a waveform on the other side within 3 s, plays on every platform, and a failed upload shows a retry that works.

## 4. Architecture decisions for 2.0

1. **One messenger.** Asatalk is the messaging and calling core of the family. Remove the older `src/components/messenger` and `src/components/calls` tabs from the Asameet shell and mount the Asatalk client inside it (shared shell, shared store), so Asameet = Asatalk + meetings + classes + assistant + admin. Keep `/talk` as the messenger-only entry (the messenger APK) — same components, same data. No duplicated features anywhere.
2. **Identity = Asa account.** Sign-in by **phone number or email + one-time code** (§5 M1); usernames become handles chosen after verification; passwords remain optional (existing accounts keep working). Sessions, devices and the multi-account switcher stay as they are.
3. **Organizations first.** Every user belongs to ≥ 1 organization; chats, meetings, classes and media are scoped to an organization; roles: owner, admin, teacher, host, member, guest; policies live on the organization.
4. **Realtime layer.** Supabase Realtime (broadcast + presence) for typing, presence, new-message pings and call signaling, with the existing polling as automatic fallback; server-side fan-out stays in Postgres (RPC), Realtime carries only "something changed" and call signals — never trusted as a source of truth.
5. **Media in object storage** (§3.2), never in row data; every media row is org-scoped and served through signed URLs with expiry ≤ 1 h.
6. **Voice/video: WebRTC P2P with mandatory TURN for 1:1; LiveKit SFU for ≥ 3 participants, meetings, classes and recording.**
7. **Notifications:** Web Push (VAPID) for PWA/desktop and FCM through the Capacitor wrappers; per-chat and quiet-hours preferences already exist in settings.
8. **Search:** Postgres full-text (`pg_trgm` + `tsvector` with simple config for Persian/Arabic) over messages, people and organizations.
9. **Assistant:** Claude via `/api/ai` (existing), now fed by LiveKit transcription or uploaded audio → transcript → minutes/decisions/action items posted into the meeting's chat; keep the demo fallback when the key is missing.
10. **Observability and safety:** structured server logs (no PII), audit log table for admin actions, rate limits on OTP/media/search, `Content-Security-Policy` and `Permissions-Policy` headers, dependency audit in CI.

## 5. Milestones with acceptance criteria

**M0 — Make calls and voice work** (§3). Diagnosis PR + fix PRs. Done when the acceptance criteria in §3 pass on real devices and the RPC/E2E suites are extended.

**M1 — Identity and onboarding (A01–A12).** Splash with the madda-dot morph and a reduced-motion variant; **language selection first**; sign-in by phone (country picker, default +98) or email; 6-digit OTP with resend countdown and paste-to-fill; email magic link; handle + display name + avatar; join/create organization (invite link, code, QR); sync from Asatalk (contacts/presence — same account, so this is a consent screen + directory import); permissions; first-run tips. Tables: `app.identities`, `app.otp_codes` (hashed, 5-minute expiry, 5 attempts, per-identity and per-client rate limit); providers behind an interface (`sms: kavenegar | twilio | log`, `email: resend | smtp | log`) with a `log` provider that prints codes in development. Existing username/password accounts keep working and can add a phone/email later. Done when a new user reaches Home in under two minutes on a phone, and the E2E suite covers phone, email and legacy paths.

**M2 — Organizations, roles, policies (G01–G12, H10).** `app.organizations`, `app.org_members(role)`, `app.org_invites`, `app.audit_log`, `app.policies`; organization switcher in the rail and mobile menu; co-branding (org logo next to the Asameet lockup, per `BRAND_BOOK.md` §9); admin console rebuilt to the G-screens: dashboard, users (search/filter/role change/suspend), invitations and bulk CSV import (rebuilt safely — no default passwords), departments/teams, roles & permissions, policies (retention, who may create groups/channels, recording, external guests), audit log, branding, integrations, usage, server health, export. Done when an owner can set up a school with 3 teachers and 30 students from CSV in under 10 minutes and every admin action appears in the audit log.

**M3 — Messenger unification (B01–B19) and realtime.** One Asatalk-based messenger inside the Asameet shell; org-scoped chats and directory; Realtime for typing/presence/new-message with polling fallback; Web Push + FCM; media in Storage; full-text search; message edit history; drafts synced across devices. Done when two users on different devices see each other's messages, typing and presence within 1 s over Realtime, and within 5 s when the socket is blocked.

**M4 — Meetings and classes on LiveKit (D01–D12, E01–E08).** Scheduling with calendar/agenda, lobby with device check, waiting room, gallery/speaker/pinned views, screen share with annotation, raise-hand queue, reactions, polls, breakout rooms, recording with consent banner (LiveKit Egress → Storage), meeting chat = a channel bound to the meeting, whiteboard (tldraw, shared state), automatic attendance from join/leave events, quizzes, class reports. Done when a 25-student class runs 45 minutes on mobile and desktop with recording and attendance exported.

**M5 — Assistant (F01–F05).** Live transcript in meetings, minutes/decisions/action items posted to the meeting chat with saffron accent, brainstorm mode, transcript view for voice messages (opt-in), graceful demo mode without a key. Done when a recorded meeting yields a minutes document within 60 s of ending.

**M6 — Release 2.0.** Both themes and RTL/LTR audited against `DESIGN_PROMPT.md` §10; Lighthouse PWA ≥ 90 and performance ≥ 80 on a mid-range Android profile; `CHANGELOG.md` `[2.0.0]`; `release.yml` dispatched with `version=v2.0.0`; both APKs verified (signature `5C:FB:DD:4D…`, `versionCode 20000`, correct `server.url`); `docs/DEPLOYMENT.md` updated with TURN/LiveKit/SMS/email/push variables; database reset so the owner's first signup is the admin.

## 6. Data model additions (sketch — refine in migrations 0004+)

```sql
-- identity
app.identities(id, user_id, kind check in ('phone','email'), value citext unique, verified_at, is_primary)
app.otp_codes(id, identity_value citext, code_hash, purpose, client, expires_at, attempts int, consumed_at)
-- organizations
app.organizations(id, slug citext unique, name, kind check in ('school','university','company','other'), logo_media_id, settings jsonb, created_by, created_at)
app.org_members(org_id, user_id, role check in ('owner','admin','teacher','host','member','guest'), department, joined_at, primary key(org_id,user_id))
app.org_invites(id, org_id, code unique, role, max_uses, uses, expires_at, created_by)
app.departments(id, org_id, name, parent_id)
app.policies(org_id primary key, retention_days, who_can_create_groups, who_can_create_channels, recording_allowed, guests_allowed, updated_by, updated_at)
app.audit_log(id, org_id, actor_id, action, target_type, target_id, meta jsonb, created_at)
-- scoping
alter table app.chats add column org_id uuid references app.organizations(id);
alter table app.meetings add column org_id uuid, add column room_name text, add column recording_media_id uuid, add column waiting_room boolean default true;
alter table app.class_sessions add column org_id uuid, add column room_name text;
-- media in storage
alter table app.media add column storage_path text, add column bytes int, add column duration int, add column width int, add column height int, add column waveform jsonb, add column org_id uuid; -- data column dropped after migration
-- notifications & search
app.push_subscriptions(id, user_id, kind check in ('webpush','fcm'), endpoint_or_token text unique, keys jsonb, user_agent, created_at)
alter table app.messages add column search tsvector generated always as (to_tsvector('simple', coalesce(content,''))) stored; create index on app.messages using gin(search);
-- assistant
app.transcripts(id, org_id, meeting_id, media_id, language, text, segments jsonb, created_at)
```

Every new RPC follows the existing conventions: `p_token` first, `app.uid()`/`app.require_admin()` (add `app.require_org_role(p_token, org_id, roles[])`), stable error codes (`unauthorized`, `forbidden`, `not_found`, `bad_request`, `too_many_attempts`, …), `SECURITY DEFINER` with `set search_path = app, extensions`, and JSON output shaped like `src/lib/types.ts`.

## 7. API additions (names)

`api_otp_request(identity, purpose, client)`, `api_otp_verify(identity, code, client)` → session; `api_identity_add/verify/remove`; `api_orgs`, `api_org_create`, `api_org_join(code)`, `api_org_invite_create`, `api_org_members`, `api_org_member_set_role`, `api_org_policies_get/set`, `api_org_audit`, `api_org_import_users` (CSV rows, no passwords — invites instead); `api_media_sign_upload`, `api_media_commit`, `api_media_sign_download`; `api_push_subscribe/unsubscribe`; `api_search` (messages/people/orgs); `api_call_ice` (TURN credentials, via Next route with the secret); `api_room_token` (LiveKit); `api_meeting_schedule`, `api_meeting_poll_*`, `api_breakout_*`, `api_class_attendance_*`, `api_quiz_*`; `api_transcript_*`. Routes: `/api/auth/otp`, `/api/auth/verify`, `/api/orgs/**`, `/api/media/sign`, `/api/push`, `/api/calls/ice`, `/api/rooms/token`, `/api/search`.

## 8. UI/UX rules for the build

Implement the screens of `docs/DESIGN_PROMPT.md` by code (A→I) in the milestone that owns them; if a design file exists, match it; if not, design in code from the tokens. Persian RTL is the default and every screen is checked in English LTR and dark theme before a PR is opened (Playwright screenshots attached to the PR). Empty/loading/error/offline states are part of the definition of done for every list. The old glass/3D treatment stays on landing and onboarding only. Copy comes from `DESIGN_PROMPT.md` §8 and the brand voice rules; new strings go to all five locales in the same PR.

## 9. Quality bar

- **Tests:** extend the direct RPC smoke suite (signup/login/OTP/orgs/chats/media/calls/admin — currently 43 checks, keep it green) and the Playwright E2E flows: onboarding by phone and email, two-user chat with realtime, voice message round-trip, 1:1 call connect/reconnect (use fake media devices in CI), org setup by an owner, admin suspend, teacher class with attendance. Run them against the standalone build (`node .next/standalone/server.js`), then reset the database.
- **Security:** OTP brute-force limits (per identity and per client), signed URL expiry, MIME sniffing and size limits on upload, org-scoping checks on every RPC (a member of org A must never read org B — write negative tests), CSRF origin check on every mutating route, no PII in logs, dependency audit in CI, `Permissions-Policy` for camera/mic, TURN credentials time-limited.
- **Performance budgets:** first load JS ≤ 250 kB gzip for the app shell, LCP ≤ 2.5 s and INP ≤ 200 ms on a mid-range Android, message send-to-render ≤ 150 ms locally, list virtualization above 200 rows.
- **Accessibility:** AA contrast, focus rings, `aria-label` on icon buttons, reduced-motion variants, pinch-zoom free, screen-reader labels for call and recording state.
- **i18n:** five locales in lockstep (the compiler enforces it), Persian digits in Persian UI, `unicode-bidi: isolate` for mixed text, directional icons mirrored in RTL.

## 10. Delivery process

Branch per slice → PR (Persian title/body, screenshots, test evidence) → CI green → squash-merge to `main` (Vercel deploys automatically) → after each milestone bump versions and `CHANGELOG.md`, dispatch `release.yml` for `vX.Y.Z` with `app_url=https://asameet.vercel.app` (or the production domain once `asameet.online` is live), verify the APK signatures and the release body, and reset the database used for testing. Never rewrite `main` history; never commit secrets; never re-introduce demo data or default passwords.

## 11. Copy (Persian primary)

Reuse `docs/DESIGN_PROMPT.md` §8 verbatim, plus:

- OTP request: «کد تأیید به شمارهٔ شما پیامک شد» / «کد تأیید به ایمیل شما ارسال شد» · «کد را وارد کنید» · «ارسال دوباره تا ۰:۴۲» · «کد اشتباه است؛ ۳ تلاش دیگر دارید» · «کد منقضی شده؛ کد جدید بگیرید»
- Organization: «به سازمان خود بپیوندید» · «کد دعوت یا لینک» · «ساخت سازمان جدید» · «شما مالک این سازمان هستید» · «دعوت ۳۰ نفر از فایل CSV»
- Calls: «در حال اتصال…» · «اتصال ضعیف است — تصویر کم‌کیفیت شد» · «تماس قطع شد؛ در حال تلاش دوباره» · «دسترسی به دوربین داده نشده — از تنظیمات مرورگر فعال کنید»
- Voice: «برای ضبط نگه دارید» · «برای لغو به چپ بکشید» · «ضبط قفل شد» · «ضبط در این مرورگر پشتیبانی نمی‌شود» · «ارسال ناموفق — دوباره تلاش کنید»

## 12. Definition of done — reject your own work if…

a feature exists twice (old messenger vs Asatalk); a call cannot connect between two mobile networks; a voice message over 2 MB fails; media is stored in a table column; an org member can read another org's data; OTP has no rate limit; a screen lacks empty/error/offline states or a dark/RTL check; a string is missing in any locale; the release is not signed with the repository key; the database still contains test accounts after the run; or `docs/` no longer describes what the code does.
