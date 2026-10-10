import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EntryForm } from "./EntryForm";
import { EntriesTable } from "./EntriesTable";
import { PageHeader } from "./inputs";
import { ENTRY_TYPES, liveEntries, useData, type EntryType } from "@/lib/db";
import { fmtPKR } from "@/lib/format";

export function BusinessEntries({ type, title, accountType }: { type: EntryType; title: string; accountType?: string }) {
  const d = useData();
  const [open, setOpen] = useState(false);
  const list = useMemo(() => liveEntries(d).filter((entry) => entry.type === type && (!accountType || d.accounts.find((account) => account.id === entry.accountId)?.type === accountType)).sort((a, b) => b.date.localeCompare(a.date) || b.voucherNo - a.voucherNo), [d, type, accountType]);
  const total = list.reduce((sum, entry) => sum + entry.amount, 0);
  return <div>
    <PageHeader title={title} subtitle={`${list.length} records · ${fmtPKR(total)}`} actions={<Button onClick={() => setOpen(true)}><Plus /> New {ENTRY_TYPES[type].label}</Button>} />
    <EntriesTable entries={list} emptyText={`No ${title.toLowerCase()} recorded yet`} />
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>New {ENTRY_TYPES[type].label}</DialogTitle></DialogHeader><EntryForm defaultType={type} onSaved={() => setOpen(false)} /></DialogContent></Dialog>
  </div>;
}