// src/app/api/goals/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function ensureDemoUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: { id: "demo-user", name: "Demo User" },
  });
  return user.id;
}

export async function GET() {
  const userId = await ensureDemoUserId();
  const goals = await prisma.goal.findMany({ where: { userId }, orderBy: [{ deadline: "asc" }, { name: "asc" }] });
  return NextResponse.json(goals, { status: 200 });
}

type Body = { name?: string; target?: number; deadline?: string };

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureDemoUserId();
    const body = (await req.json().catch(() => ({}))) as Body;
    const name = String(body?.name ?? "").trim();
    const target = Number(body?.target ?? 0);
    const deadline = body?.deadline ? new Date(body.deadline) : null;
    if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });
    if (!Number.isFinite(target) || target <= 0) return NextResponse.json({ error: "invalid_target" }, { status: 400 });

    const created = await prisma.goal.create({
      data: { userId, name, target: Math.round(target), saved: 0, deadline },
    });
    return NextResponse.json(created, { status: 200 });
  } catch (e) {
    console.error("POST /api/goals error:", e);
    return NextResponse.json(
      { error: "internal_error", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

