import { Suspense } from "react";
import { TalkApp } from "@/components/asatalk/talk-app";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <TalkApp />
    </Suspense>
  );
}
