"use client";

import { io, type Socket } from "socket.io-client";

/**
 * Optional realtime layer.
 *
 * When NEXT_PUBLIC_SOCKET_URL points at the chat mini-service
 * (mini-services/chat-service), messages/typing/presence flow in realtime.
 * Without it (e.g. the serverless demo deployment) the app falls back to
 * optimistic updates + polling and no socket connection is attempted.
 */

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!url) return null;
  if (!socket) {
    socket = io(url, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
