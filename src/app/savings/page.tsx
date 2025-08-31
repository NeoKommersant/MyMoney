/* eslint-disable @next/next/no-html-link-for-pages */
"use client";
import { useEffect, useState } from "react";
import CircularProgress from "@/components/ui/CircularProgress";

type Goal = { id: string; name: string; target: number; saved: number; deadline?: string | null };
type Projection = {
  totalIncome: number;
  totalExpenses: number;
  minDebt: number;
  free: number;
  projections: Array<{
    key: string;
    monthlyBudget: number;
    perGoal: Array<{ id: string; name: string; target: number; saved: number; monthly: number; months: number; finishAt: string | null }>;
  }>;
};

export default function SavingsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [proj, setProj] = useState<Projection | null>(null);

  async function load() {
    const [g, p] = await Promise.all([
      fetch("/api/goals", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/goals/projection", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setGoals(g);
    setProj(p);
  }

  useEffect(() => { load(); }, []);

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    const t = Math.round(Number(target) * 100);
    if (!name || !Number.isFinite(t) || t <= 0) return alert("Введите корректную цель");
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, target: t }),
    });
    if (!res.ok) return alert("Ошибка добавления цели");
    setName(""); setTarget("");
    await load();
  }

  return (
    <div className="h-screen overflow-hidden p-6 md:p-10 text-foreground">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold text-foreground">Накопления</h1>
        <div className="flex gap-3 text-sm">
          <a className="underline text-indigo-700" href="/">Главная</a>
          <a className="underline text-indigo-700" href="/debts">Долги</a>
          <a className="underline text-indigo-700" href="/savings">Накопления</a>
        </div>

        <form onSubmit={addGoal} className="p-4 rounded-2xl glass-card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="border rounded-xl p-2" placeholder="Цель" value={name} onChange={(e)=>setName(e.target.value)} />
            <input className="border rounded-xl p-2" placeholder="Сумма (₽)" type="number" step="0.01" value={target} onChange={(e)=>setTarget(e.target.value)} />
            <button className="rounded-2xl px-4 py-2 bg-black text-white">Добавить цель</button>
          </div>
        </form>

        <div className="p-4 rounded-2xl glass-card">
          <div className="font-semibold mb-2">Список целей</div>
          {goals.length === 0 ? <div className="text-muted">Пока пусто</div> : (
            <div className="space-y-2">
              {goals.map((g) => (
                <div key={g.id} className="flex items-center justify-between">
                  <div className="text-foreground">{g.name}</div>
                  <div className="text-muted">{toRub(g.saved)} / {toRub(g.target)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl glass-card">
          <div className="font-semibold mb-2">Прогноз по вариантам откладывания</div>
          {!proj ? (
            <div className="text-muted">Загрузка...</div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted">Свободно после расходов и минимальных платежей по долгам: {toRub(proj.free)}</div>
              {proj.projections.map((v) => (
                <div key={v.key} className="border rounded-xl p-3">
                  <div className="font-semibold mb-1">{label(v.key)} — бюджет: {toRub(v.monthlyBudget)} / мес</div>
                  {v.perGoal.length === 0 ? (
                    <div className="text-muted">Нет целей</div>
                  ) : (
                    <div className="text-sm space-y-1">
                      {v.perGoal.map((g) => (
                        <div key={g.id} className="flex items-center justify-between">
                          <div>{g.name}</div>
                          <div>взнос: {toRub(g.monthly)} · месяцев: {g.months} · до: {g.finishAt ? new Date(g.finishAt).toLocaleDateString("ru-RU") : "—"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Visual goals grid with circular progress */}
        <div className="p-4 rounded-2xl glass-card">
          <div className="font-semibold mb-2">Цели (прогресс)</div>
          {goals.length === 0 ? (
            <div className="text-muted">Пока нет целей</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {goals.map((g) => {
                const ratio = g.target > 0 ? g.saved / g.target : 0;
                const percent = Math.min(100, Math.round(ratio * 100));
                return (
                  <div key={g.id} className="glass-card p-3 flex flex-col items-center text-center">
                    <CircularProgress value={ratio} label={`${percent}%`} mintToRose />
                    <div className="mt-2 font-semibold">{g.name}</div>
                    <div className="text-sm text-slate-600">{toRub(g.saved)} / {toRub(g.target)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function label(key: string) {
  if (key === "conservative") return "Консервативный (10%)";
  if (key === "balanced") return "Сбалансированный (20%)";
  if (key === "aggressive") return "Агрессивный (30%)";
  return key;
}

function toRub(cents?: number) {
  const rub = (cents ?? 0) / 100;
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(rub);
}
