import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowUpRight, Banknote, Eye, EyeOff, Flame, Landmark, Plus, UserPlus, Wallet,
} from "lucide-react";
import { EntryForm } from "@/components/app/EntryForm";
import { AccountForm } from "@/components/app/AccountForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CASH, ENTRY_TYPES, fundList, liveAccounts, liveEntries, liveProduction, partyTotals, stockSummary, useData, type EntryType } from "@/lib/db";
import { fmtDate, fmtPKR, fmtTon, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Mussa Enterprises Cash Book" },
      { name: "description", content: "Finance dashboard: cash, bank, receivables, payables, stock and production heats." },
      { property: "og:title", content: "Dashboard — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "Finance dashboard: cash, bank, receivables, payables, stock and production heats." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type MetricTone = "cash" | "bank" | "receivable" | "payable";
const metricAccent: Record<MetricTone, string> = {
  cash: "bg-metric-cash",
  bank: "bg-metric-bank",
  receivable: "bg-metric-receivable",
  payable: "bg-metric-payable",
};

function MetricCard({ tone, icon: Icon, label, value, hidden, to }: { tone: MetricTone; icon: typeof Wallet; label: string; value: number; hidden: boolean; to: string }) {
  return (
    <Link to={to} className="card-hover flex min-h-[132px] flex-col rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm", metricAccent[tone])}>
          <Icon className="h-6 w-6" strokeWidth={1.9} />
        </span>
      </div>
      <div className="num mt-3 truncate text-xl font-semibold tracking-tight sm:text-2xl">{hidden ? "Rs ••••••" : fmtPKR(value)}</div>
      <span className={cn("mt-auto block h-1 w-full rounded-full", metricAccent[tone])} />
    </Link>
  );
}

const BAR_TONES = ["bg-metric-cash", "bg-metric-receivable", "bg-metric-bank", "bg-chart-4", "bg-chart-5"];

function Dashboard() {
  const d = useData();
  const today = todayISO();
  const [entryType, setEntryType] = useState<EntryType>();
  const [newAcc, setNewAcc] = useState(false);
  const [showCash, setShowCash] = useState(true);

  const stats = useMemo(() => {
    const funds = fundList(d);
    const parties = partyTotals(d);
    return {
      cashInHand: funds.find((f) => f.id === CASH)?.closing ?? 0,
      bankTotal: funds.filter((f) => f.id !== CASH).reduce((s, f) => s + f.closing, 0),
      ...parties,
    };
  }, [d]);

  const stock = useMemo(() => stockSummary(d).filter((r) => r.stock !== 0 || r.purchased !== 0), [d]);
  const maxStock = Math.max(1, ...stock.map((r) => Math.abs(r.stock)));
  const heats = useMemo(() => liveProduction(d).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [d]);
  const activity = useMemo(() => liveEntries(d).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [d]);
  const accountName = (id?: string) => d.accounts.find((a) => a.id === id)?.name;
  const matName = (id: string) => d.materials.find((m) => m.id === id)?.name ?? "—";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5 pb-10">
      {!d.opening?.completed && (
        <Link to="/opening" className="card-hover flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          <span><span className="font-semibold">Complete your Opening Setup</span> — enter cash, bank, party, stock and loan balances on your start date.</span>
          <span className="font-semibold text-primary">Start →</span>
        </Link>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here’s your business snapshot for {fmtDate(today)}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button aria-label={showCash ? "Hide amounts" : "Show amounts"} onClick={() => setShowCash((v) => !v)} className="rounded-full border bg-card p-2.5 text-muted-foreground shadow-sm hover:text-foreground">
            {showCash ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button onClick={() => setEntryType("purchase")} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90">
            <Plus className="h-4 w-4" /> New purchase
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard tone="cash" icon={Wallet} label="Cash in hand" value={stats.cashInHand} hidden={!showCash} to="/cashbook" />
        <MetricCard tone="bank" icon={Landmark} label="Bank balance" value={stats.bankTotal} hidden={!showCash} to="/banks" />
        <MetricCard tone="receivable" icon={ArrowDownLeft} label="Receivables" value={stats.receivable} hidden={!showCash} to="/accounts" />
        <MetricCard tone="payable" icon={ArrowUpRight} label="Payables" value={stats.payable} hidden={!showCash} to="/accounts" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Raw material stock */}
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">Raw material stock</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Quantity on hand by material</p>
            </div>
            <Link to="/stock" className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground">By material</Link>
          </div>
          {stock.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No stock yet — record a purchase to begin.</p>
          ) : (
            <div className="space-y-3.5">
              {stock.map((r, i) => (
                <div key={r.id} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-xs">
                  <span className="truncate text-muted-foreground">{r.name}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-secondary">
                    <span className={cn("block h-full rounded-full", BAR_TONES[i % BAR_TONES.length])} style={{ width: `${Math.max(4, (Math.abs(r.stock) / maxStock) * 100)}%` }} />
                  </span>
                  <span className="num text-right text-muted-foreground">{fmtTon(r.stock)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick actions + activity */}
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Quick actions</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Common transactions</p>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={() => setEntryType("purchase")} className="rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground shadow-sm hover:opacity-90">+ Purchase</button>
            <button onClick={() => setEntryType("sale")} className="rounded-lg border bg-card px-3 py-2 text-[11px] font-semibold shadow-sm hover:bg-secondary">+ Sale</button>
            <button onClick={() => setEntryType("inward")} className="rounded-lg border bg-card px-3 py-2 text-[11px] font-semibold shadow-sm hover:bg-secondary">+ Receive</button>
            <button onClick={() => setEntryType("outward")} className="rounded-lg border bg-card px-3 py-2 text-[11px] font-semibold shadow-sm hover:bg-secondary">+ Payment</button>
            <Link to="/production" className="rounded-lg border bg-card px-3 py-2 text-[11px] font-semibold shadow-sm hover:bg-secondary">+ Record heat</Link>
            <button onClick={() => setNewAcc(true)} className="rounded-lg border bg-card px-3 py-2 text-[11px] font-semibold shadow-sm hover:bg-secondary">+ Account</button>
          </div>
          <div className="divide-y">
            {activity.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>}
            {activity.map((e) => {
              const meta = ENTRY_TYPES[e.type];
              return (
                <Link to="/voucher/$id" params={{ id: e.id }} key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.flow === "in" ? "bg-metric-cash-soft text-metric-cash" : meta.flow === "out" ? "bg-metric-payable-soft text-metric-payable" : "bg-secondary text-muted-foreground")}>
                      {meta.flow === "in" ? <ArrowDownLeft className="h-4 w-4" /> : meta.flow === "out" ? <ArrowUpRight className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{accountName(e.accountId) ?? e.particulars}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{meta.label} · V-{e.voucherNo} · {fmtDate(e.date)}</span>
                    </span>
                  </span>
                  <span className={cn("num shrink-0 font-semibold", meta.flow === "out" && "text-destructive")}>{meta.flow === "out" ? "−" : ""}{fmtPKR(e.amount)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {/* Recent production heats */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Recent production heats</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Output, yield and estimated cost</p>
          </div>
          <Link to="/production" className="flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-[11px] font-semibold shadow-sm hover:bg-secondary"><Flame className="h-3.5 w-3.5" /> View production</Link>
        </div>
        {heats.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No heats recorded yet — open Heat Production to record the first one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className="bg-surface text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="rounded-l-lg px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Heat</th>
                  <th className="px-3 py-2.5 font-semibold">Input</th>
                  <th className="px-3 py-2.5 font-semibold">Billet</th>
                  <th className="px-3 py-2.5 font-semibold">Slag / waste</th>
                  <th className="px-3 py-2.5 font-semibold">Energy</th>
                  <th className="rounded-r-lg px-3 py-2.5 font-semibold">Cost / kg</th>
                </tr>
              </thead>
              <tbody>
                {heats.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(p.date)}</td>
                    <td className="px-3 py-2.5 font-medium">{matName(p.fromMaterialId)} → {matName(p.toMaterialId)}</td>
                    <td className="num px-3 py-2.5">{fmtTon(p.inputKg ?? p.totalKg)}</td>
                    <td className="num px-3 py-2.5">{fmtTon(p.totalKg)}</td>
                    <td className="num px-3 py-2.5">{p.slagKg || p.wasteKg ? `${fmtTon(p.slagKg ?? 0)} / ${fmtTon(p.wasteKg ?? 0)}` : "—"}</td>
                    <td className="num px-3 py-2.5">{p.kwh ? `${p.kwh.toLocaleString()} kWh` : "—"}</td>
                    <td className="num px-3 py-2.5">{p.costPerKg ? `Rs ${p.costPerKg.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={!!entryType} onOpenChange={(o) => !o && setEntryType(undefined)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>New {entryType ? ENTRY_TYPES[entryType].label : ""} voucher</DialogTitle></DialogHeader>
          {entryType && <EntryForm key={entryType} defaultType={entryType} onSaved={() => setEntryType(undefined)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={newAcc} onOpenChange={setNewAcc}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>New Account</DialogTitle></DialogHeader>
          {newAcc && <AccountForm onSaved={() => setNewAcc(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
