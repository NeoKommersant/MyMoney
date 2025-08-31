// src/app/api/goals/projection/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function ensureDemoUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: { id: "demo-user", name: "Demo User" },
  });
  return user.id;
}

function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }

export async function GET() {
  const userId = await ensureDemoUserId();
  const from = startOfMonth();
  const to = endOfMonth();

  const [goals, incomeAgg, expenseAgg, debts] = await Promise.all([
    prisma.goal.findMany({ where: { userId }, orderBy: [{ deadline: "asc" }, { name: "asc" }] }),
    prisma.income.aggregate({ _sum: { amount: true }, where: { userId, date: { gte: from, lte: to } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { userId, date: { gte: from, lte: to } } }),
    prisma.debt.findMany({ where: { userId } }),
  ]);

  const totalIncome = incomeAgg._sum.amount ?? 0;
  const totalExpenses = expenseAgg._sum.amount ?? 0;
  const minDebt = debts.reduce((s, d) => s + Math.min(d.minPayment, d.principalLeft), 0);
  const free = Math.max(0, totalIncome - totalExpenses - minDebt);

  // three variants as share of free money per month
  const variants = [
    { key: "conservative", percent: 0.1 },
    { key: "balanced", percent: 0.2 },
    { key: "aggressive", percent: 0.3 },
  ];

  const projections = variants.map((v) => {
    const monthly = Math.floor(free * v.percent);
    if (monthly <= 0 || goals.length === 0) {
      return { key: v.key, monthlyBudget: monthly, perGoal: [] as { id: string; name: string; target: number; saved: number; monthly: number; months: number; finishAt: Date | null }[] };
    }
    const perGoalBudget = Math.floor(monthly / goals.length);
    const perGoal = goals.map((g) => {
      const left = Math.max(0, (g.target ?? 0) - (g.saved ?? 0));
      const months = perGoalBudget > 0 ? Math.ceil(left / perGoalBudget) : Infinity;
      const finish = Number.isFinite(months)
        ? new Date(new Date().getFullYear(), new Date().getMonth() + months, 1)
        : null;
      return {
        id: g.id,
        name: g.name,
        target: g.target,
        saved: g.saved,
        monthly: perGoalBudget,
        months,
        finishAt: finish,
      };
    });
    return { key: v.key, monthlyBudget: monthly, perGoal };
  });

  return NextResponse.json(
    {
      totalIncome,
      totalExpenses,
      minDebt,
      free,
      projections,
    },
    { status: 200 }
  );
}
