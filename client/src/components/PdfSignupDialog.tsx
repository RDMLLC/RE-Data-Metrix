import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PdfSignupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadAnyway: () => void;
}

export function PdfSignupDialog({ open, onOpenChange, onDownloadAnyway }: PdfSignupDialogProps) {
  const handleCreate = () => {
    onOpenChange(false);
    window.location.href = "/register";
  };

  const handleDownloadAnyway = () => {
    onOpenChange(false);
    onDownloadAnyway();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background" data-testid="dialog-pdf-signup">
        <DialogHeader>
          <DialogTitle
            className="text-xl font-bold"
            style={{ color: "#1d408b" }}
            data-testid="text-pdf-signup-title"
          >
            Get your free report
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground pt-2">
            Create a free RE Data Metrix account to download your analysis report —
            plus get access to our lender network, deal analysis tools, and more.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handleCreate}
            className="w-full border-transparent font-bold"
            style={{ backgroundColor: "#e0b32e", color: "#1d408b" }}
            data-testid="button-pdf-signup-create"
          >
            Create Free Account
          </Button>
          <button
            type="button"
            onClick={handleDownloadAnyway}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline self-center"
            data-testid="button-pdf-signup-anyway"
          >
            No thanks, download anyway
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
