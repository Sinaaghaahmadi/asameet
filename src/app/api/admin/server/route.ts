import { NextResponse } from "next/server";
import os from "os";
import { ApiError, errorResponse, requireToken, rpc } from "@/lib/server/api";
import pkg from "../../../../../package.json";
import type { User } from "@/lib/types";

export async function GET() {
  try {
    const token = await requireToken();
    const { user } = await rpc<{ user: User }>("api_me", { p_token: token });
    if (user.role !== "admin") throw new ApiError("forbidden", 403);

    const load = os.loadavg()[0];
    const cpus = os.cpus().length || 1;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return NextResponse.json({
      metrics: {
        cpu: Math.min(100, Math.round((load / cpus) * 100)),
        memory: Math.round(((totalMem - freeMem) / totalMem) * 100),
        memoryTotal: Math.round(totalMem / 1024 / 1024 / 1024),
        uptime: Math.round(process.uptime()),
        version: pkg.version,
        platform: `${os.platform()} ${os.arch()}`,
        nodeVersion: process.version,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
