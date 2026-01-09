import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CreditCard, PenLine, ArrowRight } from "lucide-react";

interface QuotaExhaustedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueManual: () => void;
}

export default function QuotaExhaustedModal({
  open,
  onOpenChange,
  onContinueManual,
}: QuotaExhaustedModalProps) {
  const handleContinueManual = () => {
    onContinueManual();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-quota-exhausted">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            Free Lookups Used
          </DialogTitle>
          <DialogDescription className="text-center">
            You've used your 2 free property lookups this month. Choose how you'd like to continue:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Link href="/pricing" className="block">
            <Button 
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-auto py-4"
              data-testid="button-upgrade-account"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">Upgrade Your Account</div>
                  <div className="text-xs opacity-80">Get unlimited property lookups</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto flex-shrink-0" />
              </div>
            </Button>
          </Link>

          <Button 
            variant="outline" 
            className="w-full h-auto py-4"
            onClick={handleContinueManual}
            data-testid="button-continue-manual"
          >
            <div className="flex items-center gap-3">
              <PenLine className="h-5 w-5 flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold">Continue with Manual Entry</div>
                <div className="text-xs text-muted-foreground">Enter property details yourself</div>
              </div>
            </div>
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Your free lookups reset at the beginning of each month.
        </p>
      </DialogContent>
    </Dialog>
  );
}
