import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../config/firebase';

const CREDENTIALS_SERVER = 'com.usdt.exchange';

export interface BiometricStatus {
  isAvailable: boolean;
  biometryType: BiometryType;
  hasCredentials: boolean;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Biometric Authentication Service
 * Handles fingerprint login with Firebase Auth
 */
export const BiometricAuthService = {
  /**
   * Check if biometric authentication is available on this device
   */
  async checkAvailability(): Promise<BiometricStatus> {
    try {
      const result = await NativeBiometric.isAvailable();

      // Check if we have stored credentials
      let hasCredentials = false;
      try {
        await NativeBiometric.getCredentials({ server: CREDENTIALS_SERVER });
        hasCredentials = true;
      } catch {
        hasCredentials = false;
      }

      return {
        isAvailable: result.isAvailable,
        biometryType: result.biometryType,
        hasCredentials
      };
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return {
        isAvailable: false,
        biometryType: BiometryType.NONE,
        hasCredentials: false
      };
    }
  },

  /**
   * Store credentials securely with biometric protection
   * Called after successful email/password login
   */
  async storeCredentials(email: string, password: string): Promise<boolean> {
    try {
      await NativeBiometric.setCredentials({
        username: email,
        password: password,
        server: CREDENTIALS_SERVER
      });
      return true;
    } catch (error) {
      console.error('Failed to store credentials:', error);
      return false;
    }
  },

  /**
   * Delete stored credentials
   */
  async deleteCredentials(): Promise<boolean> {
    try {
      await NativeBiometric.deleteCredentials({
        server: CREDENTIALS_SERVER
      });
      return true;
    } catch (error) {
      console.error('Failed to delete credentials:', error);
      return false;
    }
  },

  /**
   * Authenticate with fingerprint and login to Firebase
   * Returns the Firebase user on success
   */
  async authenticateWithBiometric(): Promise<User> {
    // Verify biometric - throws error if failed
    await NativeBiometric.verifyIdentity({
      reason: 'Authenticate to access your account',
      title: 'Biometric Login',
      subtitle: 'Use your fingerprint to login',
      description: 'Touch the fingerprint sensor'
    });

    // Get stored credentials (only reached if biometric succeeded)
    const credentials = await NativeBiometric.getCredentials({
      server: CREDENTIALS_SERVER
    });

    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.username,
      credentials.password
    );

    return userCredential.user;
  },

  /**
   * Login with email and password
   * Optionally store credentials for biometric login
   */
  async loginWithEmail(
    email: string,
    password: string,
    enableBiometric: boolean = false
  ): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    if (enableBiometric) {
      await this.storeCredentials(email, password);
    }

    return userCredential.user;
  },

  /**
   * Sign out and optionally clear stored credentials
   */
  async signOut(clearCredentials: boolean = false): Promise<void> {
    if (clearCredentials) {
      await this.deleteCredentials();
    }
    await firebaseSignOut(auth);
  },

  /**
   * Get current Firebase user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  /**
   * Get Firebase ID token for API calls
   */
  async getIdToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }
};

export default BiometricAuthService;
