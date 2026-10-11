import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import {
  ArrowDownLeft, ArrowUpRight, BarChart3, BookOpen, Eye, EyeOff, HandCoins, Receipt,
  ShoppingCart, UserPlus, Users, Wallet, Scale, Boxes, FileText,
} from "lucide-react";
import { EntryForm } from "@/components/app/EntryForm";
import { AccountForm } from "@/components/app/AccountForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CASH, fundList, liveAccounts, liveEntries, partyTotals, useData, ENTRY_TYPES, type EntryType } from "@/lib/db";
import { fmtPKR, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Mussa Enterprises Cash Book" },
      { name: "description", content: "Bento dashboard: cash summary, quick sale/purchase, accounts, ledgers and reports." },
      { property: "og:title", content: "Dashboard — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "Bento dashboard: cash summary, quick sale/purchase, accounts, ledgers and reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const ORDER_KEY = "cashbook-tile-order";
const DEFAULT_ORDER = ["summary", "inflow", "outflow", "sale", "purchase", "account", "ledgers", "workers", "reports", "expense", "stock", "vouchers", "loans", "banks"];
type Tone = "received" | "paid" | "sale" | "purchase" | "account" | "ledger" | "report" | "expense" | "entries" | "admin" | "hero";
const toneCls: Record<Tone, string> = {
  received: "bg-received text-hero-foreground",
  paid: "bg-paid text-hero-foreground",
  sale: "bg-sale text-hero-foreground",
  purchase: "bg-purchase text-hero-foreground",
  account: "bg-account text-hero-foreground",
  ledger: "bg-ledger-card text-hero-foreground",
  report: "bg-report-card text-hero-foreground",
  expense: "bg-expense-card text-hero-foreground",
  entries: "bg-entry-card text-hero-foreground",
  admin: "bg-admin-card text-hero-foreground",
  hero: "bg-hero text-hero-foreground",
};
const softCls: Record<Tone, string> = {
  received: "border-received/40 bg-received-soft",
  paid: "border-paid/40 bg-paid-soft",
  sale: "border-sale/40 bg-sale-soft",
  purchase: "border-purchase/40 bg-purchase-soft",
  account: "border-account/40 bg-account-soft",
  ledger: "border-ledger-card/40 bg-ledger-card-soft",
  report: "border-report-card/40 bg-report-card-soft",
  expense: "border-expense-card/40 bg-expense-card-soft",
  entries: "border-entry-card/40 bg-entry-card-soft",
  admin: "border-admin-card/40 bg-admin-card-soft",
  hero: "border-hero/40 bg-hero/20",
};

function Dashboard() {
  const d = useData();
  const today = todayISO();
  const stats = useMemo(() => {
    const entries = liveEntries(d);
    const todays = entries.filter((e) => e.date === today && e.chequeStatus !== "bounced" && e.type !== "capital");
    const funds = fundList(d);
    const parties = partyTotals(d);
    const totals: Record<string, number> = {};
    for (const e of entries) if (e.date.startsWith(today.slice(0, 7))) totals[e.type] = (totals[e.type] ?? 0) + e.amount;
    return {
      cashIn: todays.filter((e) => ENTRY_TYPES[e.type].flow === "in").reduce((s, e) => s + e.amount, 0),
      cashOut: todays.filter((e) => ENTRY_TYPES[e.type].flow === "out").reduce((s, e) => s + e.amount, 0),
      cashInHand: funds.find((f) => f.id === CASH)?.closing ?? 0,
      bankTotal: funds.filter((f) => f.id !== CASH).reduce((s, f) => s + f.closing, 0),
      ...parties,
      totals,
    };
  }, [d, today]);
  const { cashIn, cashOut, cashInHand, receivable, payable, bankTotal, supplierAdvance, customerAdvance } = stats;
  const mt = (t: EntryType) => stats.totals[t] ?? 0;

  const [order, setOrder] = useState(DEFAULT_ORDER);
  const [drag, setDrag] = useState<string>();
  const [ghost, setGhost] = useState<{ w: number; h: number }>();
  const orderRef = useRef(order);
  const ghostRef = useRef<HTMLDivElement>(null);
  const press = useRef<{ key: string; type: string; sx: number; sy: number; x: number; y: number; ox: number; oy: number; w: number; h: number; active: boolean; timer?: number; swapAt: number } | null>(null);
  const beginRef = useRef<() => void>(() => {});
  const endRef = useRef<() => void>(() => {});
  const suppressClick = useRef(false);
  const [entryType, setEntryType] = useState<EntryType>();
  const [newAcc, setNewAcc] = useState(false);
  const [showCash, setShowCash] = useState(true);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ORDER_KEY) ?? "null") as string[] | null;
      if (saved) {
        const o = [...saved.filter((k) => DEFAULT_ORDER.includes(k)), ...DEFAULT_ORDER.filter((k) => !saved.includes(k))];
        orderRef.current = o; setOrder(o);
      }
    } catch { /* ignore */ }
  }, []);

  // Touch/mouse drag with auto-scroll near the top/bottom edge of the screen.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = press.current;
      if (!s || !s.active) return;
      const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
      const zone = 90, topLine = headerBottom + zone, bottomLine = window.innerHeight - zone;
      let dy = 0;
      if (s.y < topLine) dy = -Math.min(1, (topLine - s.y) / zone) * 22;
      else if (s.y > bottomLine) dy = Math.min(1, (s.y - bottomLine) / zone) * 22;
      if (dy) window.scrollBy(0, dy);
      if (ghostRef.current) ghostRef.current.style.transform = `translate3d(${s.x - s.ox}px, ${s.y - s.oy}px, 0) scale(1.04)`;
      const now = performance.now();
      if (now - s.swapAt > 140) {
        const el = document.elementsFromPoint(s.x, s.y).find((n) => n instanceof HTMLElement && n.dataset["tile"] && n.dataset["tile"] !== s.key) as HTMLElement | undefined;
        if (el) {
          const o = [...orderRef.current]; const from = o.indexOf(s.key), to = o.indexOf(el.dataset["tile"]!);
          if (from >= 0 && to >= 0) { o.splice(from, 1); o.splice(to, 0, s.key); orderRef.current = o; setOrder(o); s.swapAt = now; }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    beginRef.current = () => {
      const s = press.current; if (!s || s.active) return;
      s.active = true; setDrag(s.key); setGhost({ w: s.w, h: s.h });
      navigator.vibrate?.(15);
      raf = requestAnimationFrame(tick);
    };
    endRef.current = () => {
      const s = press.current; if (!s) return;
      window.clearTimeout(s.timer); cancelAnimationFrame(raf); press.current = null;
      if (s.active) {
        suppressClick.current = true; window.setTimeout(() => { suppressClick.current = false; }, 350);
        localStorage.setItem(ORDER_KEY, JSON.stringify(orderRef.current));
        setDrag(undefined); setGhost(undefined);
      }
    };
    const move = (e: PointerEvent) => {
      const s = press.current; if (!s) return;
      s.x = e.clientX; s.y = e.clientY;
      if (!s.active && Math.hypot(s.x - s.sx, s.y - s.sy) > 8) {
        if (s.type === "mouse") beginRef.current();
        else endRef.current(); // finger moved before long-press: user is scrolling
      }
    };
    const blockScroll = (e: TouchEvent) => { if (press.current?.active && e.cancelable) e.preventDefault(); };
    const up = () => endRef.current();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("touchmove", blockScroll, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("touchmove", blockScroll);
    };
  }, []);
  const onTileDown = (e: RPointerEvent<HTMLDivElement>, key: string) => {
    if (e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    press.current = { key, type: e.pointerType, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, w: r.width, h: r.height, active: false, swapAt: 0 };
    if (e.pointerType !== "mouse") press.current.timer = window.setTimeout(() => beginRef.current(), 320);
  };

  const tiles: Record<string, { span: string; node: ReactNode }> = {
    summary: { span: "col-span-2 row-span-2", node: (
      <div className={cn("flex h-full flex-col justify-between rounded-2xl p-5 sm:p-6", toneCls.hero)}>
        <div className="flex items-center gap-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hero-foreground/15"><Wallet className="h-[18px] w-[18px]" /></span><span className="text-xl font-bold sm:text-2xl opacity-85">Cash in hand</span></div>
        <div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="num min-w-0 truncate text-3xl font-semibold sm:text-4xl">{showCash ? fmtPKR(cashInHand) : "Rs ••••••"}</div>
            <button aria-label={showCash ? "Hide amounts" : "Show amounts"} onClick={() => setShowCash((v) => !v)} className="shrink-0 rounded-full p-2 hover:bg-hero-foreground/10">{showCash ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Mini label="Receivable" value={receivable} hidden={!showCash} />
            <Mini label="Payable" value={payable} hidden={!showCash} />
            <Mini label="Bank balance" value={bankTotal} hidden={!showCash} />
            <Mini label="Supplier advance" value={supplierAdvance} hidden={!showCash} />
            {customerAdvance > 0 && <Mini label="Customer advance" value={customerAdvance} hidden={!showCash} />}
            <Mini label="Sales this month" value={mt("sale")} hidden={!showCash} />
          </div>
        </div>
      </div>) },
    inflow: { span: "", node: <StatTile tone="received" icon={ArrowDownLeft} label="Receive Payment" value={cashIn} onClick={() => setEntryType("inward")} cta="New receipt" /> },
    outflow: { span: "", node: <StatTile tone="paid" icon={ArrowUpRight} label="Issue Payment" value={cashOut} onClick={() => setEntryType("outward")} cta="New payment" /> },
    sale: { span: "", node: <LinkTile tone="sale" icon={BarChart3} label="Sales" detail={`This month ${fmtPKR(mt("sale"))}`} to="/sales" /> },
    purchase: { span: "", node: <LinkTile tone="purchase" icon={ShoppingCart} label="Purchases" detail={`This month ${fmtPKR(mt("purchase"))}`} to="/purchases" /> },
    account: { span: "", node: <ActionTile tone="account" icon={UserPlus} label="New Account" detail={`${liveAccounts(d).length} accounts`} onClick={() => setNewAcc(true)} /> },
    ledgers: { span: "col-span-2", node: <LinkTile tone="ledger" icon={BookOpen} label="Ledgers & Accounts" detail="Party balances, statements and history" to="/accounts" /> },
    workers: { span: "", node: <LinkTile tone="entries" icon={Users} label="Workers" detail="Worker accounts, wages and advances" to="/workers" /> },
    reports: { span: "col-span-2", node: <LinkTile tone="report" icon={Scale} label="Reports" detail="Cash book, sales, purchases, salaries and expenses" to="/reports" /> },
    expense: { span: "", node: <ActionTile tone="expense" icon={Receipt} label="Expense" detail={`This month ${fmtPKR(mt("expense"))}`} onClick={() => setEntryType("expense")} /> },
    stock: { span: "", node: <LinkTile tone="purchase" icon={Boxes} label="Stock" detail="Scrap, billet & material in tons" to="/stock" /> },
    vouchers: { span: "", node: <LinkTile tone="entries" icon={FileText} label="Vouchers" detail="Sales, purchases, receipts & payments" to="/vouchers" /> },
    loans: { span: "", node: <LinkTile tone="admin" icon={HandCoins} label="Personal Loans" detail="Given, taken and repayment tracking" to="/loans" /> },
    banks: { span: "", node: <LinkTile tone="ledger" icon={Wallet} label="Cash & Banks" detail="Bank statements, capital & transfers" to="/banks" /> },
  };

  return (
    <div className="space-y-5 pb-10">
      {!d.opening?.completed && (
        <Link to="/opening" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          <span><span className="font-semibold">Complete your Opening Setup</span> — enter cash, bank, party, stock and loan balances on your start date.</span>
          <span className="font-semibold text-primary">Start →</span>
        </Link>
      )}
      <div className="grid auto-rows-[minmax(150px,auto)] grid-flow-dense grid-cols-2 gap-3 md:grid-cols-4 sm:gap-4">
        {order.map((k) => {
          const t = tiles[k]; if (!t) return null;
          return (
            <div
              key={k}
              data-tile={k}
              onPointerDown={(e) => onTileDown(e, k)}
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              onClickCapture={(e) => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); } }}
              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
              className={cn("group relative min-w-0 select-none", t.span, drag === k && "opacity-30")}
            >
              {t.node}
            </div>
          );
        })}
      </div>
      {drag && ghost && tiles[drag] && (
        <div ref={ghostRef} className="pointer-events-none fixed left-0 top-0 z-[60] opacity-95 shadow-2xl" style={{ width: ghost.w, height: ghost.h, willChange: "transform" }}>
          {tiles[drag].node}
        </div>
      )}

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

function Head({ icon: Icon, label, light, tone, lg }: { icon: typeof Wallet; label: string; light?: boolean; tone?: Tone; lg?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className={cn("font-medium", lg ? "text-xl font-bold sm:text-2xl" : "text-sm", light ? "opacity-85" : "text-muted-foreground")}>{label}</span>
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", light ? "bg-hero-foreground/15" : tone && toneCls[tone])}><Icon className="h-[18px] w-[18px]" /></span>
    </div>
  );
}
function Mini({ label, value, hidden }: { label: string; value: number; hidden?: boolean }) {
  return <div className="rounded-xl bg-hero-foreground/10 p-3"><div className="text-xs opacity-75">{label}</div><div className="num mt-1 truncate font-semibold">{hidden ? "Rs ••••" : fmtPKR(value)}</div></div>;
}
const toneText: Record<Tone, string> = {
  received: "text-received", paid: "text-paid", sale: "text-sale", purchase: "text-purchase",
  account: "text-account", ledger: "text-ledger-card", report: "text-report-card",
  expense: "text-expense-card", entries: "text-entry-card", admin: "text-admin-card", hero: "text-hero",
};
const tileBase = "glass flex h-full w-full flex-col justify-between rounded-xl border-2 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 sm:p-5";
function StatTile({ tone, icon, label, value, onClick, cta }: { tone: Tone; icon: typeof Wallet; label: string; value: number; onClick: () => void; cta: string }) {
  return (
    <button onClick={onClick} className={cn(tileBase, softCls[tone])}>
      <Head icon={icon} label="" tone={tone} />
      <div><div className="text-xl font-bold sm:text-2xl">{label}</div><div className="num truncate text-sm font-semibold">{fmtPKR(value)}</div><div className={cn("mt-1 text-xs font-medium", toneText[tone])}>{cta} →</div></div>
    </button>
  );
}
function ActionTile({ tone, icon, label, detail, onClick }: { tone: Tone; icon: typeof Wallet; label: string; detail: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(tileBase, softCls[tone])}>
      <Head icon={icon} label="" tone={tone} />
      <div><div className="text-xl font-bold sm:text-2xl">{label}</div><div className="num truncate text-xs text-muted-foreground">{detail}</div></div>
    </button>
  );
}
function LinkTile({ tone, icon, label, detail, to }: { tone: Tone; icon: typeof Wallet; label: string; detail: string; to: "/accounts" | "/reports" | "/workers" | "/loans" | "/sales" | "/purchases" | "/stock" | "/vouchers" }) {
  return (
    <Link to={to} className={cn(tileBase, softCls[tone])}>
      <Head icon={icon} label="" tone={tone} />
      <div><div className="text-xl font-bold sm:text-2xl">{label}</div><div className="text-xs text-muted-foreground">{detail}</div></div>
    </Link>
  );
}
