import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PageHeader, TitleInput } from "@/components/app/inputs";
import { CloudBackup } from "@/components/app/CloudBackup";
import { changePassword, checkPw, exportJSON, getSnapshots, importJSON, restoreSnapshot, takeSnapshot, updateCompany, updateRecovery, useData, type Snapshot } from "@/lib/db";
import { downloadFile, fmtDateTime, todayISO } from "@/lib/format";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Backup — Mussa Enterprises Cash Book" },
      { name: "description", content: "Company details, password, backups and restore points." },
      { property: "og:title", content: "Settings & Backup — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "Company details, password, backups and restore points." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const d = useData();
  const [c, setC] = useState(d.company);
  const [oldPw, setOldPw] = useState("");
  const [pw, setPw] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState(d.auth?.recoveryEmail ?? "");
  const [recoveryPhone, setRecoveryPhone] = useState(d.auth?.recoveryPhone ?? "");
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => setSnaps(getSnapshots()), [d]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings & Backup" />
      <div className="grid gap-6 lg:grid-cols-2">
        <CloudBackup />
        <form className="space-y-4 rounded-lg border bg-card p-5" onSubmit={(e) => { e.preventDefault(); updateCompany(c); toast.success("Company details saved"); }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Company Details (printed on vouchers)</h2>
          <Field label="Name"><TitleInput value={c.name} onValueChange={(v) => setC({ ...c, name: v })} /></Field>
          <Field label="Address"><TitleInput value={c.address} onValueChange={(v) => setC({ ...c, address: v })} /></Field>
          <Field label="Phone"><Input value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></Field>
          <div className="flex justify-end"><Button type="submit">Save</Button></div>
        </form>

        <form className="space-y-4 rounded-lg border bg-card p-5" onSubmit={(e) => { e.preventDefault(); if (!recoveryEmail.trim() && !recoveryPhone.trim()) { toast.error("Enter an email or phone number"); return; } updateRecovery(recoveryEmail.trim(), recoveryPhone.trim()); toast.success("Recovery details saved"); }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Local PIN Recovery</h2>
          <p className="text-xs text-muted-foreground">Used only on this device to verify a PIN reset.</p>
          <Field label="Registered Email"><Input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} /></Field>
          <Field label="Registered Phone"><Input value={recoveryPhone} onChange={(e) => setRecoveryPhone(e.target.value)} /></Field>
          <div className="flex justify-end"><Button type="submit">Save Recovery Details</Button></div>
        </form>

        <form className="space-y-4 rounded-lg border bg-card p-5" onSubmit={async (e) => {
          e.preventDefault();
          if (!(await checkPw(oldPw))) { toast.error("Current password is wrong"); return; }
          if (pw.length < 4) { toast.error("New password must be at least 4 characters"); return; }
          await changePassword(pw); setOldPw(""); setPw(""); toast.success("Password changed");
        }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Change Password</h2>
          <Field label="Current Password"><Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} /></Field>
          <Field label="New Password"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          <div className="flex justify-end"><Button type="submit">Update Password</Button></div>
        </form>

        <div className="space-y-4 rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Backup File</h2>
          <p className="text-sm text-muted-foreground">Download a full backup to a USB or another computer. Import it on any Mac or Windows machine.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadFile(`mussa-cashbook-backup-${todayISO()}.json`, exportJSON(), "application/json")}><Download /> Download Backup</Button>
            <Button variant="outline" onClick={() => file.current?.click()}><Upload /> Import Backup</Button>
            <input ref={file} type="file" accept=".json,application/json" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              if (!confirm("Importing will replace all current data (you can undo with Ctrl+Z). Continue?")) return;
              try { takeSnapshot(); importJSON(await f.text()); toast.success("Backup imported"); } catch { toast.error("This is not a valid backup file"); }
            }} />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Auto Restore Points</h2>
            <Button size="sm" variant="outline" onClick={() => { takeSnapshot(); setSnaps(getSnapshots()); toast.success("Restore point created"); }}>Create now</Button>
          </div>
          <p className="text-xs text-muted-foreground">Saved automatically every 30 minutes and when the app closes. Last 10 kept.</p>
          <ul className="divide-y text-sm">
            {snaps.length === 0 && <li className="py-3 text-muted-foreground">None yet</li>}
            {snaps.map((s) => (
              <li key={s.at} className="flex items-center justify-between py-2">
                {fmtDateTime(s.at)}
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Restore data to this point? (Ctrl+Z to undo)")) { restoreSnapshot(s.at); toast.success("Restored"); } }}><RotateCcw /> Restore</Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-5 text-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Keyboard Shortcuts</h2>
        <div className="grid gap-1 sm:grid-cols-2">
          {[["Ctrl/Cmd + S", "Save form"], ["Ctrl/Cmd + N", "New voucher"], ["Ctrl/Cmd + F", "Search accounts"], ["Ctrl/Cmd + P", "Print / PDF"], ["Ctrl/Cmd + Z / Y", "Undo / Redo (up to 60 actions)"], ["Ctrl/Cmd + C / V / X / A", "Copy / Paste / Cut / Select all"], ["Enter / Tab", "Next field / choose suggestion"], ["Esc", "Close popup"]].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b py-1.5"><kbd className="num text-xs">{k}</kbd><span className="text-muted-foreground">{v}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}
