import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import logoImg from "@assets/Transparent Logo_1762969260481.png";

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/company", label: "The Company" },
    { href: "/deal-analysis", label: "Deal Analysis" },
    { href: "/rental-analysis", label: "Rental Analysis" },
    { href: "/loan-types", label: "Loan Types" },
    { href: "/lenders", label: "Lenders" },
    { href: "/toolbox", label: "Toolbox" },
    { href: "/contact", label: "Contact" },
    { href: "/login", label: "Login" },
  ];

  return (
    <nav className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Two-row layout for desktop */}
        <div className="hidden md:block">
          {/* Top row: Logo and branding */}
          <div className="flex items-center justify-center py-3 border-b border-border">
            <Link href="/" className="flex items-center gap-4 hover-elevate active-elevate-2 px-2 py-1 rounded-md" data-testid="link-home">
              <img src={logoImg} alt="RE Data Metrix" className="h-28 w-28" />
              <span className="font-bold text-4xl text-primary">RE Data Metrix</span>
            </Link>
          </div>

          {/* Bottom row: Navigation links */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4 flex-1 justify-around">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} data-testid={`link-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Button
                    variant="ghost"
                    className={`text-foreground hover:text-primary ${
                      location === link.href ? "text-primary font-semibold" : ""
                    }`}
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile layout: Single row with logo, text, and hamburger menu */}
        <div className="md:hidden flex items-center justify-between h-24">
          <Link href="/" className="flex items-center gap-3 hover-elevate active-elevate-2 px-2 py-1 rounded-md" data-testid="link-home-mobile">
            <img src={logoImg} alt="RE Data Metrix" className="h-16 w-16" />
            <span className="font-bold text-2xl text-primary">RE Data Metrix</span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-foreground hover:text-primary ${
                    location === link.href ? "text-primary font-semibold" : ""
                  }`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
