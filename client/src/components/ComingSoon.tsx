import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}

export default function ComingSoon({ title, description, imageSrc, imageAlt }: ComingSoonProps) {
  const [email, setEmail] = useState("");
  const [notified, setNotified] = useState(false);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      console.log('Notify me:', email);
      setNotified(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-5xl lg:text-6xl font-bold text-primary mb-4">{title}</h1>
        <div className="h-1 w-32 bg-accent mx-auto mb-8"></div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{description}</p>
      </div>

      <div className="mb-12">
        <div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
          <img 
            src={imageSrc} 
            alt={imageAlt}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg p-8 shadow-md max-w-md mx-auto">
        <h2 className="text-2xl font-semibold text-center mb-4">Lock in your Discount Now</h2>
        
        {notified ? (
          <div className="bg-success/10 border-l-4 border-success rounded-md p-4" data-testid="text-notify-confirmation">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
              <p className="text-sm text-foreground">You'll be the first to know when we launch!</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleNotify} className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-border focus:ring-accent"
              data-testid="input-notify-email"
            />
            <Button
              type="submit"
              className="w-full bg-accent text-accent-foreground hover:bg-accent"
              data-testid="button-notify"
            >
              Lock in my Discount
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
