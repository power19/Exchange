import { Capacitor } from '@capacitor/core';
import { registerDeviceToken } from './api';

export class PushNotificationService {
  /**
   * Initialize push notifications for the given user role
   */
  static async initialize(role: 'brian' | 'dairimar' | 'patty'): Promise<void> {
    // Only run on native mobile platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('⚠️  Push notifications disabled - not on native platform');
      return;
    }

    try {
      // Dynamically import push notifications only on native platforms
      // @ts-ignore - Module only available on native platforms
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Request permission
      const permission = await PushNotifications.requestPermissions();

      if (permission.receive === 'granted') {
        console.log(`✅ Push notification permission granted for ${role}`);

        // Register with FCM
        await PushNotifications.register();

        // Listen for registration success
        PushNotifications.addListener('registration', async (token: any) => {
          console.log('📱 Device token:', token.value);
          await this.registerDeviceTokenWithBackend(role, token.value);
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('❌ Push registration error:', error);
        });

        // Listen for push notifications received
        PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
          console.log('📩 Push notification received:', notification);
          // Notification is automatically displayed by the OS
        });

        // Listen for notification taps
        PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
          console.log('👆 Notification tapped:', action);
          // Handle notification tap (e.g., navigate to specific screen)
        });

      } else {
        console.log('❌ Push notification permission denied');
      }
    } catch (error: any) {
      console.error('❌ Error initializing push notifications:', error);
    }
  }

  /**
   * Register device token with backend
   */
  private static async registerDeviceTokenWithBackend(role: 'brian' | 'dairimar' | 'patty', token: string): Promise<void> {
    try {
      const response = await registerDeviceToken({
        user_role: role,
        device_token: token,
        device_id: Capacitor.getPlatform(),
        platform: 'android'
      });

      console.log('✅ Device token registered with backend:', response.data);
    } catch (error: any) {
      console.error('❌ Failed to register device token:', error);
    }
  }

  /**
   * Unregister device token when user logs out or app is uninstalled
   */
  static async unregister(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // @ts-ignore - Module only available on native platforms
      const { PushNotifications } = await import('@capacitor/push-notifications');
      // Remove all listeners
      await PushNotifications.removeAllListeners();
    } catch (error: any) {
      console.error('Error unregistering push notifications:', error);
    }
  }
}
