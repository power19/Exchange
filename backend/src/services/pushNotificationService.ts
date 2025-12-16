import admin from 'firebase-admin';
import pool from '../database/connection';

// Initialize Firebase Admin SDK
// NOTE: You need to set GOOGLE_APPLICATION_CREDENTIALS environment variable
// pointing to your Firebase service account JSON file
if (!admin.apps.length) {
  try {
    // Check if service account file path is provided
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      console.log('✅ Firebase Admin SDK initialized');
    } else {
      console.warn('⚠️  GOOGLE_APPLICATION_CREDENTIALS not set - Push notifications disabled');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
  }
}

interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class PushNotificationService {
  /**
   * Send push notification to specific user role
   */
  static async sendToRole(role: 'brian' | 'dairimar' | 'patty', notification: PushNotification): Promise<void> {
    if (!admin.apps.length) {
      console.warn('⚠️  Firebase not initialized - skipping push notification');
      return;
    }

    try {
      // Get all active device tokens for this role
      const result = await pool.query(
        'SELECT device_token FROM device_tokens WHERE user_role = $1 AND is_active = true',
        [role]
      );

      if (result.rows.length === 0) {
        console.log(`📱 No active devices for ${role}`);
        return;
      }

      const tokens = result.rows.map(row => row.device_token);

      // Send to all devices
      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            channelId: 'usdt_exchange'
          }
        },
        tokens
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      console.log(`📢 Sent to ${role}: ${response.successCount}/${tokens.length} delivered`);

      // Remove invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && (
            resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered'
          )) {
            invalidTokens.push(tokens[idx]);
          }
        });

        if (invalidTokens.length > 0) {
          await pool.query(
            'UPDATE device_tokens SET is_active = false WHERE device_token = ANY($1)',
            [invalidTokens]
          );
          console.log(`🗑️  Removed ${invalidTokens.length} invalid tokens`);
        }
      }
    } catch (error) {
      console.error(`❌ Error sending push to ${role}:`, error);
    }
  }

  /**
   * Send notification when new VES order is created
   */
  static async notifyNewVESOrder(order: any): Promise<void> {
    const notification = {
      title: '🆕 New VES Order!',
      body: `${order.customer_name}: ${Number(order.amount_ves).toLocaleString()} VES`,
      data: {
        type: 'new_ves_order',
        orderId: order.id.toString()
      }
    };

    // Notify both Brian and Dairimar
    await Promise.all([
      this.sendToRole('brian', notification),
      this.sendToRole('dairimar', notification)
    ]);
  }

  /**
   * Send notification when new COP order is created
   */
  static async notifyNewCOPOrder(order: any): Promise<void> {
    const notification = {
      title: '🆕 New COP Order!',
      body: `${order.customer_name}: ${Number(order.amount_cop).toLocaleString()} COP`,
      data: {
        type: 'new_cop_order',
        orderId: order.id.toString()
      }
    };

    // Notify only Brian
    await this.sendToRole('brian', notification);
  }

  /**
   * Send notification when VES order is fulfilled
   */
  static async notifyVESOrderFulfilled(order: any): Promise<void> {
    const notification = {
      title: '🎉 VES Order Completed!',
      body: `${order.customer_name}: ${Number(order.amount_ves).toLocaleString()} VES → $${Number(order.usdt_sold).toFixed(2)} USDT`,
      data: {
        type: 'ves_order_completed',
        orderId: order.id.toString()
      }
    };

    // Notify both Brian and Patty
    await Promise.all([
      this.sendToRole('brian', notification),
      this.sendToRole('patty', notification)
    ]);
  }

  /**
   * Send notification when COP order is fulfilled
   */
  static async notifyCOPOrderFulfilled(order: any): Promise<void> {
    const notification = {
      title: '🎉 COP Order Completed!',
      body: `${order.customer_name}: ${Number(order.amount_cop).toLocaleString()} COP → $${Number(order.usdt_sold).toFixed(2)} USDT`,
      data: {
        type: 'cop_order_completed',
        orderId: order.id.toString()
      }
    };

    // Notify only Patty
    await this.sendToRole('patty', notification);
  }

  /**
   * Send notification when USDT is requested
   */
  static async notifyUSDTRequested(request: any): Promise<void> {
    const notification = {
      title: '💵 USDT Request from Dairimar',
      body: `Request: $${Number(request.amount_usdt).toFixed(2)} USDT - ${request.reason}`,
      data: {
        type: 'usdt_requested',
        requestId: request.id.toString()
      }
    };

    // Notify only Brian
    await this.sendToRole('brian', notification);
  }

  /**
   * Send notification when USDT transfer is approved
   */
  static async notifyUSDTTransferApproved(transfer: any): Promise<void> {
    const notification = {
      title: '✅ USDT Request Approved!',
      body: `Brian approved your request: $${Number(transfer.amount_usdt).toFixed(2)} USDT transferred`,
      data: {
        type: 'usdt_approved',
        transferId: transfer.id.toString()
      }
    };

    // Notify only Dairimar
    await this.sendToRole('dairimar', notification);
  }

  /**
   * Send notification when USDT request is rejected
   */
  static async notifyUSDTRequestRejected(request: any): Promise<void> {
    const notification = {
      title: '❌ USDT Request Rejected',
      body: `Your request for $${Number(request.amount_usdt).toFixed(2)} was rejected${request.notes ? `: ${request.notes}` : ''}`,
      data: {
        type: 'usdt_rejected',
        requestId: request.id.toString()
      }
    };

    // Notify only Dairimar
    await this.sendToRole('dairimar', notification);
  }

  /**
   * Send notification when new USDT transfer is made
   */
  static async notifyUSDTTransfer(transfer: any): Promise<void> {
    const notification = {
      title: '💰 USDT Received!',
      body: `Brian sent you ${Number(transfer.amount_usdt).toFixed(2)} USDT`,
      data: {
        type: 'usdt_transfer',
        transferId: transfer.id.toString()
      }
    };

    // Notify only Dairimar
    await this.sendToRole('dairimar', notification);
  }
}
