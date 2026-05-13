import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

type DeviceMode = "mobile" | "desktop" | "auto";

interface SetDeviceModeOptions {
  persist?: boolean;
}

interface DeviceModeContextType {
  deviceMode: DeviceMode;
  isMobileView: boolean;
  setDeviceMode: (mode: DeviceMode, opts?: SetDeviceModeOptions) => void;
  isAutoDetected: boolean;
}

const DeviceModeContext = createContext<DeviceModeContextType | undefined>(undefined);

const MOBILE_BREAKPOINT = 768;
const STORAGE_KEY = "redatametrix-device-mode";

function readStoredMode(): DeviceMode {
  if (typeof window === "undefined") return "auto";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "mobile" || stored === "desktop") return stored;
  return "auto";
}

export function DeviceModeProvider({ children }: { children: ReactNode }) {
  const [deviceMode, setDeviceModeState] = useState<DeviceMode>(readStoredMode);

  const [isNativeMobile, setIsNativeMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    return false;
  });

  // Tracks an ephemeral (non-persisted) override. setAtPath starts as '__pending__'
  // and is replaced with the destination URL on the first navigation after the
  // override is set. Subsequent navigation away from that destination resets
  // the mode to whatever is in localStorage (or "auto").
  const ephemeralRef = useRef<{ active: boolean; setAtPath: string }>({
    active: false,
    setAtPath: "",
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

  // Patch history methods once so wouter's pushState/replaceState navigations
  // emit a custom event we can listen for. Reset ephemeral overrides when the
  // user navigates away from the desktop destination.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const EVT = "rdm:locationchange";
    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    window.history.pushState = function (...args) {
      const r = origPush.apply(this, args as Parameters<typeof origPush>);
      window.dispatchEvent(new Event(EVT));
      return r;
    };
    window.history.replaceState = function (...args) {
      const r = origReplace.apply(this, args as Parameters<typeof origReplace>);
      window.dispatchEvent(new Event(EVT));
      return r;
    };

    const onLocationChange = () => {
      const e = ephemeralRef.current;
      if (!e.active) return;
      const currentPath = window.location.pathname;
      if (e.setAtPath === "__pending__") {
        ephemeralRef.current = { active: true, setAtPath: currentPath };
      } else if (currentPath !== e.setAtPath) {
        ephemeralRef.current = { active: false, setAtPath: "" };
        setDeviceModeState(readStoredMode());
      }
    };
    window.addEventListener(EVT, onLocationChange);
    window.addEventListener("popstate", onLocationChange);
    return () => {
      window.removeEventListener(EVT, onLocationChange);
      window.removeEventListener("popstate", onLocationChange);
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, []);

  const setDeviceMode = (mode: DeviceMode, opts?: SetDeviceModeOptions) => {
    const persist = opts?.persist !== false;
    setDeviceModeState(mode);
    if (persist) {
      ephemeralRef.current = { active: false, setAtPath: "" };
      if (mode === "auto") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, mode);
      }
    } else {
      ephemeralRef.current = { active: true, setAtPath: "__pending__" };
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
