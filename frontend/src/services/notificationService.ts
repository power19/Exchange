import { LocalNotifications } from '@capacitor/local-notifications';
import { CapacitorHttp } from '@capacitor/core';

export class NotificationService {
  private static checkInterval: number | null = null;
  private static notifiedOrderIds: Set<number> = new Set();
  private static notifiedTransferIds: Set<number> = new Set();
  private static isFirstCheck: boolean = true;

  /**
   * Initialize notifications - request permissions and start monitoring
   */
  static async initialize() {
    // Check if running in Capacitor (mobile)
    const isCapacitor = !!(window as any).Capacitor;
    if (!isCapacitor) return;

    try {
      // Request permission
      const permission = await LocalNotifications.requestPermissions();

      if (permission.display === 'granted') {
        console.log('✅ Notification permissions granted');

        // Start checking for new orders/transfers every 30 seconds
        this.startMonitoring();
      } else {
        console.log('❌ Notification permissions denied');
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
    }
  }

  /**
   * Start monitoring for new orders and transfers
   */
  static startMonitoring() {
    // Clear any existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check every 15 seconds (faster notifications)
    this.checkInterval = window.setInterval(() => {
      this.checkForNewItems();
    }, 15000);

    // Also check immediately
    this.checkForNewItems();
  }

  /**
   * Stop monitoring
   */
  static stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check for new orders and transfers
   */
  private static async checkForNewItems() {
    try {
      // Use environment variable for production, fallback to local dev
      const apiUrl = import.meta.env.VITE_MOBILE_API_URL || 'http://10.10.30.100:3000/api';

      // Check for new VES orders using CapacitorHttp
      const ordersResponse = await CapacitorHttp.request({
        url: `${apiUrl}/ves-orders?status=PENDING`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const orders = ordersResponse.data;

      // Get current pending order IDs
      const currentOrderIds = new Set(orders.map((order: any) => order.id));

      // On first check, just store existing order IDs without notifying
      if (this.isFirstCheck) {
        orders.forEach((order: any) => {
          this.notifiedOrderIds.add(order.id);
        });
        console.log(`📋 Initialized with ${orders.length} existing pending orders`);
      } else {
        // Find orders we haven't notified about yet
        const newOrders = orders.filter((order: any) => {
          return !this.notifiedOrderIds.has(order.id);
        });

        if (newOrders.length > 0) {
          await this.showNewOrderNotification(newOrders);
          // Add these order IDs to our tracking set
          newOrders.forEach((order: any) => {
            this.notifiedOrderIds.add(order.id);
          });
        }

        // Clean up: remove fulfilled orders from tracking set
        // (orders that were in notifiedOrderIds but are no longer pending)
        const fulfilledOrderIds = Array.from(this.notifiedOrderIds).filter(
          id => !currentOrderIds.has(id)
        );
        fulfilledOrderIds.forEach(id => {
          this.notifiedOrderIds.delete(id);
          console.log(`✅ Order ${id} fulfilled - removed from tracking`);
        });
      }

      // Check for new transfers using CapacitorHttp
      const transfersResponse = await CapacitorHttp.request({
        url: `${apiUrl}/transfers`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const transfers = transfersResponse.data;

      // On first check, just store existing transfer IDs without notifying
      if (this.isFirstCheck) {
        transfers.forEach((transfer: any) => {
          this.notifiedTransferIds.add(transfer.id);
        });
        console.log(`📋 Initialized with ${transfers.length} existing transfers`);
        this.isFirstCheck = false; // Mark first check as complete
      } else {
        // Find transfers we haven't notified about yet
        const newTransfers = transfers.filter((transfer: any) => {
          return !this.notifiedTransferIds.has(transfer.id);
        });

        if (newTransfers.length > 0) {
          await this.showNewTransferNotification(newTransfers);
          // Add these transfer IDs to our tracking set
          newTransfers.forEach((transfer: any) => {
            this.notifiedTransferIds.add(transfer.id);
          });
        }
      }
    } catch (error) {
      console.error('Error checking for new items:', error);
    }
  }

  /**
   * Show notification for new VES orders
   */
  private static async showNewOrderNotification(orders: any[]) {
    try {
      const totalAmount = orders.reduce((sum, order) => sum + Number(order.amount_ves || 0), 0);

      // Generate a safe ID for Java int (max 2147483647)
      const notificationId = Math.floor(Math.random() * 2147483647);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: '🆕 New VES Order!',
            body: `${orders.length} new order${orders.length > 1 ? 's' : ''}: ${totalAmount.toLocaleString()} VES total`,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 100) }, // Show immediately
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: { type: 'new_order' }
          }
        ]
      });

      console.log(`📢 Notification sent: ${orders.length} new order(s)`);
    } catch (error) {
      console.error('Error showing order notification:', error);
    }
  }

  /**
   * Show notification for new USDT transfers
   */
  private static async showNewTransferNotification(transfers: any[]) {
    try {
      const totalAmount = transfers.reduce((sum, transfer) => sum + Number(transfer.amount_usdt || 0), 0);

      // Generate a safe ID for Java int (max 2147483647)
      const notificationId = Math.floor(Math.random() * 2147483647);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: '💰 USDT Received!',
            body: `Brian sent you ${totalAmount.toFixed(2)} USDT`,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 100) }, // Show immediately
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: { type: 'new_transfer' }
          }
        ]
      });

      console.log(`📢 Notification sent: ${totalAmount.toFixed(2)} USDT received`);
    } catch (error) {
      console.error('Error showing transfer notification:', error);
    }
  }

  /**
   * Show notification when an order is created (for Patty)
   */
  static async notifyOrderCreated(orderType: 'VES' | 'COP', amount: number, customerName: string) {
    try {
      const isCapacitor = !!(window as any).Capacitor;
      if (!isCapacitor) return;

      const notificationId = Math.floor(Math.random() * 2147483647);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: `✅ ${orderType} Order Created!`,
            body: `Order for ${customerName}: ${amount.toLocaleString()} ${orderType}`,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 100) },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: { type: 'order_created', orderType }
          }
        ]
      });

      console.log(`📢 Order created notification sent: ${orderType} - ${amount}`);
    } catch (error) {
      console.error('Error showing order created notification:', error);
    }
  }

  /**
   * Show notification when an order is fulfilled
   */
  static async notifyOrderFulfilled(orderType: 'VES' | 'COP', amount: number, customerName: string, usdtSold: number) {
    try {
      const isCapacitor = !!(window as any).Capacitor;
      if (!isCapacitor) return;

      const notificationId = Math.floor(Math.random() * 2147483647);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: `🎉 ${orderType} Order Fulfilled!`,
            body: `${customerName}: ${amount.toLocaleString()} ${orderType} → $${usdtSold.toFixed(2)} USDT sold`,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 100) },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: { type: 'order_fulfilled', orderType }
          }
        ]
      });

      console.log(`📢 Order fulfilled notification sent: ${orderType} - ${customerName}`);
    } catch (error) {
      console.error('Error showing order fulfilled notification:', error);
    }
  }

  /**
   * Show notification when USDT is requested (for Brian)
   */
  static async notifyUSDTRequested(amount: number, reason: string) {
    try {
      const isCapacitor = !!(window as any).Capacitor;
      if (!isCapacitor) return;

      const notificationId = Math.floor(Math.random() * 2147483647);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: '💵 USDT Request from Dairimar',
            body: `Request: $${amount.toFixed(2)} USDT - ${reason}`,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 100) },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: { type: 'usdt_requested' }
          }
        ]
      });

      console.log(`📢 USDT request notification sent: $${amount}`);
    } catch (error) {
      console.error('Error showing USDT request notification:', error);
    }
  }

  /**
   * Show notification when USDT transfer is approved (for Dairimar)
   */
  static async notifyUSDTTransferApproved(amount: number) {
    try {
      const isCapacitor = !!(window as any).Capacitor;
      if (!isCapacitor) return;

      const notificationId = Math.floor(Math.random() * 2147483647);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: '✅ USDT Request Approved!',
            body: `Brian approved your request: $${amount.toFixed(2)} USDT transferred`,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 100) },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: { type: 'usdt_approved' }
          }
        ]
      });

      console.log(`📢 USDT approved notification sent: $${amount}`);
    } catch (error) {
      console.error('Error showing USDT approved notification:', error);
    }
  }

  /**
   * Show notification when USDT request is rejected (for Dairimar)
   */
  static async notifyUSDTRequestRejected(amount: number, reason?: string) {
    try {
      const isCapacitor = !!(window as any).Capacitor;
      if (!isCapacitor) return;

      const notificationId = Math.floor(Math.random() * 2147483647);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: '❌ USDT Request Rejected',
            body: `Your request for $${amount.toFixed(2)} was rejected${reason ? `: ${reason}` : ''}`,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 100) },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: { type: 'usdt_rejected' }
          }
        ]
      });

      console.log(`📢 USDT rejected notification sent: $${amount}`);
    } catch (error) {
      console.error('Error showing USDT rejected notification:', error);
    }
  }

  /**
   * Show a test notification
   */
  static async showTestNotification() {
    try {
      // Generate a safe ID for Java int (max 2147483647)
      const notificationId = Math.floor(Math.random() * 2147483647);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: '✅ Notifications Working!',
            body: 'You will receive alerts for new orders and USDT transfers',
            id: notificationId,
            schedule: { at: new Date(Date.now() + 100) },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: { type: 'test' }
          }
        ]
      });
      console.log('✅ Test notification scheduled successfully');
    } catch (error) {
      console.error('Error showing test notification:', error);
    }
  }
}
