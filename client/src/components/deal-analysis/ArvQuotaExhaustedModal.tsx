import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CreditCard, ArrowRight, Search, ArrowLeft } from "lucide-react";

interface ArvQuotaExhaustedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated?: boolean;
}

export default function ArvQuotaExhaustedModal({
  open,
  onOpenChange,
  isAuthenticated = false,
}: ArvQuotaExhaustedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-arv-quota-exhausted">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            Free ARV Searches Used
          </DialogTitle>
          <DialogDescription className="text-center">
            You've used your 2 free ARV helper searches this month. Upgrade to get unlimited access to comparable sales data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Link href="/pricing" className="block">
            <Button 
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-auto py-4"
              data-testid="button-upgrade-for-arv"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">Upgrade Your Account</div>
                  <div className="text-xs opacity-80">Get unlimited ARV searches</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto flex-shrink-0" />
              </div>
            </Button>
          </Link>

          {isAuthenticated ? (
            <Button 
              variant="outline" 
              className="w-full h-auto py-4"
              onClick={() => { onOpenChange(false); window.history.back(); }}
              data-testid="button-go-back-arv"
            >
              <div className="flex items-center gap-3">
                <ArrowLeft className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">Go Back</div>
                  <div className="text-xs text-muted-foreground">Return to previous step</div>
                </div>
              </div>
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="w-full h-auto py-4"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-arv-modal"
            >
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">Enter ARV Manually</div>
                  <div className="text-xs text-muted-foreground">Enter your own estimate</div>
                </div>
              </div>
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Your free searches reset at the beginning of each month.
        </p>
      </DialogContent>
    </Dialog>
  );
}
