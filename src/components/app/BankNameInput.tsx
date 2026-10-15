import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PK_BANKS } from "@/lib/banks";
import { cn } from "@/lib/utils";

/** Bank-name field with the app's own suggestion list (typing a custom name is still allowed). */
export function BankNameInput({ value, onChange, placeholder = "Bank name", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const list = PK_BANKS.filter((b) => !q || b.toLowerCase().includes(q));
  return (
    <div className={cn("relative", className)}>
      <Input value={value} placeholder={placeholder} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => { onChange(e.target.value); setOpen(true); }} />
      {open && list.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md">
          {list.map((b) => (
            <li key={b}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(b); setOpen(false); }} className={cn("w-full rounded px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground", b === value && "bg-accent")}>{b}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
