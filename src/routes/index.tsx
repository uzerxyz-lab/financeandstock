import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownLeft, ArrowUpRight, Banknote, BarChart3, BookOpen, Boxes, Check, Flame, GripVertical, HandCoins, LayoutGrid, Landmark,
  ListOrdered, Maximize2, Pencil, Plus, Receipt, RotateCcw, ShoppingCart, BadgeDollarSign, Users, Wallet, Zap, FileText,
} from "lucide-react";
import { EntryForm } from "@/components/app/EntryForm";
import { TreasuryCard } from "@/components/app/TreasuryCard";
import { AccountForm } from "@/components/app/AccountForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { CASH, ENTRY_TYPES, fundList, liveAccounts, liveEntries, liveProduction, partyTotals, stockSummary, useData, type EntryType } from "@/lib/db";
import { fmtDate, fmtPKR, fmtTon, todayISO } from "@/lib/format";
import { ALL_WIDGETS, dashboard, haptic, MAX_H, MAX_W, useDashboard, WIDGET_LABELS, type WidgetId, type WidgetLayout } from "@/lib/dashboard-layout";
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

const BAR_TONES = ["bg-metric-cash", "bg-metric-receivable", "bg-metric-bank", "bg-chart-4", "bg-chart-5"];
const ROW_PX = 128;
const GAP_PX = 12;

type Ctx = ReturnType<typeof useStats> & { editing: boolean; hidden: boolean; w: number; h: number; openEntry: (t: EntryType) => void; openAccount: () => void };

function useStats() {
  const d = useData();
  return useMemo(() => {
    const funds = fundList(d);
    const parties = partyTotals(d);
    const live = liveEntries(d);
    const month = todayISO().slice(0, 7);
    const thisMonth = live.filter((e) => e.date.startsWith(month));
    const sum = (t: EntryType) => thisMonth.filter((e) => e.type === t).reduce((s, e) => s + e.amount, 0);
    const accounts = liveAccounts(d);
    const name = (id?: string) => d.accounts.find((a) => a.id === id)?.name;
    const matName = (id: string) => d.materials.find((m) => m.id === id)?.name ?? "—";
    return {
      d, funds, name, matName,
      cashInHand: funds.find((f) => f.id === CASH)?.closing ?? 0,
      bankTotal: funds.filter((f) => f.id !== CASH).reduce((s, f) => s + f.closing, 0),
      ...parties,
      stock: stockSummary(d).filter((r) => r.stock !== 0 || r.purchased !== 0),
      heats: liveProduction(d).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
      activity: [...live].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      vouchers: live.filter((e) => ["sale", "purchase", "inward", "outward"].includes(e.type)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      monthSales: sum("sale"), monthPurchases: sum("purchase"), monthExpenses: sum("expense") + sum("salary"),
      monthIn: thisMonth.filter((e) => ENTRY_TYPES[e.type].flow === "in").reduce((s, e) => s + e.amount, 0),
      monthOut: thisMonth.filter((e) => ENTRY_TYPES[e.type].flow === "out").reduce((s, e) => s + e.amount, 0),
      accountCount: accounts.filter((a) => !a.equity).length,
      workerCount: accounts.filter((a) => a.type === "worker").length,
      salesCount: live.filter((e) => e.type === "sale").length,
      purchaseCount: live.filter((e) => e.type === "purchase").length,
      expenseCount: live.filter((e) => e.type === "expense").length,
      bills: d.bills ?? [],
    };
  }, [d]);
}

const money = (c: Ctx, v: number) => (c.hidden ? "Rs ••••••" : fmtPKR(v));

function Head({ icon: Icon, title, tone = "bg-primary", sub }: { icon?: typeof Wallet; title: string; tone?: string; sub?: string | undefined }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-muted-foreground">{title}</div>
        {sub && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{sub}</div>}
      </div>
      {Icon && <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm", tone)}><Icon className="h-5 w-5" strokeWidth={1.9} /></span>}
    </div>
  );
}

function Metric({ c, icon, title, tone, value, extra }: { c: Ctx; icon: typeof Wallet; title: string; tone: string; value: number; extra?: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <Head icon={icon} title={title} tone={tone} />
      <div className="num mt-2 truncate text-xl font-semibold tracking-tight sm:text-2xl">{money(c, value)}</div>
      {(c.h > 1 || c.w > 1) && extra && <div className="mt-2 min-h-0 flex-1 overflow-hidden text-xs text-muted-foreground">{extra}</div>}
      <span className={cn("mt-auto block h-1 w-full rounded-full", tone)} />
    </div>
  );
}

function Rows({ items, limit }: { items: { k: string; l: ReactNode; r: ReactNode }[]; limit: number }) {
  if (!items.length) return <p className="py-3 text-center text-xs text-muted-foreground">Nothing yet.</p>;
  return <div className="divide-y">{items.slice(0, limit).map((x) => <div key={x.k} className="flex items-center justify-between gap-2 py-1.5 text-xs"><span className="min-w-0 truncate">{x.l}</span><span className="num shrink-0">{x.r}</span></div>)}</div>;
}

function Module({ c, icon, title, tone, count, children }: { c: Ctx; icon: typeof Wallet; title: string; tone: string; count: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <Head icon={icon} title={title} tone={tone} />
      <div className="num mt-2 text-lg font-semibold">{count}</div>
      {(c.h > 1 || c.w > 1) && children && <div className="mt-1 min-h-0 flex-1 overflow-hidden">{children}</div>}
    </div>
  );
}

const lim = (c: Ctx) => Math.max(1, c.h * 3 - 1);

const WIDGETS: Record<WidgetId, { to?: string; render: (c: Ctx) => ReactNode }> = {
  treasury: { render: (c) => <TreasuryCard editing={c.editing} w={c.w} /> },
  cash: { to: "/cashbook", render: (c) => <Metric c={c} icon={Wallet} title="Cash in hand" tone="bg-metric-cash" value={c.cashInHand} extra={<span>In this month {money(c, c.monthIn)} · Out {money(c, c.monthOut)}</span>} /> },
  bank: { to: "/banks", render: (c) => <Metric c={c} icon={Landmark} title="Bank balance" tone="bg-metric-bank" value={c.bankTotal} extra={<Rows limit={lim(c)} items={c.funds.filter((f) => f.id !== CASH).map((f) => ({ k: f.id, l: f.name, r: money(c, f.closing) }))} />} /> },
  receivable: { to: "/accounts", render: (c) => <Metric c={c} icon={ArrowDownLeft} title="Receivables" tone="bg-metric-receivable" value={c.receivable} extra={<span>Customer advances {money(c, c.customerAdvance)}</span>} /> },
  payable: { to: "/accounts", render: (c) => <Metric c={c} icon={ArrowUpRight} title="Payables" tone="bg-metric-payable" value={c.payable} extra={<span>Supplier advances {money(c, c.supplierAdvance)}</span>} /> },
  advances: { to: "/accounts", render: (c) => (
    <div className="flex h-full flex-col gap-2">
      <Head icon={HandCoins} title="Advances" tone="bg-chart-4" />
      <div className="text-xs"><div className="text-muted-foreground">Paid to suppliers</div><div className="num font-semibold">{money(c, c.supplierAdvance)}</div></div>
      <div className="text-xs"><div className="text-muted-foreground">Received from customers</div><div className="num font-semibold">{money(c, c.customerAdvance)}</div></div>
    </div>
  ) },
  monthly: { to: "/reports", render: (c) => (
    <div className="flex h-full flex-col">
      <Head icon={BarChart3} title="This month" tone="bg-chart-5" />
      <div className={cn("mt-2 grid gap-2 text-xs", c.w > 1 ? "grid-cols-3" : "grid-cols-1")}>
        <div><div className="text-muted-foreground">Sales</div><div className="num font-semibold">{money(c, c.monthSales)}</div></div>
        <div><div className="text-muted-foreground">Purchases</div><div className="num font-semibold">{money(c, c.monthPurchases)}</div></div>
        <div><div className="text-muted-foreground">Expenses</div><div className="num font-semibold">{money(c, c.monthExpenses)}</div></div>
      </div>
    </div>
  ) },
  stock: { to: "/stock", render: (c) => {
    const max = Math.max(1, ...c.stock.map((r) => Math.abs(r.stock)));
    const rows = c.stock.slice(0, lim(c) + 1);
    return (
      <div className="flex h-full flex-col">
        <Head icon={Boxes} title="Raw material stock" tone="bg-metric-bank" sub={c.h > 1 ? "Quantity on hand by material" : undefined} />
        {rows.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No stock yet.</p> : (
          <div className="mt-3 space-y-2.5 overflow-hidden">
            {rows.map((r, i) => (
              <div key={r.id} className={cn("grid items-center gap-2 text-xs", c.w > 1 ? "grid-cols-[100px_1fr_auto]" : "grid-cols-[1fr_auto]")}>
                <span className="truncate text-muted-foreground">{r.name}</span>
                {c.w > 1 && <span className="h-2 overflow-hidden rounded-full bg-secondary"><span className={cn("block h-full rounded-full", BAR_TONES[i % BAR_TONES.length])} style={{ width: `${Math.max(4, (Math.abs(r.stock) / max) * 100)}%` }} /></span>}
                <span className="num text-right">{fmtTon(r.stock)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } },
  quick: { render: (c) => {
    const btnCls = "flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-semibold transition-transform active:scale-95 sm:text-[13px]";
    const ACT = [
      { label: "Purchase", icon: ShoppingCart, cls: "bg-purchase-soft text-purchase", go: () => c.openEntry("purchase") },
      { label: "Sale", icon: BadgeDollarSign, cls: "bg-sale-soft text-sale", go: () => c.openEntry("sale") },
      { label: "Receive", icon: ArrowDownLeft, cls: "bg-received-soft text-received", go: () => c.openEntry("inward") },
      { label: "Payment", icon: ArrowUpRight, cls: "bg-paid-soft text-paid", go: () => c.openEntry("outward") },
      { label: "Expense", icon: Receipt, cls: "bg-expense-card-soft text-expense-card", go: () => c.openEntry("expense") },
    ] as const;
    return (
      <div className="flex h-full flex-col">
        <Head title="Quick actions" sub={c.h > 1 ? "Common transactions" : undefined} />
        <div className={cn("mt-3 grid flex-1 gap-2 [grid-auto-rows:1fr]", c.w > 1 ? "grid-cols-4" : "grid-cols-2")} onClick={(e) => e.stopPropagation()}>
          {ACT.map((a) => (
            <button key={a.label} onClick={a.go} className={cn(btnCls, a.cls)}>
              <a.icon className="h-4 w-4 shrink-0" strokeWidth={2.1} />
              <span className="truncate">{a.label}</span>
            </button>
          ))}
          {(c.h > 1 || c.w > 1) && <>
            <Link to="/production" className={cn(btnCls, "bg-entry-card-soft text-entry-card")}>
              <Flame className="h-4 w-4 shrink-0" strokeWidth={2.1} />
              <span className="truncate">Record heat</span>
            </Link>
            <button onClick={c.openAccount} className={cn(btnCls, "bg-account-soft text-account")}>
              <Users className="h-4 w-4 shrink-0" strokeWidth={2.1} />
              <span className="truncate">Account</span>
            </button>
          </>}
        </div>
      </div>
    );
  } },
  activity: { to: "/entries", render: (c) => (
    <div className="flex h-full flex-col">
      <Head icon={ListOrdered} title="Recent activity" />
      <div className="mt-2 min-h-0 flex-1 divide-y overflow-hidden">
        {c.activity.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No activity yet.</p>}
        {c.activity.slice(0, lim(c)).map((e) => {
          const meta = ENTRY_TYPES[e.type];
          return (
            <Link to="/voucher/$id" params={{ id: e.id }} key={e.id} onClick={(ev) => ev.stopPropagation()} className="flex items-center justify-between gap-3 py-2 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", meta.flow === "in" ? "bg-metric-cash-soft text-metric-cash" : meta.flow === "out" ? "bg-metric-payable-soft text-metric-payable" : "bg-secondary text-muted-foreground")}>
                  {meta.flow === "in" ? <ArrowDownLeft className="h-3.5 w-3.5" /> : meta.flow === "out" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <Banknote className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0"><span className="block truncate font-semibold">{c.name(e.accountId) ?? e.particulars}</span>{c.w > 1 && <span className="block text-[10px] text-muted-foreground">{meta.label} · V-{e.voucherNo} · {fmtDate(e.date)}</span>}</span>
              </span>
              <span className={cn("num shrink-0 font-semibold", meta.flow === "out" && "text-destructive")}>{meta.flow === "out" ? "−" : ""}{money(c, e.amount)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  ) },
  heats: { to: "/production", render: (c) => (
    <div className="flex h-full flex-col">
      <Head icon={Flame} title="Production heats" tone="bg-metric-payable" sub={`${c.heats.length} heats recorded`} />
      {c.heats.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No heats recorded yet.</p> : c.w < 3 ? (
        <div className="mt-2"><Rows limit={lim(c)} items={c.heats.map((p) => ({ k: p.id, l: `${fmtDate(p.date)} · ${c.matName(p.toMaterialId)}`, r: fmtTon(p.totalKg) }))} /></div>
      ) : (
        <div className="mt-3 min-h-0 flex-1 overflow-hidden">
          <table className="w-full whitespace-nowrap text-xs">
            <thead><tr className="bg-surface text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Date</th><th className="px-3 py-2">Heat</th><th className="px-3 py-2">Input</th><th className="px-3 py-2">Billet</th><th className="px-3 py-2">Slag / waste</th><th className="px-3 py-2">Energy</th><th className="px-3 py-2">Cost / kg</th>
            </tr></thead>
            <tbody>{c.heats.slice(0, lim(c) - 1).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2 text-muted-foreground">{fmtDate(p.date)}</td>
                <td className="px-3 py-2 font-medium">{c.matName(p.fromMaterialId)} → {c.matName(p.toMaterialId)}</td>
                <td className="num px-3 py-2">{fmtTon(p.inputKg ?? p.totalKg)}</td>
                <td className="num px-3 py-2">{fmtTon(p.totalKg)}</td>
                <td className="num px-3 py-2">{p.slagKg || p.wasteKg ? `${fmtTon(p.slagKg ?? 0)} / ${fmtTon(p.wasteKg ?? 0)}` : "—"}</td>
                <td className="num px-3 py-2">{p.kwh ? `${p.kwh.toLocaleString()} kWh` : "—"}</td>
                <td className="num px-3 py-2">{p.costPerKg ? `Rs ${p.costPerKg.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  ) },
  vouchers: { to: "/vouchers", render: (c) => <Module c={c} icon={FileText} title="Vouchers" tone="bg-primary" count={`${c.vouchers.length}`}><Rows limit={lim(c)} items={c.vouchers.map((e) => ({ k: e.id, l: `V-${e.voucherNo} · ${c.name(e.accountId) ?? ENTRY_TYPES[e.type].label}`, r: money(c, e.amount) }))} /></Module> },
  accounts: { to: "/accounts", render: (c) => <Module c={c} icon={Users} title="Accounts / Ledgers" tone="bg-metric-bank" count={`${c.accountCount} accounts`} /> },
  sales: { to: "/sales", render: (c) => <Module c={c} icon={BadgeDollarSign} title="Sales" tone="bg-metric-cash" count={money(c, c.monthSales)}><span className="text-xs text-muted-foreground">{c.salesCount} sales in total · this month shown</span></Module> },
  purchases: { to: "/purchases", render: (c) => <Module c={c} icon={ShoppingCart} title="Purchases" tone="bg-metric-receivable" count={money(c, c.monthPurchases)}><span className="text-xs text-muted-foreground">{c.purchaseCount} purchases in total · this month shown</span></Module> },
  cashbook: { to: "/cashbook", render: (c) => <Module c={c} icon={BookOpen} title="Cash Book" tone="bg-metric-cash" count={money(c, c.cashInHand)} /> },
  workers: { to: "/workers", render: (c) => <Module c={c} icon={Users} title="Workers" tone="bg-chart-4" count={`${c.workerCount} workers`} /> },
  loans: { to: "/loans", render: (c) => <Module c={c} icon={HandCoins} title="Personal Loans" tone="bg-chart-5" count="Open" /> },
  expenses: { to: "/expenses", render: (c) => <Module c={c} icon={Receipt} title="Expenses" tone="bg-metric-payable" count={money(c, c.monthExpenses)}><span className="text-xs text-muted-foreground">{c.expenseCount} expense entries in total</span></Module> },
  reports: { to: "/reports", render: (c) => <Module c={c} icon={BarChart3} title="Reports" tone="bg-primary" count="Open" /> },
  electricity: { to: "/electricity", render: (c) => <Module c={c} icon={Zap} title="Electricity" tone="bg-chart-4" count={`${c.bills.length} bills`} /> },
};

function Dashboard() {
  const stats = useStats();
  const { layout, editing, drawer } = useDashboard();
  const navigate = useNavigate();
  const [entryType, setEntryType] = useState<EntryType>();
  const [newAcc, setNewAcc] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const cols = () => (gridRef.current && getComputedStyle(gridRef.current).gridTemplateColumns.split(" ").length) || 2;

  const startMove = (e: React.PointerEvent, id: WidgetId) => {
    e.preventDefault(); e.stopPropagation(); haptic(15);
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-wid]");
      const to = over?.dataset["wid"] as WidgetId | undefined;
      if (to && to !== id) dashboard.move(id, to);
    };
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  };

  const startResize = (e: React.PointerEvent, w: WidgetLayout) => {
    e.preventDefault(); e.stopPropagation(); haptic(15);
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const n = cols();
    const cellW = (gridRef.current!.clientWidth - GAP_PX * (n - 1)) / n;
    const sx = e.clientX, sy = e.clientY, sw = Math.min(w.w, n), sh = w.h;
    let last = `${sw}x${sh}`;
    const move = (ev: PointerEvent) => {
      const nw = Math.min(n, Math.max(1, sw + Math.round((ev.clientX - sx) / (cellW + GAP_PX))));
      const nh = Math.min(MAX_H, Math.max(1, sh + Math.round((ev.clientY - sy) / (ROW_PX + GAP_PX))));
      if (`${nw}x${nh}` !== last) { last = `${nw}x${nh}`; haptic(6); dashboard.resize(w.id, n < MAX_W && nw === n ? Math.max(nw, w.w) : nw, nh); }
    };
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  };

  return (
    <div className="space-y-5 pb-10">
      {!stats.d.opening?.completed && (
        <Link to="/opening" className="card-hover flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          <span><span className="font-semibold">Complete your Opening Setup</span> — enter cash, bank, party, stock and loan balances on your start date.</span>
          <span className="font-semibold text-primary">Start →</span>
        </Link>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here’s your business snapshot for {fmtDate(todayISO())}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button aria-pressed={editing} aria-label={editing ? "Lock layout" : "Edit layout"} title={editing ? "Done — lock layout" : "Edit layout (move & resize cards)"} onClick={() => dashboard.setEditing(!editing)}
            className={cn("flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm", editing ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
            {editing ? <><Check className="h-4 w-4" /> Done</> : <><Pencil className="h-4 w-4" /> Edit layout</>}
          </button>
          <button onClick={() => setEntryType("purchase")} className="hidden items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 sm:flex">
            <Plus className="h-4 w-4" /> New purchase
          </button>
        </div>
      </div>

      {editing && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 px-4 py-2.5 text-xs">
          <span>Drag <GripVertical className="inline h-3.5 w-3.5" /> to move a card, drag <Maximize2 className="inline h-3.5 w-3.5" /> corner to resize. Tap <b>Done</b> to lock.</span>
          <span className="flex gap-2">
            <button onClick={() => dashboard.setDrawer(true)} className="flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1.5 font-semibold"><LayoutGrid className="h-3.5 w-3.5" /> Add / remove cards</button>
            <button onClick={() => dashboard.reset()} className="flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1.5 font-semibold"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
          </span>
        </div>
      )}

      <div ref={gridRef} className="grid grid-flow-row-dense grid-cols-2 gap-3 md:grid-cols-4" style={{ gridAutoRows: `${ROW_PX}px` }}>
        {layout.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No cards on the dashboard. Tap Edit layout → Add / remove cards to add some.</p>}
        {layout.map((w) => {
          const def = WIDGETS[w.id];
          const ctx: Ctx = { ...stats, editing, hidden: false, w: w.w, h: w.h, openEntry: setEntryType, openAccount: () => setNewAcc(true) };
          const open = () => { if (editing || !def.to) return; haptic(10); navigate({ to: def.to }); };
          return (
            <section key={w.id} data-wid={w.id} role={def.to && !editing ? "link" : undefined} tabIndex={def.to && !editing ? 0 : undefined}
              onClick={open} onKeyDown={(e) => e.key === "Enter" && open()}
              className={cn("widget relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm", w.id === "treasury" && "border-transparent bg-treasury p-3", editing ? "ring-2 ring-primary/30 ring-offset-1 ring-offset-background" : def.to && "card-hover cursor-pointer active:scale-[0.98]", "transition-transform")}
              style={{ "--w": w.w, gridRow: `span ${w.h}` } as React.CSSProperties}
              aria-label={WIDGET_LABELS[w.id]}>
              {def.render(ctx)}
              {editing && <>
                <button aria-label={`Move ${WIDGET_LABELS[w.id]}`} onPointerDown={(e) => startMove(e, w.id)} className="absolute left-1/2 top-1 flex -translate-x-1/2 cursor-grab touch-none items-center rounded-full border bg-card px-3 py-0.5 text-muted-foreground shadow-sm active:cursor-grabbing"><GripVertical className="h-4 w-4 rotate-90" /></button>
                <button aria-label={`Resize ${WIDGET_LABELS[w.id]}`} onPointerDown={(e) => startResize(e, w)} className="absolute bottom-1 right-1 flex h-7 w-7 cursor-nwse-resize touch-none items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm"><Maximize2 className="h-3.5 w-3.5 rotate-90" /></button>
              </>}
            </section>
          );
        })}
      </div>

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
      <Sheet open={drawer} onOpenChange={(o) => dashboard.setDrawer(o)}>
        <SheetContent side="right" className="w-80 overflow-y-auto">
          <SheetHeader><SheetTitle>Dashboard cards</SheetTitle></SheetHeader>
          <p className="mt-1 text-xs text-muted-foreground">Turn cards on or off. Use Edit layout to move and resize them.</p>
          <div className="mt-4 space-y-1">
            {ALL_WIDGETS.map((id) => {
              const on = layout.some((x) => x.id === id);
              return (
                <label key={id} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted">
                  <span>{WIDGET_LABELS[id]}</span>
                  <Switch checked={on} onCheckedChange={(v) => { haptic(8); dashboard.toggle(id, v); }} />
                </label>
              );
            })}
          </div>
          <button onClick={() => dashboard.reset()} className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold"><RotateCcw className="h-3.5 w-3.5" /> Reset to default</button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
