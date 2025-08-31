/* eslint-disable @next/next/no-html-link-for-pages */
"use client";
import { useEffect, useState } from "react";

type Debt = {
  id: string;
  name: string;
  type: string;
  principal: number;
  principalLeft: number;
  minPayment: number;
  apr?: number | null;
  dueDayOfMonth?: number | null;
};

type Snowball = {
  budgetCents: number;
  months: number;
  schedule: Array<{
    monthIndex: number;
    allocations: Array<{ debtId: string; name: string; min: number; extra: number; leftAfter: number }>;
  }>;
  warning?: string;
};

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [plan, setPlan] = useState<Snowball | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/debts", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load debts");
      setDebts(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addDebt(e: React.FormEvent) {
    e.preventDefault();
    const p = Math.round(Number(principal) * 100);
    const m = Math.round(Number(minPayment) * 100);
    if (!name || !Number.isFinite(p) || p <= 0) return alert("Введите корректную сумму долга");
    if (!Number.isFinite(m) || m < 0) return alert("Введите корректный минимум платежа");
    const res = await fetch("/api/debts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, principal: p, principalLeft: p, minPayment: m, type: "person" }),
    });
    if (!res.ok) { alert("Ошибка добавления долга"); return; }
    setName(""); setPrincipal(""); setMinPayment("");
    await load();
  }

  async function computePlan() {
    const res = await fetch("/api/debts/snowball", { cache: "no-store" });
    if (!res.ok) { alert("Ошибка расчета плана"); return; }
    setPlan(await res.json());
  }

  return (
    <div className="h-screen overflow-hidden p-6 md:p-10 text-foreground">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold text-foreground">Долги</h1>
        <div className="flex gap-3 text-sm">
          <a className="underline text-indigo-700" href="/">Главная</a>
          <a className="underline text-indigo-700" href="/debts">Долги</a>
          <a className="underline text-indigo-700" href="/savings">Накопления</a>
        </div>

        <form onSubmit={addDebt} className="p-4 rounded-2xl glass-card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="border rounded-xl p-2" placeholder="Название" value={name} onChange={(e)=>setName(e.target.value)} />
            <input className="border rounded-xl p-2" placeholder="Сумма (₽)" type="number" step="0.01" value={principal} onChange={(e)=>setPrincipal(e.target.value)} />
            <input className="border rounded-xl p-2" placeholder="Мин.платеж (₽)" type="number" step="0.01" value={minPayment} onChange={(e)=>setMinPayment(e.target.value)} />
            <button className="rounded-2xl px-4 py-2 bg-black text-white">Добавить долг</button>
          </div>
        </form>

        <div className="p-4 rounded-2xl glass-card">
          <div className="font-semibold mb-3">Список долгов</div>
          {loading ? (
            <div>Загрузка...</div>
          ) : debts.length === 0 ? (
            <div className="text-muted">Пока пусто</div>
          ) : (
            <div className="space-y-2">
              {debts.map((d) => (
                <div key={d.id} className="flex items-center justify-between">
                  <div className="text-foreground">{d.name}</div>
                  <div className="text-muted">
                    Остаток: {toRub(d.principalLeft)} · Мин: {toRub(d.minPayment)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl glass-card">
          <div className="flex items-center justify-between">
            <div className="font-semibold">План «снежный ком»</div>
            <button onClick={computePlan} className="rounded-2xl px-4 py-2 bg-indigo-600 text-white">Рассчитать</button>
          </div>
          {plan ? (
            <div className="mt-3 text-sm text-foreground">
              {plan.warning ? <div className="text-yellow-700 mb-2">{plan.warning}</div> : null}
              <div className="mb-2">Бюджет на долги/мес: {toRub(plan.budgetCents)}</div>
              <div>Месяцев до полного закрытия: {plan.months}</div>
            </div>
          ) : (
            <div className="mt-3 text-muted">Нажмите «Рассчитать»</div>
          )}
        </div>
      </div>
    </div>
  );
}

function toRub(cents?: number) {
  const rub = (cents ?? 0) / 100;
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(rub);
}
