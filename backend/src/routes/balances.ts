import { Router } from 'express';
import { BalanceService } from '../services/balanceService';
import { requireBrian, requireAnyRole, requireBrianOrDairimar } from '../middleware/rbac';

const router = Router();

// Get all balances (accessible to all authenticated roles)
router.get('/', requireAnyRole(), async (req, res, next) => {
  try {
    const balances = await BalanceService.getAllBalances();
    res.json(balances);
  } catch (error) {
    next(error);
  }
});

// Get profit data (PRIVATE - Brian only)
router.get('/profit', requireBrian(), async (req, res, next) => {
  try {
    const profitData = await BalanceService.getProfitData();
    res.json(profitData);
  } catch (error) {
    next(error);
  }
});

// Get VES shortfall info (Brian and Dairimar only)
router.get('/ves-shortfall', requireBrianOrDairimar(), async (req, res, next) => {
  try {
    const shortfallInfo = await BalanceService.getVESShortfall();
    res.json(shortfallInfo);
  } catch (error) {
    next(error);
  }
});

export { router as balanceRoutes };
