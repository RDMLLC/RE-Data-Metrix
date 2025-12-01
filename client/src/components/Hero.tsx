import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Volume2, VolumeX } from "lucide-react";
import marketingVideo from "@assets/Real Estate Profits, Lender Referrals_video_1080 (3)_1762983667120.mp4";

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    video.playbackRate = 1.2;
    
    // Sync muted state when native controls are used
    const handleVolumeChange = () => {
      setIsMuted(video.muted || video.volume === 0);
    };
    
    video.addEventListener('volumechange', handleVolumeChange);
    
    return () => {
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const newMutedState = !isMuted;
    
    // Set muted state directly on the video element
    video.muted = newMutedState;
    
    // When unmuting, ensure volume is up and restart playback
    if (!newMutedState) {
      video.volume = 1.0;
      // Force a play to activate audio after user interaction
      video.play().catch(err => {
        console.warn('Video play failed:', err);
      });
    }
    
    setIsMuted(newMutedState);
  };

  const scrollToForm = () => {
    const formElement = document.getElementById('prelaunch-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-[600px] lg:min-h-[700px] flex items-center overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJWMzRoLTJ6bTAtNHYyaDJ2LTJoLTJ6bS0yIDJoMnYtMmgtMnYyem0wLTJ2LTJoLTJ2Mmgyem0tMiAwaDJ2LTJoLTJ2MnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10"></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          {/* Left: Video */}
          <div className="order-2 lg:order-1">
            <div className="relative aspect-video bg-black/20 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                muted={isMuted}
                controls
                loop
                playsInline
              >
                <source src={marketingVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              {/* Custom mute/unmute button - large and prominent */}
              <button
                onClick={toggleMute}
                className={`absolute top-3 right-3 z-20 p-3 rounded-full transition-all ${
                  isMuted 
                    ? 'bg-accent hover:bg-accent/90 text-accent-foreground animate-pulse' 
                    : 'bg-black/60 hover:bg-black/80 text-white'
                }`}
                data-testid="button-toggle-mute"
                aria-label={isMuted ? "Click to unmute video" : "Mute video"}
                title={isMuted ? "Click to unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </button>
              {/* Unmute prompt overlay when muted */}
              {isMuted && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10"
                  onClick={toggleMute}
                >
                  <div className="bg-black/70 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <VolumeX className="h-5 w-5" />
                    <span className="text-sm font-medium">Click to unmute</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Text Content */}
          <div className="order-1 lg:order-2 text-center lg:text-left">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Changing the way real estate investors{" "}
              <span className="text-accent">analyze and fund</span> their deals!
            </h1>
            
            <p className="text-lg lg:text-xl text-white/90 mb-8">
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
