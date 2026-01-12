import { useEffect } from "react";
import { useLocation } from "wouter";
import { useDeviceMode } from "@/contexts/DeviceModeContext";

const MOBILE_ROUTE_MAP: Record<string, string> = {
  "/deal-analysis": "/m/deal-analysis",
  "/toolbox": "/m/toolbox",
  "/lenders": "/m/lenders",
};

const DESKTOP_ROUTE_MAP: Record<string, string> = {
  "/m/deal-analysis": "/deal-analysis",
  "/m/toolbox": "/toolbox",
  "/m/lenders": "/lenders",
};

export function useMobileRedirect() {
  const { isMobileView, deviceMode } = useDeviceMode();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isMobileView && deviceMode !== "desktop") {
      const mobileRoute = MOBILE_ROUTE_MAP[location];
      if (mobileRoute) {
        setLocation(mobileRoute, { replace: true });
      }
    }
    
    if (!isMobileView && deviceMode !== "mobile") {
      const desktopRoute = DESKTOP_ROUTE_MAP[location];
      if (desktopRoute) {
        setLocation(desktopRoute, { replace: true });
      }
    }
  }, [isMobileView, deviceMode, location, setLocation]);
}
