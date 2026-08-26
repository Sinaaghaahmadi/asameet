"use client";

import { apiFetch, openExport } from "@/lib/client-api";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Cpu,
  Download,
  FileSpreadsheet,
  HardDrive,
  MessageSquare,
  Phone,
  Search,
  Server,
  ShieldCheck,
  Upload,
  Users,
  Video,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale, useT } from "@/lib/i18n";
import type { AdminStats, ServerMetrics, User } from "@/lib/types";
import { cn, formatDuration, formatRelativeDay, toLocaleDigits } from "@/lib/utils";

const PIE_COLORS = ["#0d9488", "#10b981", "#f59e0b", "#8b5cf6"];

export function AdminView() {
  const t = useT();
  const { locale } = useLocale();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: statsData } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await apiFetch("/api/admin/stats")).json() as Promise<{ stats: AdminStats }>,
    refetchInterval: 15000,
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await apiFetch("/api/admin/users")).json() as Promise<{ users: User[] }>,
  });

  const { data: serverData } = useQuery({
    queryKey: ["admin-server"],
    queryFn: async () => (await apiFetch("/api/admin/server")).json() as Promise<{ metrics: ServerMetrics }>,
    refetchInterval: 10000,
  });

  const toggleUser = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "suspend" | "activate" }) => {
      await apiFetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const importFile = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/admin/import", { method: "POST", body: fd });
      return res.json() as Promise<{ imported: number; skipped: number }>;
    },
    onSuccess: (data) => {
      toast.success(`✅ ${toLocaleDigits(data.imported, locale)} ${t("admin.users")}`);
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const stats = statsData?.stats;
  const metrics = serverData?.metrics;

  const statCards = useMemo(
    () => [
      { icon: Users, label: t("admin.totalUsers"), value: stats?.totalUsers ?? 0, accent: "from-teal-400/20 to-teal-600/30" },
      { icon: Activity, label: t("admin.activeUsers"), value: stats?.activeUsers ?? 0, accent: "from-emerald-400/20 to-emerald-600/30" },
      { icon: MessageSquare, label: t("admin.totalChats"), value: stats?.totalChats ?? 0, accent: "from-cyan-400/20 to-cyan-600/30" },
      { icon: Video, label: t("admin.totalMeetings"), value: stats?.totalMeetings ?? 0, accent: "from-violet-400/20 to-violet-600/30" },
      { icon: Phone, label: t("admin.activeCalls"), value: stats?.activeCalls ?? 0, accent: "from-amber-400/20 to-amber-600/30" },
      { icon: MessageSquare, label: t("admin.totalMessages"), value: stats?.totalMessages ?? 0, accent: "from-rose-400/20 to-rose-600/30" },
    ],
    [stats, t]
  );

  const activityData = (stats?.weeklyActivity ?? []).map((d) => ({
    ...d,
    dayLabel: t(`admin.days.${d.day}`),
  }));

  const roleData = (stats?.roleDistribution ?? []).map((r) => ({
    name: t(`admin.roles.${r.role}`),
    value: r.count,
  }));

  const users = (usersData?.users ?? []).filter(
    (u) =>
      !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const exports = [
    { kind: "users", label: t("admin.exportUsers") },
    { kind: "meetings", label: t("admin.exportMeetings") },
    { kind: "classes", label: t("admin.exportClasses") },
    { kind: "full", label: t("admin.exportFull") },
  ];

  return (
    <div className="mesh-bg h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <ShieldCheck className="size-7 text-primary icon-3d" />
            {t("admin.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t("admin.overview")}</TabsTrigger>
            <TabsTrigger value="users">{t("admin.users")}</TabsTrigger>
            <TabsTrigger value="server">{t("admin.server")}</TabsTrigger>
          </TabsList>

          {/* ========== Overview ========== */}
          <TabsContent value="overview" className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {statCards.map((c) => (
                <div key={c.label} className="glass-card p-4">
                  <span className={cn("icon-3d-wrap mb-2 size-9 !bg-gradient-to-br", c.accent)}>
                    <c.icon className="size-4 text-primary" />
                  </span>
                  <p className="text-2xl font-black tabular-nums">{toLocaleDigits(c.value, locale)}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{c.label}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-5">
              <div className="glass-card p-5 lg:col-span-3">
                <h2 className="mb-4 text-sm font-bold">{t("admin.activityChart")}</h2>
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData}>
                      <defs>
                        <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0d9488" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                      <XAxis dataKey="dayLabel" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={36} />
                      <ChartTooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid rgba(13,148,136,0.25)", fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="messages" name={t("admin.messagesLabel")} stroke="#0d9488" fill="url(#gm)" strokeWidth={2} />
                      <Area type="monotone" dataKey="calls" name={t("admin.callsLabel")} stroke="#f59e0b" fill="url(#gc)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-5 lg:col-span-2">
                <h2 className="mb-4 text-sm font-bold">{t("admin.userDistribution")}</h2>
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={roleData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                        {roleData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <ChartTooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ========== Users ========== */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-52 flex-1">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.searchUsers")} className="ps-9" aria-label={t("admin.searchUsers")} />
              </div>
              {exports.map((ex) => (
                <Button key={ex.kind} variant="glass" size="sm" onClick={() => openExport(ex.kind)}>
                  <FileSpreadsheet className="size-4 text-emerald-600" />
                  {ex.label}
                </Button>
              ))}
              <Button variant="glass" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4 text-primary" /> {t("admin.importExcel")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openExport("sample")}>
                <Download className="size-4" /> {t("admin.downloadSample")}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importFile.mutate(f);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="glass-card overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-start text-xs text-muted-foreground">
                    <th className="p-3 text-start font-medium">{t("admin.displayName")}</th>
                    <th className="p-3 text-start font-medium">{t("admin.username")}</th>
                    <th className="p-3 text-start font-medium">{t("admin.role")}</th>
                    <th className="p-3 text-start font-medium">{t("admin.status")}</th>
                    <th className="p-3 text-start font-medium">{t("admin.lastSeen")}</th>
                    <th className="p-3 text-start font-medium">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/40 transition-colors last:border-0 hover:bg-accent/40">
                      <td className="p-3">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={u.displayName} size="sm" online={u.isOnline} />
                          <span className="font-medium">{u.displayName}</span>
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground" dir="ltr">@{u.username}</td>
                      <td className="p-3">
                        <Badge variant={u.role === "admin" ? "destructive" : u.role === "teacher" ? "warning" : "default"}>
                          {t(`admin.roles.${u.role}`)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {u.isSuspended ? (
                          <Badge variant="destructive">{t("admin.suspended")}</Badge>
                        ) : u.isOnline ? (
                          <Badge variant="success">{t("common.online")}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("common.offline")}</Badge>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {formatRelativeDay(u.lastSeen, locale, t("common.today"), t("common.yesterday"))}
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant={u.isSuspended ? "secondary" : "destructive"}
                          className="h-8 text-xs"
                          disabled={u.role === "admin"}
                          onClick={() => toggleUser.mutate({ userId: u.id, action: u.isSuspended ? "activate" : "suspend" })}
                        >
                          {u.isSuspended ? t("admin.activate") : t("admin.suspend")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========== Server ========== */}
          <TabsContent value="server" className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="glass-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <Cpu className="size-4 text-primary" /> {t("admin.cpu")}
                  </span>
                  <span className="text-lg font-black tabular-nums">{toLocaleDigits(metrics?.cpu ?? 0, locale)}٪</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-gradient-to-l from-teal-400 to-emerald-600 transition-all" style={{ width: `${metrics?.cpu ?? 0}%` }} />
                </div>
              </div>
              <div className="glass-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <HardDrive className="size-4 text-primary" /> {t("admin.memory")}
                  </span>
                  <span className="text-lg font-black tabular-nums">{toLocaleDigits(metrics?.memory ?? 0, locale)}٪</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-gradient-to-l from-amber-400 to-orange-500 transition-all" style={{ width: `${metrics?.memory ?? 0}%` }} />
                </div>
              </div>
              <div className="glass-card flex items-center justify-between p-5">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <Activity className="size-4 text-emerald-500" /> {t("admin.uptime")}
                </span>
                <span className="text-lg font-black tabular-nums" dir="ltr">
                  {toLocaleDigits(formatDuration(metrics?.uptime ?? 0), locale)}
                </span>
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
                <Server className="size-4 text-primary" /> {t("admin.systemInfo")}
              </h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-secondary/60 p-3.5">
                  <dt className="text-xs text-muted-foreground">{t("admin.version")}</dt>
                  <dd className="mt-1 font-bold" dir="ltr">Asameet v{metrics?.version ?? "1.0.0"}</dd>
                </div>
                <div className="rounded-2xl bg-secondary/60 p-3.5">
                  <dt className="text-xs text-muted-foreground">{t("admin.platform")}</dt>
                  <dd className="mt-1 font-bold" dir="ltr">{metrics?.platform ?? "—"}</dd>
                </div>
                <div className="rounded-2xl bg-secondary/60 p-3.5">
                  <dt className="text-xs text-muted-foreground">{t("admin.nodeVersion")}</dt>
                  <dd className="mt-1 font-bold" dir="ltr">{metrics?.nodeVersion ?? "—"}</dd>
                </div>
                <div className="rounded-2xl bg-secondary/60 p-3.5">
                  <dt className="text-xs text-muted-foreground">{t("admin.serverStatus")}</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-bold text-emerald-500">
                    <span className="inline-block size-2 animate-pulse rounded-full bg-emerald-500" />
                    {t("admin.healthy")}
                  </dd>
                </div>
              </dl>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
