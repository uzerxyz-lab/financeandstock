import { createFileRoute } from "@tanstack/react-router";
import { BusinessEntries } from "@/components/app/BusinessEntries";
export const Route = createFileRoute("/purchases")({
  head: () => ({ meta: [{ title: "Purchase Ledger — Mussa Enterprises" }, { name: "description", content: "Supplier purchase ledger and purchase vouchers." }, { property: "og:title", content: "Purchase Ledger — Mussa Enterprises" }, { property: "og:description", content: "Supplier purchase ledger and purchase vouchers." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <BusinessEntries type="purchase" title="Purchase Ledger" accountType="supplier" />,
});