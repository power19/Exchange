import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { BiometricAuthService, BiometricStatus } from '../services/biometricAuthService';
import { Capacitor } from '@capacitor/core';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  biometricStatus: BiometricStatus | null;
  isNative: boolean;
  loginWithEmail: (email: string, password: string, enableBiometric?: boolean) => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  logout: (clearCredentials?: boolean) => Promise<void>;
  clearError: () => void;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);

  const isNative = Capacitor.isNativePlatform();

  // Check biometric availability on mount
  useEffect(() => {
    const checkBiometrics = async () => {
      if (isNative) {
        const status = await BiometricAuthService.checkAvailability();
        setBiometricStatus(status);
      }
    };
    checkBiometrics();
  }, [isNative]);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = BiometricAuthService.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithEmail = useCallback(async (
    email: string,
    password: string,
    enableBiometric: boolean = false
  ) => {
    setLoading(true);
    setError(null);
    try {
      await BiometricAuthService.loginWithEmail(email, password, enableBiometric);
      // Update biometric status after storing credentials
      if (enableBiometric && isNative) {
        const status = await BiometricAuthService.checkAvailability();
        setBiometricStatus(status);
      }
    } catch (err: any) {
      const message = getErrorMessage(err.code);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isNative]);

  const loginWithBiometric = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await BiometricAuthService.authenticateWithBiometric();
    } catch (err: any) {
      const message = err.message || 'Biometric authentication failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async (clearCredentials: boolean = false) => {
    setLoading(true);
    try {
      await BiometricAuthService.signOut(clearCredentials);
      if (clearCredentials && isNative) {
        const status = await BiometricAuthService.checkAvailability();
        setBiometricStatus(status);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isNative]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getIdToken = useCallback(async () => {
    return BiometricAuthService.getIdToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        biometricStatus,
        isNative,
        loginWithEmail,
        loginWithBiometric,
        logout,
        clearError,
        getIdToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Firebase error code to user-friendly message
function getErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection';
    default:
      return 'Authentication failed. Please try again';
  }
}

export default AuthContext;
