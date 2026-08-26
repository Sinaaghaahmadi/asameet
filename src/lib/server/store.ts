import type { AdminStats, Call, Chat, ClassSession, Meeting, Message, Role, User } from "@/lib/types";

/**
 * In-memory data store.
 *
 * Serves the demo deployment (Vercel/serverless) with zero external
 * dependencies; state lives per server instance and re-seeds on cold start.
 * For a persistent self-hosted deployment, swap this module for the Prisma
 * adapter (see prisma/schema.prisma and docs/DEPLOYMENT.md).
 */

interface Store {
  users: User[];
  chats: Chat[];
  messages: Message[];
  calls: Call[];
  meetings: Meeting[];
  classes: ClassSession[];
  passwords: Record<string, string>;
  seededAt: string;
}

const g = globalThis as unknown as { __asameetStore?: Store };

function minsAgo(m: number): string {
  return new Date(Date.now() - m * 60000).toISOString();
}

function seed(): Store {
  const mk = (
    id: string,
    username: string,
    displayName: string,
    role: Role,
    isOnline: boolean,
    lastSeenMins: number,
    country?: string
  ): User => ({
    id,
    username,
    displayName,
    avatar: null,
    role,
    status: isOnline ? "online" : "offline",
    isOnline,
    isSuspended: false,
    lastSeen: minsAgo(lastSeenMins),
    country,
  });

  // The 17-person remote team + demo accounts
  const users: User[] = [
    mk("u-admin", "admin", "آرش | مدیر سیستم", "admin", true, 0, "ایران"),
    mk("u-teacher", "teacher1", "استاد الهام", "teacher", true, 2, "ایران"),
    mk("u-user1", "user1", "سارا محمدی", "user", true, 0, "ایران"),
    mk("u-user2", "user2", "امیر رضایی", "user", true, 5, "کانادا"),
    mk("u-user3", "user3", "نگار کریمی", "user", false, 40, "آلمان"),
    mk("u-04", "maryam", "مریم | طراح رابط", "user", true, 1, "ایران"),
    mk("u-05", "kian", "کیان | فرانت‌اند", "user", true, 3, "هلند"),
    mk("u-06", "parisa", "پریسا | بک‌اند", "user", false, 90, "استرالیا"),
    mk("u-07", "babak", "بابک | زیرساخت", "host", true, 8, "کانادا"),
    mk("u-08", "yasmin", "یاسمین | محصول", "user", true, 12, "فرانسه"),
    mk("u-09", "reza", "رضا | امنیت", "user", false, 200, "ایران"),
    mk("u-10", "shirin", "شیرین | موبایل", "user", true, 6, "ترکیه"),
    mk("u-11", "farhad", "فرهاد | دیتا", "user", false, 300, "سوئد"),
    mk("u-12", "azadeh", "آزاده | QA", "user", true, 15, "ایران"),
    mk("u-13", "omid", "امید | DevOps", "host", false, 60, "امارات"),
    mk("u-14", "leila", "لیلا | پشتیبانی", "user", true, 4, "ایران"),
    mk("u-15", "sina", "سینا | هوش مصنوعی", "user", true, 1, "انگلستان"),
  ];

  const chats: Chat[] = [
    {
      id: "c-team",
      name: "تیم محصول آسامیت",
      type: "group",
      avatar: null,
      isPinned: true,
      memberIds: ["u-admin", "u-user1", "u-user2", "u-04", "u-05", "u-08", "u-15"],
      lastMessage: "",
      lastMessageAt: null,
      unreadCount: 3,
    },
    {
      id: "c-design",
      name: "طراحان",
      type: "group",
      avatar: null,
      isPinned: false,
      memberIds: ["u-user1", "u-04", "u-05", "u-08"],
      lastMessage: "",
      lastMessageAt: null,
      unreadCount: 0,
    },
    {
      id: "c-news",
      name: "اخبار آسامیت",
      type: "channel",
      avatar: null,
      isPinned: true,
      memberIds: users.map((u) => u.id),
      lastMessage: "",
      lastMessageAt: null,
      unreadCount: 1,
    },
    {
      id: "c-p1",
      name: null,
      type: "private",
      avatar: null,
      isPinned: false,
      memberIds: ["u-user1", "u-user2"],
      lastMessage: "",
      lastMessageAt: null,
      unreadCount: 2,
    },
    {
      id: "c-p2",
      name: null,
      type: "private",
      avatar: null,
      isPinned: false,
      memberIds: ["u-user1", "u-teacher"],
      lastMessage: "",
      lastMessageAt: null,
      unreadCount: 0,
    },
    {
      id: "c-p3",
      name: null,
      type: "private",
      avatar: null,
      isPinned: false,
      memberIds: ["u-user1", "u-15"],
      lastMessage: "",
      lastMessageAt: null,
      unreadCount: 0,
    },
  ];

  let mid = 0;
  const messages: Message[] = [];
  const addMsg = (
    chatId: string,
    senderId: string,
    content: string,
    minutesAgo: number,
    opts: Partial<Message> = {}
  ) => {
    mid += 1;
    messages.push({
      id: `m-${mid}`,
      chatId,
      senderId,
      content,
      type: "text",
      replyToId: null,
      forwardedFrom: null,
      isRead: minutesAgo > 10,
      isPinned: false,
      reactions: [],
      createdAt: minsAgo(minutesAgo),
      ...opts,
    });
    return `m-${mid}`;
  };

  addMsg("c-team", "u-admin", "گروه ساخته شد", 60 * 24 * 7, { type: "system" });
  addMsg("c-team", "u-admin", "سلام به همه! نسخه ۱.۰ آسامیت آماده انتشاره 🎉", 60 * 5);
  const m1 = addMsg("c-team", "u-04", "طراحی صفحه فرود نهایی شد؛ افکت‌های شیشه‌ای فوق‌العاده شدن ✨", 60 * 4);
  addMsg("c-team", "u-05", "عالیه! انیمیشن‌های Framer Motion هم روی همه بخش‌ها اعمال شد.", 60 * 3, { replyToId: m1 });
  addMsg("c-team", "u-15", "دستیار هوش مصنوعی صورت‌جلسه رو تست کردم — خلاصه جلسه دیروز رو ۱۰ ثانیه‌ای نوشت 🤖", 100);
  const m2 = addMsg("c-team", "u-08", "برای جلسه فردا ساعت ۱۰ دعوت‌نامه فرستادم. ضبط جلسه یادمون نره.", 45);
  addMsg("c-team", "u-user2", "من از تورنتو ملحق می‌شم؛ اختلاف ساعت مشکلی نیست 🌍", 30, { replyToId: m2 });
  addMsg("c-team", "u-user1", "پس می‌بینمتون. تا اون موقع فیدبک‌ها رو داخل همین گروه بفرستید 🙏", 12);

  addMsg("c-design", "u-04", "پالت رنگی جدید: teal تا emerald با توکن‌های OKLCH", 60 * 8);
  addMsg("c-design", "u-08", "لوگوی مینیمال جدید رو دیدید؟ حباب گفت‌وگو + حرف آ 😍", 60 * 6);
  addMsg("c-design", "u-user1", "خیلی تمیزه. روی حالت تاریک هم عالی نشسته.", 60 * 5);

  addMsg("c-news", "u-admin", "📢 آسامیت ۱.۰ منتشر شد! پیام‌رسان + جلسات + کلاس آنلاین + دستیار هوش مصنوعی — همه در یک بستر.", 60 * 2);

  addMsg("c-p1", "u-user2", "سلام سارا! اسکرین‌شات‌های نسخه اندروید رو دیدی؟", 60 * 3);
  addMsg("c-p1", "u-user1", "سلام! آره، دقیقاً حس تلگرام رو می‌ده ولی با هویت خودمون 👌", 60 * 2.5);
  addMsg("c-p1", "u-user2", "فردا توی جلسه دمو نشونش می‌دیم", 25);
  addMsg("c-p1", "u-user2", "راستی صورت‌جلسه هفته پیش رو هوش مصنوعی نوشت، یه نگاه بنداز", 20);

  addMsg("c-p2", "u-teacher", "سلام! برای کلاس فردا تخته دیجیتال رو آماده کردم.", 60 * 26);
  addMsg("c-p2", "u-user1", "ممنون استاد، حتماً سر وقت میام.", 60 * 25);

  addMsg("c-p3", "u-15", "مدل خلاصه‌سازی جلسات رو بهبود دادم؛ حالا آیتم‌های اقدام رو هم جدا می‌کنه.", 60 * 10);
  addMsg("c-p3", "u-user1", "فوق‌العاده‌ست 👏", 60 * 9);

  for (const chat of chats) {
    const chatMsgs = messages.filter((m) => m.chatId === chat.id && m.type !== "system");
    const last = chatMsgs[chatMsgs.length - 1];
    if (last) {
      chat.lastMessage = last.content;
      chat.lastMessageAt = last.createdAt;
    }
  }

  const calls: Call[] = [
    { id: "call-1", type: "video", status: "ended", direction: "outgoing", initiatorId: "u-user1", peerId: "u-user2", duration: 1520, createdAt: minsAgo(60 * 3) },
    { id: "call-2", type: "audio", status: "ended", direction: "incoming", initiatorId: "u-04", peerId: "u-user1", duration: 320, createdAt: minsAgo(60 * 7) },
    { id: "call-3", type: "video", status: "ended", direction: "missed", initiatorId: "u-teacher", peerId: "u-user1", duration: null, createdAt: minsAgo(60 * 24) },
    { id: "call-4", type: "audio", status: "ended", direction: "outgoing", initiatorId: "u-user1", peerId: "u-15", duration: 940, createdAt: minsAgo(60 * 30) },
    { id: "call-5", type: "video", status: "ended", direction: "incoming", initiatorId: "u-08", peerId: "u-user1", duration: 2210, createdAt: minsAgo(60 * 50) },
  ];

  const meetings: Meeting[] = [
    {
      id: "mt-1",
      title: "دموی عمومی آسامیت ۱.۰",
      type: "conference",
      link: "demo-asameet-v1",
      status: "active",
      hostId: "u-admin",
      maxParticipants: 100,
      isRecording: true,
      participantIds: ["u-admin", "u-user1", "u-user2", "u-04", "u-05", "u-08"],
      startsAt: minsAgo(22),
      createdAt: minsAgo(60 * 24),
    },
    {
      id: "mt-2",
      title: "جلسه هفتگی تیم محصول",
      type: "meeting",
      link: "weekly-product-sync",
      status: "scheduled",
      hostId: "u-08",
      maxParticipants: 20,
      isRecording: false,
      participantIds: ["u-08", "u-user1", "u-user2", "u-04"],
      startsAt: new Date(Date.now() + 60 * 60000 * 18).toISOString(),
      createdAt: minsAgo(60 * 48),
    },
    {
      id: "mt-3",
      title: "بازبینی معماری زیرساخت",
      type: "meeting",
      link: "infra-review",
      status: "ended",
      hostId: "u-07",
      maxParticipants: 10,
      isRecording: false,
      participantIds: ["u-07", "u-13", "u-admin"],
      startsAt: minsAgo(60 * 72),
      createdAt: minsAgo(60 * 96),
    },
  ];

  const classes: ClassSession[] = [
    {
      id: "cl-1",
      title: "برنامه‌نویسی وب — مقدماتی",
      teacherId: "u-teacher",
      status: "active",
      studentIds: ["u-user1", "u-user2", "u-user3", "u-12", "u-14"],
      attendance: { "u-user1": true, "u-user2": true, "u-user3": false, "u-12": true, "u-14": true },
      startsAt: minsAgo(35),
    },
    {
      id: "cl-2",
      title: "طراحی رابط کاربری با فیگما",
      teacherId: "u-teacher",
      status: "scheduled",
      studentIds: ["u-user1", "u-04", "u-08"],
      attendance: {},
      startsAt: new Date(Date.now() + 60 * 60000 * 26).toISOString(),
    },
  ];

  const passwords: Record<string, string> = {};
  for (const u of users) passwords[u.username] = "123456";

  return { users, chats, messages, calls, meetings, classes, passwords, seededAt: new Date().toISOString() };
}

export function getStore(): Store {
  if (!g.__asameetStore) g.__asameetStore = seed();
  return g.__asameetStore;
}

export function computeStats(): AdminStats {
  const s = getStore();
  const roleCounts = new Map<Role, number>();
  for (const u of s.users) roleCounts.set(u.role, (roleCounts.get(u.role) ?? 0) + 1);
  const dayKeys = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
  const weeklyActivity = dayKeys.map((day, i) => ({
    day,
    messages: [420, 380, 510, 470, 620, 300, 180][i],
    meetings: [8, 6, 11, 9, 14, 4, 2][i],
    calls: [34, 28, 41, 39, 52, 18, 12][i],
  }));
  return {
    totalUsers: s.users.length,
    activeUsers: s.users.filter((u) => u.isOnline).length,
    totalChats: s.chats.length,
    totalMeetings: s.meetings.length,
    activeCalls: s.calls.filter((c) => c.status === "active").length,
    totalMessages: s.messages.length,
    weeklyActivity,
    roleDistribution: Array.from(roleCounts.entries()).map(([role, count]) => ({ role, count })),
  };
}
