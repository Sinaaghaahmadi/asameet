export type Role = "user" | "teacher" | "host" | "admin";
export type UserStatus = "online" | "offline" | "away" | "busy";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  role: Role;
  status: UserStatus;
  isOnline: boolean;
  isSuspended: boolean;
  lastSeen: string;
  country?: string;
}

export interface Chat {
  id: string;
  name: string | null;
  type: "private" | "group" | "channel";
  avatar: string | null;
  isPinned: boolean;
  memberIds: string[];
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export type MessageType = "text" | "image" | "file" | "voice" | "system";

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: MessageType;
  replyToId: string | null;
  forwardedFrom: string | null;
  isRead: boolean;
  isPinned: boolean;
  reactions: { emoji: string; userIds: string[] }[];
  createdAt: string;
}

export interface Call {
  id: string;
  type: "audio" | "video";
  status: "ringing" | "active" | "ended";
  direction: "incoming" | "outgoing" | "missed";
  initiatorId: string;
  peerId: string;
  duration: number | null;
  createdAt: string;
}

export type MeetingType = "meeting" | "conference" | "class";
export type MeetingStatus = "scheduled" | "active" | "ended";

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  link: string;
  status: MeetingStatus;
  hostId: string;
  maxParticipants: number;
  isRecording: boolean;
  participantIds: string[];
  startsAt: string;
  createdAt: string;
}

export interface ClassSession {
  id: string;
  title: string;
  teacherId: string;
  status: MeetingStatus;
  studentIds: string[];
  attendance: Record<string, boolean>;
  startsAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalChats: number;
  totalMeetings: number;
  activeCalls: number;
  totalMessages: number;
  weeklyActivity: { day: string; messages: number; meetings: number; calls: number }[];
  roleDistribution: { role: Role; count: number }[];
}

export interface ServerMetrics {
  cpu: number;
  memory: number;
  memoryTotal: number;
  uptime: number;
  version: string;
  platform: string;
  nodeVersion: string;
}
