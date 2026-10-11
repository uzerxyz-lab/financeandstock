import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PageHeader, PrintHeader } from "@/components/app/inputs";
import { CASH, ENTRY_TYPES, METHODS, fundLedger, fundName, updateEntry, useData, type ChequeStatus } from "@/lib/db";
import { fmtDate, fmtPKR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bank/$id")({
  head: () => ({
    meta: [
      { title: "Bank Statement — Mussa Enterprises" },
      { name: "description", content: "Date-wise bank or cash statement with party, voucher, method, cheque/online reference and running balance." },
      { property: "og:title", content: "Bank Statement — Mussa Enterprises" },
      { property: "og:description", content: "Traceable bank statement with running balance and cheque status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BankStatement,
});

function BankStatement() {
  const { id } = Route.useParams();
  const d = useData();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const l = fundLedger(d, id, from, to);
  const name = fundName(d, id);
  if (id !== CASH && !d.banks.some((b) => b.id === id)) return <div className="py-20 text-center text-muted-foreground">Account not found. <Link to="/banks" className="text-primary hover:underline">Back</Link></div>;

  return (
    <div className="space-y-5">
      <PageHeader title={name} subtitle="Statement · running balance counts cleared items only" actions={<Button onClick={() => window.print()}><Printer /> Print / PDF</Button>} />
      <PrintHeader title={`${name} Statement`} sub={from || to ? `${fmtDate(from) || "Start"} to ${fmtDate(to) || "Today"}` : "All dates"} />
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Opening", l.opening], ["Closing (cleared)", l.closing], ["Pending cheques", l.pending]].map(([k, v]) => (
          <div key={k as string} className="rounded-lg border bg-card p-3"><div className="text-xs uppercase text-muted-foreground">{k}</div><div className={cn("num mt-1 text-lg font-semibold", k === "Pending cheques" && "text-warning")}>{fmtPKR(v as number)}</div></div>
        ))}
      </div>
      <div className="no-print flex flex-wrap items-end gap-3">
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Voucher</th><th className="px-3 py-2">Party / Details</th><th className="px-3 py-2">Method / Ref</th><th className="px-3 py-2 text-right">In</th><th className="px-3 py-2 text-right">Out</th><th className="px-3 py-2 text-right">Balance</th></tr>
          </thead>
          <tbody>
            <tr className="border-t"><td colSpan={6} className="px-3 py-2 font-medium">Opening balance</td><td className="num px-3 py-2 text-right">{fmtPKR(l.opening)}</td></tr>
            {l.rows.map(({ e, delta, state, bal }) => {
              const party = d.accounts.find((a) => a.id === e.accountId);
              return (
                <tr key={e.id + delta} className={cn("border-t", state !== "cleared" && "text-muted-foreground")}>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(e.date)}</td>
                  <td className="px-3 py-2"><Link to="/voucher/$id" params={{ id: e.id }} className="num text-primary hover:underline">V-{e.voucherNo}</Link></td>
                  <td className="px-3 py-2"><div className="font-medium">{party?.name ?? ENTRY_TYPES[e.type].label}</div><div className="text-xs text-muted-foreground">{e.particulars}</div></td>
                  <td className="px-3 py-2 text-xs">
                    {e.method ? METHODS[e.method] : ""}{e.chequeNo ? ` #${e.chequeNo}` : ""}{e.reference ? ` · Ref ${e.reference}` : ""}
                    {e.method === "cheque" && <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className={cn("font-semibold uppercase", state === "pending" && "text-warning", state === "cleared" && "text-success", state === "bounced" && "text-destructive")}>{state}</span>
                      {state === "pending" && (["cleared", "bounced"] as ChequeStatus[]).map((s) => <Button key={s} size="sm" variant={s === "cleared" ? "success" : "outline"} className="no-print h-6 px-2 text-xs" onClick={() => updateEntry(e.id, { chequeStatus: s })}>{s === "cleared" ? "Clear" : "Bounce"}</Button>)}
                    </div>}
                  </td>
                  <td className="num px-3 py-2 text-right text-success">{delta > 0 ? fmtPKR(delta, false) : ""}</td>
                  <td className="num px-3 py-2 text-right text-destructive">{delta < 0 ? fmtPKR(-delta, false) : ""}</td>
                  <td className="num px-3 py-2 text-right">{fmtPKR(bal)}</td>
                </tr>
              );
            })}
            {l.rows.length === 0 && <tr className="border-t"><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No transactions</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
