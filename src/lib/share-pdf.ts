/** Captures an on-screen element exactly as shown and shares it as a PNG image (falls back to download). */
export async function shareElementAsImage(el: HTMLElement, fileName: string, title: string) {
  const { default: html2canvas } = await import("html2canvas-pro");
  // Finish decoding visible images before taking the voucher snapshot.
  await Promise.all(Array.from(el.querySelectorAll("img")).filter((img) => getComputedStyle(img).display !== "none").map((img) => img.decode()));
  const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
  const canvas = await html2canvas(el, {
    scale: 2, backgroundColor: bg, useCORS: true,
    onclone: (doc) => {
      doc.querySelectorAll<HTMLElement>("[data-share-hide]").forEach((n) => (n.style.display = "none"));
      doc.querySelectorAll<HTMLElement>("[data-share-show]").forEach((n) => (n.style.display = "block"));
    },
  });
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("no image"))), "image/png"));
  const file = new File([blob], fileName, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return "shared"; }
    catch (err) { if ((err as Error).name === "AbortError") return "cancelled"; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded";
}
