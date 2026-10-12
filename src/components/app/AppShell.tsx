import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  LayoutDashboard, ListOrdered, Users, BookOpen, Receipt, Wallet, ShieldCheck, Settings, LogOut, Search, Menu, ArrowLeft, Lock, Moon, Sun, ShoppingCart, BadgeDollarSign, HandCoins, RefreshCw, CloudUpload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountSearch, Field, TitleInput } from "./inputs";
import { changePassword, checkPw, getData, loadData, matchesRecovery, redo, setupAuth, takeSnapshot, undo, useData, useLoaded } from "@/lib/db";
import { norm } from "@/lib/format";
import { Logo } from "@/components/app/Logo";
import { mussaMark, whiteLogo } from "@/lib/logo-images";
import loginBg from "@/assets/login-industrial.webp.asset.json";
import nexumLogo from "@/assets/nexum-systems.webp.asset.json";
import { backupToCloud, scheduleAutoBackup } from "@/lib/cloud";
import { checkForUpdate } from "@/lib/update";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/entries", label: "All Entries", icon: ListOrdered },
  { to: "/accounts", label: "Accounts", icon: Users },
  { to: "/sales", label: "Sales", icon: BadgeDollarSign },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/workers", label: "Workers", icon: Users },
  { to: "/loans", label: "Personal Loans", icon: HandCoins },
  { to: "/cashbook", label: "Cash Book", icon: Wallet },
  { to: "/banks", label: "Cash & Banks", icon: Wallet },
  { to: "/opening", label: "Opening Balances", icon: BookOpen },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/reports", label: "Reports", icon: BookOpen },
  { to: "/admin", label: "Admin Panel", icon: ShieldCheck },
  { to: "/settings", label: "Settings & Backup", icon: Settings },
] as const;

const SESSION = "cashbook-session";
const LOGGED_OUT = "cashbook-logged-out";

function isTextField(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
}

function useShortcuts() {
  const navigate = useNavigate();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      const active = document.activeElement;
      if (k === "s") {
        e.preventDefault();
        const form = (active?.closest("form") as HTMLFormElement | null) ?? (document.querySelector("form[data-entry-form]") as HTMLFormElement | null);
        form?.requestSubmit();
      } else if ((k === "z" && !e.shiftKey) && !isTextField(active)) {
        e.preventDefault();
        toast(undo() ? "Undone" : "Nothing to undo");
      } else if ((k === "y" || (k === "z" && e.shiftKey)) && !isTextField(active)) {
        e.preventDefault();
        toast(redo() ? "Redone" : "Nothing to redo");
      } else if (k === "f") {
        e.preventDefault();
        (document.getElementById("global-search") as HTMLInputElement | null)?.focus();
      } else if (k === "p") {
        e.preventDefault();
        window.print();
      } else if (k === "n") {
        e.preventDefault();
        navigate({ to: "/" }).then(() => setTimeout(() => document.getElementById("entry-account")?.focus() ?? document.getElementById("entry-amount")?.focus(), 50));
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [navigate]);
}

export function AppShell() {
  const loaded = useLoaded();
  const d = useData();
  const [authed, setAuthed] = useState(false);
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    loadData();
    setAuthed(sessionStorage.getItem(SESSION) === "1");
    setDark(localStorage.getItem("cashbook-theme") === "dark");
  }, []);
  useEffect(() => {
    if (dark === null) return;
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("cashbook-theme", dark ? "dark" : "light");
  }, [dark]);

  if (!loaded) return <div className="flex min-h-screen items-center justify-center bg-background"><img src={mussaMark} alt="Mussa Enterprises" className="h-14 w-14 object-contain" /></div>;
  if (!d.auth || !authed) return <Login firstRun={!d.auth} requireUsername={localStorage.getItem(LOGGED_OUT) === "1"} onDone={() => { sessionStorage.setItem(SESSION, "1"); localStorage.removeItem(LOGGED_OUT); setAuthed(true); }} />;
  return <Shell dark={dark ?? false} onToggleTheme={() => setDark((v) => !v)} onLogout={(full?: boolean) => { sessionStorage.removeItem(SESSION); if (full) localStorage.setItem(LOGGED_OUT, "1"); setAuthed(false); }} />;
}

function Shell({ onLogout, dark, onToggleTheme }: { onLogout: (full?: boolean) => void; dark: boolean; onToggleTheme: () => void }) {
  useShortcuts();
  const data = useData();
  useEffect(() => { scheduleAutoBackup(); }, [data]);
  useEffect(() => {
    takeSnapshot();
    const t = setInterval(takeSnapshot, 30 * 60 * 1000);
    const h = () => takeSnapshot();
    window.addEventListener("beforeunload", h);
    return () => { clearInterval(t); window.removeEventListener("beforeunload", h); };
  }, []);
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useLocation({ select: (l) => l.pathname });
  return (
    <div className="min-h-screen bg-background">
      <div className="no-print sticky top-0 z-30">
      <header className="bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 pt-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <button aria-label="Menu" className="shrink-0 p-1.5 text-foreground"><Menu className="h-5 w-5" /></button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b p-4"><SheetTitle><Logo className="h-auto w-44" /></SheetTitle></SheetHeader>
                <div className="space-y-1 p-3">
                  <SheetClose asChild>
                    <button onClick={() => router.history.back()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-surface"><ArrowLeft className="h-4 w-4" /> Back</button>
                  </SheetClose>
                  <div className="my-2 border-t" />
                  {NAV.map((n) => (
                    <SheetClose asChild key={n.to}>
                      <Link to={n.to} activeOptions={{ exact: n.to === "/" }} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-surface" activeProps={{ className: "bg-accent font-medium text-accent-foreground" }}>
                        <n.icon className="h-4 w-4" /> {n.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <div className="my-2 border-t" />
                   <Button variant="ghost" onClick={onToggleTheme} className="w-full justify-start gap-3 px-3">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {dark ? "Day mode" : "Night mode"}</Button>
                  <SheetClose asChild>
                    <button onClick={() => checkForUpdate(true)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-surface"><RefreshCw className="h-4 w-4" /> Check for updates</button>
                  </SheetClose>
                  <button onClick={() => onLogout(true)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-surface"><LogOut className="h-4 w-4" /> Log out</button>
                </div>
              </SheetContent>
            </Sheet>
            <Link to="/" className="min-w-0"><Logo className="h-auto w-36 sm:w-44" /></Link>
          </div>
          <div className="flex items-center gap-1">
            <SyncButton />
            <button onClick={() => onLogout()} aria-label="Lock app" title="Lock app" className="p-2 text-muted-foreground hover:text-foreground"><Lock className="h-5 w-5" /></button>
             <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label="Toggle theme" title="Toggle theme" className="text-muted-foreground hover:text-foreground">{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</Button>
          </div>
        </div>
          {pathname === "/" && (
            <div className="pl-[60px] pr-4 pb-1 pt-1 sm:pl-[68px]">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Finance Control Dashboard</h1>
            </div>
          )}
        </header>
        <div className="border-b bg-card">
          <div className="mx-auto flex w-full max-w-xl items-center gap-2 px-4 py-2 sm:px-6"><div className="flex w-full items-center gap-2 rounded-full border bg-background px-4 py-1">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <AccountSearch
              id="global-search"
              clearOnSelect
              className="w-full [&_input]:border-0 [&_input]:bg-transparent [&_input]:shadow-none [&_input]:focus-visible:ring-0"
              placeholder="Search accounts…  (Ctrl+F)"
              onSelect={(a) => navigate({ to: "/ledger/$id", params: { id: a.id } })}
            />
          </div></div>
        </div>
      </div>
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
        <PageBackBar />
        <Outlet />
      </main>
    </div>
  );
}

// Visible step-back controls on every page except the dashboard.
function PageBackBar() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const router = useRouter();
  if (pathname === "/") return null;
  const goBack = () => { if (window.history.length > 1) router.history.back(); else router.navigate({ to: "/" }); };
  return (
    <div className="no-print -mt-1 mb-3 flex items-center gap-1">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={goBack}><ArrowLeft /> Back</Button>
      <Button asChild variant="ghost" size="sm"><Link to="/"><LayoutDashboard /> Dashboard</Link></Button>
    </div>
  );
}

function LoginArrow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 112 100" className={`login-arrow ${className}`}>
      <path className="login-arrow-main" d="M12 10 L62 50 L12 90 Z" fill="currentColor" />
      <path className="login-arrow-trail" d="M55 14 L100 50 L55 86" fill="none" strokeWidth="7" strokeLinejoin="miter" />
      <path className="login-arrow-trail login-arrow-trail-2" d="M40 22 L78 50 L40 78" fill="none" strokeWidth="7" strokeLinejoin="miter" />
    </svg>
  );
}

function Login({ firstRun: needsSetup, onDone, requireUsername }: { firstRun: boolean; onDone: () => void; requireUsername: boolean }) {
  // First install has no credentials yet: land directly on the setup form.
  const firstRun = needsSetup;
  const [company, setCompany] = useState("Mussa Enterprises");
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [recovery, setRecovery] = useState("");
  const needUser = firstRun || forgot || requireUsername;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((needUser && !username.trim()) || !pw) { toast.error(needUser ? "Username and PIN are required" : "PIN is required"); return; }
    setBusy(true);
    if (forgot) {
      const d = getData();
      const ok = d.auth && norm(username) === norm(d.auth.username) && matchesRecovery(recovery);
      if (!ok) { setBusy(false); toast.error("Username and registered email or phone do not match"); return; }
      if (!/^\d{4,8}$/.test(pw) || pw !== pw2) { setBusy(false); toast.error("PINs must match and contain 4 to 8 digits"); return; }
      await changePassword(pw);
      toast.success("Password reset. You are signed in.");
      setBusy(false);
      onDone();
      return;
    }
    if (firstRun) {
      if (!/^\d{4,8}$/.test(pw)) { setBusy(false); toast.error("PIN must contain 4 to 8 digits"); return; }
      if (pw !== pw2) { setBusy(false); toast.error("PINs do not match"); return; }
      if (!recovery.trim()) { setBusy(false); toast.error("Recovery email or phone is required"); return; }
      await setupAuth(username.trim(), pw, company.trim(), recovery.includes("@") ? recovery : "", recovery.includes("@") ? "" : recovery);
      onDone();
    } else if (await checkPw(pw, needUser ? username : undefined)) onDone();
    else toast.error(needUser ? "Wrong username or PIN" : "Wrong PIN");
    setBusy(false);
  };

  return (
    <div className="login-screen relative grid min-h-screen bg-login-backdrop md:grid-cols-[58%_42%]">
      {/* Mobile backdrop: same industrial photo + dark overlay behind the glass card */}
      <div aria-hidden="true" className="absolute inset-0 md:hidden">
        <img src={loginBg.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-login-glass/70 via-login-tint/55 to-login-glass/70" />
        <div className="login-mobile-vignette absolute inset-0" />
      </div>
      {/* Mobile corner accents */}
      <div aria-hidden="true" className="pointer-events-none absolute right-5 top-4 z-10 md:hidden">
        <LoginArrow className="login-arrow-top" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-4 left-5 z-10 md:hidden">
        <LoginArrow className="login-arrow-bottom" />
      </div>
      <div className="pointer-events-none absolute bottom-4 right-5 z-10 flex items-center gap-1.5 text-[10px] text-login-foreground/70 md:hidden">
        <span>Developed by</span>
        <img src={nexumLogo.url} alt="nexum systems" className="h-4 w-auto object-contain" />
      </div>
      <div
        className="login-split-panel relative z-10 hidden flex-col justify-between gap-12 overflow-hidden py-12 pl-8 pr-[22%] text-login-foreground md:flex lg:pl-12"
      >
        <img src={loginBg.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-login-glass/90 via-login-tint/75 to-login-glass/85" />
        <div className="login-desktop-vignette absolute inset-0" />
        <div aria-hidden="true" className="login-dot-mesh pointer-events-none absolute inset-0" />
        <div className="relative text-xs uppercase text-login-foreground/70">Mussa Enterprises · Finance Control</div>
        <div className="relative">
          <h2 className="text-3xl font-semibold leading-tight lg:text-4xl xl:text-5xl">
            Control your business<br />and finance your way
            <span className="ml-1 inline-flex items-center gap-2 align-middle">
              …<LoginArrow className="login-arrow-heading" />
            </span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-login-foreground/80">Run your business with clarity and manage your finances with the help of a built-in AI-enabled voice assistant that handles your cash flow. Make smarter moves, stay in control, and grow on your own terms.</p>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-login-foreground/70">
          <span>Developed by</span>
          <img src={nexumLogo.url} alt="nexum systems" className="h-5 w-auto object-contain" />
        </div>
      </div>
      <div className="relative flex min-w-0 items-center justify-center px-6 pb-28 pt-48 md:px-4 md:py-8 lg:px-6">
        <form onSubmit={submit} className="dark w-full max-w-sm space-y-4 rounded-2xl border border-login-foreground/15 bg-login-glass/40 p-6 text-login-foreground shadow-2xl backdrop-blur-md md:border-login-foreground/10 md:bg-login-glass/65 md:backdrop-blur-xl lg:p-8">
          <img src={whiteLogo} alt="Mussa Enterprises" className="mx-auto mb-2 h-auto w-64 max-w-full object-contain" />
          <div className="border-t border-login-foreground/10 pt-4">
            <h1 className="text-xl font-semibold">{firstRun ? "Set Up Your Cash Control" : forgot ? "Reset password" : "Sign in"}</h1>
            <p className="mt-1 text-sm text-login-foreground/60">{firstRun ? "Configure master PIN and business access to secure your ledger." : forgot ? "Confirm your username and registered email or phone." : needUser ? "Enter your username and PIN." : "Enter your PIN to unlock."}</p>
          </div>
          {(firstRun || forgot) && (
            <Field label="Company / Business Name">
              <TitleInput value={company} onValueChange={setCompany} placeholder="e.g. Ahmad Steel" />
            </Field>
          )}
          {needUser && (
            <Field label="Username">
              <Input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
            </Field>
          )}
          {(firstRun || forgot) && <Field label="Recovery Email or Phone"><Input value={recovery} onChange={(e) => setRecovery(e.target.value)} /></Field>}
          <Field label={forgot ? "New PIN" : "PIN"}>
            <Input autoFocus={!needUser} type="password" inputMode="numeric" value={pw} onChange={(e) => setPw(e.target.value.replace(/\D/g, "").slice(0, 8))} />
          </Field>
          {(firstRun || forgot) && (
            <Field label="Confirm PIN">
              <Input type="password" inputMode="numeric" value={pw2} onChange={(e) => setPw2(e.target.value.replace(/\D/g, "").slice(0, 8))} />
            </Field>
          )}
          <Button type="submit" className="w-full" disabled={busy}>{firstRun ? "Create & Continue" : forgot ? "Reset & Sign in" : "Sign in"}</Button>
          {!needsSetup && (
            <Button type="button" variant="link" onClick={() => setForgot((v) => !v)} className="w-full">
              {forgot ? "Back to sign in" : "Forgot password?"}
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

/** Header Backup & Sync: one tap uploads to the cloud copy; opens settings when not signed in. */
function SyncButton() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { toast("Sign in to Cloud Backup to sync"); navigate({ to: "/settings" }); return; }
    if (!navigator.onLine) { toast.error("You are offline — backup will run when back online"); return; }
    setBusy(true);
    try { await backupToCloud(); toast.success("Backed up & synced"); } catch { toast.error("Backup failed, try again"); }
    setBusy(false);
  };
  return <button onClick={run} disabled={busy} aria-label="Backup & sync" title="Backup & sync" className="p-2 text-muted-foreground hover:text-foreground">{busy ? <RefreshCw className="h-5 w-5 animate-spin" /> : <CloudUpload className="h-5 w-5" />}</button>;
}
