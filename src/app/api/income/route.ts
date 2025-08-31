// src/app/api/income/route.ts
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

type Body = {
  amount?: number | string;
  date?: string;
  source?: string; // salary|advance|freelance|gift...
  note?: string;
};

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureDemoUserId();
    const body = (await req.json().catch(() => ({}))) as Body;

    const rawAmount = body?.amount;
    const amountNum = Number(String(rawAmount ?? "").replace(",", ".").trim());
    if (!rawAmount || !isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "invalid_amount", message: "amount (в копейках) обязателен и > 0" },
        { status: 400 }
      );
    }

    const source = String(body?.source ?? "").trim();
    if (!source) {
      return NextResponse.json(
        { error: "source_required", message: "Поле source обязательно (salary|advance|freelance|gift...)" },
        { status: 400 }
      );
    }

    const created = await prisma.income.create({
      data: {
        user: { connect: { id: userId } },
        amount: Math.round(amountNum),
        date: body?.date ? new Date(body.date) : new Date(),
        source,
        note: body?.note ? String(body.note) : null,
      },
    });

    return NextResponse.json(created, { status: 200 });
  } catch (e) {
    console.error("POST /api/income error:", e);
    return NextResponse.json(
      { error: "internal_error", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
