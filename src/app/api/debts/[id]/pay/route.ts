/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/debts/[id]/pay/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = { amount?: number; date?: string };

// loosen context typing to satisfy Next route type-checker
export async function POST(req: Request, context: any) {
  try {
    const debtId = context?.params?.id as string;
    const body = (await req.json().catch(() => ({}))) as Body;
    const raw = Number(body?.amount ?? 0);
    if (!Number.isFinite(raw) || raw <= 0)
      return NextResponse.json({ error: "invalid_amount" }, { status: 400 });

    const debt = await prisma.debt.findUnique({ where: { id: debtId } });
    if (!debt) return NextResponse.json({ error: "debt_not_found" }, { status: 404 });

    const amount = Math.round(raw);
    const newLeft = Math.max(0, (debt.principalLeft ?? 0) - amount);

    const [payment, updated] = await prisma.$transaction([
      prisma.debtPayment.create({
        data: {
          debtId,
          amount,
          date: body?.date ? new Date(body.date) : new Date(),
        },
      }),
      prisma.debt.update({
        where: { id: debtId },
        data: { principalLeft: newLeft },
      }),
    ]);

    return NextResponse.json({ payment, debt: updated }, { status: 200 });
  } catch (e) {
    console.error("POST /api/debts/[id]/pay error:", e);
    return NextResponse.json(
      { error: "internal_error", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
