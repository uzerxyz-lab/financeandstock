import { useEffect, useRef, useState, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { titleCase, fmtDateTime } from "@/lib/format";
import { Logo } from "@/components/app/Logo";
import { accountTypeLabel, searchAccounts, useData, type Account, type AccountType } from "@/lib/db";
import { cn } from "@/lib/utils";

/** Text input that auto-capitalises the first letter of every word. */
export const TitleInput = forwardRef<HTMLInputElement, Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> & { value: string; onValueChange: (v: string) => void }>(
  ({ value, onValueChange, ...props }, ref) => (
    <Input ref={ref} value={value} onChange={(e) => onValueChange(titleCase(e.target.value))} autoComplete="off" {...props} />
  ),
);
TitleInput.displayName = "TitleInput";

export function Field({ label, children, className, id }: { label: string; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <label id={id} className={cn("flex flex-col gap-1.5 [&.field-error>span]:text-destructive", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        props.className,
      )}
    />
  );
}

/** Type-ahead account picker. Case/dash/space insensitive. */
export function AccountSearch({
  value,
  onSelect,
  placeholder = "Search account by name or ID…",
  id,
  autoFocus,
  clearOnSelect,
  className,
  accountType,
}: {
  value?: string | undefined;
  onSelect: (a: Account) => void;
  placeholder?: string;
  id?: string;
  autoFocus?: boolean;
  clearOnSelect?: boolean;
  className?: string;
  accountType?: AccountType;
}) {
  const d = useData();
  const selected = d.accounts.find((a) => a.id === value);
  const [q, setQ] = useState(selected ? selected.name : "");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const results = searchAccounts(d, q, 8, accountType);

  useEffect(() => {
    setQ(selected ? selected.name : "");
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = (a: Account) => {
    onSelect(a);
    setQ(clearOnSelect ? "" : a.name);
    setOpen(false);
  };

  return (
    <div ref={wrap} className={cn("relative", className)}>
      <Input
        id={id}
        autoFocus={autoFocus}
        value={q}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => q && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !results.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); const r = results[hi]; if (r) pick(r); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && q && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No account found</div>
          ) : (
            results.map((a, i) => (
              <button
                type="button"
                key={a.id}
                onMouseDown={(e) => { e.preventDefault(); pick(a); }}
                onMouseEnter={() => setHi(i)}
                className={cn("flex w-full items-center justify-between px-3 py-2 text-left text-sm", i === hi && "bg-accent text-accent-foreground")}
              >
                <span className="font-medium">{a.name}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {accountTypeLabel(d, a.type)}
                  <span className="num rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">{a.code}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Amount({ value, flow }: { value: number; flow?: "in" | "out" | "none" }) {
  return (
    <span className={cn("num", flow === "in" && "text-success", flow === "out" && "text-destructive")}>
      {value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
    </span>
  );
}

export function PrintHeader({ title, sub, always }: { title: string; sub?: string; always?: boolean }) {
  const d = useData();
  // Logo always sits at the very top; a rule follows; titles and details go below it.
  return (
    <div className={cn(!always && "print-only", "mb-4")}>
      <div className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-3">
        <div className="min-w-0 shrink-0 max-w-[55%]"><Logo className="h-auto w-44" /></div>
        <div className="text-right text-xs text-muted-foreground">
          {d.company.address && <div>{d.company.address}</div>}
          {d.company.phone && <div>{d.company.phone}</div>}
          <div>Printed: {fmtDateTime(new Date().toISOString())}</div>
        </div>
      </div>
      <div className="mt-3 flex justify-between text-sm">
        <span className="font-semibold uppercase tracking-wide">{title}</span>
        <span>{sub}</span>
      </div>
    </div>
  );
}
