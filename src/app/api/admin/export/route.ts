import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requireToken, rpc } from "@/lib/server/api";

/** Excel-compatible CSV export (UTF-8 BOM so Persian text opens correctly in Excel). */

function toCsv(rows: string[][]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

interface ExportData {
  header: string[];
  rows: string[][];
}

export async function GET(req: NextRequest) {
  try {
    const token = await requireToken();
    const kind = req.nextUrl.searchParams.get("kind") ?? "users";

    let rows: string[][];
    if (kind === "full") {
      rows = [];
      for (const part of ["users", "meetings", "classes"]) {
        const data = await rpc<ExportData>("api_admin_export", { p_token: token, p_kind: part });
        if (rows.length > 0) rows.push([]);
        rows.push(data.header, ...data.rows);
      }
    } else {
      const data = await rpc<ExportData>("api_admin_export", { p_token: token, p_kind: kind });
      rows = [data.header, ...data.rows];
    }

    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="asameet-${kind}.csv"`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
