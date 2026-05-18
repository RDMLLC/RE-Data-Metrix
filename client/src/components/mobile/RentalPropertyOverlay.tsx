import { X, Home as HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import RentalCalculatorForm from "@/components/RentalCalculatorForm";
import logoImg from "@assets/Transparent Logo_1762969260481.png";

interface RentalPropertyOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RentalPropertyOverlay({
  isOpen,
  onClose,
}: RentalPropertyOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      className="mobile-overlay fixed inset-0 bg-background z-[10001] flex flex-col"
      style={{ height: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-label="Rental Property Calculator"
      data-testid="overlay-rental-property"
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0">
        <img src={logoImg} alt="RE Data Metrix" className="h-10 w-10 shrink-0" />
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <HomeIcon className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-base font-semibold truncate">
            Rental Property Calculator
          </h2>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close"
          data-testid="button-rental-overlay-close"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <RentalCalculatorForm variant="overlay" />
        <div className="text-xs text-muted-foreground text-center mt-6 pt-4 border-t">
          No account required. Results are estimates for educational purposes.
        </div>
      </main>
    </div>
  );
}
