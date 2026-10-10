import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Factory, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect, PageHeader } from "@/components/app/inputs";
import { addProduction, deleteProduction, liveProduction, stockSummary, useData } from "@/lib/db";
import { fmtDate, fmtTon, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stock")({
  head: () => ({
    meta: [
      { title: "Stock — Mussa Enterprises Cash Book" },
      { name: "description", content: "Material stock in tons from purchases, sales and billet production." },
      { property: "og:title", content: "Stock — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "Material stock in tons from purchases, sales and billet production." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StockPage,
});

const num = (v: string) => Number(v.replace(/,/g, "")) || 0;

function StockPage() {
  const d = useData();
  const rows = useMemo(() => stockSummary(d), [d]);
  const runs = useMemo(() => liveProduction(d).sort((a, b) => b.date.localeCompare(a.date)), [d]);
  const [date, setDate] = useState(todayISO());
  const [from, setFrom] = useState(d.materials.find((m) => m.name === "Scrap")?.id ?? "");
  const [to, setTo] = useState(d.materials.find((m) => m.name === "Billet")?.id ?? "");
  const [bars, setBars] = useState("");
  const [barKg, setBarKg] = useState("");
  const [note, setNote] = useState("");
  const total = num(bars) * num(barKg);
  const name = (id: string) => d.materials.find((m) => m.id === id)?.name ?? "—";

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to || from === to) { toast.error("Select different 'used' and 'made' materials"); return; }
    if (total <= 0) { toast.error("Enter number of bars and approx weight per bar"); return; }
    addProduction({ date, fromMaterialId: from, toMaterialId: to, bars: num(bars), barWeightKg: num(barKg), totalKg: total, note: note.trim() });
    toast.success(`${name(to)} +${fmtTon(total)} · ${name(from)} −${fmtTon(total)}`);
    setBars(""); setBarKg(""); setNote("");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Stock" subtitle="Updated automatically from purchases, sales and production" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {rows.map((r) => (
          <div key={r.id} className="glass rounded-xl border-2 p-4 shadow-sm">
            <div className="text-lg font-bold">{r.name}</div>
            <div className={cn("num text-2xl font-semibold", r.stock < 0 && "text-destructive")}>{fmtTon(r.stock)}</div>
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <div>Purchased {fmtTon(r.purchased)}</div>
              <div>Sold {fmtTon(r.sold)}</div>
              {r.produced > 0 && <div>Produced {fmtTon(r.produced)}</div>}
              {r.consumed > 0 && <div>Used {fmtTon(r.consumed)}</div>}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={save} className="space-y-4 rounded-xl border-2 bg-card p-4">
        <div className="flex items-center gap-2 text-lg font-bold"><Factory className="h-5 w-5" /> New Production (e.g. Billet)</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Material used">
            <NativeSelect value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="">Select…</option>
              {d.materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Material made">
            <NativeSelect value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Select…</option>
              {d.materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Number of bars"><Input inputMode="numeric" className="num text-right" value={bars} onChange={(e) => setBars(e.target.value.replace(/[^0-9]/g, ""))} placeholder="e.g. 40" /></Field>
          <Field label="Approx weight per bar (kg)"><Input inputMode="decimal" className="num text-right" value={barKg} onChange={(e) => setBarKg(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 100" /></Field>
          <Field label="Total weight"><div className="num flex h-9 items-center justify-end rounded-md border bg-secondary px-3 text-sm font-semibold">{fmtTon(total)}</div></Field>
          <Field label="Note" className="sm:col-span-2 lg:col-span-3"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></Field>
        </div>
        <div className="flex justify-end"><Button type="submit">Save Production</Button></div>
      </form>

      <div className="rounded-xl border-2 bg-card">
        <div className="border-b p-4 font-bold">Production History</div>
        {runs.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No production recorded yet</p> : (
          <div className="divide-y">
            {runs.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{name(p.fromMaterialId)} → {name(p.toMaterialId)} · <span className="num">{fmtTon(p.totalKg)}</span></div>
                  <div className="text-xs text-muted-foreground">{fmtDate(p.date)} · {p.bars} bars × {p.barWeightKg} kg{p.note ? ` · ${p.note}` : ""}</div>
                </div>
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => { if (confirm("Delete this production entry?")) deleteProduction(p.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
