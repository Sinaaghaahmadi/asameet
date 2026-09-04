# پرامپت‌های طراحی UI/UX — Asatalk و Asameet

دو پرامپت مستقل برای ابزارهای طراحی هوش مصنوعی (Claude Design، Figma AI، v0 و مشابه). هر پرامپت خودکفاست: برند، توکن‌ها، فهرست کامل صفحات، جریان‌ها و معیار پذیرش را دارد. پرامپت‌ها به انگلیسی نوشته شده‌اند چون ابزارهای طراحی با آن دقیق‌تر کار می‌کنند؛ متن‌های داخل رابط باید **فارسی و راست‌چین** تولید شوند (در پرامپت تأکید شده).

نحوهٔ استفاده: کل بلوک یک پرامپت را کپی کنید. اگر ابزار محدودیت طول دارد، بخش «Screens» را در چند نوبت بدهید و بخش «Brand & System» را هر بار تکرار کنید.

---

## پرامپت ۱ — Asatalk (پیام‌رسان و تماس)

```text
ROLE
You are a principal product designer (ex-Telegram, ex-WhatsApp, ex-Signal) with 15 years in messaging UX. Design the complete UI/UX of "Asatalk" (آساتاک), a Persian-first messenger and calling app. Deliver every screen, every state, mobile-first (390×844) plus desktop (1440×900), light and dark, RTL Persian as the primary language with an LTR English variant of the key screens.

NORTH STAR
Asatalk must feel "almost exactly like Telegram" in structure, speed and information density, while borrowing the single best idea from each of WhatsApp, Facebook Messenger and Signal (listed below). It must never look like a Telegram clone: the brand is glassy, warm and playful-serious, with the "Asa" mascot and a distinctive blue.

BRAND & SYSTEM (apply exactly)
- Family: "Asa" (آسا). Product: Asatalk = "asa" (ink) + "talk" (Asa Sky). Persian wordmark: «آساتاک».
- Logo: the Asa Mark (an ascending "A" with a spark dot above) inside a circular speech bubble with a tail at 7 o'clock; gradient Sky 400→700 at 45°. Monochrome white mark for notifications.
- Colors (OKLCH-derived): Asa Sky #2F80ED (dark: #60A5FA) as brand; Ink #0F172A text; Mist #F6F9FB background (dark bg #0F1420); Sunrise #F59E0B accent for AI/celebration only; Success #10B981; Danger #EF4444. 60/30/10 rule: neutrals / brand / accent+status. Never use teal as a primary here (teal belongs to Asameet).
- User-selectable accents (7): Sky 240, Teal 175, Violet 295, Rose 5, Orange 55, Green 150, Indigo 270 (hue changes; everything re-tints).
- Type: Vazirmatn for Persian/Arabic, Inter for Latin. Scale 12/13/15/17/20/24/32/40/56. Body 15px, message text 15px (user adjustable 12–20). Persian line-height 1.7.
- Surfaces: "Asa Glass" = 55–80% white (or charcoal) + 18–24px blur + 170% saturation + 1px top highlight. Glass is for floating chrome (top bar, composer, menus, dialogs, drawer); content (bubbles, cards) sits on matte surfaces.
- Radii: 8/12/16/24/pill. Primary buttons are pills with a 135° brand gradient, colored soft shadow (brand 35%), inner top highlight, ripple from touch point.
- Bubbles: Telegram-style tails only on the last bubble of a cluster; outgoing = soft brand-tint gradient (dark: brand gradient), incoming = matte 92% white; time+ticks float at the end of the last line; on media they sit in a translucent pill.
- Motion: 120/200/320ms; ease cubic-bezier(.2,.8,.2,1); spring cubic-bezier(.34,1.56,.64,1) for buttons and new bubbles. Reduced-motion = fades only.
- Mascot "Asa": a glossy glass speech-bubble character with big eyes and pink cheeks. Use ONLY in empty states, onboarding, settings footers, celebrations and stickers. Never in headers, chat lists or during a connected call. 17 official poses: wave, phone, video, sleep, party, love, laugh, think, cool, sad, shush, megaphone, group, search, lock, thumbs, angry.
- Icons: Lucide, 1.75px stroke, rounded. Filled variant only for active state.
- RTL first: mirror directional icons (send, back, bubble tails); logical spacing.
- Accessibility: 4.5:1 contrast, 44px touch targets, visible focus, labels on every icon button.

FIRST-RUN FLOW (non-negotiable requirements)
1) Language picker is the FIRST screen: 5 languages (فارسی, English, Français, Deutsch, العربية) as large glass tiles with flag + native name; the selection re-renders the whole flow instantly and is remembered.
2) Splash / intro: a creative, memorable opener. Ideas to execute: the Asa mascot "inflating" from the spark dot into the full bubble, the brand gradient breathing behind frosted glass, floating glass message bubbles forming the wordmark, then a 4-slide carousel (Messaging · Calls · Groups & Channels · Multi-account) with the mascot changing pose per slide. Max 1.5s before the user can act. Design it in both light and dark.
3) Sign in with PHONE NUMBER or EMAIL (no username/password at first step): one smart field that detects phone vs email, country-code picker with flags and search (default +98), 6-digit code screen with auto-advance boxes, resend timer, "change number" link, then "Your name + photo" (photo optional, mascot placeholder), then optional username. Also design "Log in with QR from another device".
4) Permission primers (notifications, contacts, microphone/camera) as friendly glass sheets with the mascot, each explaining why, before the OS prompt.

SCREENS TO DELIVER (each with default / loading / empty / error where relevant; mobile + desktop)
Core
- Chat list: hamburger drawer button, search pill, folder tabs (All, Personal, Groups, Channels, Unread + custom folders with emoji), rows with avatar/online dot/title/preview/time/ticks/unread pill/pin/mute, swipe actions (pin, mute, archive, delete), long-press context menu, archived chats row, compose FAB (pencil) with menu: New group, New channel, Contacts, Join via link.
- Drawer: gradient header with avatar, name, @username, account switcher (up to 5 accounts as small avatars), items: Add account, New group, New channel, Contacts, Calls, Saved messages, Settings, Night mode toggle, "Asameet meetings" bridge, Log out.
- Conversation (private): header with avatar, name, status/last seen/typing dots in brand color, voice call, video call, search, more menu; pinned-message bar with cycling counter; date chips; unread divider; bubbles for text, emoji-only (large), photo (with caption), album/grid, video, file, voice (48-bar waveform, play, 1×/1.5×/2×), round video message (240px, tap to play with sound), sticker (no bubble), location, contact card, poll, link preview card, forwarded label, reply quote, edited label, reactions row, "seen by" for groups, system messages as translucent pills; scroll-to-bottom pill with unread count; selection mode header (forward, delete, copy).
- Composer: glass card with emoji button, auto-growing textarea, attach menu (photo/video, file, camera, location, contact, poll), primary FAB that swaps between send / microphone / video-message; recording state with red dot, timer, "slide to cancel", lock-to-hands-free, waveform live level ring; video-message recording with a round live preview; reply/edit preview strip; draft indicator.
- Emoji & stickers panel: tabs (recent, 9 emoji groups, Asa sticker pack, GIFs), search, skin-tone selector.
- Message context menu: quick reactions row, Reply, Copy, Forward, Edit, Pin, Select, Save, Delete (for me / for everyone), Report.
- Group conversation: sender names colored by hash hue, small avatars, admin badges, "X is typing", join/leave system pills, mention autocomplete (@), pinned messages list.
- Channel: broadcast footer ("Only admins can post" / Join button / Mute–Unmute toggle for members), post views counter, comments entry, share.
- Chat info (private): hero avatar, name, status, call buttons, username (copy), bio, notifications toggle, shared media tabs (media grid, files, voice, links), block, delete chat.
- Group/Channel info: editable avatar, name, description, public link (@username) with hint, invite link (copy, share, reset), members list with roles (owner crown, admin shield), add members, promote/demote/remove menu, permissions sheet, leave/delete.
- New group wizard (members → name/photo/description), New channel (name/photo/description, public/private), Contacts (search, online first, invite friends), Join via link (preview card → join).
- Forward picker sheet (search + chat list + optional comment).
- Global search: results grouped as Chats / People / Messages with highlighted matches; in-chat search with up/down navigation and date jump.
- Media viewer (lightbox with caption, share, save, delete, swipe between items).
Calls
- Calls tab: Recent (incoming/outgoing/missed/declined icons, duration, call-back) and Contacts.
- Incoming call (full screen): dark brand background with three drifting color halos, xxl avatar with ripple rings, caller name, "Incoming voice/video call", swipe-or-tap Accept (green, shaking) and Decline (red), "Reply with message".
- Outgoing/ringing, connecting, connected voice call: timer, end-to-end encrypted badge, controls: mute, camera on/off, flip camera, share screen, speaker/bluetooth, add person, minimize.
- Video call: remote video full-bleed, draggable local preview, gradient scrims, tap to hide controls, portrait+landscape, network-quality indicator, "peer camera off / muted" chips.
- Picture-in-picture mini window (160×200) draggable over the app.
- Call ended screen with duration and "Call again" / "Message".
Best-of borrowed features (design them)
- From WhatsApp: Status/Stories ring in a top strip and a Status viewer; voice-message playback speed and "listen before sending"; Communities (a home for multiple groups) as a folder-like screen.
- From Messenger: chat themes per conversation (accent + wallpaper preview), quick-reaction bar with custom emoji, message effects (confetti/heart burst) for celebrations, "Notes" (24h status text on avatar).
- From Signal: disappearing messages timer sheet (off/1h/1d/1w/custom) with a hourglass indicator, screen-security/blur in app switcher toggle, safety-number verification screen with QR, PIN lock screen (6-digit + biometrics) and "who can find me by number" privacy.
Settings (Telegram-complete)
- Root (profile header + sections: Account, General, About), Edit profile (photo, name, username with @ hint, bio 140), Accounts (switch, add, log out all), Notifications & sounds (per chat type, sound, preview, in-app sounds, browser permission), Privacy & security (last seen, profile photo, calls, forwards, group invites, blocked users, change password, PIN lock, active sessions, disappearing messages default), Chat settings (live preview bubble pair, theme light/dark/system, 7 accent swatches, 6 wallpapers (bubbles, doodle, gradient, waves, plain, stars), bubble radius slider, text size slider, animations, send-on-enter), Chat folders (create/edit, emoji, include chats), Data & storage (auto-download toggles, storage usage bar, clear cache), Devices (current + list, terminate), Language, About (logo, tagline, tech line, made-with-love), Help/FAQ.
Empty & error states with the mascot: no chats (sleeping), no results (searching), no messages (waving), offline banner (thinking), call failed (sad), permissions denied (lock).

DESKTOP LAYOUT
Three columns: chat list 360–400px | conversation | info 360px (slides in). Side panels (settings, contacts, new group) slide over the list column. Keyboard shortcuts hint on hover. Hover reveals reply/react affordances beside bubbles.

DELIVERABLES
- Complete screen set as artboards, grouped by flow, named "AT-<flow>-<screen>-<state>-<theme>".
- A components sheet: buttons (glass/primary/danger/success/ghost × sizes × states), inputs, avatar sizes, list row, chips/tabs, bubble anatomy, composer states, header, menu, sheet, switch, settings section, call controls, toast, empty state.
- Tokens page: colors (light/dark), type scale, spacing 4pt, radii, elevation, glass recipe, motion.
- App icon set (any + maskable), splash, store screenshots (6) with Persian captions.
Use real Persian content (names, messages, times in Persian digits), no lorem ipsum. Show every screen at rest with realistic data.
```

---

## پرامپت ۲ — Asameet (بستر هوشمند گفت‌وگو: جلسه، کلاس، دستیار)

```text
ROLE
You are a principal product designer who has shipped Google Meet, Zoom and Notion-class products. Design the complete UI/UX of "Asameet" (آسامیت), the Persian-first intelligent conversation platform: online meetings, virtual classes, an AI assistant for minutes/summaries, plus a lightweight team chat that hands off to its sibling messenger Asatalk. Deliver desktop-first (1440×900) and mobile (390×844), light and dark, RTL Persian primary with LTR English variants of key screens.

NORTH STAR
Meetings as effortless as a chat. Asameet is the calm, confident sibling of Asatalk: same family DNA (glass, Asa Mark, mascot) but teal instead of blue, quieter motion, denser information for work.

BRAND & SYSTEM (apply exactly)
- Family "Asa". Product wordmark: "asa" (ink) + "meet" (Asa Teal). Persian: «آسامیت».
- Logo: the Asa Mark (ascending "A" + spark dot) inside a rounded-square "meeting window" (22% corner) with two small "seat" bars under the A; gradient Teal 500→700 at 45°.
- Colors: Asa Teal #0D9488 (dark #14B8A6) brand; Ink #0F172A; Mist #F6F9FB (dark #0F1420); Sunrise #F59E0B reserved for the AI assistant and celebrations; Success #10B981; Danger #EF4444. No blue/indigo as primary (blue belongs to Asatalk); Asatalk's logo keeps its blue only on the bridge button.
- Type: Vazirmatn + Inter, same scale as the family (12/13/15/17/20/24/32/40/56), body 15, headings 700–900.
- Surfaces: Asa Glass for chrome (rails, toolbars, meeting controls, dialogs); matte cards for content. Cards lift on hover (−4px, teal 14% shadow). Radii 12/16/24, pill buttons with teal gradient.
- Motion: 120/200/320ms, same easings; meeting-room controls appear/disappear with 200ms fade+rise; reduced-motion respected.
- Mascot "Asa" in teal: empty states, onboarding, AI assistant avatar (pose "think"), success screens. Never inside a live meeting stage.
- Icons Lucide; RTL first; 4.5:1 contrast; 44px targets; keyboard-navigable (this is a work tool).

FIRST-RUN FLOW (non-negotiable)
1) Language picker first (5 languages as glass tiles), remembered.
2) Creative splash: the meeting-window container assembling from four glass panes that slide into a rounded square, the Asa Mark rising with its spark, then a 3-slide intro (Meetings · Classes · AI assistant) with the mascot.
3) Sign in with PHONE or EMAIL: smart single field, country code picker, 6-digit code, then name + photo, optional organization/workspace name and role (host, teacher, member). Also "Continue as guest" for joining a meeting by link (guest enters name only).
4) Permission primers for camera/microphone/notifications with the mascot.

SCREENS TO DELIVER
Marketing site (public)
- Landing: hero with an interactive 3D-tilt glass meeting card, feature grid (messaging, calls, meetings, classes, admin, AI), pricing (3 plans, monthly/annual toggle), testimonials, FAQ accordion, footer; pages: Features, Pricing, FAQ, About, Contact, Design system showcase.
App shell
- Left rail (68px): avatar, tabs Chats · Calls · Meetings · Classes · Admin (admin only), Asatalk bridge button, theme, language, log out. Mobile: bottom tab bar.
Meetings
- Meetings home: "New meeting" (instant / schedule / join by link) glass cards, upcoming list with time chips and join buttons, past meetings with recordings and AI minutes badges, calendar week strip.
- Schedule meeting sheet: title, date/time (Persian calendar + Gregorian toggle), duration, participants picker, options (waiting room, recording, max participants), link preview + copy.
- Pre-join lobby: camera preview with blur/background options, mic level meter, device pickers, name field for guests, "Ask to join" / "Join now".
- Meeting room (desktop + mobile): adaptive grid (1/2/4/9/16 tiles), speaker view, pinned tile, screen share with presenter thumbnail, name tags with mic state, hand raised, reactions bursting on tiles, bottom control bar (mic, camera, share, raise hand, reactions, chat, people, AI, record, more, leave), right panels: chat (threaded, emoji, files), people (roles, mute all, admit waiting room), AI assistant (live captions, live notes, action items), settings, layout picker; top: meeting title, timer, encryption badge, recording indicator, network quality.
- Waiting room (host view with admit/deny; guest view with mascot).
- Breakout rooms manager, polls & Q&A panel, whiteboard placeholder tab.
- Leave/ended screen: duration, participants, "Generate minutes with Asa" CTA, rating.
- Recording & minutes page: video player with transcript sidebar, AI minutes (summary, decisions, action items with owners), export (PDF/Docx), share.
Classes
- Classes home (teacher / student variants): class cards with schedule, attendance %, next session.
- Class room: teacher stage, student grid, attendance panel with present/absent toggles, assignments tab, quiz launcher, "raise hand" queue, class chat, recording.
- Attendance report and class analytics (charts in teal family palette).
AI assistant (Sunrise accent)
- Assistant panel/page: modes Minutes · Summary · Brainstorm; input with meeting picker; streaming output card; copy/share/export; history list; empty state with mascot "think".
Chats & calls (lightweight, work-oriented)
- Chat list + conversation reusing the family bubble system (teal tint), threads, file cards, meeting cards inside chat ("Join" button), call history; a prominent "Open in Asatalk" bridge for personal messaging.
Admin
- Dashboard: KPI tiles (users, active, meetings, calls, messages), weekly activity chart, role distribution donut, server metrics gauges.
- Users table (search, filter, suspend, role change), export CSV, audit log, settings (branding, limits).
Settings
- Profile, Account (phone/email, password, sessions/devices), Notifications, Meeting defaults (mute on join, waiting room, layout), Audio & video devices, Appearance (light/dark/system; teal is fixed, wallpaper for chat), Language, Privacy (who can add me to meetings, recording consent), Billing & plan, About.
Empty/error states with the mascot; offline banner; permission-denied states.

DELIVERABLES
- Full screen set named "AM-<area>-<screen>-<state>-<theme>", desktop first, then mobile.
- Components sheet: rail, tab bar, glass toolbar, meeting tile (states: speaking, muted, camera off, pinned, hand raised, poor network), control bar buttons (on/off/danger), side panel, glass card, schedule form fields, calendar strip, KPI tile, chart styles, table, sheet/dialog, toast, AI output card.
- Tokens page (shared with Asatalk: same neutrals, type, spacing, radii, glass, motion; only the brand hue differs).
- App icon set, splash, OG image, store screenshots (6) with Persian captions.
Use real Persian content (meeting titles, names, Persian dates/digits). Show every screen at rest with realistic data; no lorem ipsum.
```

---

## نکات اجرایی برای تیم

- **باگ‌های گزارش‌شده:** تماس تصویری و ارسال پیام صوتی در تست شما ناموفق بودند. هر دو فقط روی HTTPS و پس از اجازهٔ میکروفون/دوربین کار می‌کنند؛ در پرامپت‌ها صفحات «Permission primer» و حالت‌های «دسترسی داده نشد» گنجانده شده تا این خطاها در طراحی هم دیده شوند. رفع فنی جداگانه در محصول پیگیری می‌شود.
- **ورود با شماره/ایمیل** نیازمند سرویس ارسال کد (SMS/ایمیل) است؛ طراحی آماده است، پیاده‌سازی در فاز بعد.
- برای گرفتن خروجی یکدست، هر دو پرامپت را در **یک پروژه** و با **یک فایل توکن** اجرا کنید؛ اول Asatalk (چون سیستم حباب و کامپوزر را می‌سازد)، بعد Asameet.
