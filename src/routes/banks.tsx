import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeftRight, Landmark, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, NativeSelect, PageHeader } from "@/components/app/inputs";
import { CASH, addBank, addCapital, addTransfer, fundList, useData } from "@/lib/db";
import { fmtPKR, todayISO } from "@/lib/format";

export const Route = createFileRoute("/banks")({
  head: () => ({
    meta: [
      { title: "Cash & Banks — Mussa Enterprises" },
      { name: "description", content: "Cash in hand and every bank account with cleared balance, pending cheques, capital and internal transfers." },
      { property: "og:title", content: "Cash & Banks — Mussa Enterprises" },
      { property: "og:description", content: "Cash in hand and bank balances kept separately with statements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BanksPage,
});

const num = (v: string) => Number(v.replace(/,/g, "")) || 0;

function BanksPage() {
  const d = useData();
  const funds = fundList(d);
  const [dialog, setDialog] = useState<"bank" | "capital" | "transfer" | null>(null);
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [accNo, setAccNo] = useState("");
  const [from, setFrom] = useState(CASH);
  const [to, setTo] = useState("");
  const [reference, setReference] = useState("");

  const open = (k: typeof dialog) => { setAmount(""); setName(""); setAccNo(""); setReference(""); setFrom(CASH); setTo(""); setDialog(k); };
  const save = () => {
    const amt = num(amount);
    if (dialog === "bank") {
      if (!name.trim()) return toast.error("Enter bank name");
      addBank({ name: name.trim(), accountNo: accNo.trim() || undefined, openingBalance: amt });
      toast.success("Bank account added");
    } else {
      if (amt <= 0) return toast.error("Enter a valid amount");
      if (dialog === "capital") { const e = addCapital({ date, amount: amt, fund: from, reference }); toast.success(`Capital saved · V-${e.voucherNo}`); }
      else {
        if (!to || to === from) return toast.error("Choose two different accounts");
        const e = addTransfer({ date, amount: amt, from, to, reference }); toast.success(`Transfer saved · V-${e.voucherNo}`);
      }
    }
    setDialog(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Cash & Banks" subtitle="Cash in hand and each bank kept separately" actions={<>
        <Button variant="outline" onClick={() => open("bank")}><Plus /> Bank Account</Button>
        <Button variant="outline" onClick={() => open("transfer")}><ArrowLeftRight /> Internal Transfer</Button>
        <Button onClick={() => open("capital")}><Wallet /> Capital Introduced</Button>
      </>} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {funds.map((f) => (
          <Link key={f.id} to="/bank/$id" params={{ id: f.id }} className="rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md">
            <div className="flex items-center gap-2 font-semibold">{f.id === CASH ? <Wallet className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}{f.name}</div>
            <div className="num mt-2 text-2xl font-semibold">{fmtPKR(f.closing)}</div>
            <div className="text-xs text-muted-foreground">Available (cleared) balance</div>
            {f.pending !== 0 && <div className="num mt-1 text-xs text-warning">Pending cheques: {f.pending > 0 ? "+" : "−"}{fmtPKR(Math.abs(f.pending))}</div>}
          </Link>
        ))}
      </div>
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog === "bank" ? "New Bank Account" : dialog === "capital" ? "Capital Introduced" : "Internal Transfer"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            {dialog === "bank" ? <>
              <Field label="Bank name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Meezan Bank" /></Field>
              <Field label="Account no. (optional)"><Input value={accNo} onChange={(e) => setAccNo(e.target.value)} /></Field>
              <Field label="Opening balance (Rs)"><Input className="num text-right" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            </> : <>
              <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label={dialog === "capital" ? "Received into" : "From"}>
                <NativeSelect value={from} onChange={(e) => setFrom(e.target.value)}>{funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</NativeSelect>
              </Field>
              {dialog === "transfer" && <Field label="To">
                <NativeSelect value={to} onChange={(e) => setTo(e.target.value)}><option value="">Select…</option>{funds.filter((f) => f.id !== from).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</NativeSelect>
              </Field>}
              <Field label="Amount (Rs)"><Input className="num text-right" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
              <Field label="Reference (optional)"><Input value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
              {dialog === "capital" && <p className="text-xs text-muted-foreground">Owner capital increases the selected cash/bank balance and equity. It is not a party and never becomes a payable.</p>}
              {dialog === "transfer" && <p className="text-xs text-muted-foreground">Moving money between your own accounts is not income or expense.</p>}
            </>}
            <Button onClick={save}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
