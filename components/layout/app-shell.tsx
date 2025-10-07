import Link from "next/link";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { label: "ダッシュボード", href: "/" },
  { label: "アップロード", href: "#upload", disabled: true },
  { label: "設定", href: "#settings", disabled: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold uppercase text-white">
              ID
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-slate-600">
                imgdose 管理コンソール
              </p>
              <p className="text-xs text-slate-500">
                Cloudflare Workers / R2 / D1 統合ダッシュボード
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
            {NAV_ITEMS.map((item) =>
              item.disabled ? (
                <span
                  key={item.label}
                  className="cursor-not-allowed rounded-full border border-dashed border-slate-200 px-3 py-1.5 text-slate-300"
                  title="近日実装予定"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-transparent px-3 py-1.5 transition hover:border-slate-200 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
