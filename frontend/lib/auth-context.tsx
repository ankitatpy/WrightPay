'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, getStoredToken, setStoredToken, removeStoredToken, ApiError } from '@/lib/api';
import { User } from '@/types';

export interface SignupParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  agreeTerms?: boolean;
}


export interface AuthResponse {
  success: boolean;
  user?: User;
  userId?: string;
  error?: string;
  message?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (params: SignupParams) => Promise<AuthResponse>;
  verifyEmail: (email: string, code: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const profile = await api.get<User>('/users/me');
      setUser(profile);
      return profile;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        removeStoredToken();
        setToken(null);
        setUser(null);
      }
      return null;
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      await fetchCurrentUser();
      setIsLoading(false);
    };

    initAuth();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const res = await api.post<{
        access_token: string;
        user: { id: string; email: string; name: string };
      }>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      if (!res?.access_token) {
        return {
          success: false,
          error: 'No access token received from backend.',
        };
      }

      setStoredToken(res.access_token);
      setToken(res.access_token);

      // Hydrate full user profile from backend
      const fullProfile = await fetchCurrentUser();

      return {
        success: true,
        user: fullProfile || (res.user as unknown as User),
        message: 'Login successful',
      };
    } catch (err: unknown) {
      let errorMessage = 'Login failed. Please check your credentials.';
      if (err instanceof ApiError) {
        if (err.message === 'INVALID_CREDENTIALS') {
          errorMessage = 'Incorrect email or password.';
        } else if (err.message === 'ACCOUNT_SUSPENDED') {
          errorMessage = 'Your account has been suspended. Please contact support.';
        } else if (err.message === 'ACCOUNT_CLOSED') {
          errorMessage = 'This account has been closed.';
        } else {
          errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const signup = async (params: SignupParams): Promise<AuthResponse> => {
    try {
      const res = await api.post<{ message: string; userId: string }>('/auth/signup', {
        firstName: params.firstName.trim(),
        lastName: params.lastName.trim(),
        email: params.email.trim().toLowerCase(),
        password: params.password,
        agreeTerms: params.agreeTerms ?? true,
      });


      return {
        success: true,
        userId: res?.userId,
        message: res?.message || 'Account created successfully. Please verify your email.',
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create account. Please try again.';
      return {
        success: false,
        error: message,
      };
    }
  };

  const verifyEmail = async (email: string, code: string): Promise<AuthResponse> => {
    try {
      const res = await api.post<{ message: string }>('/auth/verify-email', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });

      return {
        success: true,
        message: res?.message || 'Email verified successfully.',
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid or expired verification code.';
      return {
        success: false,
        error: message,
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Safe to ignore logout backend error
    } finally {
      removeStoredToken();
      setToken(null);
      setUser(null);
      router.push('/login');
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    return fetchCurrentUser();
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        signup,
        verifyEmail,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
