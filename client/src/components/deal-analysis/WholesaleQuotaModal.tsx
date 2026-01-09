import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CreditCard, ArrowRight, ArrowLeft } from "lucide-react";

interface WholesaleQuotaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoBack: () => void;
}

export default function WholesaleQuotaModal({
  open,
  onOpenChange,
  onGoBack,
}: WholesaleQuotaModalProps) {
  const handleGoBack = () => {
    onGoBack();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-wholesale-quota-exhausted">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            Free Calculations Used
          </DialogTitle>
          <DialogDescription className="text-center">
            You've used your 2 free wholesale calculations this month. Choose how you'd like to continue:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Link href="/pricing" className="block">
            <Button 
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-auto py-4"
              data-testid="button-upgrade-wholesale"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">Upgrade Your Account</div>
                  <div className="text-xs opacity-80">Get unlimited wholesale calculations</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto flex-shrink-0" />
              </div>
            </Button>
          </Link>

          <Button 
            variant="outline" 
            className="w-full h-auto py-4"
            onClick={handleGoBack}
            data-testid="button-go-back"
          >
            <div className="flex items-center gap-3">
              <ArrowLeft className="h-5 w-5 flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold">Go Back</div>
                <div className="text-xs text-muted-foreground">Return to deal analysis</div>
              </div>
            </div>
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Your free calculations reset at the beginning of each month.
        </p>
      </DialogContent>
    </Dialog>
  );
}
