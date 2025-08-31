/* eslint-disable @next/next/no-html-link-for-pages */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Home, Utensils, Bus, Phone, HeartPulse, Shirt, Gamepad2, Ellipsis, Lightbulb } from "lucide-react";

type Category = { id: string; name: string; type?: string };
type Summary = {
  totalIncome: number;
  totalExpenses: number;
  warnings: string[];
  expensesByCategory?: { name: string; percent: number; cents: number }[];
};

type ExpenseItem = { id: string; date: string; amount: number; note?: string | null; categoryName: string };
type IncomeItem = { id: string; date: string; amount: number; note?: string | null; source: string };

export default function HomePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [selectedIconKey, setSelectedIconKey] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [submittingIncome, setSubmittingIncome] = useState(false);
  const [fabOpen, setFabOpen] = useState(false); // плавающее меню рекомендаций

  // Add Income modal state
  const [addIncomeOpen, setAddIncomeOpen] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState<string>("");
  const [incomeSource, setIncomeSource] = useState<string>("");
  const [incomeNote, setIncomeNote] = useState<string>("");
  // Refs for modal panels to handle outside click
  const expenseModalRef = useRef<HTMLDivElement | null>(null);
  const incomeModalRef = useRef<HTMLDivElement | null>(null);
  const addIncomeModalRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      setLoading(true);
      const [s, c] = await Promise.all([
        fetch("/api/summary", { cache: "no-store" }).then(async (r) => {
          if (!r.ok) throw new Error("summary fetch failed");
          return r.json();
        }),
        fetch("/api/categories", { cache: "no-store" }).then(async (r) => {
          if (!r.ok) throw new Error("categories fetch failed");
          return r.json();
        }),
      ]);

      const summaryData: Summary = s?.summary ?? s;
      const categories: Category[] = (c?.categories ?? c) as Category[];

      setSummary(summaryData);
      setCats(categories);
    } catch (e) {
      alert("Не удалось загрузить данные. Проверьте сервер разработки (npm run dev).");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global listeners: close modals by ESC and outside click
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (modalOpen) setModalOpen(false);
        if (incomeModalOpen) setIncomeModalOpen(false);
        if (addIncomeOpen) setAddIncomeOpen(false);
      }
    }
    function onDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (modalOpen && expenseModalRef.current && t && !expenseModalRef.current.contains(t)) {
        setModalOpen(false);
      }
      if (incomeModalOpen && incomeModalRef.current && t && !incomeModalRef.current.contains(t)) {
        setIncomeModalOpen(false);
      }
      if (addIncomeOpen && addIncomeModalRef.current && t && !addIncomeModalRef.current.contains(t)) {
        setAddIncomeOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [modalOpen, incomeModalOpen, addIncomeOpen]);

  // Иконки категорий для быстрого добавления расхода
  type IconCat = {
    key: string;
    label: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    synonyms?: string[];
  };

  const ICON_CATEGORIES: IconCat[] = [
    { key: "home", label: "Жильё", Icon: (p) => <Home {...p} />, synonyms: ["жилье", "жкх", "дом", "квартира", "аренда", "ипотека"] },
    { key: "food", label: "Еда", Icon: (p) => <Utensils {...p} />, synonyms: ["продукты", "питание", "еда"] },
    { key: "transport", label: "Транспорт", Icon: (p) => <Bus {...p} />, synonyms: ["транспорт", "проезд", "такси", "бензин", "авто"] },
    { key: "phone", label: "Связь", Icon: (p) => <Phone {...p} />, synonyms: ["связь", "интернет", "интернет/связь", "инет", "телефон", "моб связь", "мобильная", "оператор", "вайфай", "wi-fi"] },
    { key: "health", label: "Здоровье", Icon: (p) => <HeartPulse {...p} />, synonyms: ["здоровье", "аптека", "аптечка", "врач", "врачи", "медицина", "стоматология", "дантист", "зубы"] },
    { key: "clothes", label: "Одежда", Icon: (p) => <Shirt {...p} />, synonyms: ["одежда", "обувь", "гардероб"] },
    { key: "fun", label: "Досуг", Icon: (p) => <Gamepad2 {...p} />, synonyms: ["досуг", "развлечения", "кино", "игры", "спорт"] },
    { key: "other", label: "Разное", Icon: (p) => <Ellipsis {...p} />, synonyms: ["прочее", "разное", "другое"] },
  ];

  function normalize(s: string) {
    return s?.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  }
  function findCategoryIdBySynonyms(all: Category[], terms: string[]): string | undefined {
    const names = all.map((c) => ({ id: c.id, name: normalize(c.name) }));
    for (const t of terms) {
      const hit = names.find((n) => n.name === t) || names.find((n) => n.name.includes(t));
      if (hit) return hit.id;
    }
    return undefined;
  }
  const iconCatToId = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const ic of ICON_CATEGORIES) {
      const wanted = normalize(ic.label);
      const syns = [wanted, ...(ic.synonyms || []).map((x) => normalize(x))];
      const id = findCategoryIdBySynonyms(cats || [], syns);
      map.set(ic.key, id);
    }
    return map;
  }, [cats]);

  // Удаление записей (модалки)
  async function deleteExpense(id: string) {
    if (!confirm('Удалить расход?')) return;
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('Не удалось удалить расход'); return; }
    setExpenses((xs) => xs.filter((x) => x.id !== id));
    await load();
  }
  async function deleteIncome(id: string) {
    if (!confirm('Удалить доход?')) return;
    const res = await fetch(`/api/incomes/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('Не удалось удалить доход'); return; }
    setIncomes((xs) => xs.filter((x) => x.id !== id));
    await load();
  }

  const canSubmitExpense = useMemo(() => {
    const num = Number(amount);
    return !submittingExpense && !loading && Number.isFinite(num) && num > 0 && !!categoryId;
  }, [amount, categoryId, loading, submittingExpense]);

  const canSubmitIncome = useMemo(() => {
    const num = Number(incomeAmount);
    return !submittingIncome && Number.isFinite(num) && num > 0 && !!incomeSource;
  }, [incomeAmount, incomeSource, submittingIncome]);

  async function submitIncome(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(incomeAmount);
    if (!Number.isFinite(num) || num <= 0) { alert("Сумма должна быть > 0."); return; }
    if (!incomeSource) { alert("Выберите источник дохода."); return; }
    try {
      setSubmittingIncome(true);
      const res = await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(num * 100), source: incomeSource, note: incomeNote?.trim() || undefined }),
      });
      const text = await res.text();
      if (!res.ok) { let msg = text; try { msg = JSON.parse(text)?.message || JSON.parse(text)?.error || text; } catch {} alert("Ошибка добавления дохода: " + msg); return; }
      setAddIncomeOpen(false);
      await load();
      if (incomeModalOpen) { const r = await fetch("/api/incomes", { cache: "no-store" }); if (r.ok) setIncomes((await r.json())?.incomes ?? []); }
    } catch (e) { alert("Проблема соединения с API."); console.error(e); } finally { setSubmittingIncome(false); }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) { alert("Сумма должна быть > 0."); return; }
    if (!categoryId) { alert("Выберите категорию."); return; }
    try {
      setSubmittingExpense(true);
      const res = await fetch("/api/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(num * 100), categoryId, note: note?.trim() || undefined }),
      });
      const text = await res.text();
      if (!res.ok) { let msg = text; try { const j = text ? JSON.parse(text) : null; msg = j?.message || j?.error || text; } catch {} alert("Ошибка добавления расхода: " + msg); return; }
      setAmount(""); setNote("");
      await load();
    } catch (e) { alert("Проблема соединения с API."); console.error(e); } finally { setSubmittingExpense(false); }
  }

  // Подтягивать списки при открытии модалок
  useEffect(() => { if (modalOpen && expenses.length === 0) { (async () => { const r = await fetch("/api/expenses", { cache: "no-store" }); if (r.ok) setExpenses((await r.json())?.expenses ?? []); })(); } }, [modalOpen, expenses.length]);
  useEffect(() => { if (incomeModalOpen && incomes.length === 0) { (async () => { const r = await fetch("/api/incomes", { cache: "no-store" }); if (r.ok) setIncomes((await r.json())?.incomes ?? []); })(); } }, [incomeModalOpen, incomes.length]);

  return (
    <div className="h-screen overflow-hidden p-5 sm:p-6">
      <div className="max-w-xl sm:max-w-2xl md:max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{color: 'var(--foreground)'}}>Мои деньги</h1>

        {/* Cards */}
        <div id="kpi-grid" className="grid gap-3">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Card title="Доход" value={summary ? toRub(summary.totalIncome) : loading ? "..." : "0 ₽"} onClick={() => setIncomeModalOpen(true)} />
            <Card title="Расход" value={summary ? toRub(summary.totalExpenses) : loading ? "..." : "0 ₽"} onClick={() => setModalOpen(true)} />
          </div>
        </div>


        {/* Модалка: Доходы (история) */}
        {incomeModalOpen ? (
          <div className="fixed inset-0 z-50" onClick={(e) => { if (e.currentTarget === e.target) setIncomeModalOpen(false); }}>
            <div className="absolute inset-0 bg-black/30" onClick={() => setIncomeModalOpen(false)} />
            <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
              <div ref={incomeModalRef} className="w-full max-w-2xl glass-card rounded-2xl overflow-hidden modal-panel h-[75vh] md:h-auto md:max-h-[85vh] flex flex-col" onClick={(e)=>e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 shrink-0">
                  <div className="font-semibold" style={{color: 'var(--foreground)'}}>Доходы: история</div>
                  <button type="button" className="text-accent hover:opacity-90 cursor-pointer" onClick={() => setIncomeModalOpen(false)}>Закрыть</button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  {incomes.length === 0 ? (
                    <div className="text-muted">Доходов пока нет</div>
                  ) : (
                    <div className="divide-y">
                      {incomes.map((e) => (
                        <div key={e.id} className="py-2 flex items-center justify-between gap-3">
                          <div className="text-foreground min-w-0">
                            <div className="font-medium truncate">{e.source}</div>
                            {e.note ? <div className="text-muted text-sm truncate">{e.note}</div> : null}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-foreground text-sm text-right">
                              <div>{toRub(e.amount)}</div>
                              <div className="text-muted">{new Date(e.date).toLocaleDateString('ru-RU')}</div>
                            </div>
                            <button type="button" onClick={() => deleteIncome(e.id)} className="text-red-600 hover:text-red-700 text-sm cursor-pointer">Удалить</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Модалка: Расходы (история) */}
        {modalOpen ? (
          <div className="fixed inset-0 z-50" onClick={(e) => { if (e.currentTarget === e.target) setModalOpen(false); }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
            <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
              <div ref={expenseModalRef} className="w-full max-w-2xl glass-card rounded-2xl overflow-hidden modal-panel h-[75vh] md:h-auto md:max-h-[85vh] flex flex-col" onClick={(e)=>e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                  <div className="font-semibold text-foreground">Расходы: история</div>
                  <button type="button" className="text-accent hover:opacity-90 cursor-pointer" onClick={() => setModalOpen(false)}>Закрыть</button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  {expenses.length === 0 ? (
                    <div className="text-muted">Расходов пока нет</div>
                  ) : (
                    <div className="divide-y">
                      {expenses.map((e) => (
                        <div key={e.id} className="py-2 flex items-center justify-between gap-3">
                          <div className="text-foreground min-w-0">
                            <div className="font-medium truncate">{e.categoryName}</div>
                            {e.note ? <div className="text-muted text-sm truncate">{e.note}</div> : null}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-foreground text-sm text-right">
                              <div>{toRub(e.amount)}</div>
                              <div className="text-muted">{new Date(e.date).toLocaleDateString('ru-RU')}</div>
                            </div>
                            <button type="button" onClick={() => deleteExpense(e.id)} className="text-red-600 hover:text-red-700 text-sm cursor-pointer">Удалить</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Клавиатура суммы + иконки категорий */}
        <form onSubmit={addExpense} className="p-4 rounded-2xl glass-card">
          {/* 1) Заголовок + сумма + удаление */}
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-foreground">Введите расход</div>
            <div className="flex items-center gap-4">
              <div className="text-indigo-500 text-2xl font-semibold min-w-[60px] text-right">{amount ? formatAmountWithSpaces(amount) : '0'}</div>
              <button type="button" aria-label="Удалить последнюю цифру" onClick={() => setAmount((prev) => prev.slice(0, -1))} className="px-2 py-1 rounded-md border border-white/20 hover:border-white/40 cursor-pointer">⌫</button>
            </div>
          </div>

          {/* 2) Цифровая клавиатура */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {["1","2","3","4","5","6","7","8","9","0"].map((d) => (
              <button key={d} type="button" onClick={() => setAmount((prev) => (prev.replace(/\D/g,'') + d).replace(/^0+(?=\d)/,''))} className="py-2 rounded-xl bg-white/10 hover:bg-white/15 text-foreground text-base cursor-pointer">{d}</button>
            ))}
          </div>

          {/* 3) Иконки */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-4">
            {ICON_CATEGORIES.map(({ key, label, Icon }) => {
              const selected = selectedIconKey === key;
              const otherId = findCategoryIdBySynonyms(cats || [], ["разное", "прочее", "другое"]);
              const fallbackByKey =
                key === "phone"
                  ? findCategoryIdBySynonyms(cats || [], ["связь", "интернет", "телефон", "оператор", "wi-fi", "вайфай", "интернет/связь"]) || undefined
                  : key === "health"
                  ? findCategoryIdBySynonyms(cats || [], ["здоровье", "аптека", "врач", "медицина", "стоматология", "зубы"]) || undefined
                  : undefined;
              const id = (iconCatToId.get(key) || fallbackByKey || otherId) as string | undefined;
              const canSelect = !!id;
              return (
                <button key={key} type="button" aria-pressed={selected} onClick={() => { if (!canSelect) return; setSelectedIconKey(key); setCategoryId(id!); }} title={canSelect ? label : `${label}: категория не найдена`} className={`flex flex-col items-center justify-center p-1 rounded-xl border transition shadow-sm select-none ${selected ? 'bg-indigo-600/10 border-indigo-500' : 'border-white/15 hover:border-white/30'} ${canSelect ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${selected ? 'bg-indigo-500/20' : 'bg-white/10'}`}>
                    <Icon size={22} className={selected ? 'text-indigo-500' : 'text-foreground'} />
                  </div>
                  <div className="text-[11px] text-foreground text-center leading-tight">{label}</div>
                </button>
              );
            })}
          </div>

          {/* 4) Заметка */}
          <div className="mb-4">
            <input className="ui-input w-full" placeholder="Заметка" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {/* 5) Кнопка */}
          <div className="flex justify-center">
            <button type="submit" disabled={!canSubmitExpense} className={`rounded-2xl px-6 py-2 text-white ${canSubmitExpense ? 'bg-black hover:opacity-90 cursor-pointer' : 'bg-gray-400 cursor-not-allowed'}`} title={!categoryId ? 'Выберите категорию' : !amount ? 'Введите сумму' : ''}>
              {submittingExpense ? 'Добавляем...' : 'Добавить'}
            </button>
          </div>
        </form>

        {/* Кнопка добавления дохода + модалка */}
        <button onClick={() => setAddIncomeOpen(true)} className="rounded-2xl px-4 py-2 bg-indigo-600 text-white shadow hover:opacity-90 cursor-pointer">+ Добавить доход</button>
        {addIncomeOpen ? (
          <div className="fixed inset-0 z-50" onClick={(e)=>{ if(e.currentTarget===e.target) setAddIncomeOpen(false); }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setAddIncomeOpen(false)} />
            <div className="absolute inset-0 flex items-start md:items-center justify-center p-4 md:p-8">
              <div ref={addIncomeModalRef} className="w-full max-w-md glass-card rounded-2xl overflow-hidden modal-panel" onClick={(e)=>e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="font-semibold text-foreground">Добавить доход</div>
                  <button type="button" className="text-accent hover:opacity-90 cursor-pointer" onClick={() => setAddIncomeOpen(false)}>Закрыть</button>
                </div>
                <form onSubmit={submitIncome} className="p-4 space-y-3">
                  <input type="number" step="0.01" placeholder="Сумма (руб)" className="ui-input w-full" value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} />
                  <select className="ui-input w-full cursor-pointer" value={incomeSource} onChange={(e) => setIncomeSource(e.target.value)}>
                    <option value="">Выберите источник</option>
                    <option value="зарплата">Зарплата</option>
                    <option value="подработка">Подработка</option>
                    <option value="подарок">Подарок</option>
                    <option value="возврат">Возврат</option>
                    <option value="иное">Иное</option>
                  </select>
                  <input placeholder="Заметка (необязательно)" className="ui-input w-full" value={incomeNote} onChange={(e) => setIncomeNote(e.target.value)} />
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" className="px-3 py-2 rounded-xl border border-gray-300 text-muted hover:bg-gray-50 cursor-pointer" onClick={() => setAddIncomeOpen(false)}>Отмена</button>
                    <button type="submit" disabled={!canSubmitIncome} className={`px-4 py-2 rounded-2xl text-white ${canSubmitIncome ? 'bg-black hover:opacity-90 cursor-pointer' : 'bg-gray-400 cursor-not-allowed'}`}>{submittingIncome ? 'Добавляем...' : 'Добавить'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : null}

        {/* Floating recommendations (FAB) */}
        <div className="fixed right-3 sm:right-4 top-1/2 md:top-[55%] -translate-y-1/2 z-40 flex items-center gap-2">
          {/* Recommendations stack */}
          <div className={`flex items-center gap-2 transition-all duration-300 ease-out ${fabOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'} `}>
            {(summary?.warnings ?? []).map((w, i) => (
              <div
                key={i}
                className={`px-3 py-2 rounded-2xl bg-white/70 backdrop-blur-md shadow-lg text-xs text-gray-900 whitespace-nowrap translate-x-2 opacity-0 ${fabOpen ? 'animate-[fadein_300ms_ease-out_forwards]' : ''}`}
                style={{ animationDelay: fabOpen ? `${i * 80 + 80}ms` : '0ms' }}
                title={w}
              >
                {w}
              </div>
            ))}
            <style jsx>{`
              @keyframes fadein { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
            `}</style>
          </div>
          {/* FAB button */}
          <button
            type="button"
            aria-expanded={fabOpen}
            onClick={() => setFabOpen((v) => !v)}
            className={`w-12 h-12 flex items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-all duration-300 ${fabOpen ? 'bg-yellow-300/80 text-yellow-900' : 'bg-white/70 text-yellow-600 hover:bg-white/80'} `}
            title={fabOpen ? 'Скрыть рекомендации' : 'Показать рекомендации'}
          >
            <Lightbulb size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, onClick, bgClass }: { title: string; value: string; onClick?: () => void; bgClass?: string }) {
  return (
    <button type="button" onClick={onClick} className={`text-left p-4 rounded-2xl glass-card transition-transform duration-200 ease-out active:scale-95 cursor-pointer ${bgClass ?? ''}`}>
      <div className="text-sm text-muted">{title}</div>
      <div className="text-xl font-semibold text-foreground">{value}</div>
    </button>
  );
}

function toRub(cents?: number) {
  const rub = (cents ?? 0) / 100;
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(rub);
}

function formatAmountWithSpaces(numStr: string) {
  const digits = (numStr || "").replace(/\D/g, "");
  if (!digits) return "0";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
