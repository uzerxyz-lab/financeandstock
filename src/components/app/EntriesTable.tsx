import { Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Amount } from "./inputs";
import { ENTRY_TYPES, METHODS, useData, type Entry } from "@/lib/db";
import { fmtDate, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TypeBadge({ type }: { type: Entry["type"] }) {
  const f = ENTRY_TYPES[type].flow;
  return (
    <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-medium", f === "in" ? "bg-success-soft text-success" : f === "out" ? "bg-danger-soft text-destructive" : "bg-accent text-accent-foreground")}>
      {ENTRY_TYPES[type].label}
    </span>
  );
}

export function EntriesTable({
  entries,
  selectable,
  selected,
  onToggle,
  onToggleAll,
  onRowClick,
  emptyText = "No entries yet",
}: {
  entries: Entry[];
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: () => void;
  onRowClick?: (e: Entry) => void;
  emptyText?: string;
}) {
  const d = useData();
  const acc = (id?: string) => d.accounts.find((a) => a.id === id);
  const named = (list: { id: string; name: string }[], id?: string) => list.find((x) => x.id === id)?.name;
  const total = entries.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="overflow-x-auto rounded-lg border bg-card print-area">
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {selectable && (
              <th className="w-10 px-3 py-2.5">
                <Checkbox checked={entries.length > 0 && entries.every((e) => selected?.has(e.id))} onCheckedChange={() => onToggleAll?.()} />
              </th>
            )}
            <th className="px-3 py-2.5">Voucher</th>
            <th className="px-3 py-2.5">Date</th>
            <th className="px-3 py-2.5">Type</th>
            <th className="px-3 py-2.5">Account / Category</th>
            <th className="px-3 py-2.5">Particulars</th>
            <th className="px-3 py-2.5">Method</th>
            <th className="px-3 py-2.5 text-right">Amount (Rs)</th>
            <th className="no-print w-8" />
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">{emptyText}</td></tr>
          )}
          {entries.map((e) => {
            const a = acc(e.accountId);
            return (
              <tr key={e.id} onClick={() => onRowClick?.(e)} className={cn("border-t transition-colors hover:bg-surface", onRowClick && "cursor-pointer", selected?.has(e.id) && "bg-accent")}>
                {selectable && (
                  <td className="px-3 py-2" onClick={(ev) => ev.stopPropagation()}>
                    <Checkbox checked={!!selected?.has(e.id)} onCheckedChange={() => onToggle?.(e.id)} />
                  </td>
                )}
                <td className="num px-3 py-2 text-muted-foreground">V-{e.voucherNo}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div>{fmtDate(e.date)}</div>
                  <div className="text-xs text-muted-foreground">{fmtTime(e.createdAt)}</div>
                </td>
                <td className="px-3 py-2"><TypeBadge type={e.type} /></td>
                <td className="px-3 py-2">
                  {a ? (
                    <Link to="/ledger/$id" params={{ id: a.id }} onClick={(ev) => ev.stopPropagation()} className="font-medium hover:text-primary hover:underline">
                      {a.name} <span className="num text-xs text-muted-foreground">{a.code}</span>
                    </Link>
                  ) : (
                    <span className="font-medium">{named(d.categories, e.categoryId) ?? "—"}</span>
                  )}
                </td>
                <td className="max-w-xs truncate px-3 py-2 text-muted-foreground">{e.particulars}</td>
                <td className="px-3 py-2 text-xs">
                  {e.method ? METHODS[e.method] : "—"}
                  {e.chequeNo && <div className="num text-muted-foreground">#{e.chequeNo} · <span className={cn(e.chequeStatus === "bounced" && "text-destructive", e.chequeStatus === "cleared" && "text-success")}>{e.chequeStatus}</span></div>}
                </td>
                <td className="px-3 py-2 text-right font-medium"><Amount value={e.amount} flow={ENTRY_TYPES[e.type].flow} /></td>
                <td className="no-print px-2" onClick={(ev) => ev.stopPropagation()}>
                  <Link to="/voucher/$id" params={{ id: e.id }} title="Print voucher" className="text-muted-foreground hover:text-primary"><Printer className="h-4 w-4" /></Link>
                </td>
              </tr>
            );
          })}
        </tbody>
        {entries.length > 1 && (
          <tfoot>
            <tr className="border-t bg-surface font-semibold">
              <td colSpan={selectable ? 7 : 6} className="px-3 py-2 text-right text-xs uppercase text-muted-foreground">{entries.length} entries · Total</td>
              <td className="num px-3 py-2 text-right">{total.toLocaleString("en-IN")}</td>
              <td className="no-print" />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
