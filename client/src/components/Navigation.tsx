import { Link, useLocation } from "wouter";
import { Menu, X, LogOut, User, Settings, Building2, CreditCard, UserCog, Handshake, Calculator, Video, BarChart3, Gift, Ticket, Plug, Users, Link2, Code, HardHat } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import logoImg from "@assets/Transparent Logo_1762969260481.png";
import { useAuth } from "@/contexts/AuthContext";
import { useLenderAuth } from "@/contexts/LenderAuthContext";
import { useContractorAuth } from "@/contexts/ContractorAuthContext";

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

function getSubscriptionBadge(status: string, plan?: string | null, hasStripeSubscription?: boolean) {
  switch (status) {
    case "active":
      // Show plan type: Free (no Stripe subscription), Monthly, or Annual
      if (hasStripeSubscription) {
        if (plan === 'annual') {
          return <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">Annual</Badge>;
        }
        return <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">Monthly</Badge>;
      }
      return <Badge className="bg-gray-500/10 text-gray-600 border-gray-200 text-xs">Free</Badge>;
    case "comped":
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 text-xs">Comped</Badge>;
    case "referral_trial":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs">Trial</Badge>;
    case "free":
    default:
      return <Badge variant="secondary" className="text-xs">Free</Badge>;
  }
}

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { lender, isAuthenticated: isLenderAuthenticated, isLoading: isLenderLoading, isAdminPreview, logout: lenderLogout } = useLenderAuth();
  const { contractor, isAuthenticated: isContractorAuthenticated, logout: contractorLogout } = useContractorAuth();
  const { toast } = useToast();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/deal-analysis", label: "Deal Analysis" },
    { href: "/lenders", label: "Lenders" },
    { href: "/toolbox", label: "Toolbox" },
    { href: "/pricing", label: "Pricing" },
    { href: "/contact", label: "Contact" },
  ];

  const userInitials = user 
    ? (user.role === 'admin' ? 'AD' : user.role === 'developer' ? 'DV' : user.role === 'auditor' ? 'AU' : getInitials(user.profile?.fullName, user.username, user.email))
    : "";

  const lenderInitials = lender 
    ? getInitials(lender.contactName, lender.companyName || '', lender.email)
    : "";

  const contractorInitials = contractor
    ? getInitials(contractor.name, contractor.companyName || '', contractor.email)
    : "";

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const handleLenderLogout = async () => {
    try {
      await lenderLogout();
      setLocation("/");
    } catch (error) {
      console.error("Failed to logout lender:", error);
    }
  };

  const handleContractorLogout = async () => {
    try {
      await contractorLogout();
      setLocation("/");
    } catch (error) {
      console.error("Failed to logout contractor:", error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/manage-billing', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        toast({ title: "Subscription", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
      toast({ title: "Error", description: "Failed to open subscription management. Please try again.", variant: "destructive" });
    }
  };

  return (
    <nav className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Two-row layout for desktop */}
        <div className="hidden md:block">
          {/* Top row: Logo and branding with Free Webinar */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex-1" /> {/* Spacer for centering */}
            <Link href="/" className="flex items-center gap-4 hover-elevate active-elevate-2 px-2 py-1 rounded-md" data-testid="link-home">
              <img src={logoImg} alt="RE Data Metrix" className="h-28 w-28" />
              <span className="font-bold text-4xl text-primary">RE Data Metrix<sup className="text-lg">™</sup></span>
            </Link>
            <div className="flex-1 flex justify-end gap-2">
              <Link href="/webinar" data-testid="link-header-webinar">
                <Button variant="default" className="bg-accent text-accent-foreground">
                  <Video className="h-4 w-4 mr-1" />
                  Free Webinar
                </Button>
              </Link>
            </div>
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
              {isLoading || isLenderLoading ? (
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
                          ) : user.role === 'developer' ? (
                            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 text-xs">Developer</Badge>
                          ) : user.role === 'auditor' ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs">Auditor</Badge>
                          ) : (
                            getSubscriptionBadge(user.subscriptionStatus || "free", user.subscriptionPlan, !!user.stripeSubscriptionId)
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(user.role === 'admin' || user.role === 'developer' || user.role === 'auditor') ? (
                      <>
                        <DropdownMenuItem 
                          onClick={() => setLocation("/admin/dashboard")}
                          className="cursor-pointer"
                          data-testid="menu-item-admin-dashboard"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          {user.role === 'developer' ? 'Developer Dashboard' : user.role === 'auditor' ? 'Auditor Dashboard' : 'Admin Dashboard'}
                        </DropdownMenuItem>
                        {(user.role === 'admin' || user.role === 'auditor') && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => setLocation("/lender-dashboard")}
                              className="cursor-pointer"
                              data-testid="menu-item-lender-portal"
                            >
                              <Building2 className="mr-2 h-4 w-4" />
                              Lender Portal
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setLocation("/portal/dashboard")}
                              className="cursor-pointer"
                              data-testid="menu-item-member-portal"
                            >
                              <User className="mr-2 h-4 w-4" />
                              Member Portal
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setLocation("/contractor-portal")}
                              className="cursor-pointer"
                              data-testid="menu-item-contractor-portal"
                            >
                              <HardHat className="mr-2 h-4 w-4" />
                              Contractor Portal
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setLocation("/admin/developer-integrations")}
                              className="cursor-pointer"
                              data-testid="menu-item-developer-dashboard"
                            >
                              <Code className="mr-2 h-4 w-4" />
                              Developer Dashboard
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        {/* Developer-accessible pages */}
                        <DropdownMenuItem 
                          onClick={() => setLocation("/admin/lenders")}
                          className="cursor-pointer"
                          data-testid="menu-item-admin-lenders"
                        >
                          <Building2 className="mr-2 h-4 w-4" />
                          Lender Management
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setLocation("/admin/affiliates")}
                          className="cursor-pointer"
                          data-testid="menu-item-admin-affiliates"
                        >
                          <Handshake className="mr-2 h-4 w-4" />
                          Partner Tools
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setLocation("/admin/training-videos")}
                          className="cursor-pointer"
                          data-testid="menu-item-admin-videos"
                        >
                          <Video className="mr-2 h-4 w-4" />
                          Training Videos
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setLocation("/admin/integrations")}
                          className="cursor-pointer"
                          data-testid="menu-item-admin-integrations"
                        >
                          <Plug className="mr-2 h-4 w-4" />
                          Integrations
                        </DropdownMenuItem>
                        {/* Admin-only pages */}
                        {(user.role === 'admin' || user.role === 'auditor') && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setLocation("/admin/users")}
                              className="cursor-pointer"
                              data-testid="menu-item-admin-users"
                            >
                              <Users className="mr-2 h-4 w-4" />
                              User Management
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setLocation("/admin/reports")}
                              className="cursor-pointer"
                              data-testid="menu-item-admin-reports"
                            >
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Analytics & Reporting
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setLocation("/admin/lender-invite")}
                              className="cursor-pointer"
                              data-testid="menu-item-admin-lender-invite"
                            >
                              <UserCog className="mr-2 h-4 w-4" />
                              Lender Invite
                            </DropdownMenuItem>
                          </>
                        )}
                      </>
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
                    <DropdownMenuItem 
                      onClick={() => setLocation("/portal/settings")}
                      className="cursor-pointer"
                      data-testid="menu-item-account-settings"
                    >
                      <UserCog className="mr-2 h-4 w-4" />
                      Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleManageSubscription}
                      className="cursor-pointer"
                      data-testid="menu-item-manage-subscription"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </DropdownMenuItem>
                    {user?.isContractor && (
                      <DropdownMenuItem 
                        onClick={() => setLocation("/contractor-portal")}
                        className="cursor-pointer"
                        data-testid="menu-item-contractor-portal"
                      >
                        <HardHat className="mr-2 h-4 w-4" />
                        Contractor Portal
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
              ) : !isLenderLoading && isLenderAuthenticated && lender ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div 
                      className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold text-sm cursor-pointer hover:opacity-80 transition-opacity"
                      data-testid="button-lender-menu"
                    >
                      {lenderInitials}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-2">
                        <p className="text-sm font-medium">{lender.companyName || lender.contactName || 'Lender'}</p>
                        <p className="text-xs text-muted-foreground truncate">{lender.email}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Type:</span>
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs">Lender</Badge>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setLocation("/lender-dashboard")}
                      className="cursor-pointer"
                      data-testid="menu-item-lender-dashboard"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      Lender Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={isAdminPreview ? handleLogout : handleLenderLogout}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                      data-testid="menu-item-lender-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : isContractorAuthenticated && contractor ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div 
                      className="w-9 h-9 rounded-full bg-orange-600 text-white flex items-center justify-center font-semibold text-sm cursor-pointer hover:opacity-80 transition-opacity"
                      data-testid="button-contractor-menu"
                    >
                      {contractorInitials}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-2">
                        <p className="text-sm font-medium">{contractor.name || contractor.companyName || 'Contractor'}</p>
                        <p className="text-xs text-muted-foreground truncate">{contractor.email}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Type:</span>
                          <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 text-xs">Contractor</Badge>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => { window.location.href = "/contractor-portal"; }}
                      className="cursor-pointer"
                      data-testid="menu-item-contractor-portal-nav"
                    >
                      <HardHat className="mr-2 h-4 w-4" />
                      Contractor Portal
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleContractorLogout}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                      data-testid="menu-item-contractor-logout"
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
            <span className="font-bold text-2xl text-primary">RE Data Metrix<sup className="text-sm">™</sup></span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Show user avatar dropdown on mobile header when logged in */}
            {isLoading || isLenderLoading ? null : isAuthenticated && user ? (
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
                        ) : user.role === 'developer' ? (
                          <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 text-xs">Developer</Badge>
                        ) : user.role === 'auditor' ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs">Auditor</Badge>
                        ) : (
                          getSubscriptionBadge(user.subscriptionStatus || "free", user.subscriptionPlan, !!user.stripeSubscriptionId)
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(user.role === 'admin' || user.role === 'developer' || user.role === 'auditor') ? (
                    <>
                      <DropdownMenuItem 
                        onClick={() => setLocation("/admin/dashboard")}
                        className="cursor-pointer"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        {user.role === 'developer' ? 'Developer Dashboard' : user.role === 'auditor' ? 'Auditor Dashboard' : 'Admin Dashboard'}
                      </DropdownMenuItem>
                      {(user.role === 'admin' || user.role === 'auditor') && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => setLocation("/lender-dashboard")}
                            className="cursor-pointer"
                          >
                            <Building2 className="mr-2 h-4 w-4" />
                            Lender Portal
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setLocation("/portal/dashboard")}
                            className="cursor-pointer"
                          >
                            <User className="mr-2 h-4 w-4" />
                            Member Portal
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setLocation("/contractor-portal")}
                            className="cursor-pointer"
                            data-testid="menu-item-contractor-portal-mobile"
                          >
                            <HardHat className="mr-2 h-4 w-4" />
                            Contractor Portal
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setLocation("/admin/affiliates")}
                        className="cursor-pointer"
                      >
                        <Handshake className="mr-2 h-4 w-4" />
                        Partner Tools
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setLocation("/admin/lenders")}
                        className="cursor-pointer"
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        Lender Management
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setLocation("/admin/integrations")}
                        className="cursor-pointer"
                      >
                        <Plug className="mr-2 h-4 w-4" />
                        Integrations
                      </DropdownMenuItem>
                      {(user.role === 'admin' || user.role === 'auditor') && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => setLocation("/admin/discount-codes")}
                            className="cursor-pointer"
                          >
                            <Gift className="mr-2 h-4 w-4" />
                            Discount Codes
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setLocation("/admin/reports")}
                            className="cursor-pointer"
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Reports
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setLocation("/admin/users")}
                            className="cursor-pointer"
                          >
                            <Users className="mr-2 h-4 w-4" />
                            User Management
                          </DropdownMenuItem>
                        </>
                      )}
                    </>
                  ) : (
                    <DropdownMenuItem 
                      onClick={() => setLocation("/portal/dashboard")}
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Member Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => setLocation("/portal/settings")}
                    className="cursor-pointer"
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleManageSubscription}
                    className="cursor-pointer"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Subscription
                  </DropdownMenuItem>
                  {user?.isContractor && (
                    <DropdownMenuItem 
                      onClick={() => setLocation("/contractor-portal")}
                      className="cursor-pointer"
                    >
                      <HardHat className="mr-2 h-4 w-4" />
                      Contractor Portal
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
            ) : !isLenderLoading && isLenderAuthenticated && lender ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div 
                    className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold text-xs cursor-pointer hover:opacity-80 transition-opacity"
                    data-testid="button-lender-menu-mobile"
                  >
                    {lenderInitials}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                      <p className="text-sm font-medium">{lender.companyName || lender.contactName || 'Lender'}</p>
                      <p className="text-xs text-muted-foreground truncate">{lender.email}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Type:</span>
                        <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs">Lender</Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setLocation("/lender-dashboard")}
                    className="cursor-pointer"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Lender Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={isAdminPreview ? handleLogout : handleLenderLogout}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isContractorAuthenticated && contractor ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div 
                    className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-semibold text-xs cursor-pointer hover:opacity-80 transition-opacity"
                    data-testid="button-contractor-menu-mobile"
                  >
                    {contractorInitials}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                      <p className="text-sm font-medium">{contractor.name || contractor.companyName || 'Contractor'}</p>
                      <p className="text-xs text-muted-foreground truncate">{contractor.email}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Type:</span>
                        <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 text-xs">Contractor</Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => { window.location.href = "/contractor-portal"; }}
                    className="cursor-pointer"
                  >
                    <HardHat className="mr-2 h-4 w-4" />
                    Contractor Portal
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleContractorLogout}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            
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
                  variant={(link as any).highlight ? "default" : "ghost"}
                  className={(link as any).highlight 
                    ? "w-full justify-start bg-accent text-accent-foreground"
                    : `w-full justify-start text-foreground hover:text-primary ${
                        location === link.href ? "text-primary font-semibold" : ""
                      }`
                  }
                >
                  {(link as any).highlight && <Video className="h-4 w-4 mr-1" />}
                  {link.label}
                </Button>
              </Link>
            ))}
            
            {/* Login link in mobile menu (only when not authenticated) */}
            {!isLoading && !isLenderLoading && !isAuthenticated && !isLenderAuthenticated && (
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
