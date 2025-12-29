import { useQuery } from "@tanstack/react-query";

interface DemoSessionResponse {
  active: boolean;
  contactName?: string;
  expiresAt?: string;
}

interface DemoModeResponse {
  enabled: boolean;
}

export function useDemoAccess() {
  const { data: demoSessionData } = useQuery<DemoSessionResponse>({
    queryKey: ["/api/demo/session"],
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  
  const { data: demoModeData } = useQuery<DemoModeResponse>({
    queryKey: ["/api/settings/demo-mode"],
    staleTime: 60000,
  });
  
  const hasDemoToken = demoSessionData?.active || false;
  const isDemoModeEnabled = demoModeData?.enabled || false;
  
  return {
    hasDemoToken,
    isDemoModeEnabled,
    isDemoMode: hasDemoToken || isDemoModeEnabled,
    demoContactName: demoSessionData?.contactName,
    demoExpiresAt: demoSessionData?.expiresAt,
  };
}
