import { useState, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useDeviceMode } from "@/contexts/DeviceModeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft,
  Monitor,
  Calendar, 
  Clock, 
  ArrowRight,
  Loader2,
  Check,
  Gift
} from "lucide-react";

export default function MobileWebinar() {
  const { toast } = useToast();
  const { setDeviceMode } = useDeviceMode();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const webinarDate = "Friday, February 6, 2026";
  const webinarTime = "12:00 PM (Noon) EST";
  const registrationLink = "https://meet.zoho.com/edef-zym-pkw";

  // Capture referral source from URL (?ref=sakira)
  const referralSource = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get('ref') || null;
  }, [searchString]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  const handleViewDesktop = () => {
    setDeviceMode("desktop");
    // Preserve referral source when switching to desktop
    setLocation(referralSource ? `/webinar?ref=${referralSource}` : "/webinar");
  };

  const registerMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string; referralSource?: string | null }) => {
      const response = await apiRequest("POST", "/api/webinar/register", data);
      return response.json();
    },
    onSuccess: (result) => {
      if (result.alreadyRegistered) {
        toast({
          title: "Already Registered",
          description: "You're already registered! Taking you to the confirmation page...",
        });
      } else {
        toast({
          title: "Registration Successful",
          description: "Thank you for registering! Redirecting to your confirmation...",
        });
      }
      // Redirect to thank you page (avoids popup blocker issues)
      setTimeout(() => {
        setLocation(`/webinar/rsvp/${result.registrationId}/thank-you`);
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Name Required", description: "Please enter your name.", variant: "destructive" });
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast({ title: "Valid Email Required", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    registerMutation.mutate({ ...formData, referralSource });
  };

  const benefits = [
    "See live tool demonstrations",
    "Learn to analyze deals faster",
    "Find the best financing options",
    "Get invited to our soft launch",
    "Receive free access discount code"
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-base font-semibold">Webinar Registration</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            title="Desktop Version" 
            onClick={handleViewDesktop}
            data-testid="button-desktop-version"
          >
            <Monitor className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="pb-8">
        {/* Video Section */}
        <div className="aspect-video w-full">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/z9qAazJhWhI"
            title="RE Data Metrix Platform Overview"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            data-testid="video-platform-overview"
          />
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Title and Date/Time */}
          <div className="text-center space-y-3">
            <h2 className="text-xl font-bold text-primary">
              RE Data Metrix<br />
              <span className="text-accent">Soft Launch Webinar</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              A better way to analyze and fund your real estate deals
            </p>
            
            <div className="flex justify-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-accent" />
                <span className="font-medium">{webinarDate}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-accent" />
                <span className="font-medium">{webinarTime}</span>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <Card className="p-4 bg-primary text-primary-foreground">
            <h3 className="font-semibold text-lg mb-4 text-center">Reserve Your Spot</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-primary-foreground text-sm">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-white/90 border-0 text-foreground"
                  data-testid="input-webinar-name"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-primary-foreground text-sm">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-white/90 border-0 text-foreground"
                  data-testid="input-webinar-email"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-primary-foreground text-sm">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-white/90 border-0 text-foreground"
                  data-testid="input-webinar-phone"
                />
              </div>
              <Button 
                type="submit"
                size="lg"
                className="w-full bg-accent text-accent-foreground"
                disabled={registerMutation.isPending}
                data-testid="button-register-webinar"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    Register Now - It's Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Benefits */}
          <Card className="p-4">
            <h3 className="font-semibold text-base mb-3 text-center">Why Attend?</h3>
            <ul className="space-y-2">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-0.5 rounded-full">
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Exclusive Offer */}
          <Card className="p-4 bg-accent/10 border-accent/30">
            <div className="flex items-start gap-3">
              <div className="bg-accent/20 p-2 rounded-lg shrink-0">
                <Gift className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Exclusive Launch Offer</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Webinar attendees receive a discount code granting free access to premium features!
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
