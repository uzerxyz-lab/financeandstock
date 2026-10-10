import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/inputs";
import { liveEntries, useData, ENTRY_TYPES, type EntryType } from "@/lib/db";
import { fmtDate, fmtPKR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vouchers")({
  head: () => ({
    meta: [
      { title: "Vouchers — Mussa Enterprises Cash Book" },
      { name: "description", content: "All sale, purchase, receipt and payment vouchers in one list." },
      { property: "og:title", content: "Vouchers — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "All sale, purchase, receipt and payment vouchers in one list." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Vouchers,
});

const FILTERS: { key: "all" | EntryType; label: string }[] = [
  { key: "all", label: "All" }, { key: "sale", label: "Sales" }, { key: "purchase", label: "Purchases" },
  { key: "inward", label: "Received" }, { key: "outward", label: "Issued" },
];
const TYPES: EntryType[] = ["sale", "purchase", "inward", "outward"];

function Vouchers() {
  const d = useData();
  const [f, setF] = useState<"all" | EntryType>("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => liveEntries(d).filter((e) => TYPES.includes(e.type)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [d]);
  const shown = list.filter((e) => (f === "all" || e.type === f) && (!q || `V-${e.voucherNo} ${e.particulars} ${d.accounts.find((a) => a.id === e.accountId)?.name ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <PageHeader title="Vouchers" subtitle={`${list.length} vouchers`} />
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((x) => <Button key={x.key} size="sm" className="shrink-0 rounded-full" variant={f === x.key ? "default" : "outline"} onClick={() => setF(x.key)}>{x.label}</Button>)}
      </div>
      <Input className="mb-4" placeholder="Search voucher no., party or details…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="space-y-2">
        {shown.length === 0 && <p className="py-10 text-center text-muted-foreground">No vouchers</p>}
        {shown.map((e) => {
          const flow = ENTRY_TYPES[e.type].flow;
          const party = d.accounts.find((a) => a.id === e.accountId)?.name;
          return (
            <Link key={e.id} to="/voucher/$id" params={{ id: e.id }} className={cn("flex items-center justify-between gap-3 rounded-lg border border-l-[5px] bg-card p-3 shadow-sm", flow === "in" ? "border-l-success" : flow === "out" ? "border-l-destructive" : "border-l-primary")}>
              <div className="min-w-0">
                <div className="truncate font-semibold">{party ?? ENTRY_TYPES[e.type].label}</div>
                <div className="truncate text-xs text-muted-foreground">V-{e.voucherNo} · {e.type === "inward" ? "Received" : e.type === "outward" ? "Issued" : ENTRY_TYPES[e.type].label} · {fmtDate(e.date)}</div>
              </div>
              <div className={cn("num shrink-0 text-sm font-semibold", flow === "in" && "text-success", flow === "out" && "text-destructive")}>{fmtPKR(e.amount)}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
