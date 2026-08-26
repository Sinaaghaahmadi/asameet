// Seed script for the self-hosted Prisma deployment.
// Usage: npx prisma db push && npm run db:seed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  { username: "admin", displayName: "آرش | مدیر سیستم", role: "admin" },
  { username: "teacher1", displayName: "استاد الهام", role: "teacher" },
  { username: "user1", displayName: "سارا محمدی", role: "user" },
  { username: "user2", displayName: "امیر رضایی", role: "user" },
  { username: "user3", displayName: "نگار کریمی", role: "user" },
];

async function main() {
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { ...u, password: "123456" },
    });
  }

  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  const user1 = await prisma.user.findUnique({ where: { username: "user1" } });
  const user2 = await prisma.user.findUnique({ where: { username: "user2" } });

  const chat = await prisma.chat.create({
    data: {
      name: "تیم محصول آسامیت",
      type: "group",
      members: {
        create: [
          { userId: admin.id, role: "admin" },
          { userId: user1.id },
          { userId: user2.id },
        ],
      },
    },
  });

  await prisma.message.create({
    data: {
      chatId: chat.id,
      senderId: admin.id,
      content: "سلام به همه! نسخه ۱.۰ آسامیت آماده انتشاره 🎉",
    },
  });

  await prisma.meeting.create({
    data: {
      title: "دموی عمومی آسامیت",
      type: "conference",
      link: "demo-asameet-v1",
      status: "scheduled",
      hostId: admin.id,
      participants: { create: [{ userId: admin.id, role: "host" }] },
    },
  });

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
