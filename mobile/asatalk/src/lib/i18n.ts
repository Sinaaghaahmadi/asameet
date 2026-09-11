/**
 * Strings for the native app. Persian is the primary language and drives
 * RTL; English is the fallback. Keys mirror the web app's `talk.*` section.
 */
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Locale = "fa" | "en";
let current: Locale = "fa";
const listeners = new Set<() => void>();

const fa = {
  common: { save: "ذخیره", cancel: "انصراف", delete: "حذف", edit: "ویرایش", search: "جستجو", send: "ارسال", close: "بستن", back: "بازگشت", next: "بعدی", loading: "در حال بارگذاری…", copy: "کپی", copied: "کپی شد", confirm: "تأیید", online: "آنلاین", offline: "آفلاین", you: "شما", today: "امروز", yesterday: "دیروز", error: "خطایی رخ داد", retry: "تلاش مجدد", empty: "موردی یافت نشد", logout: "خروج", ok: "باشه" },
  name: "آساتاک", savedMessages: "پیام‌های ذخیره‌شده", deletedAccount: "حساب حذف‌شده",
  onboard: { start: "شروع کنید", signinTitle: "ورود به آساتاک", signinSub: "شماره موبایل یا ایمیل خود را وارد کنید؛ خودمان تشخیص می‌دهیم.", identifier: "شماره موبایل یا ایمیل", getCode: "دریافت کد تأیید", or: "یا", password: "ورود با نام کاربری و رمز", username: "نام کاربری", passwordField: "رمز عبور", login: "ورود", otpTitle: "کد را وارد کنید", otpSentTo: "کد ۶ رقمی به {id} فرستاده شد.", change: "تغییر شماره", resendIn: "ارسال دوباره تا", resend: "ارسال دوباره", demoCode: "حالت آزمایشی: کد شما", whoTitle: "شما کی هستید؟", whoSub: "نام‌تان را بنویسید؛ عکس اختیاری است.", nameField: "نام و نام خانوادگی", continueBtn: "ادامه", wrongCode: "کد اشتباه است", terms: "با ادامه، قوانین استفاده و حریم خصوصی را می‌پذیرید.", notifTitle: "اعلان‌ها را روشن کنید", notifSub: "تا وقتی پیامی می‌رسد باخبر شوید.", turnOn: "روشن کن", notNow: "حالا نه", slide1: "پیام‌رسانی سریع با حباب‌های شیشه‌ای", slide2: "تماس صوتی و تصویری بی‌قطعی", slide3: "گروه، کانال و پوشه‌های سفارشی" },
  qr: { scan: "اسکن کد QR", approveTitle: "ورود این دستگاه؟", approveSub: "اگر شما این درخواست را نداده‌اید، رد کنید.", approve: "تأیید و ورود", reject: "رد کردن", approved: "دستگاه وارد شد", rejected: "درخواست رد شد", expired: "کد منقضی شد", hint: "کد QR روی صفحهٔ ورودِ دستگاه دیگر را اسکن کنید", noCamera: "دسترسی به دوربین لازم است" },
  tabs: { chats: "گفت‌وگوها", calls: "تماس‌ها", contacts: "مخاطبین", settings: "تنظیمات" },
  folders: { all: "همه", personal: "شخصی", groups: "گروه‌ها", channels: "کانال‌ها", unread: "خوانده‌نشده" },
  list: { noChats: "هنوز گفت‌وگویی ندارید", noChatsDesc: "از مخاطبین یکی را انتخاب کنید و سلام کنید!", archived: "بایگانی‌شده", typing: "در حال نوشتن…", draft: "پیش‌نویس", you: "شما" },
  chat: { members: "عضو", subscribers: "مشترک", mute: "بی‌صدا", unmute: "صدادار", pin: "سنجاق", unpin: "برداشتن سنجاق", delete: "حذف گفت‌وگو", deleteConfirm: "این گفت‌وگو برای هر دو طرف حذف می‌شود. مطمئنید؟", leave: "ترک", leaveConfirm: "از این گفت‌وگو خارج می‌شوید. مطمئنید؟", call: "تماس صوتی", videoCall: "تماس تصویری", info: "اطلاعات", noMessages: "پیامی نیست", noMessagesDesc: "اولین پیام را بفرستید!", broadcast: "فقط مدیران کانال می‌توانند پیام بفرستند", unreadMessages: "پیام‌های خوانده‌نشده", placeholder: "پیام…", block: "مسدود کردن", unblock: "رفع مسدودی", blocked: "شما این کاربر را مسدود کرده‌اید" },
  msg: { photo: "عکس", file: "فایل", voice: "پیام صوتی", video: "ویدئو", videoNote: "پیام ویدئویی", sticker: "استیکر", call: "تماس", edited: "ویرایش‌شده", forwardedFrom: "فوروارد از", reply: "پاسخ", forward: "فوروارد", copy: "کپی", pin: "سنجاق", unpin: "برداشتن سنجاق", edit: "ویرایش", delete: "حذف", react: "واکنش", deleteConfirm: "این پیام برای همه حذف می‌شود.", replyingTo: "پاسخ به", editing: "ویرایش پیام", sending: "در حال ارسال…", failed: "ارسال نشد", poll: "نظرسنجی", location: "موقعیت", contact: "مخاطب", copied: "کپی شد", holdToRecord: "برای ضبط نگه دارید", release: "رها کنید تا ارسال شود", cancelRecord: "لغو", gallery: "گالری", camera: "دوربین", tooLarge: "فایل بزرگ‌تر از ۳ مگابایت است" },
  calls: { title: "تماس‌ها", recent: "اخیر", incoming: "ورودی", outgoing: "خروجی", missed: "از دست رفته", declined: "رد شده", audioCall: "تماس صوتی", videoCall: "تماس تصویری", ringing: "در حال زنگ زدن…", connecting: "در حال اتصال…", connected: "متصل", ended: "تماس پایان یافت", noAnswer: "پاسخی داده نشد", failed: "اتصال برقرار نشد", declinedMsg: "تماس رد شد", mute: "بی‌صدا", unmute: "صدادار", cameraOn: "دوربین روشن", cameraOff: "دوربین خاموش", switchCamera: "تعویض دوربین", speaker: "بلندگو", end: "پایان تماس", accept: "پاسخ", decline: "رد", incomingAudio: "تماس صوتی ورودی", incomingVideo: "تماس تصویری ورودی", noCalls: "هنوز تماسی نگرفته‌اید", noCallsDesc: "از مخاطبین یکی را انتخاب کنید و تماس بگیرید.", groupCall: "تماس گروهی", youLabel: "شما", permission: "برای تماس به میکروفون (و دوربین) دسترسی بدهید.", encrypted: "رمزنگاری سرتاسری", callAgain: "تماس دوباره" },
  contacts: { title: "مخاطبین", search: "جستجوی افراد", noResults: "کسی با این نام پیدا نشد", all: "همهٔ اعضای آساتاک", newGroup: "گروه جدید", groupName: "نام گروه", create: "ساختن", selectMembers: "اعضا را انتخاب کنید" },
  status: { justNow: "همین حالا", lastSeen: "آخرین بازدید", minAgo: "دقیقه پیش", hourAgo: "ساعت پیش" },
  settings: { title: "تنظیمات", editProfile: "ویرایش پروفایل", name: "نام", username: "نام کاربری", bio: "بیو", save: "ذخیره", saved: "ذخیره شد", accounts: "حساب‌ها", logout: "خروج", logoutConfirm: "از این حساب خارج می‌شوید؟", notifications: "اعلان‌ها و صداها", privacy: "حریم خصوصی", chatSettings: "تنظیمات چت", devices: "دستگاه‌ها", language: "زبان", about: "دربارهٔ آساتاک", version: "نسخه", theme: "پوسته", light: "روشن", dark: "تاریک", system: "سیستم", accent: "رنگ اصلی", notifPrivate: "چت‌های خصوصی", notifGroups: "گروه‌ها", notifChannels: "کانال‌ها", notifPreview: "پیش‌نمایش متن", notifSound: "صدای پیام", pushEnabled: "اعلان‌های این دستگاه", currentDevice: "این دستگاه", otherDevices: "دستگاه‌های دیگر", terminate: "خروج از دستگاه", terminateAll: "خروج از همهٔ دستگاه‌های دیگر", blocked: "کاربران مسدودشده", noBlocked: "کسی را مسدود نکرده‌اید" },
  errors: { too_many_accounts: "حداکثر ۵ حساب هم‌زمان می‌توانید داشته باشید", forbidden: "اجازهٔ این کار را ندارید", not_found: "پیدا نشد", username_taken: "این نام کاربری قبلاً گرفته شده", invalid_username: "نام کاربری معتبر نیست", network: "ارتباط برقرار نشد", bad_request: "درخواست نامعتبر", invalid_credentials: "نام کاربری یا رمز اشتباه است", invalid_code: "کد اشتباه است", too_many_attempts: "تعداد تلاش زیاد است؛ کمی بعد دوباره امتحان کنید", generic: "خطایی رخ داد" },
};
type Dict = typeof fa;
const en: Dict = {
  common: { save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", search: "Search", send: "Send", close: "Close", back: "Back", next: "Next", loading: "Loading…", copy: "Copy", copied: "Copied", confirm: "Confirm", online: "online", offline: "offline", you: "You", today: "Today", yesterday: "Yesterday", error: "Something went wrong", retry: "Retry", empty: "Nothing here", logout: "Log out", ok: "OK" },
  name: "Asatalk", savedMessages: "Saved Messages", deletedAccount: "Deleted account",
  onboard: { start: "Get started", signinTitle: "Sign in to Asatalk", signinSub: "Enter your phone number or email; we'll detect which.", identifier: "Phone number or email", getCode: "Get verification code", or: "or", password: "Log in with username & password", username: "Username", passwordField: "Password", login: "Log in", otpTitle: "Enter the code", otpSentTo: "A 6-digit code was sent to {id}.", change: "Change", resendIn: "Resend in", resend: "Resend", demoCode: "Demo mode: your code is", whoTitle: "Who are you?", whoSub: "Write your name; the photo is optional.", nameField: "Full name", continueBtn: "Continue", wrongCode: "Wrong code", terms: "By continuing you accept the Terms of Use and Privacy Policy.", notifTitle: "Turn on notifications", notifSub: "Know when a message arrives.", turnOn: "Turn on", notNow: "Not now", slide1: "Fast messaging with glass bubbles", slide2: "Reliable voice and video calls", slide3: "Groups, channels and folders" },
  qr: { scan: "Scan QR code", approveTitle: "Log this device in?", approveSub: "If you did not ask for this, reject it.", approve: "Approve and sign in", reject: "Reject", approved: "Device signed in", rejected: "Request rejected", expired: "Code expired", hint: "Scan the QR code on the other device's sign-in screen", noCamera: "Camera access is required" },
  tabs: { chats: "Chats", calls: "Calls", contacts: "Contacts", settings: "Settings" },
  folders: { all: "All", personal: "Personal", groups: "Groups", channels: "Channels", unread: "Unread" },
  list: { noChats: "No chats yet", noChatsDesc: "Pick someone from Contacts and say hi!", archived: "Archived", typing: "typing…", draft: "Draft", you: "You" },
  chat: { members: "members", subscribers: "subscribers", mute: "Mute", unmute: "Unmute", pin: "Pin", unpin: "Unpin", delete: "Delete chat", deleteConfirm: "This chat will be deleted for both sides. Sure?", leave: "Leave", leaveConfirm: "You will leave this chat. Sure?", call: "Voice call", videoCall: "Video call", info: "Info", noMessages: "No messages", noMessagesDesc: "Send the first message!", broadcast: "Only channel admins can post", unreadMessages: "Unread messages", placeholder: "Message…", block: "Block", unblock: "Unblock", blocked: "You blocked this user" },
  msg: { photo: "Photo", file: "File", voice: "Voice message", video: "Video", videoNote: "Video message", sticker: "Sticker", call: "Call", edited: "edited", forwardedFrom: "Forwarded from", reply: "Reply", forward: "Forward", copy: "Copy", pin: "Pin", unpin: "Unpin", edit: "Edit", delete: "Delete", react: "React", deleteConfirm: "This message will be deleted for everyone.", replyingTo: "Reply to", editing: "Edit message", sending: "Sending…", failed: "Failed", poll: "Poll", location: "Location", contact: "Contact", copied: "Copied", holdToRecord: "Hold to record", release: "Release to send", cancelRecord: "Cancel", gallery: "Gallery", camera: "Camera", tooLarge: "File is larger than 3 MB" },
  calls: { title: "Calls", recent: "Recent", incoming: "Incoming", outgoing: "Outgoing", missed: "Missed", declined: "Declined", audioCall: "Voice call", videoCall: "Video call", ringing: "Ringing…", connecting: "Connecting…", connected: "Connected", ended: "Call ended", noAnswer: "No answer", failed: "Could not connect", declinedMsg: "Call declined", mute: "Mute", unmute: "Unmute", cameraOn: "Camera on", cameraOff: "Camera off", switchCamera: "Switch camera", speaker: "Speaker", end: "End call", accept: "Accept", decline: "Decline", incomingAudio: "Incoming voice call", incomingVideo: "Incoming video call", noCalls: "No calls yet", noCallsDesc: "Pick a contact and call.", groupCall: "Group call", youLabel: "You", permission: "Allow microphone (and camera) to call.", encrypted: "End-to-end encrypted", callAgain: "Call again" },
  contacts: { title: "Contacts", search: "Search people", noResults: "Nobody by that name", all: "Everyone on Asatalk", newGroup: "New group", groupName: "Group name", create: "Create", selectMembers: "Select members" },
  status: { justNow: "just now", lastSeen: "last seen", minAgo: "min ago", hourAgo: "h ago" },
  settings: { title: "Settings", editProfile: "Edit profile", name: "Name", username: "Username", bio: "Bio", save: "Save", saved: "Saved", accounts: "Accounts", logout: "Log out", logoutConfirm: "Log out of this account?", notifications: "Notifications & sounds", privacy: "Privacy", chatSettings: "Chat settings", devices: "Devices", language: "Language", about: "About Asatalk", version: "Version", theme: "Theme", light: "Light", dark: "Dark", system: "System", accent: "Accent", notifPrivate: "Private chats", notifGroups: "Groups", notifChannels: "Channels", notifPreview: "Message preview", notifSound: "Sound", pushEnabled: "Notifications on this device", currentDevice: "This device", otherDevices: "Other devices", terminate: "Terminate", terminateAll: "Terminate all other sessions", blocked: "Blocked users", noBlocked: "Nobody blocked" },
  errors: { too_many_accounts: "You can have at most 5 accounts", forbidden: "You are not allowed to do that", not_found: "Not found", username_taken: "Username is taken", invalid_username: "Invalid username", network: "Could not connect", bad_request: "Bad request", invalid_credentials: "Wrong username or password", invalid_code: "Wrong code", too_many_attempts: "Too many attempts; try again later", generic: "Something went wrong" },
};
const dicts: Record<Locale, Dict> = { fa, en };

export function t(key: string, vars?: Record<string, string | number>): string {
  const walk = (d: unknown) => key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), d);
  let s = (walk(dicts[current]) ?? walk(en)) as string | undefined;
  if (typeof s !== "string") return key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
export const locale = () => current;
export const isRTL = () => current === "fa";
export function onLocaleChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

const KEY = "asatalk.locale";
export async function loadLocale(): Promise<Locale> {
  const saved = (await AsyncStorage.getItem(KEY)) as Locale | null;
  current = saved === "en" ? "en" : "fa";
  applyRTL(current);
  return current;
}
/** RTL is a native layout flag; switching it needs a reload, which the caller handles. */
export async function setLocale(l: Locale): Promise<boolean> {
  current = l;
  await AsyncStorage.setItem(KEY, l);
  listeners.forEach((f) => f());
  return applyRTL(l);
}
function applyRTL(l: Locale): boolean {
  const rtl = l === "fa";
  if (I18nManager.isRTL !== rtl) { I18nManager.allowRTL(rtl); I18nManager.forceRTL(rtl); return true; }
  return false;
}
export function errorText(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "generic";
  const s = t(`errors.${code}`);
  return s.startsWith("errors.") ? t("errors.generic") : s;
}
