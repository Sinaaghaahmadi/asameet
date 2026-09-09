"use client";

/** Asatalk UI primitives: glass buttons, avatars, switches, rows, menus. */
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

/* ---------- Buttons ---------- */

type Variant = "glass" | "primary" | "danger" | "success" | "ghost";

export interface GBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg" | "icon" | "iconLg" | "fab";
}

export const GBtn = React.forwardRef<HTMLButtonElement, GBtnProps>(
  (
    {
      className,
      variant = "glass",
      size = "md",
      type = "button",
      onPointerDown,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty(
          "--rx",
          `${((e.clientX - r.left) / r.width) * 100}%`,
        );
        e.currentTarget.style.setProperty(
          "--ry",
          `${((e.clientY - r.top) / r.height) * 100}%`,
        );
        onPointerDown?.(e);
      }}
      className={cn(
        "tg-btn tg-ripple text-sm font-semibold",
        variant === "primary" && "tg-btn-primary",
        variant === "danger" && "tg-btn-danger",
        variant === "success" && "tg-btn-success",
        variant === "ghost" && "tg-btn-ghost",
        size === "sm" && "h-9 px-4 text-xs",
        size === "md" && "h-11 px-5",
        size === "lg" && "h-12 px-7 text-base",
        size === "icon" && "tg-icon",
        size === "iconLg" && "tg-icon-lg",
        size === "fab" && "tg-fab",
        className,
      )}
      {...props}
    />
  ),
);
GBtn.displayName = "GBtn";

/* ---------- Avatar ---------- */

const HUES = [240, 175, 300, 20, 60, 150, 270, 330, 200];
export function hueFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

const AV_SIZES = { xs: 28, sm: 36, md: 44, lg: 54, xl: 88, xxl: 120 } as const;

export function TalkAvatar({
  name,
  src,
  size = "md",
  online,
  className,
  icon,
  seed,
  onClick,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof AV_SIZES;
  online?: boolean;
  className?: string;
  icon?: React.ReactNode;
  seed?: string;
  onClick?: () => void;
}) {
  const px = AV_SIZES[size];
  const hue = hueFor(seed ?? name);
  return (
    <span
      className={cn("tg-avatar", onClick && "cursor-pointer", className)}
      style={{
        width: px,
        height: px,
        fontSize: px * 0.36,
        background: src
          ? undefined
          : `linear-gradient(145deg, oklch(0.8 0.13 ${hue}), oklch(0.58 0.17 ${hue}))`,
      }}
      onClick={onClick}
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} draggable={false} />
      ) : icon ? (
        icon
      ) : (
        initials(name || "?")
      )}
      {online && <span className="tg-online" />}
    </span>
  );
}

/* ---------- Switch ---------- */

export function GSwitch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-on={on}
      className="tg-switch"
      onClick={() => onChange(!on)}
    />
  );
}

/* ---------- Settings rows ---------- */

export function GSection({
  title,
  hint,
  children,
  className,
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      {title && <p className="tg-section-title">{title}</p>}
      <div className="tg-section">{children}</div>
      {hint && <p className="tg-hint">{hint}</p>}
    </div>
  );
}

export function GItem({
  icon,
  color,
  label,
  value,
  onClick,
  right,
  danger,
  chevron,
  className,
}: {
  icon?: React.ReactNode;
  color?: string;
  label: React.ReactNode;
  value?: React.ReactNode;
  onClick?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  chevron?: boolean;
  className?: string;
}) {
  const { dir } = useLocale();
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      className={cn("tg-item", !onClick && "cursor-default", className)}
      onClick={onClick}
    >
      {icon && (
        <span
          className="tg-item-icon"
          style={{
            background:
              color ??
              "linear-gradient(135deg, var(--talk), var(--talk-strong))",
          }}
        >
          {icon}
        </span>
      )}
      <span
        className={cn(
          "min-w-0 flex-1 text-sm font-medium",
          danger && "text-red-500",
        )}
      >
        {label}
      </span>
      {value !== undefined && (
        <span className="tg-muted max-w-[45%] truncate text-xs">{value}</span>
      )}
      {right}
      {chevron && <Chevron className="tg-muted size-4 shrink-0" />}
    </Comp>
  );
}

/* ---------- Menu (radix dropdown with Asatalk styling) ---------- */

export const GMenu = DropdownMenuPrimitive.Root;
export const GMenuTrigger = DropdownMenuPrimitive.Trigger;

export const GMenuContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn("tg-menu talk", className)}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
GMenuContent.displayName = "GMenuContent";

export const GMenuItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    danger?: boolean;
  }
>(({ className, danger, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    data-danger={danger}
    className={cn(
      "tg-menu-item outline-none [&_svg]:size-4 [&_svg]:shrink-0",
      className,
    )}
    {...props}
  />
));
GMenuItem.displayName = "GMenuItem";

export const GMenuSeparator = () => <div className="bg-talk-line my-1 h-px" />;

/* ---------- Header bar ---------- */

export function GHeader({
  title,
  subtitle,
  onBack,
  right,
  left,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  right?: React.ReactNode;
  left?: React.ReactNode;
  className?: string;
}) {
  const { dir } = useLocale();
  const Back = dir === "rtl" ? ChevronRight : ChevronLeft;
  return (
    <header
      className={cn(
        "tg-panel tg-safe-top z-chrome tg-line flex h-14 shrink-0 items-center gap-2 border-b px-2",
        className,
      )}
    >
      {onBack && (
        <GBtn variant="ghost" size="icon" onClick={onBack} aria-label="back">
          <Back className="size-5" />
        </GBtn>
      )}
      {left}
      <div className="min-w-0 flex-1 px-1">
        <div className="truncate text-sm font-bold">{title}</div>
        {subtitle && (
          <div className="tg-muted text-caption truncate">{subtitle}</div>
        )}
      </div>
      {right}
    </header>
  );
}

/* ---------- Search field ---------- */

export function GSearch({
  value,
  onChange,
  placeholder,
  autoFocus,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative">
      <span className="tg-muted pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 [&_svg]:size-4">
        {icon}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        className="tg-input tg-search h-10 py-0 text-sm"
      />
    </div>
  );
}

/* ---------- Empty state with a mascot ---------- */

export function GEmpty({
  mascot,
  title,
  desc,
  action,
}: {
  mascot: React.ReactNode;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="tg-fade-in flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      {mascot}
      <h2 className="text-lg font-black">{title}</h2>
      {desc && <p className="tg-muted max-w-xs text-sm leading-6">{desc}</p>}
      {action}
    </div>
  );
}
