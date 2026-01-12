import { Button } from "@/components/ui/button";

// YouTube video for landing page
const YOUTUBE_VIDEO_ID = "quO8Zn_IIAY";

export default function Hero() {
  const handleGetStarted = () => {
    window.location.href = '/register';
  };

  return (
    <div className="relative min-h-[500px] lg:min-h-[700px] flex items-center overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJWMzRoLTJ6bTAtNHYyaDJ2LTJoLTJ6bS0yIDJoMnYtMmgtMnYyem0wLTJ2LTJoLTJ2Mmgyem0tMiAwaDJ2LTJoLTJ2MnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10"></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-20">
        {/* Mobile layout: stacked with video right after headline */}
        <div className="lg:hidden flex flex-col items-center text-center space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            Changing the way real estate investors{" "}
            <span className="text-accent">analyze and fund</span> their deals!
          </h1>
          
          {/* Video immediately after headline on mobile */}
          <div className="w-full">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`}
                title="RE Data Metrix Overview"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                data-testid="video-hero-mobile"
              />
            </div>
          </div>

          <p className="text-sm text-white/90">
            Analyze deals and compare loan products to see the impact on your ROI. Connect with lenders at the click of a button!
          </p>

          <div className="flex flex-col gap-3 w-full">
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent text-base px-6 py-5 w-full"
              onClick={handleGetStarted}
              data-testid="button-get-started-mobile"
            >
              Get a Free Account
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 backdrop-blur-sm text-white border-white/30 hover:bg-white/20 text-base px-6 py-5 w-full"
              onClick={() => window.location.href = '/features'}
              data-testid="button-learn-more-mobile"
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Desktop layout: side by side */}
        <div className="hidden lg:grid grid-cols-2 gap-10 items-center">
          {/* Left: Video */}
          <div>
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`}
                title="RE Data Metrix Overview"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                data-testid="video-hero"
              />
            </div>
          </div>

          {/* Right: Text Content */}
          <div className="text-left">
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              Changing the way real estate investors{" "}
              <span className="text-accent">analyze and fund</span> their deals!
            </h1>
            
            <p className="text-xl text-white/90 mb-8">
              Analyze deals and compare individual loan products to see the impact on your cash-on-cash, ROI and annualized ROI. And then connect with the lender of your choice with the click of a button!
            </p>

            <div className="flex gap-4">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent text-lg px-8 py-6"
                onClick={handleGetStarted}
                data-testid="button-get-started"
              >
                Get a Free Account
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-sm text-white border-white/30 hover:bg-white/20 text-lg px-8 py-6"
                onClick={() => window.location.href = '/features'}
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
