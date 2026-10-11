import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntriesTable } from "@/components/app/EntriesTable";
import { Field, PageHeader, PrintHeader } from "@/components/app/inputs";
import { CASH, fundLedger, fundList, liveEntries, updateEntry, useData, type ChequeStatus } from "@/lib/db";
import { Link } from "@tanstack/react-router";
import { fmtDate, fmtPKR, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cashbook")({
  head: () => ({
    meta: [
      { title: "Cash Book — Mussa Enterprises" },
      { name: "description", content: "Day book, cash in hand, bank balance, pending cheques and day-end cash tally." },
      { property: "og:title", content: "Cash Book — Mussa Enterprises" },
      { property: "og:description", content: "Day book, cash in hand, bank balance, pending cheques and day-end cash tally." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CashBook,
});

function CashBook() {
  const d = useData();
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [counted, setCounted] = useState("");
  const all = liveEntries(d);

  const cashInHand = fundLedger(d, CASH).closing;
  const bank = fundList(d).filter((f) => f.id !== CASH).reduce((s, f) => s + f.closing, 0);
  const pending = all.filter((e) => e.method === "cheque" && e.chequeStatus === "pending");

  const { opening, rows, inT, outT } = useMemo(() => {
    const l = fundLedger(d, CASH, from, to);
    const inT = l.rows.filter((m) => m.delta > 0).reduce((s, m) => s + m.delta, 0);
    const outT = -l.rows.filter((m) => m.delta < 0).reduce((s, m) => s + m.delta, 0);
    return { opening: l.opening, rows: l.rows.map((m) => m.e), inT, outT };
  }, [d, from, to]);

  const diff = counted ? Number(counted.replace(/,/g, "")) - cashInHand : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Cash Book" subtitle="Rokar · day book and wallets" actions={<Button onClick={() => window.print()}><Printer /> Print / PDF</Button>} />
      <PrintHeader title="Cash Book" sub={`${fmtDate(from)} to ${fmtDate(to)}`} />

      <div className="no-print grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Cash in Hand</div><div className="num mt-2 text-2xl font-semibold">{fmtPKR(cashInHand)}</div></div>
        <div className="rounded-lg border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">All Banks (cleared)</div><div className="num mt-2 text-2xl font-semibold">{fmtPKR(bank)}</div><Link to="/banks" className="text-xs text-primary hover:underline">Bank statements →</Link></div>
        <div className="rounded-lg border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Cheques Pending ({pending.length})</div><div className="num mt-2 text-2xl font-semibold text-warning">{fmtPKR(pending.reduce((s, e) => s + e.amount, 0))}</div></div>
      </div>

      <div className="no-print rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Day-End Cash Tally</h2>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Cash counted in drawer (Rs)"><Input className="num w-56 text-right" value={counted} onChange={(e) => setCounted(e.target.value.replace(/[^0-9.,]/g, ""))} /></Field>
          <div className="text-sm">System: <span className="num font-semibold">{fmtPKR(cashInHand)}</span></div>
          {counted && (
            <div className={cn("rounded-md px-3 py-2 text-sm font-semibold", diff === 0 ? "bg-success-soft text-success" : "bg-danger-soft text-destructive")}>
              {diff === 0 ? "Tallied — no difference" : diff < 0 ? `Shortage ${fmtPKR(-diff)}` : `Excess ${fmtPKR(diff)}`}
            </div>
          )}
        </div>
      </div>

      {pending.length > 0 && (
        <div className="no-print rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pending Cheques</h2>
          <ul className="divide-y text-sm">
            {pending.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>V-{e.voucherNo} · {fmtDate(e.date)} · {d.accounts.find((a) => a.id === e.accountId)?.name} · Chq #{e.chequeNo || "—"} {d.banks.find((b) => b.id === e.bankId)?.name ?? e.bank}</span>
                <span className="flex items-center gap-2">
                  <span className="num font-medium">{fmtPKR(e.amount)}</span>
                  {(["cleared", "bounced"] as ChequeStatus[]).map((s) => (
                    <Button key={s} size="sm" variant={s === "cleared" ? "success" : "outline"} onClick={() => updateEntry(e.id, { chequeStatus: s })}>{s === "cleared" ? "Cleared" : "Bounced"}</Button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="no-print flex flex-wrap items-end gap-3">
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {[["Opening", opening, ""], ["Total In", inT, "text-success"], ["Total Out", outT, "text-destructive"], ["Closing", opening + inT - outT, ""]].map(([l, v, c]) => (
          <div key={l as string} className="rounded-lg border bg-card p-3"><div className="text-xs uppercase text-muted-foreground">{l}</div><div className={cn("num mt-1 text-lg font-semibold", c as string)}>{fmtPKR(v as number)}</div></div>
        ))}
      </div>
      <EntriesTable entries={rows} emptyText="No cash movement in this period" />
    </div>
  );
}
