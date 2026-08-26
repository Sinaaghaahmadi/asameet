// Asameet realtime chat mini-service (Socket.io).
// Runs standalone on its own port for self-hosted deployments:
//   PORT=3001 node mini-services/chat-service/index.js
// The web app connects when NEXT_PUBLIC_SOCKET_URL is set.
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;
const ORIGIN = process.env.CORS_ORIGIN || "*";

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "asameet-chat", uptime: process.uptime() }));
});

const io = new Server(server, {
  cors: { origin: ORIGIN, methods: ["GET", "POST"] },
});

const onlineUsers = new Map(); // socketId -> userId

io.on("connection", (socket) => {
  socket.on("register", (userId) => {
    onlineUsers.set(socket.id, userId);
    io.emit("user-online", userId);
  });

  socket.on("send-message", (message) => {
    // Fan the message out to every member of the chat room
    io.to(`chat:${message.chatId}`).emit("receive-message", message);
  });

  socket.on("join-chat", (chatId) => socket.join(`chat:${chatId}`));
  socket.on("leave-chat", (chatId) => socket.leave(`chat:${chatId}`));

  socket.on("typing", ({ chatId, userId, isTyping }) => {
    socket.to(`chat:${chatId}`).emit("typing", { chatId, userId, isTyping });
  });

  socket.on("join-meeting", ({ meetingId, user }) => {
    socket.join(`meeting:${meetingId}`);
    socket.to(`meeting:${meetingId}`).emit("participant-joined", user);
  });

  socket.on("leave-meeting", ({ meetingId, userId }) => {
    socket.leave(`meeting:${meetingId}`);
    socket.to(`meeting:${meetingId}`).emit("participant-left", userId);
  });

  socket.on("disconnect", () => {
    const userId = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    if (userId && ![...onlineUsers.values()].includes(userId)) {
      io.emit("user-offline", userId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[asameet-chat] listening on :${PORT}`);
});
