import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import logoFullImg from "@assets/Logo (2)_1762969260482.jpg";

export default function Hero() {
  const scrollToForm = () => {
    const formElement = document.getElementById('prelaunch-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-[600px] lg:min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Video Background Placeholder with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/90">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJWMzRoLTJ6bTAtNHYyaDJ2LTJoLTJ6bS0yIDJoMnYtMmgtMnYyem0wLTJ2LTJoLTJ2Mmgyem0tMiAwaDJ2LTJoLTJ2MnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-24">
        <div className="mb-12 flex justify-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
            <img src={logoFullImg} alt="RE Data Metrix - Turning Terms into Returns" className="h-48 md:h-64 w-auto" />
          </div>
        </div>
        
        <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Changing the way real estate investors{" "}
          <span className="text-accent">analyse and fund</span> their deals!
        </h1>
        
        <p className="text-xl lg:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
          Connect with lenders, analyze profitability beyond standard tools, and streamline your investment journey with our monthly subscription platform.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
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

        <div className="mt-16 animate-bounce">
          <ChevronDown className="h-8 w-8 text-accent mx-auto" />
        </div>
      </div>
    </div>
  );
}
