import { toast } from "sonner";

/** Signature of the app version: the script files the page loads change on every publish. */
const sig = (html: string) => (html.match(/\/assets\/[^"' ]+\.js/g) ?? []).sort().join("|");

/** Compares the running version with the latest published one; offers a reload when newer. */
export async function checkForUpdate(manual = false) {
  // Update checks are opt-in only; never interrupt normal use with an automatic alert.
  if (!manual) return;
  try {
    const current = sig(document.documentElement.outerHTML);
    const res = await fetch(`/?v=${Date.now()}`, { cache: "no-store" });
    const latest = sig(await res.text());
    if (latest && current && latest !== current) {
      toast("New version available", { id: "manual-app-update", duration: 6000, action: { label: "Update Now", onClick: () => location.reload() } });
    } else if (manual) toast.success("App is already up to date");
  } catch {
    if (manual) toast.error("Could not check for updates — you may be offline");
  }
}
