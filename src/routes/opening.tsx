import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect, PageHeader } from "@/components/app/inputs";
import { accountTypeLabel, liveAccounts, liveBanks, openingCapital, saveOpening, useData, type Data, type OpeningItem } from "@/lib/db";
import { fmtPKR, todayISO } from "@/lib/format";

export const Route = createFileRoute("/opening")({
  head: () => ({
    meta: [
      { title: "Opening Balances — Mussa Enterprises" },
      { name: "description", content: "Opening setup: cash, bank, party, stock and loan balances on your cut-off date, with calculated opening capital." },
      { property: "og:title", content: "Opening Balances — Mussa Enterprises" },
      { property: "og:description", content: "Set opening cash, banks, parties, stock and liabilities; capital = assets − liabilities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OpeningPage,
});

const num = (v: string) => Number(String(v).replace(/,/g, "")) || 0;
type Side = "dr" | "cr";

function OpeningPage() {
  const d = useData();
  const navigate = useNavigate();
  const o = d.opening;
  const [date, setDate] = useState(o?.date ?? todayISO());
  const [cash, setCash] = useState(o?.cash ? String(o.cash) : "");
  const [banks, setBanks] = useState(liveBanks(d).map((b) => ({ id: b.id as string | undefined, name: b.name, accountNo: b.accountNo ?? "", amount: b.openingBalance ? String(b.openingBalance) : "" })));
  const parties = liveAccounts(d).filter((a) => a.type !== "worker");
  const [party, setParty] = useState<Record<string, { amount: string; side: Side }>>(() => Object.fromEntries(parties.map((a) => [a.id, { amount: a.openingBalance ? String(Math.abs(a.openingBalance)) : "", side: a.openingBalance < 0 ? "cr" : "dr" }])));
  const [equity, setEquity] = useState<string[]>(parties.filter((a) => a.equity).map((a) => a.id));
  const [stock, setStock] = useState<Record<string, { kg: string; value: string }>>(() => Object.fromEntries(d.materials.map((m) => { const s = o?.stock.find((x) => x.materialId === m.id); return [m.id, { kg: s?.kg ? String(s.kg) : "", value: s?.value ? String(s.value) : "" }]; })));
  const [others, setOthers] = useState<(Omit<OpeningItem, "amount"> & { amount: string })[]>((o?.others ?? []).map((x) => ({ ...x, amount: String(x.amount) })));

  const build = () => {
    const opening = {
      date, cash: num(cash), completed: true,
      stock: Object.entries(stock).filter(([, s]) => num(s.kg) || num(s.value)).map(([materialId, s]) => ({ materialId, kg: num(s.kg), value: num(s.value) })),
      others: others.filter((x) => x.name.trim() && num(x.amount)).map((x) => ({ ...x, name: x.name.trim(), amount: num(x.amount) })),
    };
    const partyOpenings = Object.fromEntries(Object.entries(party).map(([id, p]) => [id, equity.includes(id) ? 0 : p.side === "cr" ? -num(p.amount) : num(p.amount)]));
    const bankList = banks.map((b) => ({ id: b.id, name: b.name, accountNo: b.accountNo || undefined, openingBalance: num(b.amount) }));
    return { opening, partyOpenings, bankList };
  };

  const preview = useMemo(() => {
    const { opening, partyOpenings, bankList } = build();
    const draft: Data = {
      ...d, opening,
      accounts: d.accounts.map((a) => ({ ...a, openingBalance: partyOpenings[a.id] ?? a.openingBalance, equity: equity.includes(a.id) || undefined })),
      banks: bankList.map((b, i) => ({ ...b, id: b.id ?? `new-${i}`, createdAt: "" })),
    };
    return openingCapital(draft);
  }, [d, date, cash, banks, party, equity, stock, others]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    const { opening, partyOpenings, bankList } = build();
    saveOpening(opening, partyOpenings, equity, bankList);
    toast.success("Opening balances saved");
    navigate({ to: "/" });
  };

  const sideLabel = (type: string, side: Side) => side === "dr" ? (type === "supplier" ? "Advance paid to supplier" : "Receivable") : (type === "buyer" ? "Advance from customer" : "Payable");

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Opening Balances" subtitle="Balances on your cut-off date. Capital is calculated as assets − liabilities." actions={<Button onClick={save}>Save Opening Setup</Button>} />

      <section className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
        <Field label="Cut-off date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Cash in hand (Rs)"><Input className="num text-right" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} /></Field>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Bank accounts</h2><Button size="sm" variant="outline" onClick={() => setBanks([...banks, { id: undefined, name: "", accountNo: "", amount: "" }])}><Plus /> Add bank</Button></div>
        {banks.length === 0 && <p className="text-sm text-muted-foreground">No bank accounts yet.</p>}
        <div className="grid gap-2">
          {banks.map((b, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_8rem] gap-2">
              <Input placeholder="Bank name" value={b.name} onChange={(e) => setBanks(banks.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <Input placeholder="Account no." value={b.accountNo} onChange={(e) => setBanks(banks.map((x, j) => j === i ? { ...x, accountNo: e.target.value } : x))} />
              <Input className="num text-right" placeholder="Balance" value={b.amount} onChange={(e) => setBanks(banks.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-1 font-semibold">Buyers & suppliers</h2>
        <p className="mb-3 text-xs text-muted-foreground">Tick "Owner capital" for any account that is really your own capital (e.g. "My Capital"). It will be shown as equity, never as a payable.</p>
        {parties.length === 0 && <p className="text-sm text-muted-foreground">No accounts yet.</p>}
        <div className="grid gap-2">
          {parties.map((a) => {
            const p = party[a.id] ?? { amount: "", side: "dr" as Side };
            const isEq = equity.includes(a.id);
            return (
              <div key={a.id} className="grid items-center gap-2 sm:grid-cols-[1fr_8rem_14rem_auto]">
                <div><span className="font-medium">{a.name}</span> <span className="text-xs text-muted-foreground">{accountTypeLabel(d, a.type)}</span></div>
                <Input disabled={isEq} className="num text-right" placeholder="0" value={p.amount} onChange={(e) => setParty({ ...party, [a.id]: { ...p, amount: e.target.value } })} />
                <NativeSelect disabled={isEq} value={p.side} onChange={(e) => setParty({ ...party, [a.id]: { ...p, side: e.target.value as Side } })}>
                  <option value="dr">{sideLabel(a.type, "dr")}</option>
                  <option value="cr">{sideLabel(a.type, "cr")}</option>
                </NativeSelect>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={isEq} onChange={(e) => setEquity(e.target.checked ? [...equity, a.id] : equity.filter((x) => x !== a.id))} /> Owner capital</label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-semibold">Opening stock</h2>
        <div className="grid gap-2">
          {d.materials.map((m) => {
            const s = stock[m.id] ?? { kg: "", value: "" };
            return (
              <div key={m.id} className="grid grid-cols-[1fr_8rem_9rem] items-center gap-2">
                <span className="font-medium">{m.name}</span>
                <Input className="num text-right" placeholder="Qty (kg)" value={s.kg} onChange={(e) => setStock({ ...stock, [m.id]: { ...s, kg: e.target.value } })} />
                <Input className="num text-right" placeholder="Value (Rs)" value={s.value} onChange={(e) => setStock({ ...stock, [m.id]: { ...s, value: e.target.value } })} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Loans & other assets / liabilities</h2><Button size="sm" variant="outline" onClick={() => setOthers([...others, { id: crypto.randomUUID(), name: "", kind: "liability", amount: "" }])}><Plus /> Add</Button></div>
        {others.length === 0 && <p className="text-sm text-muted-foreground">e.g. bank loan taken (liability), loan given or machinery (asset).</p>}
        <div className="grid gap-2">
          {others.map((x, i) => (
            <div key={x.id} className="grid grid-cols-[1fr_9rem_8rem_auto] gap-2">
              <Input placeholder="Description" value={x.name} onChange={(e) => setOthers(others.map((y, j) => j === i ? { ...y, name: e.target.value } : y))} />
              <NativeSelect value={x.kind} onChange={(e) => setOthers(others.map((y, j) => j === i ? { ...y, kind: e.target.value as "asset" | "liability" } : y))}><option value="asset">Asset</option><option value="liability">Liability</option></NativeSelect>
              <Input className="num text-right" placeholder="Amount" value={x.amount} onChange={(e) => setOthers(others.map((y, j) => j === i ? { ...y, amount: e.target.value } : y))} />
              <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => setOthers(others.filter((_, j) => j !== i))}><Trash2 /></Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-semibold">Opening capital check</h2>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
          {([["Cash in hand", preview.cash], ["Banks", preview.banks], ["Receivables", preview.receivable], ["Supplier advances", preview.supplierAdvance], ["Stock value", preview.stock], ["Other assets", preview.otherAssets]] as const).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd className="num text-right">{fmtPKR(v)}</dd></Fragment>)}
          <dt className="border-t pt-1 font-semibold">Total assets</dt><dd className="num border-t pt-1 text-right font-semibold">{fmtPKR(preview.assets)}</dd>
          {([["Payables", preview.payable], ["Customer advances", preview.customerAdvance], ["Loans & other liabilities", preview.otherLiab]] as const).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd className="num text-right">{fmtPKR(v)}</dd></Fragment>)}
          <dt className="border-t pt-1 font-semibold">Total liabilities</dt><dd className="num border-t pt-1 text-right font-semibold">{fmtPKR(preview.liabilities)}</dd>
          <dt className="mt-2 text-base font-bold">Opening capital (equity)</dt><dd className="num mt-2 text-right text-base font-bold">{fmtPKR(preview.capital)}</dd>
        </dl>
      </section>
      <div className="flex justify-end"><Button onClick={save}>Save Opening Setup</Button></div>
    </div>
  );
}
