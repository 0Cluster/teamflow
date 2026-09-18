import {
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import type { AuthUser } from "./auth.types.js";
import { setAccessToken as setStoredAccessToken } from "../../lib/auth-token.js";

import {
  login as loginRequest,
  logout as logoutRequest,
  refreshAccessToken,
  register as registerRequest,
} from "./auth.api.js";

import { AuthContext } from "./auth-context.js";

export function AuthProvider({
  children,
}: PropsWithChildren) {
const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] =
    useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const response = await refreshAccessToken();

        setAccessToken(response.accessToken);
        setStoredAccessToken(response.accessToken);
        setUser(response.user);
      } catch {
        setAccessToken(null);
        setStoredAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    void restoreSession();
  }, []);

  async function login(input: Parameters<typeof loginRequest>[0]) {
    const response = await loginRequest(input);

    setAccessToken(response.accessToken);
    setStoredAccessToken(response.accessToken);
    setUser(response.user);
  }

async function register(
  input: Parameters<typeof registerRequest>[0],
) {
  await registerRequest(input);
}

  async function logout() {
    try {
      await logoutRequest();
    } finally {
      setAccessToken(null);
      setStoredAccessToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
