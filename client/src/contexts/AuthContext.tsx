import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  subscriptionPlan?: string | null;
  stripeSubscriptionId?: string | null;
  referralCode: string;
  createdAt: string;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  privacyVersion?: string | null;
  profile?: {
    fullName: string;
    creditScoreRange?: string;
    state?: string;
    street?: string;
    city?: string;
    zipCode?: string;
    phone?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSubscriber: boolean;
  login: (credentials: { identifier: string; password: string }) => Promise<User>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  referralCode?: string;
  compCode?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [authChecked, setAuthChecked] = useState(false);

  const { data: user = null, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    enabled: authChecked,
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          throw new Error("Failed to fetch user");
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
    mutationFn: async (credentials: { identifier: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      const responseData = await response.json();
      if (!response.ok) {
        const error: any = new Error(responseData.message || responseData.error || "Login failed");
        error.requiresVerification = responseData.requiresVerification;
        throw error;
      }
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Registration failed. Please try again.");
      }
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || "Registration failed");
      }
      return responseData;
    },
    onSuccess: (data) => {
      if (!data.requiresVerification) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.setQueryData(["/api/lenders/me"], null);
      queryClient.clear();
    },
  });

  const login = async (credentials: { identifier: string; password: string }) => {
    const result = await loginMutation.mutateAsync(credentials);
    return result;
  };

  const register = async (data: RegisterData) => {
    return await registerMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refetchUser = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const isSubscriber = !!user && (
    user.role === 'admin' || 
    ['active', 'referral_trial', 'comped'].includes(user.subscriptionStatus)
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: !authChecked || isLoading,
        isAuthenticated: !!user,
        isSubscriber,
        login,
        register,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
