import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, Building2, User, HardHat, LayoutDashboard } from "lucide-react";

export default function MobileAdminSwitcher() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated || !user) return null;
  const role = user.role;
  const isStaff = role === "admin" || role === "developer" || role === "auditor";
  if (!isStaff) return null;

  const dashboardLabel =
    role === "developer" ? "Developer Dashboard" : role === "auditor" ? "Auditor Dashboard" : "Admin Dashboard";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Switch dashboard"
          aria-label="Switch dashboard"
          data-testid="button-mobile-admin-switcher"
        >
          <LayoutDashboard className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Dashboard</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setLocation("/admin/dashboard")}
          className="cursor-pointer"
          data-testid="menu-mobile-admin-dashboard"
        >
          <Settings className="mr-2 h-4 w-4" />
          {dashboardLabel}
        </DropdownMenuItem>
        {(role === "admin" || role === "auditor") && (
          <>
            <DropdownMenuItem
              onClick={() => setLocation("/lender-dashboard")}
              className="cursor-pointer"
              data-testid="menu-mobile-lender-portal"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Lender Portal
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLocation("/portal/dashboard")}
              className="cursor-pointer"
              data-testid="menu-mobile-member-portal"
            >
              <User className="mr-2 h-4 w-4" />
              Member Portal
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLocation("/contractor-portal")}
              className="cursor-pointer"
              data-testid="menu-mobile-contractor-portal"
            >
              <HardHat className="mr-2 h-4 w-4" />
              Contractor Portal
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
