import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fieldError } from "@/lib/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PK_BANKS } from "@/lib/banks";
import { AccountSearch, Field, NativeSelect, TitleInput } from "./inputs";
import { useNamePrompt } from "./NameDialog";
import {
  addEntry, addNamed, addMaterial, addBank, liveBanks, updateEntry, findDuplicate, getData, useData,
  ENTRY_TYPES, METHODS, type Entry, type EntryType, type PayMethod,
} from "@/lib/db";
import { todayISO, amountInWords, fmtTon } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ConfirmSave, type ConfirmRow } from "./ConfirmSave";

const DRAFT = "cashbook-entry-draft";
const TYPE_ORDER: EntryType[] = ["inward", "outward", "sale", "purchase", "salary", "advance", "expense"];

export function EntryForm({ initial, onSaved, defaultType = "inward", defaultAccountId, typeChoices }: { initial?: Entry; onSaved?: (e?: Entry) => void; defaultType?: EntryType; defaultAccountId?: string; typeChoices?: EntryType[] }) {
  const d = useData();
  const [type, setType] = useState<EntryType>(initial?.type ?? defaultType);
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [accountId, setAccountId] = useState(initial?.accountId ?? defaultAccountId);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [method, setMethod] = useState<PayMethod>(initial?.method ?? "cash");
  const [chequeNo, setChequeNo] = useState(initial?.chequeNo ?? "");
  const [bank, setBank] = useState(initial?.bank ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const [bankId, setBankId] = useState(initial?.bankId ?? "");
  const [particulars, setParticulars] = useState(initial?.particulars ?? "");
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [formKey, setFormKey] = useState(0);
  const [materialId, setMaterialId] = useState(initial?.materialId ?? "");
  const [weight, setWeight] = useState(initial?.weightKg ? String(initial.weightKg) : "");
  const [rate, setRate] = useState(initial?.rate ? String(initial.rate) : "");
  const [payMode, setPayMode] = useState<"credit" | "advance" | "net" | "">(initial?.payMode ?? "");
  const [receivedBy, setReceivedBy] = useState(initial?.receivedBy ?? "");

  const meta = ENTRY_TYPES[type];

  const names = useNamePrompt();
  // Auto-draft: keeps unsaved typing safe across power cuts / accidental close.
  // Shown inside the form (not a toast) because open dialogs block clicks on toasts.
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    if (initial) return;
    try {
      const raw = localStorage.getItem(DRAFT);
      if (!raw) return;
      const dr = JSON.parse(raw);
      if (!dr.amount && !dr.particulars && !dr.accountId) return;
      setDraft(dr);
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const restoreDraft = () => {
    const dr = draft; if (!dr) return;
    setType(dr["type"] as EntryType); setDate(dr["date"] ?? todayISO()); setAccountId(dr["accountId"]); setAmount(dr["amount"] ?? ""); setParticulars(dr["particulars"] ?? ""); setMethod((dr["method"] as PayMethod) ?? "cash"); setChequeNo(dr["chequeNo"] ?? ""); setBank(dr["bank"] ?? ""); setReference(dr["reference"] ?? ""); setBankId(dr["bankId"] ?? ""); setCategoryId(dr["categoryId"] ?? ""); setFormKey((k) => k + 1);
    setRemarks(dr["remarks"] ?? ""); setMaterialId(dr["materialId"] ?? ""); setWeight(dr["weight"] ?? ""); setRate(dr["rate"] ?? ""); setPayMode(dr["payMode"] === "net" || dr["payMode"] === "advance" ? "net" : dr["payMode"] === "credit" ? "credit" : ""); setReceivedBy(dr["receivedBy"] ?? "");
    setDraft(null);
  };
  const discardDraft = () => { localStorage.removeItem(DRAFT); setDraft(null); };

  useEffect(() => {
    if (initial) return;
    const t = setTimeout(() => {
      if (amount || particulars || accountId || remarks || weight || rate) localStorage.setItem(DRAFT, JSON.stringify({ type, date, accountId, amount, particulars, remarks, materialId, weight, rate, payMode, receivedBy, method, chequeNo, bank, bankId, reference, categoryId }));
      else localStorage.removeItem(DRAFT);
    }, 1500);
    return () => clearTimeout(t);
  }, [initial, type, date, accountId, amount, particulars, remarks, materialId, weight, rate, payMode, receivedBy, method, chequeNo, bank, bankId, reference, categoryId]);

  useEffect(() => {
    if (initial) return;
    const h = (e: BeforeUnloadEvent) => { if (amount) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [initial, amount]);
  const trade = type === "sale" || type === "purchase";
  const wKg = Number(weight.replace(/,/g, "")) || 0;
  const rt = Number(rate.replace(/,/g, "")) || 0;
  const autoAmt = trade && wKg > 0 && rt > 0;
  const amt = autoAmt ? Math.round(wKg * rt * 100) / 100 : Number(amount.replace(/,/g, ""));
  // Method fields show for cash vouchers, and for sale/purchase only when paid on the spot (advance).
  const showPay = meta.cash || (trade && payMode === "net");

  const reset = () => {
    setAccountId(defaultAccountId); setAmount(""); setChequeNo(""); setBank(""); setReference(""); setParticulars(""); setWeight(""); setRate(""); setReceivedBy(""); setPayMode("");
    setRemarks("");
    setFormKey((k) => k + 1);
  };

  const submit = (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (meta.party && !accountId) { fieldError("f-account", type === "salary" || type === "advance" ? "Please select the worker" : "Please select an account"); return; }
    if (type === "expense" && !accountId) { fieldError("f-paidto", "Please select who this expense was paid to"); return; }
    if (trade && !materialId) { fieldError("f-material", "Please select the material"); return; }
    if (!amt || amt <= 0) { fieldError(trade && !wKg ? "f-weight" : trade && !rt ? "f-rate" : "f-amount", "Please enter weight and rate, or a valid amount"); return; }
    if (showPay && method !== "cash" && !bankId) { fieldError("f-bank", "Please select the bank account"); return; }
    if (trade && !initial && !payMode) { fieldError("f-saletype", `Please select the ${type === "purchase" ? "purchase" : "sale"} type`); return; }
    const bankName = d.banks.find((b) => b.id === bankId)?.name ?? bank;
    const matName = d.materials.find((m) => m.id === materialId)?.name ?? "";
    const tradeText = trade && wKg ? `${matName} ${fmtTon(wKg)}${rt ? ` @ Rs ${rt}/kg` : ""}` : matName;
    const payload = {
      type, date, amount: amt, particulars: trade ? tradeText || ENTRY_TYPES[type].label : particulars.trim() || (type === "expense" ? d.categories.find((c) => c.id === categoryId)?.name ?? "Expense" : ENTRY_TYPES[type].label),
      remarks: trade ? remarks.trim() || undefined : undefined,
      accountId: meta.party || type === "expense" ? accountId : undefined,
      method: showPay ? method : undefined,
      chequeNo: showPay && method === "cheque" ? chequeNo : undefined,
      bank: meta.cash && method !== "cash" ? bankName : undefined,
      ...(type === "transfer" ? {} : { bankId: showPay && method !== "cash" ? bankId : undefined }),
      reference: showPay && method === "online" ? reference : undefined,
      chequeStatus: meta.cash && method === "cheque" ? initial?.chequeStatus ?? "pending" : undefined,
      categoryId: type === "expense" ? categoryId : undefined,
      materialId: trade ? materialId : undefined,
      weightKg: trade && wKg ? wKg : undefined,
      rate: trade && rt ? rt : undefined,
      payMode: trade ? payMode || undefined : undefined,
      receivedBy: meta.cash && method === "cash" && receivedBy.trim() ? receivedBy.trim() : undefined,
    } as const;
    const dup = findDuplicate(getData(), payload, initial?.id);
    if (dup && !confirm(`A similar entry (V-${dup.voucherNo}) already exists for the same account, amount and date. Save anyway?`)) return;
    const save = () => {
    if (initial) {
      updateEntry(initial.id, payload);
      toast.success(`Voucher V-${initial.voucherNo} updated`);
      onSaved?.();
    } else {
      const e = addEntry(payload);
      if (trade && payMode === "advance") { // legacy only; Net Sale/Purchase records no cash voucher
        // Paid on the spot: record the matching cash voucher so ledgers and cash in hand stay correct.
        const p = addEntry({
          type: type === "sale" ? "inward" : "outward", date, amount: amt, accountId,
          particulars: `Advance for V-${e.voucherNo} · ${tradeText}`, method,
          chequeNo: method === "cheque" ? chequeNo : undefined,
          bank: method !== "cash" ? bankName : undefined,
          bankId: method !== "cash" ? bankId : undefined,
          reference: method === "online" ? reference : undefined,
          chequeStatus: method === "cheque" ? "pending" : undefined,
          receivedBy: method === "cash" && receivedBy.trim() ? receivedBy.trim() : undefined,
          linkedId: e.id,
        });
        toast.success(`Saved · V-${e.voucherNo} + payment V-${p.voucherNo}`);
      } else toast.success(`Saved · Voucher V-${e.voucherNo}`);
      reset();
      localStorage.removeItem(DRAFT);
      onSaved?.(e);
    }
    };
    const acc = d.accounts.find((a) => a.id === accountId)?.name;
    const rows: ConfirmRow[] = [
      ["Type", meta.label], ["Date", date], ["Account", acc],
      ["Material", trade ? matName : undefined],
      ["Weight / Rate", trade && wKg ? `${fmtTon(wKg)}${rt ? ` @ Rs ${rt}/kg` : ""}` : undefined],
      ["Amount", `Rs ${amt.toLocaleString("en-PK")}`],
      ["In words", amountInWords(amt)],
      [type === "purchase" ? "Purchase Type" : "Sale Type", trade && payMode ? `${payMode === "credit" ? "Credit" : "Net"} ${type === "purchase" ? "Purchase" : "Sale"}${payMode === "credit" ? "" : " (balance unchanged)"}` : undefined],
      ["Method", showPay ? `${METHODS[method] ?? method}${method !== "cash" && bankName ? ` · ${bankName}` : ""}` : undefined],
      ["Particulars", payload.particulars], ["Remarks", payload.remarks],
    ];
    setPending({ rows, save });
  };
  const [pending, setPending] = useState<{ rows: ConfirmRow[]; save: () => void } | null>(null);

  const cap = (s: string) => s.trim().replace(/(^|\s)(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());
  const addCat = async () => {
    const name = await names.ask("New category", "e.g. LESCO Bill");
    if (name) setCategoryId(addNamed("categories", cap(name)).id);
  };

  return (
    <form onSubmit={submit} data-entry-form className="space-y-4">
      {names.node}
      {draft && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-sm">
          <span className="font-medium">Unsaved draft found. Restore it?</span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={discardDraft}>Discard</Button>
            <Button type="button" size="sm" onClick={restoreDraft}>Restore</Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {(typeChoices ? typeChoices : type === "expense" || type === "salary" || type === "advance" ? (["expense", "salary", "advance"] as EntryType[]) : type === "sale" || type === "purchase" ? ([type, type === "sale" ? "purchase" : "sale"] as EntryType[]) : type === "inward" || type === "outward" ? ([type, type === "inward" ? "outward" : "inward"] as EntryType[]) : TYPE_ORDER.filter((t) => t === type)).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { if (t !== type && !defaultAccountId) setAccountId(undefined); setType(t); setFormKey((k) => k + 1); }}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              type === t
                ? ENTRY_TYPES[t].flow === "in"
                  ? "border-success bg-success text-success-foreground"
                  : ENTRY_TYPES[t].flow === "out"
                    ? "border-destructive bg-destructive text-destructive-foreground"
                    : "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary",
            )}
          >
            {ENTRY_TYPES[t].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {meta.party ? (
          <Field id="f-account" label={type === "salary" || type === "advance" ? "Worker" : "Account"} className="col-span-2">
            {type === "sale" ? <AccountSearch key={formKey} id="entry-account" value={accountId} accountType="buyer" onSelect={(a) => setAccountId(a.id)} />
              : type === "purchase" ? <AccountSearch key={formKey} id="entry-account" value={accountId} accountType="supplier" onSelect={(a) => setAccountId(a.id)} />
                : type === "salary" || type === "advance" ? <AccountSearch key={formKey} id="entry-account" value={accountId} accountType="worker" onSelect={(a) => setAccountId(a.id)} />
                  : <AccountSearch key={formKey} id="entry-account" value={accountId} onSelect={(a) => setAccountId(a.id)} />}
          </Field>
        ) : (
          <Field label="Category" className="col-span-2">
            <div className="flex gap-2">
              <NativeSelect value={categoryId} onChange={(e) => {
                const name = d.categories.find((c) => c.id === e.target.value)?.name.toLowerCase();
                if (name === "salary" || name === "advance") { setType(name); if (!defaultAccountId) setAccountId(undefined); setFormKey((k) => k + 1); toast(`Select the worker for this ${name}`); return; }
                setCategoryId(e.target.value);
              }}>
                <option value="">Select category (optional)…</option>
                 {d.categories.filter((c) => c.selectable !== false).sort((a, b) => {
                   const defaults = ["Salary", "Advance", "LESCO Bill", "Fuel", "Grocery"];
                   const ai = defaults.indexOf(a.name), bi = defaults.indexOf(b.name);
                   return ai < 0 ? bi < 0 ? a.name.localeCompare(b.name) : 1 : bi < 0 ? -1 : ai - bi;
                 }).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </NativeSelect>
               <Button type="button" variant="outline" size="sm" className="h-9" onClick={addCat}>+ New</Button>
            </div>
          </Field>
        )}
        {type === "expense" && (
          <Field id="f-paidto" label="Paid To (Account) *" className="col-span-2">
            <AccountSearch key={formKey} id="entry-account" value={accountId} onSelect={(a) => setAccountId(a.id)} />
          </Field>
        )}
        {trade && (
          <Field id="f-material" label="Material *" className="col-span-2 sm:col-span-1">
            <div className="flex gap-2">
              <NativeSelect value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                <option value="">Select material…</option>
                {d.materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </NativeSelect>
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={async () => {
                const name = await names.ask("New material", "e.g. Iron");
                if (name) setMaterialId(addMaterial(cap(name)).id);
              }}>+ New</Button>
            </div>
          </Field>
        )}
        {trade && (
          <Field id="f-weight" label="Weight (kg)">
            <Input inputMode="decimal" className="num text-right" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="e.g. 2000" />
            {wKg > 0 && <span className="text-right text-xs text-muted-foreground">= {fmtTon(wKg)}</span>}
          </Field>
        )}
        {trade && (
          <Field id="f-rate" label="Rate (Rs per kg)">
            <Input inputMode="decimal" className="num text-right" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="e.g. 142" />
          </Field>
        )}
        <Field id="f-amount" label={autoAmt ? "Amount (auto)" : "Amount (Rs)"}>
          <Input id="entry-amount" inputMode="decimal" className="num text-right" readOnly={autoAmt} value={autoAmt ? String(amt) : amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="0" />
        </Field>
        {trade && !initial && (
          <Field id="f-saletype" label={type === "purchase" ? "Purchase Type *" : "Sale Type *"}>
            <NativeSelect value={payMode} onChange={(e) => setPayMode(e.target.value as "credit" | "net")}>
              <option value="" disabled>Select {type === "purchase" ? "purchase" : "sale"} type…</option>
              <option value="credit">{type === "purchase" ? "Credit Purchase (payable)" : "Credit Sale (receivable)"}</option>
              <option value="net">{type === "purchase" ? "Net Purchase (balance unchanged)" : "Net Sale (balance unchanged)"}</option>
            </NativeSelect>
          </Field>
        )}
      </div>

      {amt > 0 && <p className="-mt-2 text-right text-xs text-muted-foreground">{amountInWords(amt)}</p>}

      {showPay && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Field label="Payment Method">
            <NativeSelect value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
              {Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </NativeSelect>
          </Field>
          {method === "cash" && (
            <Field label="Received By">
              <TitleInput value={receivedBy} onValueChange={setReceivedBy} placeholder="Name (optional)" />
            </Field>
          )}
          {method === "cheque" && (
            <Field label="Cheque No. (optional)">
              <Input value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} className="num" />
            </Field>
          )}
          {method !== "cash" && (
            <Field id="f-bank" label="Bank Account *" className="col-span-2">
              <div className="flex gap-2">
                <NativeSelect value={bankId} onChange={(e) => {
                  const v = e.target.value;
                  if (v.startsWith("pk:")) {
                    const name = v.slice(3);
                    const ex = liveBanks(getData()).find((b) => b.name === name);
                    const b = ex ?? addBank({ name, openingBalance: 0 });
                    setBankId(b.id); setBank(b.name); return;
                  }
                  setBankId(v); setBank(d.banks.find((b) => b.id === v)?.name ?? "");
                }}>
                  <option value="" disabled>Select bank…</option>
                  {liveBanks(d).length > 0 && <optgroup label="My accounts">{liveBanks(d).map((b) => <option key={b.id} value={b.id}>{b.name}{b.accountNo ? ` · ${b.accountNo}` : ""}</option>)}</optgroup>}
                  <optgroup label="Pakistani banks">{PK_BANKS.filter((n) => !liveBanks(d).some((b) => b.name === n)).map((n) => <option key={n} value={`pk:${n}`}>{n}</option>)}</optgroup>
                </NativeSelect>
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={async () => {
                  const name = await names.ask("New bank account", "e.g. Meezan Bank");
                  if (name) { const b = addBank({ name: cap(name), openingBalance: 0 }); setBankId(b.id); setBank(b.name); }
                }}>+ New</Button>
              </div>
            </Field>
          )}
          {method === "online" && (
            <Field label="Transaction Reference (optional)">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
          )}
        </div>
      )}

      <div className="grid gap-4">
        <Field label={trade ? "Remarks" : "Particulars"}>
          {trade ? <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (optional)" /> : <TitleInput value={particulars} onValueChange={setParticulars} placeholder="Details / remarks" />}
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <span className="mr-auto text-xs text-muted-foreground">Press <kbd className="rounded border bg-secondary px-1">Ctrl</kbd>+<kbd className="rounded border bg-secondary px-1">S</kbd> to save</span>
        {!initial && <Button type="button" variant="ghost" onClick={reset}>Clear</Button>}
        <Button type="submit" variant={meta.flow === "in" ? "success" : meta.flow === "out" ? "destructive" : "default"}>
          {initial ? "Update Entry" : `Save ${meta.label}`}
        </Button>
      </div>
      <ConfirmSave open={!!pending} title={initial ? `Update Voucher V-${initial.voucherNo}?` : `Save ${meta.label}?`} rows={pending?.rows ?? []}
        confirmLabel={initial ? "Confirm & Update" : "Confirm & Save"}
        onCancel={() => setPending(null)}
        onConfirm={() => { const p = pending; setPending(null); p?.save(); }} />
    </form>
  );
}
