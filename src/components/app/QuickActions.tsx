import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, BadgeDollarSign, Flame, Plus, Receipt, ShoppingCart, Users, type LucideIcon } from "lucide-react";
import type { EntryType } from "@/lib/db";
import { cn } from "@/lib/utils";

export type QuickId = "sale" | "purchase" | "inward" | "outward" | "expense" | "heat" | "account";
export const DEFAULT_QUICK: QuickId[] = ["sale", "purchase", "inward", "outward"];
const KEY = "quick-actions-v1";

const META: Record<QuickId, { label: string; icon: LucideIcon; text: string; line: string }> = {
  sale: { label: "Sale", icon: BadgeDollarSign, text: "text-sale", line: "bg-sale" },
  purchase: { label: "Purchase", icon: ShoppingCart, text: "text-purchase", line: "bg-purchase" },
  inward: { label: "Receive Payment", icon: ArrowDownLeft, text: "text-received", line: "bg-received" },
  outward: { label: "Issue Payment", icon: ArrowUpRight, text: "text-paid", line: "bg-paid" },
  expense: { label: "Expense", icon: Receipt, text: "text-expense-card", line: "bg-expense-card" },
  heat: { label: "Heat", icon: Flame, text: "text-entry-card", line: "bg-entry-card" },
  account: { label: "Account", icon: Users, text: "text-account", line: "bg-account" },
};
const ALL = Object.keys(META) as QuickId[];

/** Pure helper: move an action into or out of the quick list (kept testable). */
export function applyDrop(list: QuickId[], id: QuickId, zone: "in" | "out", beforeId?: QuickId): QuickId[] {
  const rest = list.filter((x) => x !== id);
  if (zone === "out") return rest;
  const i = beforeId ? rest.indexOf(beforeId) : -1;
  if (i < 0) return [...rest, id];
  return [...rest.slice(0, i), id, ...rest.slice(i)];
}

function load(): QuickId[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(v)) return v.filter((x): x is QuickId => ALL.includes(x));
  } catch { /* ignore */ }
  return DEFAULT_QUICK;
}

export function QuickActions({ wide, openEntry, openAccount, header }: { wide: boolean; openEntry: (t: EntryType) => void; openAccount: () => void; header?: React.ReactNode }) {
  const navigate = useNavigate();
  const [list, setList] = useState<QuickId[]>(DEFAULT_QUICK);
  const [drag, setDrag] = useState<{ id: QuickId; x: number; y: number } | null>(null);
  const suppress = useRef(false);
  useEffect(() => setList(load()), []);
  const save = (l: QuickId[]) => { setList(l); localStorage.setItem(KEY, JSON.stringify(l)); };

  const run = (id: QuickId) => {
    if (suppress.current) return;
    if (id === "account") openAccount();
    else if (id === "heat") navigate({ to: "/production" });
    else openEntry(id as EntryType);
  };

  const onDown = (e: React.PointerEvent, id: QuickId) => {
    const sx = e.clientX, sy = e.clientY;
    const el = e.currentTarget as HTMLElement;
    let active = false;
    suppress.current = false;
    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) {
        active = true; suppress.current = true;
        try { el.setPointerCapture(ev.pointerId); } catch { /* ignore */ }
      }
      if (active) { ev.preventDefault(); setDrag({ id, x: ev.clientX, y: ev.clientY }); }
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      setDrag(null);
      if (!active) return;
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      const zone = t?.closest<HTMLElement>("[data-qzone]")?.dataset["qzone"] as "in" | "out" | undefined;
      const before = t?.closest<HTMLElement>("[data-qid]")?.dataset["qid"] as QuickId | undefined;
      if (zone) save(applyDrop(list, id, zone, zone === "in" && before !== id ? before : undefined));
      setTimeout(() => { suppress.current = false; }, 50);
    };
    window.addEventListener("pointermove", move, { passive: false }); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  };

  const extras = ALL.filter((x) => !list.includes(x));
  const [menu, setMenu] = useState(false);
  void wide;

  return (
    <div data-qzone="out" className="flex min-h-0 flex-1 flex-col" onClick={(e) => e.stopPropagation()}>
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">{header}</div>
        <button type="button" aria-label="Add quick action" onClick={() => setMenu((v) => !v)} disabled={extras.length === 0}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-card text-foreground transition-colors hover:bg-secondary disabled:opacity-40">
          <Plus className="h-4 w-4" />
        </button>
        {menu && extras.length > 0 && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-8 z-50 w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
              {extras.map((id) => {
                const m = META[id];
                return (
                  <button key={id} type="button" onClick={() => { save([...list, id]); setMenu(false); }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-secondary">
                    <m.icon className={cn("h-4 w-4", m.text)} />{m.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div data-qzone="in" className={cn("mt-3 grid flex-1 grid-cols-2 gap-2 [grid-auto-rows:minmax(4.25rem,1fr)] rounded-lg", drag && "outline-dashed outline-1 outline-border")}>
        {list.map((id) => {
          const m = META[id];
          return (
            <button key={id} data-qid={id} onPointerDown={(e) => onDown(e, id)} onClick={() => run(id)}
              className={cn("relative flex min-w-0 touch-none select-none flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border bg-card px-2 pb-3.5 pt-2.5 text-sm font-semibold text-foreground transition-transform active:scale-95", drag?.id === id && "opacity-40")}>
              <m.icon className={cn("h-6 w-6 shrink-0", m.text)} strokeWidth={2.1} />
              <span className="truncate">{m.label}</span>
              <span className={cn("absolute inset-x-4 bottom-1.5 h-[3px] rounded-full", m.line)} />
            </button>
          );
        })}
        {list.length === 0 && <p className="col-span-full self-center text-center text-[11px] text-muted-foreground">Tap + to add actions</p>}
      </div>
      {drag && <p className="mt-1 text-center text-[10px] text-muted-foreground">Drop outside the buttons to remove</p>}
      {drag && (
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-md border bg-card px-2 py-1 text-xs font-semibold shadow-lg" style={{ left: drag.x, top: drag.y }}>
          {META[drag.id].label}
        </div>
      )}
    </div>
  );
}
