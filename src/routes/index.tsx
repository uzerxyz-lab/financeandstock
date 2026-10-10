import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Delete, Divide, Equal, Minus, Percent, Plus, X } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Classic Calculator" },
      {
        name: "description",
        content:
          "A classic pocket calculator with a clean design — add, subtract, multiply, divide, percentages, and keyboard support.",
      },
      { property: "og:title", content: "Classic Calculator" },
      {
        property: "og:description",
        content:
          "A classic pocket calculator with a clean design — add, subtract, multiply, divide, percentages, and keyboard support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalculatorPage,
});

type Operator = "+" | "-" | "×" | "÷";

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  if (Number.isInteger(value) && Math.abs(value) < 1e15) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  const rounded = parseFloat(value.toPrecision(12));
  return String(rounded);
}

function apply(a: number, b: number, op: Operator): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

function CalculatorPage() {
  const [display, setDisplay] = useState("0");
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<Operator | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(true);
  const [lastEquals, setLastEquals] = useState<{
    operand: number;
    op: Operator;
  } | null>(null);

  const clearAll = useCallback(() => {
    setDisplay("0");
    setAccumulator(null);
    setPendingOp(null);
    setWaitingForOperand(true);
    setLastEquals(null);
  }, []);

  const inputDigit = useCallback(
    (digit: string) => {
      setLastEquals(null);
      if (waitingForOperand) {
        setDisplay(digit);
        setWaitingForOperand(false);
      } else {
        setDisplay((d) =>
          d.replace(/,/g, "").length >= 12 ? d : d === "0" ? digit : d + digit,
        );
      }
    },
    [waitingForOperand],
  );

  const inputDot = useCallback(() => {
    setLastEquals(null);
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else {
      setDisplay((d) => (d.includes(".") ? d : d + "."));
    }
  }, [waitingForOperand]);

  const chooseOperator = useCallback(
    (op: Operator) => {
      const current = parseFloat(display.replace(/,/g, ""));
      if (pendingOp && accumulator !== null && !waitingForOperand) {
        const result = apply(accumulator, current, pendingOp);
        setAccumulator(result);
        setDisplay(formatNumber(result));
      } else {
        setAccumulator(current);
      }
      setPendingOp(op);
      setWaitingForOperand(true);
      setLastEquals(null);
    },
    [accumulator, display, pendingOp, waitingForOperand],
  );

  const equals = useCallback(() => {
    const current = parseFloat(display.replace(/,/g, ""));
    if (pendingOp && accumulator !== null) {
      const result = apply(accumulator, current, pendingOp);
      setDisplay(formatNumber(result));
      setLastEquals({ operand: current, op: pendingOp });
      setAccumulator(null);
      setPendingOp(null);
      setWaitingForOperand(true);
    } else if (lastEquals) {
      const result = apply(current, lastEquals.operand, lastEquals.op);
      setDisplay(formatNumber(result));
      setWaitingForOperand(true);
    }
  }, [accumulator, display, lastEquals, pendingOp]);

  const backspace = useCallback(() => {
    if (waitingForOperand) return;
    setDisplay((d) => {
      const next = d.length <= 1 || (d.length === 2 && d.startsWith("-"))
        ? "0"
        : d.slice(0, -1);
      return next;
    });
  }, [waitingForOperand]);

  const toggleSign = useCallback(() => {
    setDisplay((d) =>
      d === "0" || d === "Error" ? d : d.startsWith("-") ? d.slice(1) : "-" + d,
    );
  }, []);

  const percent = useCallback(() => {
    const current = parseFloat(display.replace(/,/g, ""));
    setDisplay(formatNumber(current / 100));
    setWaitingForOperand(true);
  }, [display]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") inputDigit(e.key);
      else if (e.key === "." || e.key === ",") inputDot();
      else if (e.key === "+") chooseOperator("+");
      else if (e.key === "-") chooseOperator("-");
      else if (e.key === "*" || e.key === "x") chooseOperator("×");
      else if (e.key === "/") {
        e.preventDefault();
        chooseOperator("÷");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        equals();
      } else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape" || e.key.toLowerCase() === "c") clearAll();
      else if (e.key === "%") percent();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    inputDigit,
    inputDot,
    chooseOperator,
    equals,
    backspace,
    clearAll,
    percent,
  ]);

  const expression =
    accumulator !== null && pendingOp
      ? `${formatNumber(accumulator)} ${pendingOp}`
      : "\u00A0";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-xs">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-foreground/10">
          {/* Display */}
          <div className="flex flex-col items-end justify-end gap-1 px-6 pb-4 pt-10">
            <div className="h-5 text-sm text-muted-foreground tabular-nums">
              {expression}
            </div>
            <div
              className="w-full overflow-hidden text-right text-5xl font-light tracking-tight text-card-foreground tabular-nums"
              aria-live="polite"
              aria-label={`Display: ${display}`}
            >
              {display}
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-2 p-4">
            <CalcButton variant="function" onClick={clearAll} label="AC" />
            <CalcButton
              variant="function"
              onClick={toggleSign}
              label="+/−"
              ariaLabel="Toggle sign"
            />
            <CalcButton
              variant="function"
              onClick={percent}
              ariaLabel="Percent"
            >
              <Percent className="h-5 w-5" />
            </CalcButton>
            <CalcButton
              variant="operator"
              active={pendingOp === "÷" && waitingForOperand}
              onClick={() => chooseOperator("÷")}
              ariaLabel="Divide"
            >
              <Divide className="h-5 w-5" />
            </CalcButton>

            <CalcButton onClick={() => inputDigit("7")} label="7" />
            <CalcButton onClick={() => inputDigit("8")} label="8" />
            <CalcButton onClick={() => inputDigit("9")} label="9" />
            <CalcButton
              variant="operator"
              active={pendingOp === "×" && waitingForOperand}
              onClick={() => chooseOperator("×")}
              ariaLabel="Multiply"
            >
              <X className="h-5 w-5" />
            </CalcButton>

            <CalcButton onClick={() => inputDigit("4")} label="4" />
            <CalcButton onClick={() => inputDigit("5")} label="5" />
            <CalcButton onClick={() => inputDigit("6")} label="6" />
            <CalcButton
              variant="operator"
              active={pendingOp === "-" && waitingForOperand}
              onClick={() => chooseOperator("-")}
              ariaLabel="Subtract"
            >
              <Minus className="h-5 w-5" />
            </CalcButton>

            <CalcButton onClick={() => inputDigit("1")} label="1" />
            <CalcButton onClick={() => inputDigit("2")} label="2" />
            <CalcButton onClick={() => inputDigit("3")} label="3" />
            <CalcButton
              variant="operator"
              active={pendingOp === "+" && waitingForOperand}
              onClick={() => chooseOperator("+")}
              ariaLabel="Add"
            >
              <Plus className="h-5 w-5" />
            </CalcButton>

            <CalcButton onClick={backspace} ariaLabel="Backspace">
              <Delete className="h-5 w-5" />
            </CalcButton>
            <CalcButton onClick={() => inputDigit("0")} label="0" />
            <CalcButton onClick={inputDot} label="." />
            <CalcButton variant="equals" onClick={equals} ariaLabel="Equals">
              <Equal className="h-5 w-5" />
            </CalcButton>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Keyboard supported — digits, + − * /, Enter, Backspace, Esc
        </p>
      </div>
    </div>
  );
}

function CalcButton({
  children,
  label,
  onClick,
  variant = "digit",
  active = false,
  ariaLabel,
}: {
  children?: React.ReactNode;
  label?: string;
  onClick: () => void;
  variant?: "digit" | "function" | "operator" | "equals";
  active?: boolean;
  ariaLabel?: string;
}) {
  const base =
    "flex h-14 items-center justify-center rounded-2xl text-xl font-medium transition-all active:scale-95 select-none";
  const styles = {
    digit:
      "bg-secondary text-secondary-foreground hover:bg-secondary/70",
    function:
      "bg-muted text-muted-foreground hover:bg-muted/70 text-base",
    operator: active
      ? "bg-primary-foreground text-primary"
      : "bg-primary text-primary-foreground hover:bg-primary/90",
    equals: "bg-primary text-primary-foreground hover:bg-primary/90",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={`${base} ${styles[variant]}`}
    >
      {children ?? label}
    </button>
  );
}
