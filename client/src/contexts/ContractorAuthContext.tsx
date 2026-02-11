import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ContractorData {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  phone?: string;
  website?: string;
  description?: string;
  specialties?: string[];
  licenseNumber?: string;
  licensedStates?: string[];
  isInsured?: boolean;
  isBonded?: boolean;
  referralLink?: string;
  generatedReferralCode?: string;
  referralClickCount?: number;
  isActive?: boolean;
  serviceRegions?: Array<{ id: string; name: string; state: string }>;
}

interface ContractorAuthContextType {
  contractor: ContractorData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refetchContractor: () => Promise<void>;
}

const ContractorAuthContext = createContext<ContractorAuthContextType | undefined>(undefined);

export function ContractorAuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [authChecked, setAuthChecked] = useState(false);

  const { data: contractor = null, isLoading } = useQuery<ContractorData | null>({
    queryKey: ["/api/contractors/me"],
    retry: false,
    enabled: authChecked,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    queryFn: async () => {
      try {
        const response = await fetch("/api/contractors/me", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return null;
          }
          throw new Error("Failed to fetch contractor");
        }
        return response.json();
      } catch (error) {
        return null;
      }
    },
  });

  useEffect(() => {
    setAuthChecked(true);
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch("/api/contractors/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || "Login failed");
      }
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/contractors/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/contractors/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/me"] });
    },
  });

  const login = async (credentials: { email: string; password: string }) => {
    await loginMutation.mutateAsync(credentials);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refetchContractor = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/contractors/me"] });
  };

  return (
    <ContractorAuthContext.Provider
      value={{
        contractor,
        isLoading: !authChecked || isLoading,
        isAuthenticated: !!contractor,
        login,
        logout,
        refetchContractor,
      }}
    >
      {children}
    </ContractorAuthContext.Provider>
  );
}

export function useContractorAuth() {
  const context = useContext(ContractorAuthContext);
  if (context === undefined) {
    throw new Error("useContractorAuth must be used within a ContractorAuthProvider");
  }
  return context;
}
