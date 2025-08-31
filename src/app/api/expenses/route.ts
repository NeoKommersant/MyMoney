// src/app/api/expenses/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function GET() {
  const userId = "demo-user";
  const from = startOfMonth();
  const to = endOfMonth();

  const items = await prisma.expense.findMany({
    where: { userId, date: { gte: from, lte: to } },
    orderBy: [{ date: "desc" }],
    include: { category: { select: { name: true } } },
  });

  const list = items.map((e) => ({
    id: e.id,
    date: e.date,
    amount: e.amount,
    note: e.note,
    categoryName: e.category?.name ?? "Без категории",
  }));

  return NextResponse.json({ expenses: list }, { status: 200 });
}

