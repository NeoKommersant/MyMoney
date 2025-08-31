// src/app/api/expense/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
  note?: string;
  categoryId?: string;
  categoryName?: string;
};

export async function POST(req: NextRequest) {
  try {
    const userId = await ensureDemoUserId();
    const body = (await req.json().catch(() => ({}))) as Body;

    // amount: число в копейках
    const rawAmount = body?.amount;
    const amountNum = Number(String(rawAmount ?? "").replace(",", ".").trim());
    if (!rawAmount || !isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "invalid_amount", message: "amount (в копейках) обязателен и > 0" },
        { status: 400 }
      );
    }

    // Категория: по id ИЛИ по (userId, name)
    let resolvedCategoryId: string | null = null;

    if (body.categoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: body.categoryId },
        select: { id: true },
      });
      if (!cat) {
        return NextResponse.json(
          { error: "invalid_category", message: "Категория с таким id не найдена" },
          { status: 400 }
        );
      }
      resolvedCategoryId = cat.id;
    } else if (body.categoryName) {
      const cat = await prisma.category.findFirst({
        where: { userId, name: body.categoryName },
        select: { id: true },
      });
      if (!cat) {
        return NextResponse.json(
          { error: "invalid_category", message: "Категория с таким названием не найдена у этого пользователя" },
          { status: 400 }
        );
      }
      resolvedCategoryId = cat.id;
    } else {
      return NextResponse.json(
        { error: "category_required", message: "Укажите categoryId или categoryName" },
        { status: 400 }
      );
    }

    const created = await prisma.expense.create({
      data: {
        amount: Math.round(amountNum),
        date: body?.date ? new Date(body.date) : new Date(),
        note: body?.note ? String(body.note) : null,
        user: { connect: { id: userId } },
        category: { connect: { id: resolvedCategoryId } },
      },
    });

    return NextResponse.json(created, { status: 200 });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json(
        { error: "foreign_key_failed", message: "Проверьте наличие user/category." },
        { status: 400 }
      );
    }
    console.error("POST /api/expense error:", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "internal_error", detail }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
