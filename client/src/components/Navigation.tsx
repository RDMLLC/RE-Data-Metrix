import { Link, useLocation } from "wouter";
import { Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import logoImg from "@assets/Transparent Logo_1762969260481.png";

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

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
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="default" 
                    className="ml-4 bg-accent text-accent-foreground hover:bg-accent"
                    data-testid="button-user-menu"
                  >
                    <User className="h-4 w-4 mr-2" />
                    {user?.username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user?.profile?.fullName || user?.username}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {user?.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/portal/profile")} data-testid="menu-item-portal">
                    <User className="h-4 w-4 mr-2" />
                    My Portal
                  </DropdownMenuItem>
                  {user?.role === "admin" && (
                    <DropdownMenuItem onClick={() => setLocation("/admin/users")} data-testid="menu-item-admin">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      await logout();
                      setLocation("/");
                    }}
                    data-testid="menu-item-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login" data-testid="link-login">
                <Button variant="ghost" className="ml-4">
                  Login
                </Button>
              </Link>
            )}
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
            
            {isAuthenticated ? (
              <>
                <Link href="/portal/profile" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    My Portal
                  </Button>
                </Link>
                {user?.role === "admin" && (
                  <Link href="/admin/users" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Admin Panel
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={async () => {
                    await logout();
                    setMobileMenuOpen(false);
                    setLocation("/");
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  Login
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
