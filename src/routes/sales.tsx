import { createFileRoute } from "@tanstack/react-router";
import { BusinessEntries } from "@/components/app/BusinessEntries";
export const Route = createFileRoute("/sales")({
  head: () => ({ meta: [{ title: "Sales Ledger — Mussa Enterprises" }, { name: "description", content: "Buyer sales ledger and sale vouchers." }, { property: "og:title", content: "Sales Ledger — Mussa Enterprises" }, { property: "og:description", content: "Buyer sales ledger and sale vouchers." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <BusinessEntries type="sale" title="Sales Ledger" accountType="buyer" />,
});