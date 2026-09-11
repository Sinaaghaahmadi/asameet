/** Polling data layer: users, chats and the derived lookups every screen needs. */
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { talkApi } from "./api";
import type { Chat, User } from "./types";

export function useUsers() {
  const q = useQuery({ queryKey: ["users"], queryFn: () => talkApi.users(), refetchInterval: 20_000 });
  const users = useMemo(() => new Map<string, User>((q.data?.users ?? []).map((u) => [u.id, u])), [q.data]);
  return { users, userList: q.data?.users ?? [], loading: q.isLoading };
}
export function useChats() {
  const q = useQuery({ queryKey: ["chats"], queryFn: () => talkApi.chats(), refetchInterval: 4_000 });
  return { chats: (q.data?.chats ?? []) as Chat[], loading: q.isLoading, refetch: q.refetch };
}
export function useInvalidate() {
  const qc = useQueryClient();
  return {
    chats: () => qc.invalidateQueries({ queryKey: ["chats"] }),
    messages: (id: string) => qc.invalidateQueries({ queryKey: ["messages", id] }),
    users: () => qc.invalidateQueries({ queryKey: ["users"] }),
  };
}
