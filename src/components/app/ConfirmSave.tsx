import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ConfirmRow = [label: string, value: string | undefined];

/** Summary dialog shown before any form saves; the caller runs the save in onConfirm. */
export function ConfirmSave({ open, title, rows, confirmLabel = "Confirm & Save", onCancel, onConfirm }: {
  open: boolean; title: string; rows: ConfirmRow[]; confirmLabel?: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Please review the details before saving.</DialogDescription>
        </DialogHeader>
        <dl className="divide-y rounded-lg border bg-surface text-sm">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 px-3 py-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium break-words">{v}</dd>
            </div>
          ))}
        </dl>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Review / Cancel</Button>
          <Button type="button" onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
