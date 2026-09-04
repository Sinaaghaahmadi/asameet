import { Suspense } from "react";
import { TalkApp } from "@/components/asatalk/talk-app";

/** Invite / public links: asatalk.../talk/join/<code|username> */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  return (
    <Suspense fallback={null}>
      <TalkApp joinRef={ref} />
    </Suspense>
  );
}
