import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, PageHeader } from "@/components/app/inputs";
import { addBill, deleteBill, effectiveRate, liveBills, useData } from "@/lib/db";
import { fmtPKR } from "@/lib/format";

export const Route = createFileRoute("/electricity")({
  head: () => ({
    meta: [
      { title: "Electricity — Mussa Enterprises Cash Book" },
      { name: "description", content: "Monthly electricity bills and the effective unit rate used for heat costing." },
      { property: "og:title", content: "Electricity — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "Monthly electricity bills and the effective unit rate used for heat costing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ElectricityPage,
});

const num = (v: string) => Number(v.replace(/,/g, "")) || 0;

function ElectricityPage() {
  const d = useData();
  const bills = useMemo(() => [...liveBills(d)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [d]);
  const rate = effectiveRate(d);
  const latest = bills[0];
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("");
  const [amount, setAmount] = useState("");
  const [units, setUnits] = useState("");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!period.trim()) { toast.error("Enter the bill period, e.g. Oct 2026"); return; }
    if (num(amount) <= 0 || num(units) <= 0) { toast.error("Enter bill amount and billed units"); return; }
    addBill({ period: period.trim(), amount: num(amount), units: num(units) });
    toast.success("Bill saved — heats now use its effective rate");
    setPeriod(""); setAmount(""); setUnits(""); setOpen(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Electricity"
        subtitle="Enter the monthly bill; its effective rate prices production heats"
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add monthly bill</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold">Current bill period</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Latest entered monthly bill</p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground">All-in rate</span>
          </div>
          {latest ? (
            <div className="rounded-lg border bg-surface p-4 text-sm leading-8">
              <div className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4 text-metric-receivable" /> {latest.period}</div>
              <div>Bill amount: <strong className="num">{fmtPKR(latest.amount)}</strong></div>
              <div>Billed units: <strong className="num">{latest.units.toLocaleString()}</strong></div>
              <div>Effective rate: <strong className="num">Rs {rate.toLocaleString("en-IN", { maximumFractionDigits: 2 })} / unit</strong></div>
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">No bill entered yet — add one so heat energy costs can be calculated.</p>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">How allocation works</h2>
          <p className="text-xs leading-6 text-muted-foreground">
            Effective unit rate = total bill amount ÷ billed units. Each heat’s electricity cost = heat units × effective rate.
            The newest bill’s rate applies to heats recorded after it. Bill payments themselves are recorded as expenses under the LESCO Bill category.
          </p>
        </section>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Monthly bills</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Bill amount and billed units used for heat costing</p>
        </div>
        {bills.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No bills yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className="bg-surface text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="rounded-l-lg px-3 py-2.5 font-semibold">Period</th>
                  <th className="px-3 py-2.5 font-semibold">Bill amount</th>
                  <th className="px-3 py-2.5 font-semibold">Billed units</th>
                  <th className="px-3 py-2.5 font-semibold">Effective rate / unit</th>
                  <th className="rounded-r-lg px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="px-3 py-2.5 font-medium">{b.period}</td>
                    <td className="num px-3 py-2.5">{fmtPKR(b.amount)}</td>
                    <td className="num px-3 py-2.5">{b.units.toLocaleString()}</td>
                    <td className="num px-3 py-2.5">Rs {(b.amount / b.units).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2.5"><Button variant="ghost" size="icon" aria-label="Delete" onClick={() => { if (confirm("Delete this bill?")) deleteBill(b.id); }}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add monthly bill</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <Field label="Period"><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. Oct 2026" /></Field>
            <Field label="Bill amount (Rs)"><Input inputMode="decimal" className="num text-right" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="e.g. 2784000" /></Field>
            <Field label="Billed units (kWh)"><Input inputMode="decimal" className="num text-right" value={units} onChange={(e) => setUnits(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="e.g. 12400" /></Field>
            {num(amount) > 0 && num(units) > 0 && (
              <p className="text-xs text-muted-foreground">Effective rate: <strong className="num">Rs {(num(amount) / num(units)).toLocaleString("en-IN", { maximumFractionDigits: 2 })} / unit</strong></p>
            )}
            <div className="flex justify-end"><Button type="submit">Save bill</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
