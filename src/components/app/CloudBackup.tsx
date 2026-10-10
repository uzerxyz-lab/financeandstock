import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cloud, CloudDownload, CloudUpload, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./inputs";
import { supabase } from "@/integrations/supabase/client";
import { backupToCloud, lastCloudBackup, restoreFromCloud } from "@/lib/cloud";
import { fmtDateTime } from "@/lib/format";

export function CloudBackup() {
  const [email, setEmail] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (email) lastCloudBackup().then(setLast); }, [email]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    setBusy(false);
  };

  if (!email)
    return (
      <form className="space-y-4 rounded-lg border bg-card p-5" onSubmit={(e) => e.preventDefault()}>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><Cloud className="h-4 w-4" /> Cloud Backup</h2>
        <p className="text-xs text-muted-foreground">Keeps a safe copy online so your data survives a new phone, cleared browser or lost device. The app still works offline.</p>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Cloud password (min 6)"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => run(async () => {
            const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { emailRedirectTo: window.location.origin } });
            if (error) throw error;
            if (!data.session) throw new Error("Check your email and tap the confirmation link, then sign in");
          }, "Cloud account created")}>Create account</Button>
          <Button type="button" disabled={busy} onClick={() => run(async () => {
            const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
            if (error) throw error;
          }, "Signed in to cloud backup")}>Sign in</Button>
        </div>
      </form>
    );

  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><Cloud className="h-4 w-4" /> Cloud Backup — On</h2>
      <p className="text-sm">Signed in as <b>{email}</b>. Changes back up automatically when online.</p>
      <p className="text-xs text-muted-foreground">Last cloud backup: {last ? fmtDateTime(last) : "none yet"}</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => run(async () => { await backupToCloud(); setLast(new Date().toISOString()); }, "Backed up to cloud")}><CloudUpload /> Back up now</Button>
        <Button variant="outline" disabled={busy} onClick={() => { if (confirm("Replace the data on this device with your cloud backup?")) run(restoreFromCloud, "Restored from cloud"); }}><CloudDownload /> Restore from cloud</Button>
        <Button variant="ghost" onClick={() => supabase.auth.signOut()}><LogOut /> Sign out</Button>
      </div>
    </div>
  );
}
