import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CreditCard, ArrowRight, FileText } from "lucide-react";

interface PdfQuotaExhaustedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PdfQuotaExhaustedModal({
  open,
  onOpenChange,
}: PdfQuotaExhaustedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-pdf-quota-exhausted">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            Free PDF Downloads Used
          </DialogTitle>
          <DialogDescription className="text-center">
            You've used your 2 free PDF downloads this month. Upgrade your account to get unlimited PDF downloads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Link href="/pricing" className="block">
            <Button 
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-auto py-4"
              data-testid="button-upgrade-for-pdf"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">Upgrade Your Account</div>
                  <div className="text-xs opacity-80">Get unlimited PDF downloads</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto flex-shrink-0" />
              </div>
            </Button>
          </Link>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-pdf-modal"
          >
            <FileText className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Your free PDF downloads reset at the beginning of each month.
        </p>
      </DialogContent>
    </Dialog>
  );
}
