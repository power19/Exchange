import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BiometryType } from 'capacitor-native-biometric';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const {
    user,
    loading,
    error,
    biometricStatus,
    isNative,
    loginWithEmail,
    loginWithBiometric,
    clearError
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(true);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Auto-trigger biometric if credentials exist
  useEffect(() => {
    if (biometricStatus?.hasCredentials && !user && !loading) {
      handleBiometricLogin();
    }
  }, [biometricStatus?.hasCredentials]);

  // Redirect on successful login
  useEffect(() => {
    if (user && onLoginSuccess) {
      onLoginSuccess();
    }
  }, [user, onLoginSuccess]);

  const handleBiometricLogin = async () => {
    try {
      clearError();
      await loginWithBiometric();
    } catch {
      // Error is set in context, show email form as fallback
      setShowEmailForm(true);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      clearError();
      await loginWithEmail(email, password, enableBiometric && isNative && biometricStatus?.isAvailable);
    } catch {
      // Error is set in context
    }
  };

  const getBiometricLabel = () => {
    if (!biometricStatus) return 'Biometric';
    switch (biometricStatus.biometryType) {
      case BiometryType.FINGERPRINT:
        return 'Fingerprint';
      case BiometryType.FACE_AUTHENTICATION:
      case BiometryType.FACE_ID:
        return 'Face ID';
      case BiometryType.IRIS_AUTHENTICATION:
        return 'Iris';
      default:
        return 'Biometric';
    }
  };

  // Show biometric prompt if credentials are stored
  if (isNative && biometricStatus?.hasCredentials && !showEmailForm) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">Use {getBiometricLabel()} to login</p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleBiometricLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-4 rounded-xl transition-colors mb-4"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Authenticating...
              </span>
            ) : (
              `Login with ${getBiometricLabel()}`
            )}
          </button>

          <button
            onClick={() => setShowEmailForm(true)}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Use email and password instead
          </button>
        </div>
      </div>
    );
  }

  // Email/password login form
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">USDT Exchange</h1>
          <p className="text-gray-400">Sign in to continue</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter your password"
              required
            />
          </div>

          {isNative && biometricStatus?.isAvailable && (
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableBiometric}
                onChange={(e) => setEnableBiometric(e.target.checked)}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
              />
              <span className="text-gray-300 text-sm">
                Enable {getBiometricLabel()} for future logins
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-4 rounded-xl transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {biometricStatus?.hasCredentials && (
          <button
            onClick={() => {
              setShowEmailForm(false);
              clearError();
            }}
            className="w-full mt-4 text-gray-400 hover:text-white text-sm transition-colors"
          >
            Use {getBiometricLabel()} instead
          </button>
        )}
      </div>
    </div>
  );
}

export default LoginScreen;
