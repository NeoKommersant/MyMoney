// src/app/api/debts/snowball/route.ts
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

// Compute a simple snowball plan per month using current free budget
// Query param: budgetCents (optional). If absent, compute from current month incomes-expenses.
export async function GET(req: NextRequest) {
  const userId = await ensureDemoUserId();
  const { searchParams } = new URL(req.url);
  const budgetCentsParam = Number(searchParams.get("budgetCents") ?? "NaN");

  function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }

  const from = startOfMonth();
  const to = endOfMonth();

  const [debts, incomeAgg, expensesAgg] = await Promise.all([
    prisma.debt.findMany({ where: { userId }, orderBy: { principalLeft: "asc" } }),
    prisma.income.aggregate({ _sum: { amount: true }, where: { userId, date: { gte: from, lte: to } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { userId, date: { gte: from, lte: to } } }),
  ]);

  const totalIncome = incomeAgg._sum.amount ?? 0;
  const totalExpenses = expensesAgg._sum.amount ?? 0;
  const inferredBudget = Math.max(0, totalIncome - totalExpenses);
  const budgetCents = Number.isFinite(budgetCentsParam) ? budgetCentsParam : inferredBudget;

  // if no debts or budget is zero, return early
  if (!debts.length || budgetCents <= 0) {
    return NextResponse.json({ budgetCents, schedule: [], months: 0 }, { status: 200 });
  }

  // clone debts state
  type D = { id: string; name: string; principalLeft: number; minPayment: number };
  const ds: D[] = debts.map((d) => ({ id: d.id, name: d.name, principalLeft: d.principalLeft, minPayment: d.minPayment }));

  // ensure min payments fit budget
  const minSum = ds.reduce((s, d) => s + (d.minPayment || 0), 0);
  if (minSum > budgetCents) {
    return NextResponse.json({
      budgetCents,
      schedule: [],
      months: 0,
      warning: "Budget does not cover minimum payments",
    }, { status: 200 });
  }

  const schedule: Array<{
    monthIndex: number;
    allocations: Array<{ debtId: string; name: string; min: number; extra: number; leftAfter: number }>;
  }> = [];

  let month = 0;
  const maxMonths = 120; // guard

  // continue until all debts are paid
  while (ds.some((d) => d.principalLeft > 0) && month < maxMonths) {
    // sort by smallest remaining (snowball)
    ds.sort((a, b) => a.principalLeft - b.principalLeft);

    let extraPool = budgetCents - ds.reduce((s, d) => s + Math.min(d.minPayment, d.principalLeft), 0);
    const allocations: { debtId: string; name: string; min: number; extra: number; leftAfter: number }[] = [];

    for (const d of ds) {
      if (d.principalLeft <= 0) {
        allocations.push({ debtId: d.id, name: d.name, min: 0, extra: 0, leftAfter: 0 });
        continue;
      }
      const min = Math.min(d.minPayment, d.principalLeft);
      d.principalLeft -= min;

      let extra = 0;
      if (d === ds.find((x) => x.principalLeft > 0)) {
        // apply all extra to the smallest active debt
        extra = Math.min(extraPool, d.principalLeft);
        d.principalLeft -= extra;
        extraPool -= extra;
      }
      allocations.push({ debtId: d.id, name: d.name, min, extra, leftAfter: d.principalLeft });
    }

    schedule.push({ monthIndex: month, allocations });
    month += 1;
  }

  return NextResponse.json({ budgetCents, schedule, months: schedule.length }, { status: 200 });
}

