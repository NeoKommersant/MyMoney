// src/app/api/summary/route.ts
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

  const [incomesAgg, expenses] = await Promise.all([
    prisma.income.aggregate({
      _sum: { amount: true },
      where: { userId, date: { gte: from, lte: to } },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: from, lte: to } },
      include: { category: { select: { name: true } } },
    }),
  ]);

  const totalIncome = incomesAgg._sum.amount ?? 0;
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  const norm = (s: string) => s.normalize("NFKC").trim().toLowerCase();
  const byCategory = new Map<string, { name: string; cents: number }>();
  for (const e of expenses) {
    const name = e.category?.name ? e.category.name : "Без категории";
    const key = norm(name);
    const prev = byCategory.get(key);
    byCategory.set(key, { name, cents: (prev?.cents ?? 0) + (e.amount ?? 0) });
  }
  const foodSpent = byCategory.get(norm("Еда"))?.cents ?? 0;
  const funSpent = byCategory.get(norm("Развлечения"))?.cents ?? 0;

  const foodRatio = totalIncome > 0 ? foodSpent / totalIncome : 0;
  const funRatio = totalIncome > 0 ? funSpent / totalIncome : 0;
  const warningFood = foodRatio > 0.2 ? `Еда ${Math.round(foodRatio * 100)}% (>20%). Сократить траты.` : null;
  const warningFun = funRatio > 0.25 ? `Развлечения ${Math.round(funRatio * 100)}% (>25%). Сократить траты.` : null;

  const availableToday = totalIncome - totalExpenses; // MVP-приближение

  return NextResponse.json(
    {
      totalIncome,
      totalExpenses,
      warnings: [warningFood, warningFun].filter(Boolean) as string[],
      expensesByCategory: Array.from(byCategory.values()).map(({ name, cents }) => ({ name, percent: totalExpenses > 0 ? Math.round((cents / totalExpenses) * 100) : 0, cents })),
    },
    { status: 200 }
  );
}
