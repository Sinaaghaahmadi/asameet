"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";

/**
 * Drops every cached query when the signed-in account changes (including
 * logout), so the next account never sees the previous one's chats.
 */
function AccountBoundary() {
  const qc = useQueryClient();
  const userId = useAppStore((s) => s.currentUser?.id ?? null);
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current !== null && previous.current !== userId) qc.clear();
    previous.current = userId;
  }, [userId, qc]);
  return null;
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 1 },
        },
      })
  );

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const bp = process.env.NEXT_PUBLIC_BASE_PATH || "";
      navigator.serviceWorker.register(`${bp}/sw.js`).catch(() => {
        /* SW optional */
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AccountBoundary />
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <I18nProvider>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster position="top-center" richColors dir="rtl" />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
