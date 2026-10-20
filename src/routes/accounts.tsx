import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AccountForm } from "@/components/app/AccountForm";
import { PageHeader } from "@/components/app/inputs";
import { accountBalance, accountTypeLabel, balanceClass, liveAccounts, useData, ACCOUNT_TYPES } from "@/lib/db";
import { fmtPKR, norm } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts — Mussa Enterprises Cash Book" },
      { name: "description", content: "Customers, suppliers and workers with auto short IDs and live balances." },
      { property: "og:title", content: "Accounts — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "Customers, suppliers and workers with auto short IDs and live balances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const d = useData();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const list = useMemo(() => {
    const n = norm(q);
    return liveAccounts(d)
      .filter((a) => (!type || a.type === type) && (!n || norm(a.name + a.code + a.phone + a.address + accountTypeLabel(d, a.type)).includes(n)))
      .map((a) => ({ a, b: accountBalance(d, a.id) }))
      .sort((x, y) => x.a.name.localeCompare(y.a.name));
  }, [d, q, type]);

  return (
    <div>
      <PageHeader title="Accounts & Ledgers" subtitle={`${list.length} accounts`} actions={<Button onClick={() => setOpen(true)}><Plus /> New Account</Button>} />
      <div className="relative mb-4 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-11 pl-10" aria-label="Search accounts" placeholder="Search by name, ID, or type…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="no-print mb-5 flex gap-2 overflow-x-auto pb-1">
        {[["", "All"], ...Object.entries(ACCOUNT_TYPES), ...d.accountTypes.map((item) => [item.id, item.name])].map(([key, label]) =>
          <Button key={key ?? "all"} variant={type === key ? "default" : "outline"} className="shrink-0 rounded-full" onClick={() => setType(key ?? "")}>{label}{key ? "s" : ""}</Button>
        )}
      </div>
      <h2 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Accounts</h2>
      <div className="grid gap-3">
        {list.length === 0 && <p className="py-10 text-center text-muted-foreground">No accounts found</p>}
        {list.map(({ a, b }) => (
          <Link key={a.id} to="/ledger/$id" params={{ id: a.id }} className="group flex min-w-0 items-center justify-between gap-3 rounded-lg border bg-card px-4 py-4 shadow-sm transition hover:border-primary/40 hover:shadow-md sm:px-5">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold sm:text-lg">{a.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className={cn("rounded px-2 py-0.5 font-semibold uppercase", a.type === "buyer" ? "bg-sale-soft text-sale" : a.type === "supplier" ? "bg-purchase-soft text-purchase" : a.type === "worker" ? "bg-report-card-soft text-report-card" : "bg-account-soft text-account")}>{accountTypeLabel(d, a.type)}</span>
                <span className="num">{a.code}</span>{a.phone && <span>· {a.phone}</span>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-3">
              <div className="text-right"><div className="text-[10px] uppercase text-muted-foreground">{balanceClass(a, b)}</div><div className={cn("num text-sm font-semibold sm:text-lg", b >= 0 ? "text-success" : "text-destructive")}>{b < 0 ? "−" : ""}{fmtPKR(Math.abs(b))}</div></div>
              <ChevronRight className="hidden h-4 w-4 text-muted-foreground group-hover:text-primary sm:block" />
            </div>
          </Link>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>New Account</DialogTitle></DialogHeader>
          <AccountForm onSaved={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
