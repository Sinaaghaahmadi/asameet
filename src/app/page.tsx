"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LandingPage } from "@/components/landing/landing-page";
import { AppShell } from "@/components/shared/app-shell";
import { LoginModal } from "@/components/shared/login-modal";
import { restoreSession, useAppStore, type AppTab } from "@/stores/app-store";

const VALID_TABS: AppTab[] = ["chats", "calls", "meetings", "classes", "admin"];

function HomeInner() {
  const { view, setView, setTab, login, setMessengerOnly, setShowLoginModal, currentUser } = useAppStore();
  const params = useSearchParams();

  useEffect(() => {
    const saved = restoreSession();
    if (saved) login(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate effect keyed on params: in static exports useSearchParams is
  // empty on first render and populates after hydration.
  useEffect(() => {
    const tab = params.get("tab") as AppTab | null;
    const mode = params.get("mode");
    if (mode === "messenger") {
      setMessengerOnly(true);
      setTab("chats");
    } else if (tab && VALID_TABS.includes(tab)) {
      setTab(tab);
    }
    // ?login=1 is how every marketing page hands the visitor over to the app.
    if ((params.get("login") === "1" || mode === "messenger" || tab) && !restoreSession()) {
      // Deep link (PWA shortcut / Android app / site CTA) without a session → prompt login
      setShowLoginModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <>
      <AnimatePresence mode="wait">
        {view === "landing" || !currentUser ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <LandingPage />
          </motion.div>
        ) : (
          <motion.div key="app" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <AppShell />
          </motion.div>
        )}
      </AnimatePresence>
      <LoginModal />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}
