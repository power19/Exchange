import { Router } from 'express';
import { balanceRoutes } from './balances';
import { purchaseRoutes } from './purchases';
import { transferRoutes } from './transfers';
import { conversionRoutes } from './conversions';
import { vesOrderRoutes } from './vesOrders';
import { copOrderRoutes } from './copOrders';
import { withdrawalRoutes } from './withdrawals';
import { authRoutes } from './auth';
import { exchangeRatesRoutes } from './exchangeRates';
import { reportsRoutes } from './reports';
import { auditLogRoutes } from './auditLogs';
import { usdtRequestRoutes } from './usdtRequests';
import { expensesRoutes } from './expenses';

const router = Router();

router.use('/auth', authRoutes);
router.use('/balances', balanceRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/transfers', transferRoutes);
router.use('/conversions', conversionRoutes);
router.use('/ves-orders', vesOrderRoutes);
router.use('/cop-orders', copOrderRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/expenses', expensesRoutes);
router.use('/exchange-rates', exchangeRatesRoutes);
router.use('/reports', reportsRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/usdt-requests', usdtRequestRoutes);

export { router as apiRoutes };
