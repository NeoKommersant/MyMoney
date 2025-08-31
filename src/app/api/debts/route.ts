// src/app/api/debts/route.ts
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
  const debts = await prisma.debt.findMany({
    where: { userId },
    orderBy: [{ principalLeft: "asc" }],
  });
  return NextResponse.json(debts, { status: 200 });
}

type Body = {
  name?: string;
  type?: string; // credit_card|bank_loan|person
  principal?: number; // in cents
  principalLeft?: number; // in cents
  apr?: number; // e.g. 19.9
  minPayment?: number; // in cents
  dueDayOfMonth?: number;
};

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureDemoUserId();
    const body = (await req.json().catch(() => ({}))) as Body;

    const name = String(body?.name ?? "").trim();
    const type = String(body?.type ?? "").trim() || "person";
    const principal = Number(body?.principal ?? 0);
    const left = Number(body?.principalLeft ?? principal);
    const minPayment = Number(body?.minPayment ?? 0);
    const dueDayOfMonth = body?.dueDayOfMonth ?? null;
    const apr = body?.apr ?? null;

    if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });
    if (!Number.isFinite(principal) || principal <= 0)
      return NextResponse.json({ error: "invalid_principal" }, { status: 400 });
    if (!Number.isFinite(left) || left < 0)
      return NextResponse.json({ error: "invalid_principalLeft" }, { status: 400 });
    if (!Number.isFinite(minPayment) || minPayment < 0)
      return NextResponse.json({ error: "invalid_minPayment" }, { status: 400 });

    const created = await prisma.debt.create({
      data: {
        userId,
        name,
        type,
        principal: Math.round(principal),
        principalLeft: Math.round(left),
        apr: apr == null ? null : Number(apr),
        minPayment: Math.round(minPayment),
        dueDayOfMonth: dueDayOfMonth == null ? null : Number(dueDayOfMonth),
      },
    });

    return NextResponse.json(created, { status: 200 });
  } catch (e) {
    console.error("POST /api/debts error:", e);
    return NextResponse.json(
      { error: "internal_error", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

