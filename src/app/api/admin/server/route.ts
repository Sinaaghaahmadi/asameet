import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
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
      version: "1.0.0",
      platform: `${os.platform()} ${os.arch()}`,
      nodeVersion: process.version,
    },
  });
}
