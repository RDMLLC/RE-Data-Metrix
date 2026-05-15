import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@assets/Transparent Logo_1762969260481.png";

interface DealAnalysisOverlayProps {
  currentStep: number;
  onNext: () => void;
  onBack: () => void;
  onClose?: () => void;
  children: React.ReactNode;
  nextLabel?: string;
  backLabel?: string;
  isNextDisabled?: boolean;
}

const TOTAL_STEPS = 6;

export default function DealAnalysisOverlay({
  currentStep,
  onNext,
  onBack,
  onClose,
  children,
  nextLabel = "Continue",
  backLabel = "Back",
  isNextDisabled = false,
}: DealAnalysisOverlayProps) {
  const [, setLocation] = useLocation();
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!isMobile) {
    return null;
  }

  const handleClose = () => {
    if (onClose) onClose();
    setLocation("/deal-analysis/about");
  };

  const safeStep = Math.min(Math.max(currentStep, 1), TOTAL_STEPS);
  const progressPct = (safeStep / TOTAL_STEPS) * 100;

  return (
    <div
      className="fixed inset-0 bg-background z-[9999] flex flex-col"
      style={{ width: "100vw", height: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-label="Deal Analysis"
      data-testid="overlay-deal-analysis"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img src={logoImg} alt="RE Data Metrix" className="h-8 w-8" />
          <span className="font-bold text-base text-primary truncate">
            RE Data Metrix
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleClose}
          aria-label="Close"
          data-testid="button-overlay-close"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      <div className="px-4 py-2 border-b border-border shrink-0">
        <p
          className="text-center text-xs text-muted-foreground mb-1.5"
          data-testid="text-step-indicator"
        >
          Step {safeStep} of {TOTAL_STEPS}
        </p>
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
            data-testid="bar-step-progress"
          />
        </div>
      </div>

      <main
        className="flex-1 overflow-y-auto overscroll-contain"
        data-testid="container-overlay-body"
      >
        {children}
      </main>

      <footer className="border-t border-border bg-background px-4 py-3 flex items-center justify-between gap-3 shrink-0">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={safeStep <= 1}
          data-testid="button-overlay-back"
        >
          {backLabel}
        </Button>
        <Button
          onClick={onNext}
          disabled={isNextDisabled}
          data-testid="button-overlay-next"
        >
          {nextLabel}
        </Button>
      </footer>
    </div>
  );
}
