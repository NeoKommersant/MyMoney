export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = "demo-user";
  const cats = await prisma.category.findMany({
    where: { userId },
    select: { id: true, name: true, type: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(cats, { status: 200 });
}
