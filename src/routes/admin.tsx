import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Lock, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EntriesTable } from "@/components/app/EntriesTable";
import { EntryForm } from "@/components/app/EntryForm";
import { AccountForm } from "@/components/app/AccountForm";
import { PageHeader } from "@/components/app/inputs";
import { accountTypeLabel, checkPw, deleteItems, exportJSON, liveAccounts, liveEntries, resetAllData, restoreLog, useData, type Account, type Entry } from "@/lib/db";
import { fmtDateTime, norm } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Mussa Enterprises Cash Book" },
      { name: "description", content: "Edit or delete accounts and entries, with a recycle bin to restore anything." },
      { property: "og:title", content: "Admin Panel — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "Edit or delete accounts and entries, with a recycle bin to restore anything." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});



function useSel() {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const all = (ids: string[]) => setSel((s) => (ids.every((i) => s.has(i)) ? new Set() : new Set(ids)));
  return { sel, toggle, all, clear: () => setSel(new Set()) };
}

function Admin() {
  const [ok, setOk] = useState(false);
  const [pw, setPw] = useState("");
  if (!ok)
    return (
      <form
        className="mx-auto mt-16 max-w-sm space-y-4 rounded-xl border bg-card p-8"
        onSubmit={async (e) => { e.preventDefault(); if (await checkPw(pw)) setOk(true); else toast.error("Wrong password"); }}
      >
        <div className="flex items-center gap-2 text-lg font-semibold"><Lock className="h-5 w-5 text-primary" /> Admin Panel</div>
        <p className="text-sm text-muted-foreground">Re-enter your password to edit, delete or restore records.</p>
        <Input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" />
        <Button type="submit" className="w-full">Unlock</Button>
      </form>
    );
  return <AdminPanel />;
}

function AdminPanel() {
  const d = useData();
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);
  const accSel = useSel();
  const entSel = useSel();
  const logSel = useSel();
  const [editAcc, setEditAcc] = useState<Account>();
  const [editEnt, setEditEnt] = useState<Entry>();
  const n = norm(q);

  const accounts = useMemo(() => liveAccounts(d).filter((a) => !n || norm(a.name + a.code).includes(n)), [d, n]);
  const entries = useMemo(() => liveEntries(d).filter((e) => {
    if (!n) return true;
    const a = d.accounts.find((x) => x.id === e.accountId);
    return norm(`${a?.name}${a?.code}v${e.voucherNo}${e.particulars}${e.amount}`).includes(n);
  }).sort((a, b) => b.voucherNo - a.voucherNo), [d, n]);
  const log = useMemo(() => d.log.filter((l) => !n || norm(l.label).includes(n)), [d, n]);

  const del = (kind: "account" | "entry", ids: string[], clear: () => void) => {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} ${kind === "account" ? "account(s) and their entries" : "entr(ies)"}? You can restore from the Recycle Bin.`)) return;
    deleteItems(kind, ids);
    clear();
    toast.success("Moved to Recycle Bin");
  };

  return (
    <div>
      <PageHeader title="Admin Panel" subtitle="Nothing is permanently deleted — everything can be restored from the Recycle Bin." />
      <Input className="mb-4 max-w-sm" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Entries ({entries.length})</TabsTrigger>
          <TabsTrigger value="accounts">Accounts ({accounts.length})</TabsTrigger>
          <TabsTrigger value="log">Recycle Bin & Audit Log ({d.log.filter((l) => !l.restoredAt).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-3">
          <div className="flex gap-2">
            <Button variant="destructive" disabled={!entSel.sel.size} onClick={() => del("entry", [...entSel.sel], entSel.clear)}><Trash2 /> Delete selected ({entSel.sel.size})</Button>
            <span className="self-center text-xs text-muted-foreground">Click a row to edit</span>
          </div>
          <EntriesTable entries={entries.slice(0, limit)} selectable selected={entSel.sel} onToggle={entSel.toggle} onToggleAll={() => entSel.all(entries.map((e) => e.id))} onRowClick={setEditEnt} />
          {entries.length > limit && <Button variant="outline" className="w-full" onClick={() => setLimit((l) => l + 100)}>Show more ({entries.length - limit} remaining)</Button>}
        </TabsContent>

        <TabsContent value="accounts" className="space-y-3">
          <Button variant="destructive" disabled={!accSel.sel.size} onClick={() => del("account", [...accSel.sel], accSel.clear)}><Trash2 /> Delete selected ({accSel.sel.size})</Button>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-2.5"><Checkbox checked={accounts.length > 0 && accounts.every((a) => accSel.sel.has(a.id))} onCheckedChange={() => accSel.all(accounts.map((a) => a.id))} /></th>
                  <th className="px-3 py-2.5">Short ID</th><th className="px-3 py-2.5">Name</th><th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">Phone</th><th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className={cn("border-t", accSel.sel.has(a.id) && "bg-accent")}>
                    <td className="px-3 py-2"><Checkbox checked={accSel.sel.has(a.id)} onCheckedChange={() => accSel.toggle(a.id)} /></td>
                    <td className="num px-3 py-2 font-semibold text-primary">{a.code}</td>
                    <td className="px-3 py-2">{a.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{accountTypeLabel(d, a.type)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.phone}</td>
                    <td className="px-2"><button className="p-1 text-muted-foreground hover:text-primary" onClick={() => setEditAcc(a)}><Pencil className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="log" className="space-y-3">
          <Button variant="success" disabled={!logSel.sel.size} onClick={() => { restoreLog([...logSel.sel]); logSel.clear(); toast.success("Restored"); }}><RotateCcw /> Restore selected ({logSel.sel.size})</Button>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
                <tr><th className="w-10 px-3 py-2.5" /><th className="px-3 py-2.5">When</th><th className="px-3 py-2.5">Action</th><th className="px-3 py-2.5">Record</th><th className="px-3 py-2.5">Status</th><th /></tr>
              </thead>
              <tbody>
                {log.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">Nothing deleted or edited yet</td></tr>}
                {log.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2">{!l.restoredAt && <Checkbox checked={logSel.sel.has(l.id)} onCheckedChange={() => logSel.toggle(l.id)} />}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{fmtDateTime(l.at)}</td>
                    <td className="px-3 py-2"><span className={cn("rounded px-2 py-0.5 text-xs font-medium", l.action === "delete" ? "bg-danger-soft text-destructive" : "bg-warning-soft text-warning")}>{l.action === "delete" ? "Deleted" : "Edited"} {l.kind}</span></td>
                    <td className="px-3 py-2">{l.label}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{l.restoredAt ? `Restored ${fmtDateTime(l.restoredAt)}` : "—"}</td>
                    <td className="px-2">{!l.restoredAt && <Button size="sm" variant="outline" onClick={() => { restoreLog([l.id]); toast.success(l.action === "delete" ? "Restored" : "Previous version restored"); }}><RotateCcw /> {l.action === "delete" ? "Restore" : "Revert"}</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <DangerZone />

      <Dialog open={!!editAcc} onOpenChange={(o) => !o && setEditAcc(undefined)}>
        <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>{editAcc && <AccountForm initial={editAcc} onSaved={() => setEditAcc(undefined)} />}</DialogContent>
      </Dialog>
      <Dialog open={!!editEnt} onOpenChange={(o) => !o && setEditEnt(undefined)}>
        <DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>Edit Voucher V-{editEnt?.voucherNo}</DialogTitle></DialogHeader>{editEnt && <EntryForm initial={editEnt} onSaved={() => setEditEnt(undefined)} />}</DialogContent>
      </Dialog>
    </div>
  );
}

function DangerZone() {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const download = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Mussa-Enterprises-Backup-before-reset-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const reset = async () => {
    if (word !== "RESET") { toast.error("Type RESET in capital letters"); return; }
    setBusy(true);
    const ok = await checkPw(pin);
    setBusy(false);
    if (!ok) { toast.error("Wrong PIN"); return; }
    if (!confirm("Final confirmation: erase ALL accounts, entries, loans, logs and login on this device? This cannot be undone.")) return;
    resetAllData();
    toast.success("App reset complete");
    window.location.href = "/";
  };
  return (
    <section className="mt-10 rounded-xl border-2 border-destructive/50 bg-danger-soft p-5">
      <div className="flex items-center gap-2 text-lg font-semibold text-destructive"><AlertTriangle className="h-5 w-5" /> Danger Zone</div>
      <p className="mt-1 text-sm text-muted-foreground">Erase the whole app and all its data on this device. Your theme is kept. Download a backup first.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={download}><Download /> Download backup</Button>
        <Button variant="destructive" onClick={() => { setWord(""); setPin(""); setOpen(true); }}><Trash2 /> Reset entire app</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive">Reset entire app</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">All accounts, entries, personal loans, recycle bin, snapshots and your login will be permanently erased.</p>
          <label className="text-sm font-medium">Type <span className="font-mono text-destructive">RESET</span> to confirm</label>
          <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder="RESET" autoComplete="off" />
          <label className="text-sm font-medium">Your PIN / password</label>
          <Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={busy || word !== "RESET" || !pin} onClick={reset}>Erase everything</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
