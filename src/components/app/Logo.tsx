import { blackLogo, whiteLogo } from "@/lib/logo-images";
import { cn } from "@/lib/utils";

/** Theme-aware logo: black text on light, white text on dark, always black when printed. */
export function Logo({ className }: { className?: string }) {
  return (
    <>
      <img src={blackLogo} width={1994} height={409} loading="eager" alt="Mussa Enterprises" className={cn("logo-light object-contain max-w-full shrink-0", className)} />
      <img src={whiteLogo} width={1920} height={394} loading="eager" alt="" aria-hidden="true" className={cn("logo-dark object-contain max-w-full shrink-0", className)} />
    </>
  );
}
