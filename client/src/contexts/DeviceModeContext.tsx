import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type DeviceMode = "mobile" | "desktop" | "auto";

interface DeviceModeContextType {
  deviceMode: DeviceMode;
  isMobileView: boolean;
  setDeviceMode: (mode: DeviceMode) => void;
  isAutoDetected: boolean;
}

const DeviceModeContext = createContext<DeviceModeContextType | undefined>(undefined);

const MOBILE_BREAKPOINT = 768;
const STORAGE_KEY = "redatametrix-device-mode";

export function DeviceModeProvider({ children }: { children: ReactNode }) {
  const [deviceMode, setDeviceModeState] = useState<DeviceMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "mobile" || stored === "desktop") {
        return stored;
      }
    }
    return "auto";
  });

  const [isNativeMobile, setIsNativeMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsNativeMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", handleResize);
    handleResize();

    return () => mql.removeEventListener("change", handleResize);
  }, []);

  const setDeviceMode = (mode: DeviceMode) => {
    setDeviceModeState(mode);
    if (mode === "auto") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  };

  const isMobileView = deviceMode === "auto" ? isNativeMobile : deviceMode === "mobile";
  const isAutoDetected = deviceMode === "auto";

  return (
    <DeviceModeContext.Provider value={{ deviceMode, isMobileView, setDeviceMode, isAutoDetected }}>
      {children}
    </DeviceModeContext.Provider>
  );
}

export function useDeviceMode() {
  const context = useContext(DeviceModeContext);
  if (context === undefined) {
    throw new Error("useDeviceMode must be used within a DeviceModeProvider");
  }
  return context;
}
