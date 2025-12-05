import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Lender {
  id: number;
  email: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
  website?: string;
  status: string;
  createdAt: string;
}

interface LenderAuthContextType {
  lender: Lender | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refetchLender: () => Promise<void>;
}

const LenderAuthContext = createContext<LenderAuthContextType | undefined>(undefined);

export function LenderAuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [authChecked, setAuthChecked] = useState(false);

  const { data: lender = null, isLoading } = useQuery<Lender | null>({
    queryKey: ["/api/lenders/me"],
    retry: false,
    enabled: authChecked,
    queryFn: async () => {
      try {
        const response = await fetch("/api/lenders/me", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return null;
          }
          throw new Error("Failed to fetch lender");
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
      const response = await fetch("/api/lenders/login", {
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
      queryClient.invalidateQueries({ queryKey: ["/api/lenders/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/lenders/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/lenders/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/lenders/me"] });
    },
  });

  const login = async (credentials: { email: string; password: string }) => {
    await loginMutation.mutateAsync(credentials);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refetchLender = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/lenders/me"] });
  };

  return (
    <LenderAuthContext.Provider
      value={{
        lender,
        isLoading: !authChecked || isLoading,
        isAuthenticated: !!lender,
        login,
        logout,
        refetchLender,
      }}
    >
      {children}
    </LenderAuthContext.Provider>
  );
}

export function useLenderAuth() {
  const context = useContext(LenderAuthContext);
  if (context === undefined) {
    throw new Error("useLenderAuth must be used within a LenderAuthProvider");
  }
  return context;
}
