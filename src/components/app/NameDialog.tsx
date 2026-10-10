import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** In-app replacement for window.prompt(), which mobile browsers and installed apps often block. */
export function useNamePrompt() {
  const [state, setState] = useState<{ title: string; placeholder?: string | undefined } | null>(null);
  const [value, setValue] = useState("");
  const resolver = useRef<(v: string | null) => void>(undefined);

  const ask = (title: string, placeholder?: string) =>
    new Promise<string | null>((resolve) => { resolver.current = resolve; setValue(""); setState({ title, placeholder }); });
  const finish = (v: string | null) => { resolver.current?.(v); resolver.current = undefined; setState(null); };

  const node = (
    <Dialog open={!!state} onOpenChange={(o) => { if (!o) finish(null); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{state?.title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input autoFocus value={value} placeholder={state?.placeholder} onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (value.trim()) finish(value.trim()); } }} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => finish(null)}>Cancel</Button>
            <Button type="button" disabled={!value.trim()} onClick={() => finish(value.trim())}>Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
  return { ask, node };
}
