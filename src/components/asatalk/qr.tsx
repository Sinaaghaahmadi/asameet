"use client";

/**
 * QR rendering and scanning for sign-in from another device.
 *
 * The code is drawn as inline SVG rather than a canvas so it stays crisp at
 * any size and costs nothing to re-render. Scanning uses the platform's own
 * `BarcodeDetector` where it exists; where it does not — Safari, Firefox —
 * the user can still point their phone's camera app at the code, because the
 * QR encodes a link to the approval page rather than a bare token.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import qrcode from "qrcode-generator";

export function QrImage({
  value,
  size = 220,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const path = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { d, n };
  }, [value]);

  return (
    <svg
      viewBox={`-1 -1 ${path.n + 2} ${path.n + 2}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="QR"
      shapeRendering="crispEdges"
    >
      <rect
        x={-1}
        y={-1}
        width={path.n + 2}
        height={path.n + 2}
        fill="#fff"
        rx={1}
      />
      <path d={path.d} fill="#000" />
    </svg>
  );
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (o: {
  formats: string[];
}) => BarcodeDetectorLike;

export const qrScanSupported = () =>
  typeof window !== "undefined" && "BarcodeDetector" in window;

/**
 * Live camera scan. Returns the video ref to mount and any error; `onCode`
 * fires once, after which the camera is released.
 */
export function useQrScanner(active: boolean, onCode: (v: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef(false);

  useEffect(() => {
    if (!active) return;
    seen.current = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    (async () => {
      const Ctor = (
        window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
      ).BarcodeDetector;
      if (!Ctor) return setError("unsupported");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        return setError("denied");
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => {});
      const detector = new Ctor({ formats: ["qr_code"] });
      const tick = async () => {
        if (stopped || seen.current) return;
        try {
          const hits = await detector.detect(video);
          if (hits[0]?.rawValue) {
            seen.current = true;
            navigator.vibrate?.(15);
            onCode(hits[0].rawValue);
            return;
          }
        } catch {
          /* a frame that cannot be decoded is normal */
        }
        raf = requestAnimationFrame(() => void tick());
      };
      raf = requestAnimationFrame(() => void tick());
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active, onCode]);

  return { videoRef, error };
}

/** The ticket code out of whatever the camera read — a link or the code itself. */
export function codeFromScan(raw: string): string | null {
  const direct = raw.trim();
  if (/^[a-f0-9]{32}$/i.test(direct)) return direct.toLowerCase();
  try {
    const url = new URL(direct);
    const c = url.hash.replace(/^#/, "") || url.searchParams.get("code") || "";
    return /^[a-f0-9]{32}$/i.test(c) ? c.toLowerCase() : null;
  } catch {
    return null;
  }
}
