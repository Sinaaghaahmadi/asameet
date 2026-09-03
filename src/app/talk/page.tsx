import { Suspense } from "react";
import { TalkApp } from "@/components/asatalk/talk-app";

export default function TalkPage() {
  return (
    <Suspense fallback={null}>
      <TalkApp />
    </Suspense>
  );
}
