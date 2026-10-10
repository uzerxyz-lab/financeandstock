import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntriesTable } from "@/components/app/EntriesTable";
import { PageHeader, PrintHeader } from "@/components/app/inputs";
import { addNamed, liveEntries, removeNamed, renameNamed, useData, type Named } from "@/lib/db";
import { fmtPKR, titleCase } from "@/lib/format";
import { FilterBar, emptyFilters, exportEntriesCSV, filterEntries } from "./entries";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Mussa Enterprises Cash Book" },
      { name: "description", content: "Miscellaneous expenses by searchable custom category." },
      { property: "og:title", content: "Expenses — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "Miscellaneous expenses by searchable custom category." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExpensesPage,
});

function NamedList({ title, items }: { title: string; items: Named[] }) {
  const [name, setName] = useState("");
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { addNamed("categories", name.trim()); setName(""); } }}>
        <Input list="expense-categories" value={name} onChange={(e) => setName(titleCase(e.target.value))} placeholder="Search or add category…" />
        <datalist id="expense-categories">{items.map((item) => <option key={item.id} value={item.name} />)}</datalist>
        <Button type="submit" size="icon"><Plus /></Button>
      </form>
      <ul className="max-h-64 divide-y overflow-auto text-sm">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-1.5">
            {c.name}
            <span className="flex gap-1">
              <button className="p-1 text-muted-foreground hover:text-primary" onClick={() => { const n = prompt("Rename", c.name); if (n?.trim()) renameNamed("categories", c.id, titleCase(n.trim())); }}><Pencil className="h-3.5 w-3.5" /></button>
              <button className="p-1 text-muted-foreground hover:text-destructive" onClick={() => confirm(`Remove "${c.name}"?`) && removeNamed("categories", c.id)}><Trash2 className="h-3.5 w-3.5" /></button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExpensesPage() {
  const d = useData();
  const [f, setF] = useState(emptyFilters);
  const list = useMemo(() => filterEntries(d, liveEntries(d).filter((e) => e.type === "expense"), f).sort((a, b) => b.date.localeCompare(a.date)), [d, f]);
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    list.forEach((e) => {
      const k = d.categories.find((c) => c.id === e.categoryId)?.name ?? "Uncategorised";
      m.set(k, (m.get(k) ?? 0) + e.amount);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [d, list]);
  const total = list.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" subtitle={`Total ${fmtPKR(total)}`} actions={<>
        <Button variant="outline" onClick={() => exportEntriesCSV(d, list, "expenses.csv")}><Download /> Excel</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer /> Print / PDF</Button>
      </>} />
      <PrintHeader title="Expense Report" />
      <div className="no-print grid gap-4 md:grid-cols-2">
        <NamedList title="Categories" items={d.categories.filter((c) => c.selectable !== false)} />
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h3>
          <ul className="max-h-72 divide-y overflow-auto text-sm">
            {byCat.length === 0 && <li className="py-4 text-center text-muted-foreground">No expenses</li>}
            {byCat.map(([k, v]) => <li key={k} className="flex justify-between py-1.5"><span>{k}</span><span className="num font-medium">{fmtPKR(v, false)}</span></li>)}
          </ul>
        </div>
      </div>
      <FilterBar f={f} setF={setF} />
      <EntriesTable entries={list} emptyText="No expenses match these filters" />
    </div>
  );
}
