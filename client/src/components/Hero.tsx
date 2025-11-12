import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import marketingVideo from "@assets/Real Estate Profits, Lender Referrals_video_1080 (3)_1762983667120.mp4";

export default function Hero() {
  const scrollToForm = () => {
    const formElement = document.getElementById('prelaunch-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-[600px] lg:min-h-[700px] flex items-center overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJWMzRoLTJ6bTAtNHYyaDJ2LTJoLTJ6bS0yIDJoMnYtMmgtMnYyem0wLTJ2LTJoLTJ2Mmgyem0tMiAwaDJ2LTJoLTJ2MnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10"></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Video */}
          <div className="order-2 lg:order-1">
            <div className="relative aspect-video bg-black/20 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
              <video
                className="absolute inset-0 w-full h-full object-cover"
                controls
                loop
                playsInline
              >
                <source src={marketingVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          {/* Right: Text Content */}
          <div className="order-1 lg:order-2 text-center lg:text-left">
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-8 leading-tight">
              Changing the way real estate investors{" "}
              <span className="text-accent">analyze and fund</span> their deals!
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 mb-10">
              Analyze deals and compare individual loan products to see the impact on your cash-on-cash, ROI and annualized ROI. And then connect with the lender of your choice with the click of a button!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent text-lg px-8 py-6"
                onClick={scrollToForm}
                data-testid="button-get-started"
              >
                Get Early Access
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-sm text-white border-white/30 hover:bg-white/20 text-lg px-8 py-6"
                onClick={() => window.location.href = '/about'}
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center animate-bounce">
          <ChevronDown className="h-8 w-8 text-accent mx-auto" />
        </div>
      </div>
    </div>
  );
}
