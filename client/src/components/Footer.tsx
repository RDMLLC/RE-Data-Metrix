import { Link } from "wouter";
import { MapPin, Phone } from "lucide-react";
import { SiFacebook, SiLinkedin } from "react-icons/si";
import logoImg from "@assets/Transparent Logo_1762969260481.png";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="border-t border-accent/30 mb-8"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                <img src={logoImg} alt="RE Data Metrix" className="h-12 w-12" />
              </div>
              <div>
                <div className="font-bold text-xl">RE Data Metrix</div>
                <div className="text-accent text-sm italic">Turning Terms into Returns</div>
              </div>
            </div>
            <p className="text-primary-foreground/90 mb-4">
              Changing the way real estate investors analyze and fund their deals.
            </p>
            <div className="space-y-2 text-sm text-primary-foreground/80">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-accent flex-shrink-0" />
                <div>
                  <div>RE Data Metrix, LLC</div>
                  <div>8735 Dunwoody Pl, Suite R</div>
                  <div>Atlanta, GA 30350</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent" />
                <span>(888) 450-4408</span>
              </div>
            </div>
            
            <div className="flex gap-4 mt-6">
              <a
                href="https://www.facebook.com/profile.php?id=61582008407624"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 backdrop-blur-sm p-2 rounded-lg hover-elevate active-elevate-2 transition-colors text-accent"
                aria-label="Visit our Facebook page"
                data-testid="link-facebook"
              >
                <SiFacebook className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com/company/re-data-metrix-llc"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 backdrop-blur-sm p-2 rounded-lg hover-elevate active-elevate-2 transition-colors text-accent"
                aria-label="Visit our LinkedIn page"
                data-testid="link-linkedin"
              >
                <SiLinkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-accent">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-primary-foreground/80 hover:text-accent transition-colors" data-testid="link-footer-about">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/company" className="text-primary-foreground/80 hover:text-accent transition-colors" data-testid="link-footer-company">
                  The Company
                </Link>
              </li>
              <li>
                <Link href="/deal-analysis" className="text-primary-foreground/80 hover:text-accent transition-colors" data-testid="link-footer-deal-analysis">
                  Deal Analysis
                </Link>
              </li>
              <li>
                <Link href="/lenders" className="text-primary-foreground/80 hover:text-accent transition-colors" data-testid="link-footer-lenders">
                  Lenders
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-primary-foreground/80 hover:text-accent transition-colors" data-testid="link-footer-resources">
                  Additional Resources
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-accent">Legal & Contact</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contact" className="text-primary-foreground/80 hover:text-accent transition-colors" data-testid="link-footer-contact">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-primary-foreground/80 hover:text-accent transition-colors" data-testid="link-footer-privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-primary-foreground/80 hover:text-accent transition-colors" data-testid="link-footer-terms">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-accent/30 pt-6 text-center text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} RE Data Metrix, LLC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
