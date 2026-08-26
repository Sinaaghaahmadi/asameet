"use client";

import * as React from "react";
import { cn, initials } from "@/lib/utils";

const AVATAR_GRADIENTS = [
  "from-teal-400 to-emerald-600",
  "from-emerald-400 to-teal-600",
  "from-cyan-400 to-teal-600",
  "from-amber-400 to-orange-600",
  "from-rose-400 to-pink-600",
  "from-violet-400 to-purple-600",
  "from-sky-400 to-cyan-600",
];

function gradientFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
}

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-24 text-3xl",
};

export function Avatar({ name, src, size = "md", online, className, ...props }: AvatarProps) {
  return (
    <div className={cn("relative shrink-0", className)} {...props}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className={cn("rounded-full object-cover", sizeClasses[size])} />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-inner",
            gradientFor(name),
            sizeClasses[size]
          )}
          aria-label={name}
        >
          {initials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 end-0 block size-3 rounded-full border-2 border-background",
            online ? "bg-emerald-500 animate-pulse-ring" : "bg-zinc-400"
          )}
        />
      )}
    </div>
  );
}
