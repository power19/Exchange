import { Router } from 'express';
import { BalanceService } from '../services/balanceService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all balances (public)
router.get('/', async (req, res, next) => {
  try {
    const balances = await BalanceService.getAllBalances();
    res.json(balances);
  } catch (error) {
    next(error);
  }
});

// Get profit data (PRIVATE - requires authentication)
router.get('/profit', authMiddleware, async (req, res, next) => {
  try {
    const profitData = await BalanceService.getProfitData();
    res.json(profitData);
  } catch (error) {
    next(error);
  }
});

// Get VES shortfall info (for Dairimar's dashboard)
router.get('/ves-shortfall', async (req, res, next) => {
  try {
    const shortfallInfo = await BalanceService.getVESShortfall();
    res.json(shortfallInfo);
  } catch (error) {
    next(error);
  }
});

export { router as balanceRoutes };
