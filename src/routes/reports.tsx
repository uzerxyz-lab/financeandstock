import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PageHeader, PrintHeader } from "@/components/app/inputs";
import { accountBalance, balanceClass, fundList, liveAccounts, liveEntries, useData, ENTRY_TYPES, ACCOUNT_TYPES, type EntryType } from "@/lib/db";
import { fmtDate, fmtPKR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Mussa Enterprises Cash Book" },
      { name: "description", content: "Receivables, payables, worker salaries and period totals." },
      { property: "og:title", content: "Reports — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "Receivables, payables, worker salaries and period totals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reports,
});

function Reports() {
  const d = useData();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const entries = liveEntries(d).filter((e) => (!from || e.date >= from) && (!to || e.date <= to));
  const totals = useMemo(() => {
    const m = {} as Record<EntryType, number>;
    (Object.keys(ENTRY_TYPES) as EntryType[]).forEach((k) => (m[k] = 0));
    entries.forEach((e) => (m[e.type] += e.amount));
    return m;
  }, [entries]);
  const accs = liveAccounts(d).map((a) => ({ a, b: accountBalance(d, a.id) }));
  const workers = accs.filter((x) => x.a.type === "worker").map(({ a }) => ({
    a,
    salary: entries.filter((e) => e.accountId === a.id && e.type === "salary").reduce((s, e) => s + e.amount, 0),
    advance: entries.filter((e) => e.accountId === a.id && e.type === "advance").reduce((s, e) => s + e.amount, 0),
  }));
  const cls = (c: string) => accs.filter((x) => x.a.type !== "worker" && balanceClass(x.a, x.b) === c).sort((x, y) => Math.abs(y.b) - Math.abs(x.b));
  const rec = cls("Receivable");
  const pay = accs.filter((x) => !x.a.equity && balanceClass(x.a, x.b) === "Payable").sort((x, y) => x.b - y.b);
  const supAdv = cls("Supplier Advance");
  const custAdv = cls("Customer Advance");
  const funds = fundList(d);

  const Table = ({ title, rows, tone }: { title: string; rows: typeof rec; tone: string }) => (
    <div className="rounded-lg border bg-card">
      <h3 className="border-b px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.length === 0 && <tr><td className="px-4 py-6 text-center text-muted-foreground">None</td></tr>}
          {rows.map(({ a, b }) => (
            <tr key={a.id} className="border-t first:border-t-0">
              <td className="px-4 py-2"><Link to="/ledger/$id" params={{ id: a.id }} className="hover:text-primary">{a.name}</Link> <span className="num text-xs text-muted-foreground">{a.code}</span></td>
              <td className={cn("num px-4 py-2 text-right font-medium", tone)}>{fmtPKR(Math.abs(b), false)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="border-t bg-surface font-semibold"><td className="px-4 py-2">Total</td><td className="num px-4 py-2 text-right">{fmtPKR(rows.reduce((s, x) => s + Math.abs(x.b), 0), false)}</td></tr></tfoot>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" actions={<Button onClick={() => window.print()}><Printer /> Print / PDF</Button>} />
      <PrintHeader title="Business Summary" sub={from || to ? `${fmtDate(from) || "Start"} to ${fmtDate(to) || "Today"}` : "All dates"} />
      <div className="no-print flex flex-wrap items-end gap-3">
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {(Object.keys(ENTRY_TYPES) as EntryType[]).map((k) => (
          <div key={k} className="rounded-lg border bg-card p-3">
            <div className="text-xs uppercase text-muted-foreground">{ENTRY_TYPES[k].label}</div>
            <div className="num mt-1 font-semibold">{fmtPKR(totals[k], false)}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Table title="Receivables (Dr)" rows={rec} tone="text-success" />
        <Table title="Payables (Cr)" rows={pay} tone="text-destructive" />
        <Table title="Supplier Advances (Dr)" rows={supAdv} tone="text-success" />
        <Table title="Customer Advances (Cr)" rows={custAdv} tone="text-destructive" />
      </div>
      <div className="rounded-lg border bg-card">
        <h3 className="border-b px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cash & Bank Balances (cleared)</h3>
        <table className="w-full text-sm"><tbody>
          {funds.map((f) => <tr key={f.id} className="border-t first:border-t-0"><td className="px-4 py-2">{f.name}</td><td className="num px-4 py-2 text-right">{fmtPKR(f.closing, false)}{f.pending ? <span className="ml-2 text-xs text-warning">(pending {fmtPKR(f.pending, false)})</span> : null}</td></tr>)}
        </tbody></table>
      </div>
      <div className="rounded-lg border bg-card">
        <h3 className="border-b px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Workers — Salary & Advance</h3>
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-2">Worker</th><th className="px-4 py-2 text-right">Salary Paid</th><th className="px-4 py-2 text-right">Advance</th><th className="px-4 py-2 text-right">Total</th></tr></thead>
          <tbody>
            {workers.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No worker accounts ({ACCOUNT_TYPES["worker"]} type)</td></tr>}
            {workers.map((w) => (
              <tr key={w.a.id} className="border-t">
                <td className="px-4 py-2"><Link to="/ledger/$id" params={{ id: w.a.id }} className="hover:text-primary">{w.a.name}</Link> <span className="num text-xs text-muted-foreground">{w.a.code}</span></td>
                <td className="num px-4 py-2 text-right">{fmtPKR(w.salary, false)}</td>
                <td className="num px-4 py-2 text-right">{fmtPKR(w.advance, false)}</td>
                <td className="num px-4 py-2 text-right font-medium">{fmtPKR(w.salary + w.advance, false)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
