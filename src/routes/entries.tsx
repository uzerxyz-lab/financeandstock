import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntriesTable } from "@/components/app/EntriesTable";
import { Field, NativeSelect, PageHeader, PrintHeader } from "@/components/app/inputs";
import { liveEntries, useData, ENTRY_TYPES, METHODS, type Data, type Entry } from "@/lib/db";
import { downloadFile, fmtDate, norm, toCSV } from "@/lib/format";

export const Route = createFileRoute("/entries")({
  head: () => ({
    meta: [
      { title: "All Entries — Mussa Enterprises Cash Book" },
      { name: "description", content: "Search and filter every voucher by type, method, category and date." },
      { property: "og:title", content: "All Entries — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "Search and filter every voucher by type, method, category and date." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EntriesPage,
});

export interface EntryFilters { q: string; type: string; method: string; category: string; from: string; to: string }
export const emptyFilters: EntryFilters = { q: "", type: "", method: "", category: "", from: "", to: "" };

export function filterEntries(d: Data, list: Entry[], f: EntryFilters) {
  const n = norm(f.q);
  return list.filter((e) => {
    if (f.type && e.type !== f.type) return false;
    if (f.method && e.method !== f.method) return false;
    if (f.category && e.categoryId !== f.category) return false;
    if (f.from && e.date < f.from) return false;
    if (f.to && e.date > f.to) return false;
    if (n) {
      const a = d.accounts.find((x) => x.id === e.accountId);
      const cat = d.categories.find((x) => x.id === e.categoryId)?.name ?? "";
      const hay = norm([a?.name, a?.code, e.particulars, `v${e.voucherNo}`, e.chequeNo, e.reference, e.bank, cat, String(e.amount)].join(" "));
      if (!hay.includes(n)) return false;
    }
    return true;
  });
}

export function FilterBar({ f, setF }: { f: EntryFilters; setF: (f: EntryFilters) => void }) {
  const d = useData();
  const set = (k: keyof EntryFilters) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="no-print mb-4 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3 lg:grid-cols-6">
      <Field label="Search" className="sm:col-span-3 lg:col-span-2">
        <Input value={f.q} onChange={set("q")} placeholder="Name, ID, voucher, cheque, particulars…" />
      </Field>
      <Field label="Type">
        <NativeSelect value={f.type} onChange={set("type")}>
          <option value="">All</option>
          {Object.entries(ENTRY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </NativeSelect>
      </Field>
      <Field label="Method">
        <NativeSelect value={f.method} onChange={set("method")}>
          <option value="">All</option>
          {Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </NativeSelect>
      </Field>
      <Field label="Category">
        <NativeSelect value={f.category} onChange={set("category")}>
          <option value="">All</option>
          {d.categories.filter((c) => c.selectable !== false).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-2 gap-2 sm:col-span-3 lg:col-span-6 lg:max-w-md">
        <Field label="From"><Input type="date" value={f.from} onChange={set("from")} /></Field>
        <Field label="To"><Input type="date" value={f.to} onChange={set("to")} /></Field>
      </div>
    </div>
  );
}

export function exportEntriesCSV(d: Data, list: Entry[], name: string) {
  const rows: (string | number)[][] = [["Voucher", "Date", "Type", "Account", "Short ID", "Category", "Particulars", "Method", "Cheque No", "Bank", "Amount"]];
  list.forEach((e) => {
    const a = d.accounts.find((x) => x.id === e.accountId);
    rows.push([`V-${e.voucherNo}`, fmtDate(e.date), ENTRY_TYPES[e.type].label, a?.name ?? "", a?.code ?? "", d.categories.find((c) => c.id === e.categoryId)?.name ?? "", e.particulars, e.method ? METHODS[e.method] : "", e.chequeNo ?? "", e.bank ?? "", e.amount]);
  });
  downloadFile(name, toCSV(rows));
}

function EntriesPage() {
  const d = useData();
  const [f, setF] = useState(emptyFilters);
  const list = useMemo(() => filterEntries(d, liveEntries(d), f).sort((a, b) => b.date.localeCompare(a.date) || b.voucherNo - a.voucherNo), [d, f]);
  return (
    <div>
      <PageHeader
        title="All Entries"
        subtitle={`${list.length} vouchers`}
        actions={<>
          <Button variant="outline" onClick={() => exportEntriesCSV(d, list, "entries.csv")}><Download /> Excel</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer /> Print / PDF</Button>
        </>}
      />
      <PrintHeader title="Entries Report" sub={f.from || f.to ? `${fmtDate(f.from) || "Start"} to ${fmtDate(f.to) || "Today"}` : "All dates"} />
      <FilterBar f={f} setF={setF} />
      <EntriesTable entries={list} emptyText="No entries match these filters" />
    </div>
  );
}
