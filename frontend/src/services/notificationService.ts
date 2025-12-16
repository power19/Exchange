import { LocalNotifications } from '@capacitor/local-notifications';
import { CapacitorHttp } from '@capacitor/core';

export class NotificationService {
  private static checkInterval: number | null = null;
  private static notifiedOrderIds: Set<number> = new Set();
  private static notifiedTransferIds: Set<number> = new Set();
  private static notifiedVESFulfilledIds: Set<number> = new Set();
  private static notifiedCOPFulfilledIds: Set<number> = new Set();
  private static notifiedUSDTRequestIds: Set<number> = new Set();
  private static isFirstCheck: boolean = true;
  private static userRole: 'brian' | 'dairimar' | 'patty' | null = null;

  /**
   * Initialize notifications - request permissions and start monitoring
   */
  static async initialize(role: 'brian' | 'dairimar' | 'patty') {
    this.userRole = role;

    // Check if running in Capacitor (mobile)
    const isCapacitor = !!(window as any).Capacitor;
    if (!isCapacitor) return;

    try {
      // Request permission
      const permission = await LocalNotifications.requestPermissions();

      if (permission.display === 'granted') {
        console.log(`✅ Notification permissions granted for ${role}`);

        // Start checking for new orders/transfers every 15 seconds
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
   * Check for new orders and transfers based on user role
   */
  private static async checkForNewItems() {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';

      if (this.userRole === 'brian') {
        await this.checkForBrian(apiUrl);
      } else if (this.userRole === 'dairimar') {
        await this.checkForDairimar(apiUrl);
      } else if (this.userRole === 'patty') {
        await this.checkForPatty(apiUrl);
      }

      this.isFirstCheck = false;
    } catch (error) {
      console.error('Error checking for new items:', error);
    }
  }

  /**
   * Brian monitors: new VES orders, new COP orders, fulfilled VES orders, USDT requests
   */
  private static async checkForBrian(apiUrl: string) {
    // 1. Check for new PENDING VES orders
    const vesOrdersRes = await CapacitorHttp.request({
      url: `${apiUrl}/ves-orders?status=PENDING`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const pendingVES = vesOrdersRes.data;

    if (this.isFirstCheck) {
      pendingVES.forEach((order: any) => this.notifiedOrderIds.add(order.id));
      console.log(`📋 Brian: Initialized with ${pendingVES.length} pending VES orders`);
    } else {
      const newVES = pendingVES.filter((order: any) => !this.notifiedOrderIds.has(order.id));
      if (newVES.length > 0) {
        await this.showNewVESOrderNotification(newVES);
        newVES.forEach((order: any) => this.notifiedOrderIds.add(order.id));
      }
    }

    // 2. Check for new PENDING COP orders
    const copOrdersRes = await CapacitorHttp.request({
      url: `${apiUrl}/cop-orders?status=PENDING`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const pendingCOP = copOrdersRes.data;

    if (this.isFirstCheck) {
      pendingCOP.forEach((order: any) => this.notifiedOrderIds.add(order.id));
      console.log(`📋 Brian: Initialized with ${pendingCOP.length} pending COP orders`);
    } else {
      const newCOP = pendingCOP.filter((order: any) => !this.notifiedOrderIds.has(order.id));
      if (newCOP.length > 0) {
        await this.showNewCOPOrderNotification(newCOP);
        newCOP.forEach((order: any) => this.notifiedOrderIds.add(order.id));
      }
    }

    // 3. Check for newly COMPLETED VES orders
    const completedVESRes = await CapacitorHttp.request({
      url: `${apiUrl}/ves-orders?status=COMPLETED`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const completedVES = completedVESRes.data;

    if (this.isFirstCheck) {
      completedVES.forEach((order: any) => this.notifiedVESFulfilledIds.add(order.id));
      console.log(`📋 Brian: Initialized with ${completedVES.length} completed VES orders`);
    } else {
      const newlyCompleted = completedVES.filter((order: any) => !this.notifiedVESFulfilledIds.has(order.id));
      if (newlyCompleted.length > 0) {
        await this.showVESOrderCompletedNotification(newlyCompleted);
        newlyCompleted.forEach((order: any) => this.notifiedVESFulfilledIds.add(order.id));
      }
    }

    // 4. Check for new USDT requests
    const requestsRes = await CapacitorHttp.request({
      url: `${apiUrl}/usdt-requests?status=PENDING`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const requests = requestsRes.data;

    if (this.isFirstCheck) {
      requests.forEach((req: any) => this.notifiedUSDTRequestIds.add(req.id));
      console.log(`📋 Brian: Initialized with ${requests.length} USDT requests`);
    } else {
      const newRequests = requests.filter((req: any) => !this.notifiedUSDTRequestIds.has(req.id));
      if (newRequests.length > 0) {
        for (const req of newRequests) {
          await this.notifyUSDTRequested(req.amount_usdt, req.reason);
          this.notifiedUSDTRequestIds.add(req.id);
        }
      }
    }
  }

  /**
   * Dairimar monitors: new VES orders, new USDT transfers
   */
  private static async checkForDairimar(apiUrl: string) {
    // 1. Check for new PENDING VES orders
    const ordersResponse = await CapacitorHttp.request({
      url: `${apiUrl}/ves-orders?status=PENDING`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const orders = ordersResponse.data;

    if (this.isFirstCheck) {
      orders.forEach((order: any) => this.notifiedOrderIds.add(order.id));
      console.log(`📋 Dairimar: Initialized with ${orders.length} pending VES orders`);
    } else {
      const newOrders = orders.filter((order: any) => !this.notifiedOrderIds.has(order.id));
      if (newOrders.length > 0) {
        await this.showNewVESOrderNotification(newOrders);
        newOrders.forEach((order: any) => this.notifiedOrderIds.add(order.id));
      }
    }

    // 2. Check for new USDT transfers
    const transfersResponse = await CapacitorHttp.request({
      url: `${apiUrl}/transfers`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const transfers = transfersResponse.data;

    if (this.isFirstCheck) {
      transfers.forEach((transfer: any) => this.notifiedTransferIds.add(transfer.id));
      console.log(`📋 Dairimar: Initialized with ${transfers.length} transfers`);
    } else {
      const newTransfers = transfers.filter((transfer: any) => !this.notifiedTransferIds.has(transfer.id));
      if (newTransfers.length > 0) {
        await this.showNewTransferNotification(newTransfers);
        newTransfers.forEach((transfer: any) => this.notifiedTransferIds.add(transfer.id));
      }
    }
  }

  /**
   * Patty monitors: her orders being completed
   */
  private static async checkForPatty(apiUrl: string) {
    // 1. Check for COMPLETED VES orders
    const vesOrdersRes = await CapacitorHttp.request({
      url: `${apiUrl}/ves-orders?status=COMPLETED`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const completedVES = vesOrdersRes.data;

    if (this.isFirstCheck) {
      completedVES.forEach((order: any) => this.notifiedVESFulfilledIds.add(order.id));
      console.log(`📋 Patty: Initialized with ${completedVES.length} completed VES orders`);
    } else {
      const newlyCompleted = completedVES.filter((order: any) => !this.notifiedVESFulfilledIds.has(order.id));
      if (newlyCompleted.length > 0) {
        await this.showVESOrderCompletedNotification(newlyCompleted);
        newlyCompleted.forEach((order: any) => this.notifiedVESFulfilledIds.add(order.id));
      }
    }

    // 2. Check for COMPLETED COP orders
    const copOrdersRes = await CapacitorHttp.request({
      url: `${apiUrl}/cop-orders?status=COMPLETED`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const completedCOP = copOrdersRes.data;

    if (this.isFirstCheck) {
      completedCOP.forEach((order: any) => this.notifiedCOPFulfilledIds.add(order.id));
      console.log(`📋 Patty: Initialized with ${completedCOP.length} completed COP orders`);
    } else {
      const newlyCompleted = completedCOP.filter((order: any) => !this.notifiedCOPFulfilledIds.has(order.id));
      if (newlyCompleted.length > 0) {
        await this.showCOPOrderCompletedNotification(newlyCompleted);
        newlyCompleted.forEach((order: any) => this.notifiedCOPFulfilledIds.add(order.id));
      }
    }
  }

  /**
   * Show notification for new VES orders
   */
  private static async showNewVESOrderNotification(orders: any[]) {
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
            sound: 'default',
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
            sound: 'default',
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
   * Show notification for new COP orders (for Brian)
   */
  private static async showNewCOPOrderNotification(orders: any[]) {
    try {
      const totalAmount = orders.reduce((sum, order) => sum + Number(order.amount_cop || 0), 0);
      const notificationId = Math.floor(Math.random() * 2147483647);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: '🆕 New COP Order!',
            body: `${orders.length} new order${orders.length > 1 ? 's' : ''}: ${totalAmount.toLocaleString()} COP total`,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: { type: 'new_cop_order' }
          }
        ]
      });

      console.log(`📢 Notification sent: ${orders.length} new COP order(s)`);
    } catch (error) {
      console.error('Error showing COP order notification:', error);
    }
  }

  /**
   * Show notification for VES order completion
   */
  private static async showVESOrderCompletedNotification(orders: any[]) {
    try {
      for (const order of orders) {
        const notificationId = Math.floor(Math.random() * 2147483647);

        await LocalNotifications.schedule({
          notifications: [
            {
              title: '🎉 VES Order Completed!',
              body: `${order.customer_name}: ${Number(order.amount_ves).toLocaleString()} VES → $${Number(order.usdt_sold).toFixed(2)} USDT`,
              id: notificationId,
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default',
              attachments: undefined,
              actionTypeId: '',
              extra: { type: 'ves_order_completed' }
            }
          ]
        });

        console.log(`📢 VES order completed: ${order.customer_name}`);
      }
    } catch (error) {
      console.error('Error showing VES completion notification:', error);
    }
  }

  /**
   * Show notification for COP order completion
   */
  private static async showCOPOrderCompletedNotification(orders: any[]) {
    try {
      for (const order of orders) {
        const notificationId = Math.floor(Math.random() * 2147483647);

        await LocalNotifications.schedule({
          notifications: [
            {
              title: '🎉 COP Order Completed!',
              body: `${order.customer_name}: ${Number(order.amount_cop).toLocaleString()} COP → $${Number(order.usdt_sold).toFixed(2)} USDT`,
              id: notificationId,
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default',
              attachments: undefined,
              actionTypeId: '',
              extra: { type: 'cop_order_completed' }
            }
          ]
        });

        console.log(`📢 COP order completed: ${order.customer_name}`);
      }
    } catch (error) {
      console.error('Error showing COP completion notification:', error);
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
            sound: 'default',
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
            sound: 'default',
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
            sound: 'default',
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
            sound: 'default',
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
            sound: 'default',
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
            sound: 'default',
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
