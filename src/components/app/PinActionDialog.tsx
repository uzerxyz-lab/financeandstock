import { useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { checkPw } from "@/lib/db";

export function PinActionDialog({ action, onClose, onVerified }: { action: "edit" | "delete" | null; onClose: () => void; onVerified: (action: "edit" | "delete") => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  return <Dialog open={!!action} onOpenChange={(open) => { if (!open) { setPin(""); onClose(); } }}>
    <DialogContent className="max-w-sm">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Confirm PIN to {action}</DialogTitle></DialogHeader>
      <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        if (!action || busy) return;
        setBusy(true);
        const valid = await checkPw(pin);
        setBusy(false);
        if (!valid) { toast.error("Incorrect PIN"); return; }
        const confirmedAction = action;
        setPin("");
        // Let the PIN dialog's history entry unwind before opening the editor.
        // Otherwise its delayed Back event immediately closes the new dialog.
        const closed = new Promise<void>((resolve) => {
          const done = () => { window.removeEventListener("popstate", done); clearTimeout(timer); resolve(); };
          const timer = window.setTimeout(done, 500);
          window.addEventListener("popstate", done, { once: true });
        });
        onClose();
        await closed;
        onVerified(confirmedAction);
      }}>
        <Input aria-label="PIN" type="password" inputMode="numeric" autoFocus value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Enter your PIN" />
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || !pin}>Confirm</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}