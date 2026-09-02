"use client";

import { apiFetch } from "@/lib/client-api";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Download,
  Eraser,
  GraduationCap,
  Hand,
  Loader2,
  MicOff,
  PenLine,
  Phone,
  Plus,
  Presentation,
  Search,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useLocale, useT } from "@/lib/i18n";
import type { ClassSession, User } from "@/lib/types";
import { cn, formatTime, toLocaleDigits } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

const PEN_COLORS = ["#0d9488", "#ef4444", "#3b82f6", "#f59e0b", "#111111"];

export function ClassesView() {
  const t = useT();
  const { locale } = useLocale();
  const { currentUser, activeClassId, setActiveClassId } = useAppStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await apiFetch("/api/classes")).json() as Promise<{ classes: ClassSession[] }>,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await apiFetch("/api/users")).json() as Promise<{ users: User[] }>,
  });

  const createClass = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("create failed");
      return res.json() as Promise<{ class: ClassSession }>;
    },
    onSuccess: (data) => {
      setShowCreate(false);
      setTitle("");
      void qc.invalidateQueries({ queryKey: ["classes"] });
      setActiveClassId(data.class.id);
    },
  });

  const joinClass = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch("/api/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: id, action: "join", userId: currentUser?.id }),
      });
      return id;
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: ["classes"] });
      setActiveClassId(id);
    },
  });

  if (!currentUser) return null;

  const classes = (classesData?.classes ?? []).filter(
    (c) => !search || c.title.toLowerCase().includes(search.toLowerCase())
  );
  const activeClass = (classesData?.classes ?? []).find((c) => c.id === activeClassId) ?? null;
  const userMap = new Map((usersData?.users ?? []).map((u) => [u.id, u]));

  if (activeClass) {
    return (
      <ClassRoom
        cls={activeClass}
        users={usersData?.users ?? []}
        onLeave={() => {
          void apiFetch("/api/classes", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classId: activeClass.id, action: "leave", userId: currentUser.id }),
          }).then(() => qc.invalidateQueries({ queryKey: ["classes"] }));
          setActiveClassId(null);
        }}
      />
    );
  }

  const isTeacher = currentUser.role === "teacher" || currentUser.role === "admin";

  return (
    <div className="mesh-bg flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black">{t("classes.title")}</h1>
          {isTeacher && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="size-4" /> {t("classes.create")}
            </Button>
          )}
        </div>
        <div className="relative mb-4">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.search")} className="ps-9" aria-label={t("common.search")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {classes.length === 0 && (
            <p className="glass-card col-span-full p-10 text-center text-sm text-muted-foreground">{t("classes.noClasses")}</p>
          )}
          {classes.map((c) => {
            const teacher = userMap.get(c.teacherId);
            return (
              <article key={c.id} className="glass-card card-3d flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between">
                  <span className="icon-3d-wrap size-11 !bg-gradient-to-br !from-violet-400/20 !to-purple-600/30">
                    <GraduationCap className="size-5 text-violet-500" />
                  </span>
                  <Badge variant={c.status === "active" ? "success" : c.status === "scheduled" ? "warning" : "secondary"}>
                    {t(`common.${c.status}`)}
                  </Badge>
                </div>
                <div>
                  <h2 className="font-bold">{c.title}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span>👨‍🏫 {teacher?.displayName}</span>
                    <span>👥 {toLocaleDigits(c.studentIds.length, locale)} {t("classes.students")}</span>
                    <span>{formatTime(c.startsAt, locale)}</span>
                  </p>
                </div>
                <Button size="sm" className="mt-auto" onClick={() => joinClass.mutate(c.id)} disabled={c.status === "ended"}>
                  {t("classes.joinClass")}
                </Button>
              </article>
            );
          })}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" /> {t("classes.create")}
            </DialogTitle>
          </DialogHeader>
          <label className="text-sm font-semibold" htmlFor="class-title">{t("classes.className")}</label>
          <Input id="class-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("classes.namePlaceholder")} />
          <Button disabled={!title.trim() || createClass.isPending} onClick={() => createClass.mutate()}>
            {createClass.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {t("classes.create")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= Class Room ================= */

function ClassRoom({ cls, users, onLeave }: { cls: ClassSession; users: User[]; onLeave: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const { currentUser } = useAppStore();
  const qc = useQueryClient();
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const teacher = userMap.get(cls.teacherId);
  const isTeacher = currentUser?.id === cls.teacherId || currentUser?.role === "admin";

  const [boardOpen, setBoardOpen] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [penSize, setPenSize] = useState(4);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [mutedStudents, setMutedStudents] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const setAttendance = useMutation({
    mutationFn: async ({ userId, present }: { userId: string; present: boolean }) => {
      await apiFetch("/api/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: cls.id, action: "attendance", userId, present }),
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["classes"] }),
  });

  // Canvas with 2x resolution
  useEffect(() => {
    if (!boardOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(2, 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [boardOpen]);

  const getPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const point = getPoint(e);
    if (!ctx || !lastPoint.current) return;
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? penSize * 6 : penSize;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
  }

  function clearBoard() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function saveBoard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `asameet-whiteboard-${cls.id}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    toast.success(t("classes.boardSaved"));
  }

  const students = cls.studentIds.map((id) => userMap.get(id)).filter((u): u is User => !!u);

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-zinc-900 to-violet-950">
      <header className="flex items-center gap-3 px-4 py-3 text-white">
        <GraduationCap className="size-5 text-violet-300" />
        <h1 className="truncate text-sm font-bold">{cls.title}</h1>
        <Badge className="bg-violet-500/30 text-violet-100">{teacher?.displayName}</Badge>
        <span className="ms-auto text-xs text-violet-200">{formatTime(cls.startsAt, locale)}</span>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 p-3 pt-0">
        {/* Main area: whiteboard or videos */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {boardOpen ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 p-2.5">
                <p className="me-2 flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                  <Presentation className="size-4 text-teal-600" /> {t("classes.whiteboard")}
                </p>
                <button
                  onClick={() => setTool("pen")}
                  className={cn("rounded-lg p-2 cursor-pointer", tool === "pen" ? "bg-teal-100 text-teal-700" : "text-zinc-500 hover:bg-zinc-100")}
                  aria-label={t("classes.pen")}
                >
                  <PenLine className="size-4" />
                </button>
                <button
                  onClick={() => setTool("eraser")}
                  className={cn("rounded-lg p-2 cursor-pointer", tool === "eraser" ? "bg-teal-100 text-teal-700" : "text-zinc-500 hover:bg-zinc-100")}
                  aria-label={t("classes.eraser")}
                >
                  <Eraser className="size-4" />
                </button>
                <div className="mx-1 flex gap-1">
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setColor(c);
                        setTool("pen");
                      }}
                      className={cn("size-6 rounded-full border-2 transition-transform cursor-pointer", color === c && tool === "pen" ? "scale-110 border-zinc-500" : "border-transparent")}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
                <div className="flex w-28 items-center gap-2">
                  <span className="text-[10px] text-zinc-500">{t("classes.penSize")}</span>
                  <Slider value={[penSize]} min={1} max={16} step={1} onValueChange={(v) => setPenSize(v[0])} />
                </div>
                <div className="ms-auto flex gap-1">
                  <button onClick={clearBoard} className="rounded-lg p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 cursor-pointer" aria-label={t("classes.clearBoard")}>
                    <Trash2 className="size-4" />
                  </button>
                  <button onClick={saveBoard} className="rounded-lg p-2 text-zinc-500 hover:bg-teal-50 hover:text-teal-700 cursor-pointer" aria-label={t("classes.saveBoard")}>
                    <Download className="size-4" />
                  </button>
                  <button onClick={() => setBoardOpen(false)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 cursor-pointer" aria-label={t("common.close")}>
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <canvas
                ref={canvasRef}
                className="min-h-0 flex-1 cursor-crosshair touch-none"
                onPointerDown={(e) => {
                  drawing.current = true;
                  lastPoint.current = getPoint(e);
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={draw}
                onPointerUp={() => {
                  drawing.current = false;
                  lastPoint.current = null;
                }}
                aria-label={t("classes.whiteboard")}
              />
            </div>
          ) : (
            <>
              {/* Teacher video (large) */}
              <div className="glass relative flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl !bg-white/5">
                <Avatar name={teacher?.displayName ?? "?"} size="xl" />
                <p className="font-bold text-white">{teacher?.displayName}</p>
                <Badge className="bg-violet-500/30 text-violet-100">{t("classes.teacher")}</Badge>
              </div>
              {/* Students strip */}
              <div className="no-scrollbar flex h-24 gap-2 overflow-x-auto">
                {students.map((s) => (
                  <div key={s.id} className="glass flex w-32 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl !bg-white/5">
                    <Avatar name={s.displayName} size="sm" />
                    <p className="max-w-full truncate px-2 text-[10px] text-white">{s.displayName}</p>
                    {raisedHands.has(s.id) && <Hand className="size-3 text-amber-400" />}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Students sidebar */}
        <aside className="glass-strong hidden w-72 flex-col overflow-hidden rounded-3xl md:flex">
          <header className="border-b border-border/40 px-4 py-3">
            <h2 className="text-sm font-bold">
              {t("classes.attendance")} ({toLocaleDigits(students.length, locale)})
            </h2>
          </header>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {students.map((s) => {
              const present = cls.attendance[s.id] ?? false;
              return (
                <div key={s.id} className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-accent/50">
                  <Avatar name={s.displayName} size="sm" online={s.isOnline} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{s.displayName}</p>
                    <p className={cn("text-[10px]", present ? "text-emerald-500" : "text-red-400")}>
                      {present ? t("classes.present") : t("classes.absent")}
                    </p>
                  </div>
                  {raisedHands.has(s.id) && <Hand className="size-3.5 animate-bounce text-amber-500" />}
                  {mutedStudents.has(s.id) && <MicOff className="size-3.5 text-red-400" />}
                  {isTeacher && (
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => setAttendance.mutate({ userId: s.id, present: !present })}
                        className={cn("rounded-lg p-1.5 cursor-pointer", present ? "text-emerald-500 hover:bg-emerald-500/10" : "text-muted-foreground hover:bg-accent")}
                        aria-label={t("classes.attendance")}
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setMutedStudents((prev) => {
                            const next = new Set(prev);
                            if (next.has(s.id)) next.delete(s.id);
                            else next.add(s.id);
                            return next;
                          })
                        }
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent cursor-pointer"
                        aria-label={t("classes.muteStudent")}
                      >
                        <MicOff className="size-3.5" />
                      </button>
                      <button
                        onClick={() => toast.info(`${s.displayName} — ${t("classes.removeStudent")}`)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
                        aria-label={t("classes.removeStudent")}
                      >
                        <UserX className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Controls */}
      <footer className="safe-area-bottom flex items-center justify-center gap-2 p-4 pt-1">
        {isTeacher ? (
          <button
            onClick={() => setBoardOpen((b) => !b)}
            className={cn(
              "flex h-12 items-center gap-2 rounded-full px-5 text-sm font-bold transition-all cursor-pointer",
              boardOpen ? "bg-gradient-to-l from-teal-500 to-emerald-600 text-white shadow-lg" : "bg-white/10 text-white hover:bg-white/20"
            )}
          >
            <Presentation className="size-5" /> {t("classes.whiteboard")}
          </button>
        ) : (
          <button
            onClick={() => {
              if (!currentUser) return;
              setRaisedHands((prev) => {
                const next = new Set(prev);
                if (next.has(currentUser.id)) next.delete(currentUser.id);
                else next.add(currentUser.id);
                return next;
              });
            }}
            className={cn(
              "flex h-12 items-center gap-2 rounded-full px-5 text-sm font-bold transition-all cursor-pointer",
              currentUser && raisedHands.has(currentUser.id)
                ? "bg-amber-500 text-white shadow-lg"
                : "bg-white/10 text-white hover:bg-white/20"
            )}
          >
            <Hand className="size-5" /> {t("classes.raiseHand")}
          </button>
        )}
        <button
          onClick={onLeave}
          className="flex h-12 items-center gap-2 rounded-full bg-red-500 px-6 font-bold text-white shadow-lg shadow-red-500/40 hover:bg-red-600 cursor-pointer"
          aria-label={t("classes.leaveClass")}
        >
          <Phone className="size-5 rotate-[135deg]" />
          <span className="hidden sm:inline">{t("classes.leaveClass")}</span>
        </button>
      </footer>
    </div>
  );
}
