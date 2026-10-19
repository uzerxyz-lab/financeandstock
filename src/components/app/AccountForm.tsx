import { useState } from "react";
import { toast } from "sonner";
import { fieldError } from "@/lib/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect, TitleInput } from "./inputs";
import { useNamePrompt } from "./NameDialog";
import { addAccount, addAccountType, accountTypeLabel, previewCode, searchAccounts, updateAccount, useData, ACCOUNT_TYPES, type Account, type AccountType } from "@/lib/db";

export function AccountForm({ initial, onSaved }: { initial?: Account; onSaved?: (a?: Account) => void }) {
  const d = useData();
  const names = useNamePrompt();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [wages, setWages] = useState(initial?.fixedWages ? String(initial.fixedWages) : "");
  const [idCard, setIdCard] = useState(initial?.idCard ?? "");
  const [balanceSide, setBalanceSide] = useState<"receivable" | "payable" | "">(!initial?.openingBalance ? "" : initial.openingBalance < 0 ? "payable" : "receivable");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [opening, setOpening] = useState(initial ? String(initial.openingBalance || "") : "");
  const similar = !initial && name.trim().length >= 2 ? searchAccounts(d, name, 4, type || undefined) : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) { fieldError("f-acctype", "Please select an account type"); return; }
    if (!name.trim()) { fieldError("f-accname", "Account name is required"); return; }
    const openingAmount = Math.abs(Number(opening.replace(/,/g, "")) || 0);
    if (type !== "worker" && openingAmount > 0 && !balanceSide) { fieldError("f-balside", "Please select the balance type"); return; }
    const payload = { name: name.trim(), type, title: title.trim(), fixedWages: Number(wages.replace(/,/g, "")) || undefined, idCard: idCard.trim(), phone: phone.trim(), address: address.trim(), openingBalance: balanceSide === "payable" ? -openingAmount : openingAmount };
    const save = () => {
    if (initial) {
      updateAccount(initial.id, payload);
      toast.success("Account updated");
      onSaved?.();
    } else {
      const a = addAccount(payload);
      toast.success(`Account created · ${a.code}`);
      setName(""); setPhone(""); setAddress(""); setOpening(""); setBalanceSide("");
      onSaved?.(a);
    }
    };
    const rows: ConfirmRow[] = [
      ["Account Type", accountTypeLabel(d, type)], ["Name", payload.name],
      ["Short ID", initial ? initial.code : previewCode(payload.name)],
      ["Fixed Wages", type === "worker" && payload.fixedWages ? `Rs ${payload.fixedWages.toLocaleString("en-PK")}` : undefined],
      ["ID Card", type === "worker" ? payload.idCard : undefined],
      ["Phone", payload.phone], ["Address", payload.address],
      ["Opening Balance", type !== "worker" && openingAmount ? `Rs ${openingAmount.toLocaleString("en-PK")} · ${balanceSide === "payable" ? "Payable (We Owe Them)" : "Receivable (They Owe Us)"}` : undefined],
    ];
    setPending({ rows, save });
  };
  const [pending, setPending] = useState<{ rows: ConfirmRow[]; save: () => void } | null>(null);

  return (
    <form onSubmit={submit} className="space-y-4">
      {names.node}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="f-acctype" label="Account Type *">
          <NativeSelect value={type} onChange={async (e) => {
            if (e.target.value === "__new") {
              const value = await names.ask("New account type", "e.g. Transporter");
              if (value) setType(addAccountType(value).id);
            } else setType(e.target.value);
          }}>
            <option value="" disabled>Select account type…</option>
            {Object.entries(ACCOUNT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            {d.accountTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            <option value="__new">+ New Account Type</option>
          </NativeSelect>
        </Field>
        <Field id="f-accname" label="Account Name *" className="sm:col-span-2">
          <TitleInput autoFocus value={name} onValueChange={setName} placeholder="e.g. Ali Traders" />
        </Field>
        <Field label="Short ID">
          <div className="num flex h-9 items-center rounded-md border border-dashed bg-surface px-3 text-sm font-semibold text-primary">
            {initial ? initial.code : name.trim() ? previewCode(name) : "—"}
          </div>
        </Field>
      </div>
      {similar.length > 0 && (
        <div className="rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs">
          Similar accounts already exist: {similar.map((a) => `${a.name} (${a.code})`).join(", ")}
        </div>
      )}
      {type === "worker" && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fixed Wages (optional)"><Input inputMode="decimal" value={wages} onChange={(e) => setWages(e.target.value.replace(/[^0-9.,]/g, ""))} /></Field>
        <Field label="ID Card No. (optional)"><Input value={idCard} onChange={(e) => setIdCard(e.target.value)} /></Field>
      </div>}
      <Field label="Phone (optional)">
        <Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="Address (optional)">
        <TitleInput value={address} onValueChange={setAddress} />
      </Field>
      {type !== "worker" && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Opening Balance (optional)">
          <Input className="num text-right" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value.replace(/[^0-9.,-]/g, ""))} placeholder="0" />
        </Field>
        <Field id="f-balside" label="Balance Type"><NativeSelect disabled={!(Math.abs(Number(opening.replace(/,/g, "")) || 0) > 0)} value={balanceSide} onChange={(e) => setBalanceSide(e.target.value as "receivable" | "payable")}><option value="" disabled>Select balance type…</option><option value="receivable">Receivable — They Owe Us</option><option value="payable">Payable — We Owe Them</option></NativeSelect></Field>
      </div>}
      <p className="text-xs text-muted-foreground">Creating {accountTypeLabel(d, type)} account. Only the name is required.</p>
      <div className="flex justify-end">
        <Button type="submit">{initial ? "Update Account" : "Create Account"}</Button>
      </div>
    </form>
  );
}
