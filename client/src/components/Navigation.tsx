import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import logoImg from "@assets/Transparent Logo_1762969260481.png";

export default function Navigation() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/company", label: "The Company" },
    { href: "/deal-analysis", label: "Deal Analysis" },
    { href: "/lenders", label: "Lenders" },
    { href: "/resources", label: "Resources" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 hover-elevate active-elevate-2 px-2 py-1 rounded-md" data-testid="link-home">
            <img src={logoImg} alt="RE Data Metrix" className="h-10 w-10" />
            <span className="font-bold text-xl">RE Data Metrix</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} data-testid={`link-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <Button
                  variant="ghost"
                  className={`text-primary-foreground hover:text-accent ${
                    location === link.href ? "text-accent" : ""
                  }`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
            <Link href="/login" data-testid="link-login">
              <Button variant="default" className="ml-4 bg-accent text-accent-foreground hover:bg-accent">
                Login
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-primary-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-primary-foreground hover:text-accent ${
                    location === link.href ? "text-accent" : ""
                  }`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="default" className="w-full bg-accent text-accent-foreground hover:bg-accent">
                Login
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
