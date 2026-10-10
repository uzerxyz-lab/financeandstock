import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { shareElementAsImage } from "@/lib/share-pdf";
import { Button } from "@/components/ui/button";
import { PrintHeader } from "@/components/app/inputs";
import { useData, liveEntries, signedForAccount, ENTRY_TYPES, METHODS } from "@/lib/db";
import { amountInWords, fmtDate, fmtPKR, fmtTime } from "@/lib/format";

export const Route = createFileRoute("/voucher/$id")({
  head: () => ({
    meta: [
      { title: "Voucher — Mussa Enterprises Cash Book" },
      { name: "description", content: "Printable payment / receipt voucher." },
      { property: "og:title", content: "Voucher — Mussa Enterprises Cash Book" },
      { property: "og:description", content: "Printable payment / receipt voucher." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VoucherPage,
});

function Row({ label, value }: { label: string; value?: string | undefined }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-3 border-b py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 font-medium">{value}</span>
    </div>
  );
}

function VoucherPage() {
  const { id } = Route.useParams();
  const d = useData();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const e = d.entries.find((x) => x.id === id);
  if (!e) return <div className="py-20 text-center text-muted-foreground">Voucher not found. <Link to="/entries" className="text-primary hover:underline">Back</Link></div>;
  const a = d.accounts.find((x) => x.id === e.accountId);
  const previousBalance = a ? liveEntries(d).filter((x) => x.accountId === a.id && (x.date < e.date || (x.date === e.date && x.voucherNo < e.voucherNo))).reduce((balance, x) => balance + signedForAccount(x), a.openingBalance) : 0;
  const paymentNumber = e.method === "cheque" ? e.chequeNo : e.method === "online" ? e.reference : undefined;
  const bankDetails = [e.bank?.trim(), paymentNumber?.trim()].filter(Boolean).join(" — ");
  const meta = ENTRY_TYPES[e.type];
  const title = meta.flow === "in" ? "Receipt Voucher" : meta.flow === "out" ? "Payment Voucher" : `${meta.label} Voucher`;

  const share = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const r = await shareElementAsImage(ref.current, `Voucher-V-${e.voucherNo}.png`, `${title} V-${e.voucherNo}`);
      if (r === "downloaded") toast.success("Voucher image downloaded");
    } catch { toast.error("Could not create image"); }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex justify-end gap-2">
        <Button variant="outline" onClick={share} disabled={busy}><Share2 /> {busy ? "Preparing…" : "Share"}</Button>
        <Button onClick={() => window.print()}><Printer /> Print / PDF</Button>
      </div>
      <div ref={ref} className="print-area rounded-lg border bg-card p-8">
        <PrintHeader always title={title} sub={`V-${e.voucherNo}`} />
        {e.deletedAt && <div className="mb-3 rounded bg-danger-soft px-3 py-1.5 text-sm text-destructive">This voucher has been deleted.</div>}
        <Row label="Date / Time" value={`${fmtDate(e.date)} · ${fmtTime(e.createdAt)}`} />
        <Row label={meta.flow === "in" ? "Received From" : meta.flow === "out" ? "Paid To" : "Account"} value={a ? `${a.name} (${a.code})` : undefined} />
        <Row label="Category" value={d.categories.find((c) => c.id === e.categoryId)?.name} />
        <Row label="Particulars" value={e.particulars} />
        <Row label={e.type === "purchase" ? "Purchase Type" : "Sale Type"} value={e.type === "sale" || e.type === "purchase" ? e.payMode === "advance" ? "Net Payment" : "Credit Sale" : undefined} />
        <Row label="Remarks" value={e.remarks} />
        <Row label="Payment Method" value={e.method ? METHODS[e.method] : undefined} />
        <Row label="Bank" value={bankDetails || undefined} />
        <Row label="Previous Balance" value={a ? `${fmtPKR(Math.abs(previousBalance))}${previousBalance > 0 ? " · Receivable (Dr)" : previousBalance < 0 ? " · Payable (Cr)" : " · Settled"}` : undefined} />
        <div className="mt-6 rounded-md bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm uppercase tracking-wide text-muted-foreground">Amount</span>
            <span className="num text-2xl font-bold">{fmtPKR(e.amount)}</span>
          </div>
          <div className="mt-1 text-right text-sm italic">{amountInWords(e.amount)}</div>
        </div>
        <div data-share-hide className="mt-20 grid grid-cols-3 gap-6 text-center text-xs">
          <span className="border-t pt-1">Prepared By</span>
          <span className="border-t pt-1">Received By</span>
          <span className="border-t pt-1">Authorized Signature</span>
        </div>
        <p data-share-show style={{ display: "none" }} className="mt-6 text-center text-sm italic">Thank you for doing business with Mussa Enterprises!</p>
      </div>
    </div>
  );
}
