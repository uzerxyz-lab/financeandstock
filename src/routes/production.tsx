import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Flame, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, NativeSelect, PageHeader } from "@/components/app/inputs";
import { addProduction, deleteProduction, effectiveRate, liveProduction, materialAvgCost, useData } from "@/lib/db";
import { fmtDate, fmtPKR, fmtTon, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/production")({
  head: () => ({
    meta: [
      { title: "Heat Production — Mussa Enterprises Cash Book" },
      { name: "description", content: "Record production heats: sampled billet weight, slag, energy and cost per kg." },
      { property: "og:title", content: "Heat Production — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "Record production heats: sampled billet weight, slag, energy and cost per kg." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductionPage,
});

const num = (v: string) => Number(v.replace(/,/g, "")) || 0;

function ProductionPage() {
  const d = useData();
  const runs = useMemo(() => liveProduction(d).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [d]);
  const [open, setOpen] = useState(false);
  const name = (id: string) => d.materials.find((m) => m.id === id)?.name ?? "—";

  const month = todayISO().slice(0, 7);
  const monthRuns = runs.filter((p) => p.date.startsWith(month));
  const monthOut = monthRuns.reduce((s, p) => s + p.totalKg, 0);
  const costed = monthRuns.filter((p) => p.costPerKg);
  const avgCost = costed.length ? costed.reduce((s, p) => s + p.costPerKg!, 0) / costed.length : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Heat production"
        subtitle="Estimate total material kg per heat; billets from 4 samples × bar count"
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Record heat</Button>}
      />

      <div className="rounded-xl border bg-metric-bank-soft/60 p-4 text-xs leading-relaxed text-muted-foreground">
        No piece-by-piece weighing: enter one estimated total per heat. Billet output = average of 4 sample bars × total bar count. Slag and other waste are recorded separately as non-saleable waste.
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm"><div className="text-xs font-semibold text-muted-foreground">Heats this month</div><div className="num mt-2 text-xl font-semibold">{monthRuns.length}</div></div>
        <div className="rounded-xl border bg-card p-4 shadow-sm"><div className="text-xs font-semibold text-muted-foreground">Billet output</div><div className="num mt-2 truncate text-xl font-semibold">{fmtTon(monthOut)}</div></div>
        <div className="rounded-xl border bg-card p-4 shadow-sm"><div className="text-xs font-semibold text-muted-foreground">Avg cost / kg</div><div className="num mt-2 truncate text-xl font-semibold">{avgCost ? `Rs ${avgCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}</div></div>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Production register</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Estimated charge, sampled billet weight and calculated unit cost</p>
        </div>
        {runs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No heats recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className="bg-surface text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  {["Date", "Heat", "Input est.", "Bars × avg kg", "Billet output", "Slag", "Waste", "Energy", "Heat cost", "Cost/kg", "Variance", ""].map((h, i) => (
                    <th key={h || i} className={cn("px-3 py-2.5 font-semibold", i === 0 && "rounded-l-lg", i === 11 && "rounded-r-lg")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(p.date)}</td>
                    <td className="px-3 py-2.5 font-medium">{name(p.fromMaterialId)} → {name(p.toMaterialId)}{p.shift ? ` · ${p.shift}` : ""}</td>
                    <td className="num px-3 py-2.5">{fmtTon(p.inputKg ?? p.totalKg)}</td>
                    <td className="num px-3 py-2.5">{p.bars} × {p.barWeightKg}</td>
                    <td className="num px-3 py-2.5 font-semibold">{fmtTon(p.totalKg)}</td>
                    <td className="num px-3 py-2.5">{p.slagKg ? fmtTon(p.slagKg) : "—"}</td>
                    <td className="num px-3 py-2.5">{p.wasteKg ? fmtTon(p.wasteKg) : "—"}</td>
                    <td className="num px-3 py-2.5">{p.kwh ? `${p.kwh.toLocaleString()} kWh` : "—"}</td>
                    <td className="num px-3 py-2.5">{p.cost ? fmtPKR(p.cost) : "—"}</td>
                    <td className="num px-3 py-2.5">{p.costPerKg ? `Rs ${p.costPerKg.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}</td>
                    <td className={cn("num px-3 py-2.5", (p.varianceKg ?? 0) < 0 && "text-destructive")}>{p.varianceKg !== undefined ? fmtTon(p.varianceKg) : "—"}</td>
                    <td className="px-3 py-2.5">
                      <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => { if (confirm("Delete this heat?")) deleteProduction(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-metric-bank" /> Record heat</DialogTitle></DialogHeader>
          {open && <HeatForm onSaved={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HeatForm({ onSaved }: { onSaved: () => void }) {
  const d = useData();
  const [date, setDate] = useState(todayISO());
  const [shift, setShift] = useState("Day");
  const [from, setFrom] = useState(d.materials.find((m) => m.name === "Scrap")?.id ?? "");
  const [to, setTo] = useState(d.materials.find((m) => m.name === "Billet")?.id ?? "");
  const [inputKg, setInputKg] = useState("");
  const [samples, setSamples] = useState(["", "", "", ""]);
  const [bars, setBars] = useState("");
  const [slag, setSlag] = useState("");
  const [waste, setWaste] = useState("");
  const [kwh, setKwh] = useState("");
  const [direct, setDirect] = useState("");
  const [note, setNote] = useState("");

  const sampleVals = samples.map(num).filter((v) => v > 0);
  const avgBar = sampleVals.length ? sampleVals.reduce((s, v) => s + v, 0) / sampleVals.length : 0;
  const billetOut = avgBar * num(bars);
  const variance = num(inputKg) - (billetOut + num(slag) + num(waste));
  const matCost = num(inputKg) * (from ? materialAvgCost(d, from) : 0);
  const rate = effectiveRate(d);
  const energyCost = num(kwh) * rate;
  const totalCost = matCost + energyCost + num(direct);
  const costPerKg = billetOut > 0 ? totalCost / billetOut : 0;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to || from === to) { toast.error("Select different 'used' and 'made' materials"); return; }
    if (num(inputKg) <= 0) { toast.error("Enter the estimated input weight"); return; }
    if (billetOut <= 0) { toast.error("Enter sample weights and bar count"); return; }
    addProduction({
      date, fromMaterialId: from, toMaterialId: to, bars: num(bars), barWeightKg: Math.round(avgBar * 100) / 100,
      totalKg: Math.round(billetOut * 100) / 100, note: note.trim(),
      shift, samples: sampleVals, inputKg: num(inputKg), slagKg: num(slag) || undefined, wasteKg: num(waste) || undefined,
      kwh: num(kwh) || undefined, directCost: num(direct) || undefined,
      cost: totalCost > 0 ? Math.round(totalCost) : undefined,
      costPerKg: costPerKg > 0 ? Math.round(costPerKg * 100) / 100 : undefined,
      varianceKg: Math.round(variance * 100) / 100,
    });
    toast.success(`Heat saved · billet ${fmtTon(billetOut)} @ Rs ${costPerKg.toLocaleString("en-IN", { maximumFractionDigits: 2 })}/kg`);
    onSaved();
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Shift">
          <NativeSelect value={shift} onChange={(e) => setShift(e.target.value)}>
            <option>Day</option><option>Night</option>
          </NativeSelect>
        </Field>
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
        <Field label="Estimated input (kg)"><Input inputMode="decimal" className="num text-right" value={inputKg} onChange={(e) => setInputKg(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="e.g. 4600" /></Field>
        <Field label="Bar count"><Input inputMode="numeric" className="num text-right" value={bars} onChange={(e) => setBars(e.target.value.replace(/[^0-9]/g, ""))} placeholder="e.g. 200" /></Field>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sample bar weights (kg) — up to 4</div>
        <div className="grid grid-cols-4 gap-2">
          {samples.map((s, i) => (
            <Input key={i} inputMode="decimal" className="num text-right" value={s} placeholder={`S${i + 1}`}
              onChange={(e) => setSamples((prev) => prev.map((x, j) => (j === i ? e.target.value.replace(/[^0-9.]/g, "") : x)))} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Slag (kg)"><Input inputMode="decimal" className="num text-right" value={slag} onChange={(e) => setSlag(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="0" /></Field>
        <Field label="Other waste (kg)"><Input inputMode="decimal" className="num text-right" value={waste} onChange={(e) => setWaste(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="0" /></Field>
        <Field label="Energy units (kWh)"><Input inputMode="decimal" className="num text-right" value={kwh} onChange={(e) => setKwh(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="e.g. 610" /></Field>
        <Field label="Direct cost (Rs)"><Input inputMode="decimal" className="num text-right" value={direct} onChange={(e) => setDirect(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="0" /></Field>
      </div>

      <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></Field>

      <div className="rounded-lg border bg-surface p-4 text-xs leading-7">
        <div>Average bar weight: <strong className="num">{avgBar ? `${avgBar.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg` : "—"}</strong> · Billet output: <strong className="num">{billetOut ? fmtTon(billetOut) : "—"}</strong> · Variance: <strong className={cn("num", variance < 0 && "text-destructive")}>{num(inputKg) ? fmtTon(variance) : "—"}</strong></div>
        <div>Material cost: <strong className="num">{matCost ? fmtPKR(matCost) : "—"}</strong> · Energy ({rate ? `Rs ${rate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}/unit` : "no bill rate"}): <strong className="num">{energyCost ? fmtPKR(energyCost) : "—"}</strong> · Total heat cost: <strong className="num">{totalCost ? fmtPKR(totalCost) : "—"}</strong> · Cost/kg: <strong className="num">{costPerKg ? `Rs ${costPerKg.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}</strong></div>
      </div>

      <div className="flex justify-end"><Button type="submit">Save heat</Button></div>
    </form>
  );
}
