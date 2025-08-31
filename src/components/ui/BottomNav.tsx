"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PiggyBank, Wallet } from "lucide-react";

const items = [
  { href: "/", label: "Расходы", icon: Home },
  { href: "/debts", label: "Долги", icon: Wallet },
  { href: "/savings", label: "Накопления", icon: PiggyBank },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-screen-sm md:max-w-3xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="glass-card flex items-center justify-around py-2.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors " +
                  (active ? "text-emerald-500" : "text-muted hover:text-emerald-500")
                }
              >
                <Icon size={22} strokeWidth={active ? 2.6 : 2} />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
