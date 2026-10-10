import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PageHeader, PrintHeader } from "@/components/app/inputs";
import { EntryForm } from "@/components/app/EntryForm";
import { PinActionDialog } from "@/components/app/PinActionDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TypeBadge } from "@/components/app/EntriesTable";
import { accountTypeLabel, deleteItems, liveEntries, signedForAccount, useData, METHODS, ENTRY_TYPES, type Entry, type EntryType } from "@/lib/db";
import { downloadFile, fmtDate, fmtPKR, fmtTime, toCSV, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ledger/$id")({
  head: () => ({
    meta: [
      { title: "Party Ledger — Mussa Enterprises Cash Book" },
      { name: "description", content: "Date-wise party statement with debit, credit and running balance." },
      { property: "og:title", content: "Party Ledger — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "Date-wise party statement with debit, credit and running balance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LedgerPage,
});

function LedgerPage() {
  const { id } = Route.useParams();
  const d = useData();
  const a = d.accounts.find((x) => x.id === id);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filter, setFilter] = useState<"all" | "received" | "issued">("all");
  const [pending, setPending] = useState<{ entry: Entry; action: "edit" | "delete" } | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [adding, setAdding] = useState(false);

  const { opening, rows, closing, dr, cr } = useMemo(() => {
    const all = liveEntries(d).filter((e) => e.accountId === id).sort((x, y) => x.date.localeCompare(y.date) || x.voucherNo - y.voucherNo);
    let bal = a?.openingBalance ?? 0;
    for (const e of all) if (from && e.date < from) bal += signedForAccount(e);
    const opening = bal;
    let dr = 0, cr = 0;
    const rows = all.filter((e) => (!from || e.date >= from) && (!to || e.date <= to)).map((e) => {
      const s = signedForAccount(e);
      bal += s;
      if (s > 0) dr += s; else cr -= s;
      return { e, debit: s > 0 ? s : 0, credit: s < 0 ? -s : 0, bal };
    });
    return { opening, rows, closing: bal, dr, cr };
  }, [d, id, a, from, to]);

  if (!a) return <div className="py-20 text-center text-muted-foreground">Account not found. <Link to="/accounts" className="text-primary hover:underline">Back to accounts</Link></div>;

  const choices: EntryType[] = a.type === "buyer" ? ["sale", "inward", "outward"] : a.type === "supplier" ? ["purchase", "outward", "inward"] : a.type === "worker" ? ["salary", "advance"] : ["inward", "outward", "sale", "purchase"];
  const balText = (b: number) => `${fmtPKR(Math.abs(b), false)} ${b > 0 ? "Dr" : b < 0 ? "Cr" : ""}`;
  const period = from || to ? `${fmtDate(from) || "Start"} to ${fmtDate(to) || fmtDate(todayISO())}` : "All dates";
  const received = rows.filter(({ e }) => ENTRY_TYPES[e.type].flow === "in").reduce((total, { e }) => total + e.amount, 0);
  const issued = rows.filter(({ e }) => ENTRY_TYPES[e.type].flow === "out").reduce((total, { e }) => total + e.amount, 0);
  const isWorker = a.type === "worker";
  const month = todayISO().slice(0, 7);
  const monthRows = liveEntries(d).filter((e) => e.accountId === a.id && e.date.startsWith(month) && (e.type === "salary" || e.type === "advance"));
  const paidSalary = monthRows.filter((e) => e.type === "salary").reduce((t, e) => t + e.amount, 0);
  const paidAdvance = monthRows.filter((e) => e.type === "advance").reduce((t, e) => t + e.amount, 0);
  const wageLeft = (a.fixedWages ?? 0) - paidSalary - paidAdvance;
  const visible = rows.filter(({ e }) => filter === "all" || ENTRY_TYPES[e.type].flow === (filter === "received" ? "in" : "out")).slice().reverse();

  const exportCSV = () => {
    const out: (string | number)[][] = [[`${a.name} (${a.code})`], ["Period", period], [], ["Date", "Voucher", "Type", "Particulars", "Method", "Debit", "Credit", "Balance"], ["", "", "", "Opening Balance", "", "", "", balText(opening)]];
    rows.forEach(({ e, debit, credit, bal }) => out.push([fmtDate(e.date), `V-${e.voucherNo}`, e.type, e.particulars, e.method ? METHODS[e.method] : "", debit || "", credit || "", balText(bal)]));
    out.push(["", "", "", "Closing Balance", "", dr, cr, balText(closing)]);
    downloadFile(`ledger-${a.code}.csv`, toCSV(out));
  };

  return (
    <div>
       
       <PageHeader
        title={a.name}
        subtitle={`${a.code} · ${accountTypeLabel(d, a.type)}${a.phone ? " · " + a.phone : ""}`}
        actions={<>
          <Button onClick={() => setAdding(true)}><Plus /> New Entry</Button>
          <Button variant="outline" onClick={exportCSV}><Download /> Excel</Button>
          <Button onClick={() => { const previous = document.title; document.title = `${a.name} Statement ${todayISO()}`; window.print(); setTimeout(() => { document.title = previous; }, 500); }}><Printer /> Print / PDF</Button>
        </>}
      />
      <PrintHeader title="Account Statement" sub={period} />
      <div className="print-only mb-3 text-sm">
        <div className="font-semibold">{a.name} <span className="num">({a.code})</span></div>
        {a.phone && <div>{a.phone}</div>}
        {a.address && <div>{a.address}</div>}
      </div>

       <div className="no-print mb-5 rounded-lg border bg-card p-5 sm:p-6">
         <div className="flex flex-wrap items-start justify-between gap-4">
           <div><h2 className="text-xl font-semibold sm:text-2xl">{a.name}</h2><span className="num text-sm text-muted-foreground">{a.code}</span></div>
           <div className="text-left sm:text-right"><div className="text-xs uppercase text-muted-foreground">Balance</div><div className={cn("num text-xl font-semibold sm:text-2xl", closing >= 0 ? "text-success" : "text-destructive")}>{closing < 0 ? "−" : ""}{fmtPKR(Math.abs(closing))}</div><div className="text-xs text-muted-foreground">{closing > 0 ? "Receivable · Dr" : closing < 0 ? "Payable · Cr" : "Settled"}</div></div>
         </div>
         <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 text-sm"><dt className="text-muted-foreground">Type</dt><dd>{accountTypeLabel(d, a.type)}</dd>{a.phone && <><dt className="text-muted-foreground">Contact</dt><dd>{a.phone}</dd></>}{a.address && <><dt className="text-muted-foreground">Address</dt><dd>{a.address}</dd></>}</dl>
       </div>
       {isWorker ? <div className="no-print mb-6 grid grid-cols-2 gap-3">
         <div className="rounded-lg border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Fixed Wages / month</div><div className="num mt-1 text-lg font-semibold">{a.fixedWages ? fmtPKR(a.fixedWages) : "Not set"}</div></div>
         <div className="rounded-lg border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Paid this month</div><div className="num mt-1 text-lg font-semibold text-destructive">{fmtPKR(paidSalary + paidAdvance)}</div><div className="num text-xs text-muted-foreground">Salary {fmtPKR(paidSalary)} · Advance {fmtPKR(paidAdvance)}</div></div>
         {!!a.fixedWages && <div className="col-span-2 rounded-lg border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">{wageLeft >= 0 ? "Remaining to pay this month" : "Advance over wages"}</div><div className={cn("num mt-1 text-xl font-semibold", wageLeft >= 0 ? "text-success" : "text-destructive")}>{fmtPKR(Math.abs(wageLeft))}</div></div>}
       </div> : <div className="no-print mb-6 grid grid-cols-2 gap-3">
         <div className="rounded-lg border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Received</div><div className="num mt-1 text-lg font-semibold text-success">{fmtPKR(received)}</div></div>
         <div className="rounded-lg border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Issued</div><div className="num mt-1 text-lg font-semibold text-destructive">{fmtPKR(issued)}</div></div>
       </div>}
       <div className="no-print mb-4 flex flex-wrap items-end gap-3">
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        {(from || to) && <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); }}>Clear</Button>}
      </div>

       <div className="print-only mb-4 grid gap-3 sm:grid-cols-4">
        {[["Opening", opening], ["Total Debit", dr], ["Total Credit", -cr], ["Closing", closing]].map(([l, v]) => (
          <div key={l as string} className="rounded-lg border bg-card p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{l}</div>
            <div className={cn("num mt-1 text-lg font-semibold", (l === "Opening" || l === "Closing") && ((v as number) > 0 ? "text-success" : (v as number) < 0 ? "text-destructive" : ""))}>
              {l === "Opening" || l === "Closing" ? balText(v as number) : fmtPKR(Math.abs(v as number), false)}
            </div>
          </div>
        ))}
      </div>

       {!isWorker && <div className="no-print mb-5 flex gap-2">
         {(["all", "received", "issued"] as const).map((key) => <Button key={key} className="rounded-full" variant={filter === key ? "default" : "outline"} onClick={() => setFilter(key)}>{key === "all" ? "All" : key === "received" ? "Received" : "Issued"}</Button>)}
       </div>}
       <h2 className="no-print mb-3 text-xs font-semibold uppercase text-muted-foreground">Transactions</h2>
       <div className="no-print space-y-3">
         {visible.length === 0 && <p className="py-8 text-center text-muted-foreground">No transactions in this view</p>}
         {visible.map(({ e, bal }) => {
           const flow = ENTRY_TYPES[e.type].flow;
           return <div key={e.id} className={cn("rounded-lg border border-l-[5px] bg-card p-4 shadow-sm", flow === "in" ? "border-l-success" : flow === "out" ? "border-l-destructive" : "border-l-ledger")}>
             <div className="flex min-w-0 items-start justify-between gap-3">
               <div className="min-w-0"><div className="font-semibold">{isWorker ? ENTRY_TYPES[e.type].label : flow === "in" ? "Received" : flow === "out" ? "Issued" : ENTRY_TYPES[e.type].label}</div><div className="text-xs text-muted-foreground">{fmtDate(e.date)} · {fmtTime(e.createdAt)} · {e.method ? METHODS[e.method] : `V-${e.voucherNo}`}</div></div>
               <div className={cn("num shrink-0 text-right text-sm font-semibold sm:text-lg", flow === "in" ? "text-success" : flow === "out" ? "text-destructive" : "text-foreground")}>{flow === "in" ? "+ " : flow === "out" ? "− " : ""}{fmtPKR(e.amount)}</div>
             </div>
             {e.particulars && <p className="mt-2 text-sm text-muted-foreground">{e.particulars}</p>}
             <div className="mt-3 flex items-center justify-between border-t pt-2"><span className="num text-xs text-muted-foreground">V-{e.voucherNo} · Balance {balText(bal)}</span><div className="flex gap-1"><Button variant="ghost" size="icon" title="Edit · PIN required" aria-label={`Edit voucher V-${e.voucherNo}`} onClick={() => setPending({ entry: e, action: "edit" })}><Pencil /></Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete · PIN required" aria-label={`Delete voucher V-${e.voucherNo}`} onClick={() => setPending({ entry: e, action: "delete" })}><Trash2 /></Button></div></div>
           </div>;
         })}
       </div>
       <div className="print-only statement-print overflow-x-auto rounded-lg border bg-card print-area">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Voucher</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Particulars</th>
              <th className="px-3 py-2.5">Method</th>
              <th className="px-3 py-2.5 text-right">Debit</th>
              <th className="px-3 py-2.5 text-right">Credit</th>
              <th className="px-3 py-2.5 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t bg-surface/50 font-medium">
              <td colSpan={7} className="px-3 py-2">Opening Balance</td>
              <td className="num px-3 py-2 text-right">{balText(opening)}</td>
            </tr>
            {rows.map(({ e, debit, credit, bal }) => (
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(e.date)}</td>
                <td className="num px-3 py-2"><Link to="/voucher/$id" params={{ id: e.id }} className="hover:text-primary">V-{e.voucherNo}</Link></td>
                <td className="px-3 py-2"><TypeBadge type={e.type} /></td>
                <td className="px-3 py-2">{e.particulars}{e.chequeNo && <span className="text-xs text-muted-foreground"> · Chq #{e.chequeNo}</span>}</td>
                <td className="px-3 py-2 text-xs">{e.method ? METHODS[e.method] : "—"}</td>
                <td className="num px-3 py-2 text-right">{debit ? debit.toLocaleString("en-IN") : ""}</td>
                <td className="num px-3 py-2 text-right">{credit ? credit.toLocaleString("en-IN") : ""}</td>
                <td className="num px-3 py-2 text-right font-medium">{balText(bal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-surface font-semibold">
              <td colSpan={5} className="px-3 py-2">Closing Balance</td>
              <td className="num px-3 py-2 text-right">{dr.toLocaleString("en-IN")}</td>
              <td className="num px-3 py-2 text-right">{cr.toLocaleString("en-IN")}</td>
              <td className="num px-3 py-2 text-right">{balText(closing)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="print-only mt-16 flex justify-between text-xs">
        <span className="border-t px-8 pt-1">Prepared By</span>
        <span className="border-t px-8 pt-1">Authorized Signature</span>
      </div>
       <PinActionDialog action={pending?.action ?? null} onClose={() => setPending(null)} onVerified={(action) => {
         if (!pending) return;
         if (action === "edit") setEditing(pending.entry);
         else if (confirm(`Delete voucher V-${pending.entry.voucherNo}? You can restore it from the Recycle Bin.`)) { deleteItems("entry", [pending.entry.id]); toast.success("Moved to Recycle Bin"); }
         setPending(null);
       }} />
       <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Edit Voucher V-{editing?.voucherNo}</DialogTitle></DialogHeader>{editing && <EntryForm key={editing.id} initial={editing} onSaved={() => setEditing(null)} />}</DialogContent></Dialog>
       <Dialog open={adding} onOpenChange={setAdding}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>New Entry · {a.name} ({a.code})</DialogTitle></DialogHeader>{adding && <EntryForm defaultType={choices[0] ?? "inward"} typeChoices={choices} defaultAccountId={a.id} onSaved={() => setAdding(false)} />}</DialogContent></Dialog>
    </div>
  );
}
