import { Link, useLocation } from "wouter";
import { Menu, X, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import logoImg from "@assets/Transparent Logo_1762969260481.png";
import { useAuth } from "@/contexts/AuthContext";

function getInitials(fullName: string | undefined, username: string, email: string): string {
  if (fullName && fullName.trim().length > 0) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
  }
  if (username && username.length >= 2) {
    return username.substring(0, 2).toUpperCase();
  }
  if (email) {
    const emailPart = email.split('@')[0];
    if (emailPart.length >= 2) {
      return emailPart.substring(0, 2).toUpperCase();
    }
  }
  return "U";
}

function getSubscriptionBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">Active</Badge>;
    case "comped":
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 text-xs">Comped</Badge>;
    case "referral_trial":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs">Trial</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">Inactive</Badge>;
  }
}

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();

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
    { href: "/faq", label: "FAQ" },
  ];

  const userInitials = user ? getInitials(user.profile?.fullName, user.username, user.email) : "";

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

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
              
              {/* Login/User Avatar with Dropdown */}
              {isLoading ? (
                <Button variant="ghost" className="text-foreground" disabled>
                  ...
                </Button>
              ) : isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div 
                      className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm cursor-pointer hover:opacity-80 transition-opacity"
                      data-testid="button-user-menu"
                    >
                      {userInitials}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-2">
                        <p className="text-sm font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Status:</span>
                          {user.role === 'admin' ? (
                            <Badge variant="default" className="text-xs">Admin</Badge>
                          ) : (
                            getSubscriptionBadge(user.subscriptionStatus || "inactive")
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.role === 'admin' ? (
                      <DropdownMenuItem 
                        onClick={() => setLocation("/admin/dashboard")}
                        className="cursor-pointer"
                        data-testid="menu-item-admin-dashboard"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        onClick={() => setLocation("/portal/dashboard")}
                        className="cursor-pointer"
                        data-testid="menu-item-member-dashboard"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Member Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                      data-testid="menu-item-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login" data-testid="link-nav-login">
                  <Button
                    variant="ghost"
                    className={`text-foreground hover:text-primary ${
                      location === "/login" ? "text-primary font-semibold" : ""
                    }`}
                  >
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile layout: Single row with logo, text, and hamburger menu */}
        <div className="md:hidden flex items-center justify-between h-24">
          <Link href="/" className="flex items-center gap-3 hover-elevate active-elevate-2 px-2 py-1 rounded-md" data-testid="link-home-mobile">
            <img src={logoImg} alt="RE Data Metrix" className="h-16 w-16" />
            <span className="font-bold text-2xl text-primary">RE Data Metrix</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Show user avatar dropdown on mobile header when logged in */}
            {!isLoading && isAuthenticated && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div 
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs cursor-pointer hover:opacity-80 transition-opacity"
                    data-testid="button-user-menu-mobile"
                  >
                    {userInitials}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                      <p className="text-sm font-medium">{user.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        {user.role === 'admin' ? (
                          <Badge variant="default" className="text-xs">Admin</Badge>
                        ) : (
                          getSubscriptionBadge(user.subscriptionStatus || "inactive")
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === 'admin' ? (
                    <DropdownMenuItem 
                      onClick={() => setLocation("/admin/dashboard")}
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem 
                      onClick={() => setLocation("/portal/dashboard")}
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Member Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
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
            
            {/* Login link in mobile menu (only when not authenticated) */}
            {!isLoading && !isAuthenticated && (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-foreground hover:text-primary ${
                    location === "/login" ? "text-primary font-semibold" : ""
                  }`}
                >
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
