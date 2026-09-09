"use client";

import { useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const bp = process.env.NEXT_PUBLIC_BASE_PATH || "";
      navigator.serviceWorker.register(`${bp}/sw.js`).catch(() => {
        /* the service worker is optional */
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <I18nProvider>
          <TooltipProvider delayDuration={300}>
            {children}
            {/* `toastFont` re-asserts the app face: sonner ships its own
                font-family, which otherwise leaves toasts in system-ui. */}
            <Toaster
              position="top-center"
              richColors
              dir="rtl"
              className="talk-toaster"
              toastOptions={{ className: "talk-toast" }}
            />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
