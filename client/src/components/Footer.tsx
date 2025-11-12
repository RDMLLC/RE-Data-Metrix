import { Link } from "wouter";
import { MapPin, Phone } from "lucide-react";
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
              <img src={logoImg} alt="RE Data Metrix" className="h-8 w-8" />
              <span className="font-bold text-lg">RE Data Metrix</span>
            </div>
            <p className="text-primary-foreground/80 text-sm mb-2 italic">
              Turning Terms into Returns
            </p>
            <p className="text-primary-foreground/80 text-sm mb-4">
              Changing the way real estate investors analyse and fund their deals.
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
                <span>(Coming Soon)</span>
              </div>
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
