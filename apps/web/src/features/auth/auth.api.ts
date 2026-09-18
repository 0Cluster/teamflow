import { api } from "../../lib/api.js";

import type {
  AuthResponse,
  AuthUser,
  LoginInput,
  RegisterInput,
} from "./auth.types.js";

import type { ApiResponse } from "@teamflow/shared";

interface AuthPayload {
  accessToken: string;
  user: AuthUser;
}

interface UserPayload {
  user: AuthUser;
}

export async function register(
  input: RegisterInput,
): Promise<{ user: AuthUser }> {
  const response = await api.post<
    ApiResponse<UserPayload>
  >("/auth/register", input);

  return response.data.data;
}

export async function login(
  input: LoginInput,
): Promise<AuthResponse> {
  const response = await api.post<
    ApiResponse<AuthPayload>
  >("/auth/login", input);

  return response.data.data;
}

export async function refreshAccessToken(): Promise<AuthResponse> {
  const response = await api.post<
    ApiResponse<AuthPayload>
  >("/auth/refresh");

  return response.data.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function getMe(): Promise<AuthUser> {
  const response = await api.get<ApiResponse<UserPayload>>(
    "/auth/me",
  );

  return response.data.data.user;
}
