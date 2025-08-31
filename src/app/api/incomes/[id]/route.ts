// src/app/api/incomes/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function DELETE(_req: Request, context: any) {
  try {
    const userId = "demo-user";
    const id = context?.params?.id as string;
    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

    const item = await prisma.income.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!item || item.userId !== userId) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.income.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("DELETE /api/incomes/[id] error:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

