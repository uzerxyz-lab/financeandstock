import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Eye, EyeOff, FileCheck2, Landmark, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { accountBalance, CASH, entryState, fundName, liveAccounts, liveEntries, todayISO as _t, updateEntry, useData, type ChequeStatus } from "@/lib/db";
import { fmtDate, fmtPKR, todayISO } from "@/lib/format";
import { haptic } from "@/lib/dashboard-layout";
import { cn } from "@/lib/utils";

void _t;
type Panel = "cash" | "bank" | "receivable" | "payable" | "cheques";
const HIDE_KEY = "cashbook-treasury-hidden";

export function TreasuryCard({ editing, w }: { editing: boolean; w: number }) {
  const d = useData();
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && localStorage.getItem(HIDE_KEY) === "1");
  const [panel, setPanel] = useState<Panel>();
  const [tab, setTab] = useState<ChequeStatus>("pending");

  const s = useMemo(() => {
    const funds = [CASH, ...d.banks.filter((b) => !b.deletedAt).map((b) => b.id)];
    const live = liveEntries(d);
    const ledgerOf = (fund: string) => {
      let bal = fund === CASH ? d.opening?.cash ?? 0 : d.banks.find((b) => b.id === fund)?.openingBalance ?? 0;
      let pending = 0, inToday = 0, outToday = 0;
      const today = todayISO();
      for (const e of live) {
        const moves = e.type === "transfer"
          ? [{ f: e.bankId ?? CASH, v: -e.amount }, { f: e.toBankId ?? CASH, v: e.amount }]
          : [];
        if (!moves.length) {
          const flow = ({ inward: 1, capital: 1, outward: -1, salary: -1, advance: -1, expense: -1 } as Record<string, number>)[e.type];
          if (!flow) continue;
          moves.push({ f: !e.method || e.method === "cash" ? CASH : e.bankId ?? "bank-unassigned", v: flow * e.amount });
        }
        for (const m of moves) {
          if (m.f !== fund) continue;
          const st = entryState(e);
          if (st === "cleared") { bal += m.v; if (e.date === today) m.v > 0 ? (inToday += m.v) : (outToday -= m.v); }
          else if (st === "pending") pending += m.v;
        }
      }
      return { id: fund, name: fundName(d, fund), bal, pending, inToday, outToday };
    };
    const all = funds.map(ledgerOf);
    const parties = liveAccounts(d).filter((a) => !a.equity).map((a) => ({ a, b: accountBalance(d, a.id) }));
    const receivables = parties.filter((p) => p.b > 0 && p.a.type !== "supplier").sort((x, y) => y.b - x.b);
    const payables = parties.filter((p) => p.b < 0 && p.a.type !== "buyer").map((p) => ({ ...p, b: -p.b })).sort((x, y) => y.b - x.b);
    const cheques = live.filter((e) => e.method === "cheque").sort((a, b) => b.date.localeCompare(a.date));
    const by = (st: ChequeStatus) => cheques.filter((e) => entryState(e) === st);
    return {
      cash: all[0]!, banks: all.slice(1),
      bankTotal: all.slice(1).reduce((x, f) => x + f.bal, 0),
      receivables, payables,
      recTotal: receivables.reduce((x, p) => x + p.b, 0), payTotal: payables.reduce((x, p) => x + p.b, 0),
      pending: by("pending"), cleared: by("cleared"), bounced: by("bounced"),
    };
  }, [d]);

  const m = (v: number) => (hidden ? "Rs ••••••" : fmtPKR(v));
  const pendingAmt = s.pending.reduce((x, e) => x + e.amount, 0);
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation(); haptic(8);
    setHidden((h) => { localStorage.setItem(HIDE_KEY, h ? "0" : "1"); return !h; });
  };
  const open = (p: Panel) => (e: React.MouseEvent) => { e.stopPropagation(); if (editing) return; haptic(10); setPanel(p); };
  const accName = (id?: string) => d.accounts.find((a) => a.id === id)?.name ?? "—";

  const subs: { id: Panel; label: string; value: number; icon: typeof Wallet; tone: string; note?: string; wide?: boolean }[] = [
    { id: "cash", label: "Cash in hand", value: s.cash.bal, icon: Wallet, tone: "bg-metric-cash" },
    { id: "bank", label: "Bank balance", value: s.bankTotal, icon: Landmark, tone: "bg-metric-bank" },
    { id: "receivable", label: "Receivables", value: s.recTotal, icon: ArrowDownLeft, tone: "bg-metric-receivable" },
    { id: "payable", label: "Payables", value: s.payTotal, icon: ArrowUpRight, tone: "bg-metric-payable" },
    { id: "cheques", label: "Cheques & clearing", value: pendingAmt, icon: FileCheck2, tone: "bg-chart-4", wide: true,
      note: `${s.pending.length} pending · ${s.cleared.length} cleared · ${s.bounced.length} bounced` },
  ];

  const Row = ({ l, sub, r, to }: { l: string; sub?: string; r: number; to?: { id: string } }) => (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <div className="min-w-0">
        {to ? <Link to="/accounts/$id" params={to} className="block truncate font-medium hover:underline" onClick={() => setPanel(undefined)}>{l}</Link> : <div className="truncate font-medium">{l}</div>}
        {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
      </div>
      <span className="num shrink-0 font-semibold">{m(r)}</span>
    </div>
  );
  const Empty = ({ t }: { t: string }) => <p className="py-6 text-center text-sm text-muted-foreground">{t}</p>;
  const list = tab === "pending" ? s.pending : tab === "cleared" ? s.cleared : s.bounced;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate text-sm font-semibold">Treasury Position</h2>
        <button aria-label={hidden ? "Show amounts" : "Hide amounts"} onClick={toggle} onPointerDown={(e) => e.stopPropagation()}
          className="rounded-full border bg-background p-2 text-muted-foreground shadow-sm hover:text-foreground">
          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div className={cn("mt-3 grid min-h-0 flex-1 auto-rows-fr gap-2 overflow-hidden", w >= 3 ? "grid-cols-5" : "grid-cols-2")}>
        {subs.map((x) => (
          <button key={x.id} type="button" onClick={open(x.id)}
            className={cn("flex min-w-0 flex-col justify-between rounded-lg border bg-surface p-2.5 text-left transition-transform active:scale-[0.97]", !editing && "hover:border-primary/50", x.wide && w < 3 && "col-span-2")}>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-primary-foreground", x.tone)}><x.icon className="h-3 w-3" /></span>
              <span className="truncate">{x.label}</span>
            </span>
            <span className="num mt-1 truncate text-base font-semibold tracking-tight">{m(x.value)}</span>
            {x.note && <span className="truncate text-[10px] text-muted-foreground">{x.note}</span>}
          </button>
        ))}
      </div>

      <Dialog open={!!panel} onOpenChange={(o) => !o && setPanel(undefined)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
          {panel === "cash" && <>
            <DialogHeader><DialogTitle>Cash in hand</DialogTitle></DialogHeader>
            <div className="divide-y">
              <Row l="Current hard cash" r={s.cash.bal} />
              <Row l="Received today" r={s.cash.inToday} />
              <Row l="Paid today" r={s.cash.outToday} />
            </div>
            <Link to="/cashbook" onClick={() => setPanel(undefined)} className="text-sm font-semibold text-primary">Open Cash Book →</Link>
          </>}
          {panel === "bank" && <>
            <DialogHeader><DialogTitle>Bank balance · {m(s.bankTotal)}</DialogTitle></DialogHeader>
            {s.banks.length === 0 ? <Empty t="No bank accounts yet." /> : <div className="divide-y">
              {s.banks.map((b) => <Row key={b.id} l={b.name} sub={b.pending ? `Pending cheques ${m(b.pending)}` : "Cleared balance"} r={b.bal} />)}
            </div>}
            <Link to="/banks" onClick={() => setPanel(undefined)} className="text-sm font-semibold text-primary">Open Cash & Banks →</Link>
          </>}
          {(panel === "receivable" || panel === "payable") && (() => {
            const rows = panel === "receivable" ? s.receivables : s.payables;
            return <>
              <DialogHeader><DialogTitle>{panel === "receivable" ? "Receivables" : "Payables"} · {m(panel === "receivable" ? s.recTotal : s.payTotal)}</DialogTitle></DialogHeader>
              {rows.length === 0 ? <Empty t="No dues." /> : <div className="divide-y">
                {rows.map((p) => <Row key={p.a.id} l={p.a.name} sub={[p.a.code, p.a.phone].filter(Boolean).join(" · ")} r={p.b} to={{ id: p.a.id }} />)}
              </div>}
            </>;
          })()}
          {panel === "cheques" && <>
            <DialogHeader><DialogTitle>Cheques & clearing</DialogTitle></DialogHeader>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-xs font-semibold">
              {(["pending", "cleared", "bounced"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={cn("rounded-md px-2 py-1.5 capitalize", tab === t ? "bg-card shadow-sm" : "text-muted-foreground")}>
                  {t} ({s[t].length})
                </button>
              ))}
            </div>
            {list.length === 0 ? <Empty t={`No ${tab} cheques.`} /> : <div className="divide-y">
              {list.map((e) => (
                <div key={e.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{accName(e.accountId)}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        Chq {e.chequeNo || "—"} · {e.bank || fundName(d, e.bankId ?? "")} · {fmtDate(e.date)} · {e.type === "inward" ? "Received" : "Issued"}
                      </div>
                    </div>
                    <span className="num shrink-0 font-semibold">{m(e.amount)}</span>
                  </div>
                  {tab === "pending" && <div className="mt-2 flex gap-2">
                    <button onClick={() => { haptic(10); updateEntry(e.id, { chequeStatus: "cleared" }); }} className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Mark cleared</button>
                    <button onClick={() => { haptic(10); updateEntry(e.id, { chequeStatus: "bounced" }); }} className="rounded-md border px-3 py-1 text-xs font-semibold text-destructive">Mark bounced</button>
                  </div>}
                </div>
              ))}
            </div>}
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
