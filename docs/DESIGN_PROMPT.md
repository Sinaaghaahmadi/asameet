# ASAMEET — Complete UI/UX Design Brief

> Paste everything below this line into Claude Design (or any capable design AI). It is self-contained: brand DNA, product definition, screen inventory, interaction rules, copy, and the deliverable format are all inside.

---

## 0. Your role and the goal

You are the principal product designer for **Asameet (آسامیت)** — "the intelligent conversation platform" (بستر هوشمند گفت‌وگو) built by *A Programming Group (گروه برنامه‌نویسی آ)*. Design the **complete UI/UX of the product: every screen, every state**, for mobile (iOS/Android), tablet and desktop/web, in **Persian (RTL, default)** and **English (LTR)**, in **light and dark** themes. The result must feel like a first-class sibling of Telegram in fluency and speed, upgraded with the best institutional features of Microsoft Teams, Zoom and Workplace/Messenger — and it must look unmistakably like Asameet, never like a reskin of any of them.

Work like a studio that ships: real content, real Persian copy (provided below), consistent components, organized artboards, and a prototype-ready flow. Do not use lorem ipsum, stock smiling photos, emoji as icons, or any blue accent.

## 1. The product in one breath

Asameet is where an **institution** — a school, a university, a company, a large enterprise — talks and gets things done: messaging (private, group, channel), voice/video calls, meetings with recording, online classes with whiteboard and attendance, and an **assistant** that turns conversations into minutes, decisions and action items. Big idea: **حرف، تصمیم می‌شود — Where talk becomes decisions.**

Positioning: unlike consumer messengers it is organizational (roles, workspaces, admin console, self-hosting); unlike Western meeting tools it is Persian-native with first-class RTL, regional pricing and availability. Personality: **the caring sage** — calm, precise, warm; formal-but-human ("شما"), never hype, never bureaucratic.

Primary audiences: school principals and teachers; university IT directors, professors and students; HR/operations managers in companies; CIOs of large organizations. Design for a teacher on a mid-range Android phone and a CIO on a 27-inch monitor with equal care.

## 2. Brand DNA (use exactly)

**Logo.** A chat bubble (superellipse, tail bottom-left, tail orientation never mirrors) containing a peak "A" with a dot above it — read simultaneously as Latin A, Persian آ (dot = madda) and a person with open arms. Product marks add a small deep-teal badge with a white Lucide glyph in the bottom-end corner: Messenger (send), Meet (video), Class (graduation-cap), Admin (shield). Use the standalone "آ glyph" (peak + dot) for favicons, avatar fallback and the motion signature. Reversed (white bubble, teal glyph) on dark/photo backgrounds. Clear space = 2× dot diameter; minimum 24 px.

**Color tokens.**
- Brand teal `#0D9488` (asameet) · primary button/AA text surface `#0F766E` (teal-700) · light accent `#2DD4BF` (dark-theme brand) · deep sea ink `#134E4A` · teal scale 50–950: `#F0FDFA #CCFBF1 #99F6E4 #5EEAD4 #2DD4BF #14B8A6 #0D9488 #0F766E #115E59 #134E4A #0B1716`
- Neutrals "Mist" (teal-biased, never pure grey): ground `#F4FAF9`, card `#FFFFFF`, border `#D3E1DE`, secondary text `#526864`, primary text `#12302D`
- Dark theme: ground `#0B1716`, card `#122120`, border `#24413D`, text `#E6F2EF`, secondary `#93ABA6`, brand `#2DD4BF`
- Signal "Saffron" `#D97706` (dark `#FBBF24`): **only** for the assistant, decisions/action items, and the recording indicator. Never more than one saffron element per screen. It is not a second brand color.
- Semantic: success `#059669` / `#34D399`, warning `#D97706` / `#FBBF24`, error `#DC2626` / `#F87171`, info = teal. **No blue anywhere.**
- Message bubbles: own = teal `#0D9488` with white text (dark: `#0F766E`), others = card white (dark `#1A2C2A`). Chat background: `#EEF6F4` with a faint dot grid (dark `#0E1B1A`).
- Usage ratio 60 % mist neutrals / 30 % teal family / 10 % saffron + semantic.

**Typography.** Persian/Arabic: **Vazirmatn**. Latin: **Manrope** (display 800, UI 600–700). Code/OTP/IDs: **JetBrains Mono**. Scale: Display 40/1.3·900, H1 32/1.35·800, H2 24/1.4·800, H3 20/1.5·700, Body 16/1.8·400, Message 15/1.7, Small 14/1.7·500, Caption 12/1.6·600. Persian line-height never below 1.7. Persian digits in Persian UI (۱۴۰۵), Latin digits in codes. Half-space (نیم‌فاصله) mandatory; guillemets «»; no kashida in UI.

**Shape & surface.** Radius: sm 8, md 12, lg 16, xl 20, bubble 18 (4 px on the sender-side top corner), pill 999. Spacing on a 4-pt grid (4·8·12·16·20·24·32·40·48·64). Elevation: flat → card (0 1px 2px) → float (0 12px 32px / 10 %) → modal (0 24px 60px / 18 %). Glassmorphism (blur 16, saturate 180 %, 65 % fill) and 3D glass icons appear **only** on splash/onboarding/marketing and empty-state heroes; working screens (chat, call, class, admin) are flat, quiet and content-first.

**Motion.** Three durations: 120 ms feedback, 200 ms state change, 320 ms screen transition; easing `cubic-bezier(.2,.8,.2,1)`. Signature: **the madda-dot pulse** — the dot above the آ emits a soft expanding ring; use it for loading, presence, recording and incoming calls. RTL screens enter from the right. Honor reduced-motion. Nothing readable is hidden behind an animation.

**Iconography.** Lucide, stroke 1.75, sizes 16/20/24. Directional icons mirror in RTL; symbolic ones never do. No emoji as icons.

**Voice (microcopy).** Short and complete; "شما"; errors say what happened + what to do; outcomes not features. Words: گفت‌وگو/چت, جلسه (not میتینگ), کلاس, دستیار (not AI/ربات), مدیر/مدیریت (not ادمین), ثبت‌نام/ورود.

## 3. Interaction DNA — what to take from whom

**From Telegram (replicate the fluency almost exactly):** chat list with avatar-initials on stable colors, one-line preview with sender name in groups, time, unread badge, pin, mute; chat folders/filters (All, Unread, Groups, Channels, custom); asymmetric bubbles with ✓ sent / ✓✓ delivered / ✓✓ colored read; long-press context menu (reply, forward, copy, pin, react, edit, delete, select); swipe-to-reply; reply quote and forward header; reactions row under bubbles; sticky date separators; jump-to-bottom with unread count; composer that turns the mic into send when text exists; hold-to-record voice with slide-to-cancel and slide-up-to-lock; attachment sheet (gallery, file, location, contact, poll); media viewer with captions; message search with calendar jump; profile pages with shared media tabs; groups (members, admins, permissions, invite links, join requests), channels (subscribers, admin-only posting, comments), typing/recording indicators; settings information architecture; folder tabs on desktop; three-pane desktop layout.

**From Microsoft Teams:** organizations/workspaces with departments and teams; roles (owner, admin, teacher/host, member, guest) and role badges; presence statuses (available, busy, do-not-disturb, in a meeting, in class, away) with automatic switching; meeting chat and participants pane inside a meeting; calendar/scheduling with agenda and invite; organization directory with departments; admin console with policies and audit log; co-branding (institution logo next to Asameet).

**From Zoom:** gallery and speaker views, pinned/spotlight participant, active-speaker highlight, waiting room/lobby with device check, breakout rooms, raise hand queue, non-verbal reactions, recording indicator with consent notice, screen share with annotation, polls, whiteboard, end-meeting summary.

**From Workplace / Messenger:** reaction set and read-receipt avatars on group messages, group "announcement" posts with comments, quick "story-like" org announcements at the top of the chat list (institution notices), live broadcast to a channel, mentions with autocomplete.

Everything above is filtered through Asameet's principles: content is the hero; one saffron element per screen; institutional clarity over social noise.

## 4. Mandatory requirements (non-negotiable)

1. **Onboarding order is fixed:** Splash → **Language selection first** → Sign in → Verification code → Profile → Join or create an organization → Permissions → Home.
2. **Splash / entry must be creative and memorable:** an aurora of soft teal blobs on mist; the آ glyph's dot pulses, then morphs into the chat bubble, then the wordmark آسامیت / Asameet settles in. Design the resting frame as a beautiful still, and describe the 1.2 s motion in a note. Include a reduced-motion variant.
3. **Language selection screen:** five languages shown in their own script (فارسی، English، العربية، Français، Deutsch), auto-detected suggestion pre-selected, no flags, direction switches live on selection.
4. **Sign-in with phone number or email** (segmented control), country-code picker defaulting to the device region (+98 for Iran), then a 6-box **OTP** screen with paste-to-fill, resend countdown, "change number/email" link, and a magic-link alternative for email. Username is not an entry method; it is chosen on the profile step (handle, with availability check).
5. **Video calls must be designed completely** (they failed in testing and will be rebuilt against these screens): outgoing call, incoming full-screen and banner variants, 1:1 in-call with self-view PIP, group call grid (2–9 tiles then "+N"), controls (mic, camera, flip, speaker, share screen, raise hand, more), network-quality badge and "poor connection" handling, switch video↔audio, minimize to floating PIP while chatting, screen share view with presenter tile, call ended summary (duration, quality, "call again", "send message"), missed call states in chat and call log, ring/vibrate settings, and permission-denied states for camera/mic.
6. **Voice messages must be designed completely** (they failed in testing): hold-to-record with live waveform and timer, slide-to-cancel and slide-up-to-lock, locked-recording bar with pause/delete/send, preview before send, the voice bubble (play button, waveform with progress, duration, 1×/1.5×/2× speed, listened state), background playback mini-bar, and an assistant-generated transcript toggle under the bubble.
7. **Asatalk sync:** Asameet and Asatalk (a sibling product of the same group) share one **Asa account**. Design: Settings → Connected apps → Asatalk (connected/not connected states, what is synced: contacts, presence, profile), a "Sync contacts from Asatalk" step in onboarding, a subtle "متصل به آساتاک" chip on synced contacts, and a hand-off action "Open in Asatalk". Do not invent Asatalk's own branding; show it as a neutral sibling mark with the shared bubble geometry.
8. **Institution-first:** every user belongs to at least one organization; the organization switcher lives in the top bar/rail; admin console is a full product surface, not an afterthought.

## 5. Screen inventory (design all of them)

Use the codes as artboard prefixes.

**A · Onboarding**
A01 Splash · A02 Language · A03 Welcome carousel (3 slides, glass 3D icons) · A04 Sign in (phone/email) · A05 Country picker · A06 Verification code · A07 Profile (name, handle with availability, avatar) · A08 Join organization (invite link / code / QR) · A09 Create organization (type: school/university/company/other, name, logo) · A10 Sync from Asatalk · A11 Permissions (notifications, contacts, mic/camera) · A12 Done / first-run tips

**B · Messenger**
B01 Chat list (folders, org notices strip, search) · B02 Chat list — compact/desktop 3-pane · B03 Private chat · B04 Group chat (sender names, read avatars) · B05 Channel (admin posting, comments) · B06 Composer states (empty/typing/reply/edit/attachment) · B07 Voice recording (hold, locked, preview) · B08 Voice bubble & transcript · B09 Message context menu & reactions picker · B10 Forward / select mode · B11 Attachment sheet · B12 Media viewer · B13 Search in chat + global search · B14 New chat / contacts (Asatalk chip) · B15 New group (name, members, permissions) · B16 Group/channel info & settings (members, admins, invite link, join requests) · B17 User profile (shared media, mutual groups, call buttons) · B18 Pinned messages & saved messages · B19 Folders manager

**C · Calls**
C01 Call log (missed/incoming/outgoing) · C02 Outgoing call · C03 Incoming call — full screen · C04 Incoming call — banner while in app · C05 1:1 audio call · C06 1:1 video call (PIP self-view) · C07 Group video call grid + speaker view · C08 Screen share (presenter tile) · C09 Floating PIP over chat · C10 Call ended summary · C11 Poor connection / reconnecting · C12 Permission denied (mic/camera)

**D · Meetings**
D01 Meetings home (upcoming, past, recordings) · D02 Schedule meeting (title, time, participants, recording policy, waiting room) · D03 Join by link / lobby with device check · D04 Waiting room (host view with admit) · D05 Meeting room — gallery · D06 Meeting room — speaker/pinned · D07 Side panel: chat / participants / raise-hand queue / polls · D08 Screen share with annotation · D09 Breakout rooms (create/assign/join) · D10 Recording indicator & consent · D11 Whiteboard · D12 End meeting → summary with assistant minutes

**E · Classes**
E01 Classes home (teacher vs student variants) · E02 Create class (schedule, students, materials) · E03 Class room — teacher (whiteboard, students grid, attendance, mute all, quiz) · E04 Class room — student (raise hand, answer quiz) · E05 Attendance sheet & export · E06 Quiz / poll in class · E07 Materials & recordings · E08 Class report (assistant summary, participation)

**F · Assistant**
F01 Assistant panel in meeting (live minutes, decisions, action items — saffron accent) · F02 Minutes document view & share · F03 Brainstorm mode · F04 Voice transcript view · F05 Assistant unavailable/demo state

**G · Admin console**
G01 Dashboard (users, active now, messages, meetings, weekly chart, role distribution) · G02 Users table (search, filters, suspend/activate, role change) · G03 Invitations & bulk import · G04 Departments & teams · G05 Roles & permissions · G06 Policies (retention, who can create groups/channels, recording, external guests) · G07 Audit log · G08 Branding (org logo co-brand, colors within limits) · G09 Integrations (Asatalk, calendar, SSO placeholder) · G10 Usage & billing · G11 Server/health (self-hosted) · G12 Export (CSV) & data requests

**H · Settings & profile**
H01 Settings home · H02 My profile · H03 Account & security (sessions/devices, change number/email, password) · H04 Notifications (per chat, quiet hours) · H05 Privacy (last seen, read receipts, who can call) · H06 Appearance (theme light/dark/system, chat background, text size, density) · H07 Language · H08 Connected apps — Asatalk · H09 Storage & data · H10 Organization membership & switching

**I · System states**
I01 Empty states (chats, calls, meetings, classes, search) · I02 Loading skeletons matching final layouts · I03 Errors (wrong code, taken handle, full meeting, suspended account, rate limited) · I04 Offline bar & queued messages · I05 Update available / maintenance · I06 Toasts & confirmations

## 6. Layout system

- **Desktop:** navigation rail 68 px (deep sea) with org switcher, tabs (Chats, Calls, Meetings, Classes, Admin), presence avatar at bottom; list pane 300–340 px; content pane; optional right panel (info/participants/assistant).
- **Tablet:** rail + list, content pushes list; meetings/classes take full width.
- **Mobile:** bottom tab bar (Chats, Calls, Meetings, Classes, Menu); chat list full-width; entering a chat replaces the list with a back affordance; calls/meetings are full-screen modals; composer respects the keyboard and safe areas.
- Density: comfortable (list row 68 px) default; compact (56 px) toggle for enterprise users.
- Bubble max width 75 % of pane, max 560 px.

## 7. States, edge cases and accessibility

Every list has skeleton, empty (one sentence + next action) and error (what happened + what happens next) states. Offline is a thin amber bar, never a modal; messages queue with a clock icon and send on reconnect. Suspended accounts see a clear explanation and a contact path. Rate-limited sign-in shows a countdown. Contrast ≥ 4.5:1 (white text sits on teal-700, never teal-600); touch targets ≥ 44 px; focus rings 2 px teal; pinch-zoom never disabled; recording/calls are announced with icon + text, not color alone.

## 8. Copy to use (Persian primary, English secondary)

- Language screen title: «زبان خود را انتخاب کنید» / "Choose your language"
- Sign in title: «ورود به آسامیت» / "Sign in to Asameet"; segmented: «شمارهٔ موبایل» · «ایمیل» / "Phone" · "Email"; hint: «کد تأیید برای شما ارسال می‌شود» / "We'll send you a verification code"
- OTP: «کد تأیید را وارد کنید» · «ارسال دوباره تا ۰:۴۲» · «تغییر شماره» / "Enter the code" · "Resend in 0:42" · "Change number"
- Profile: «نام نمایشی» · «نام کاربری» · «این نام کاربری قبلاً گرفته شده. یکی دیگر امتحان کنید.»
- Organization: «به سازمان خود بپیوندید» · «کد دعوت یا لینک» · «ساخت سازمان جدید» / "Join your organization"
- Asatalk: «اتصال به آساتاک» · «مخاطبان و وضعیت حضور شما همگام می‌شود» · «متصل به آساتاک» / "Connect Asatalk" · "Your contacts and presence stay in sync" · "Connected to Asatalk"
- Composer placeholder: «پیام بنویسید…» / "Write a message…"; recording hint: «برای لغو به چپ بکشید» / "Slide to cancel"
- Empty chats: «هنوز گفت‌وگویی ندارید» + «با «چت جدید» اولین پیام را بفرستید.»
- Incoming call: «تماس تصویری ورودی · آسامیت» · «پاسخ» · «رد»
- Assistant: «دستیار · صورت‌جلسه» · «تصمیم‌ها» · «اقدام‌ها» · «تولید صورت‌جلسه»
- Errors: «نام کاربری یا رمز عبور اشتباه است» · «تلاش‌های ناموفق زیاد بود؛ چند دقیقه بعد دوباره امتحان کنید» · «این حساب توسط مدیر مسدود شده است» · «اتصال قطع شد — پیام‌ها بعد از اتصال دوباره ارسال می‌شوند»
- Footer/about: «تهیه شده با قلب قرمز توسط ایرانی‌ها. گروه برنامه‌نویسی آ»

## 9. Deliverables and format

1. Artboards named `<code>-<name>-<fa|en>-<light|dark>-<mobile|tablet|desktop>` (e.g. `B03-private-chat-fa-light-mobile`). Persian/RTL/light/mobile is the default set for **every** screen; add dark for every screen; add English and desktop for A01–A07, B01–B08, C03–C07, D05–D07, E03, F01, G01–G02.
2. A **component sheet** built from the tokens: buttons (primary teal-700, glass, ghost, danger, signal-saffron), inputs (LTR fields for numbers/emails/handles), chat row, bubbles (own/other/voice/media/reply/system), composer states, call controls, meeting tile, participant row, assistant card, stat tile, toast, tabs, sheets, dialogs, avatars (initials on stable colors + presence dot), badges and chips (role, «متصل به آساتاک», recording).
3. An **iconography sheet** (Lucide set used, RTL mirroring list) and the **logo usage** frame (mark, product badges, reversed, glyph, clear space).
4. **Flow prototypes:** onboarding (A01→A12), send a voice message (B03→B07→B08), receive a video call while chatting (B03→C04→C06→C09), host a meeting with assistant minutes (D02→D03→D05→D07→D12), teacher runs a class (E02→E03→E05).
5. **Motion notes** on splash, madda-dot pulse, bubble entrance, call ring, recording lock.
6. A one-page **design rationale** explaining how Telegram fluency and institutional features were reconciled, and where saffron is used.

## 10. Quality bar — reject your own work if…

it uses blue; it hides content behind animation; it has more than one saffron element on a screen; bubbles are symmetric; Persian text is set below 1.7 line-height or mixed with Latin digits; the tail of the logo is mirrored; a working screen uses glass or 3D icons; an empty state has no next action; a call screen lacks a permission-denied state; a voice bubble has no speed control; any screen would be unreadable on a mid-range Android in sunlight.
