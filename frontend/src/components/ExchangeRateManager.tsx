import { useState, useEffect } from 'react';
import * as api from '../services/api';
import { Card, Button } from './modern';
import type { ExchangeRate, CurrentRates } from '../types';

export default function ExchangeRateManager() {
  const [rates, setRates] = useState<CurrentRates | null>(null);
  const [vesHistory, setVesHistory] = useState<ExchangeRate[]>([]);
  const [showVESForm, setShowVESForm] = useState(false);
  const [showCOPForm, setShowCOPForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      setLoading(true);
      const [ratesRes, vesHistoryRes] = await Promise.all([
        api.getCurrentRates(),
        api.getTodayRateHistory('VES')
      ]);
      setRates(ratesRes.data);
      setVesHistory(vesHistoryRes.data);
    } catch (error) {
      console.error('Error loading rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetRate = async (e: React.FormEvent<HTMLFormElement>, currency: 'VES' | 'COP') => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rate = parseFloat(formData.get('rate') as string);

    if (rate <= 0) {
      alert('❌ Rate must be greater than 0');
      return;
    }

    try {
      await api.setExchangeRate({ currency, rate, set_by: 'admin' });
      alert(`✅ ${currency} rate updated successfully to ${rate.toLocaleString()}!`);
      setShowVESForm(false);
      setShowCOPForm(false);
      loadRates();
    } catch (error: any) {
      alert(`❌ Error: ${error.response?.data?.error || 'Failed to update rate'}`);
    }
  };

  if (loading) {
    return (
      <Card>
        <p className="text-gray-400">Loading rates...</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-2xl font-bold mb-6">💱 Exchange Rate Management</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* VES Rate */}
        <div className="bg-[#151932] border border-purple-500/30 rounded-lg p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm text-gray-400 font-medium mb-2">VES Rate</p>
              <p className="text-4xl font-bold text-purple-400">
                {rates?.VES ? Number(rates.VES.rate).toLocaleString() : 'Not Set'}
              </p>
              <p className="text-xs text-gray-600 mt-1">VES/USDT</p>
              {rates?.VES && (
                <p className="text-xs text-gray-500 mt-2">
                  Updated: {new Date(rates.VES.created_at).toLocaleString()}
                </p>
              )}
            </div>
            <Button
              onClick={() => setShowVESForm(!showVESForm)}
              variant="secondary"
              size="sm"
            >
              Update
            </Button>
          </div>

          {showVESForm && (
            <form onSubmit={(e) => handleSetRate(e, 'VES')} className="mt-4 pt-4 border-t border-gray-700 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New VES Rate (VES/USDT)
                </label>
                <input
                  type="number"
                  name="rate"
                  step="0.01"
                  defaultValue={rates?.VES?.rate || ''}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g., 40000.00"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" fullWidth>
                  Set Rate
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowVESForm(false)}
                  variant="secondary"
                  fullWidth
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* COP Rate */}
        <div className="bg-[#151932] border border-green-500/30 rounded-lg p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm text-gray-400 font-medium mb-2">COP Rate</p>
              <p className="text-4xl font-bold text-green-400">
                {rates?.COP ? Number(rates.COP.rate).toLocaleString() : 'Not Set'}
              </p>
              <p className="text-xs text-gray-600 mt-1">COP/USDT</p>
              {rates?.COP && (
                <p className="text-xs text-gray-500 mt-2">
                  Updated: {new Date(rates.COP.created_at).toLocaleString()}
                </p>
              )}
            </div>
            <Button
              onClick={() => setShowCOPForm(!showCOPForm)}
              variant="secondary"
              size="sm"
            >
              Update
            </Button>
          </div>

          {showCOPForm && (
            <form onSubmit={(e) => handleSetRate(e, 'COP')} className="mt-4 pt-4 border-t border-gray-700 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New COP Rate (COP/USDT)
                </label>
                <input
                  type="number"
                  name="rate"
                  step="0.01"
                  defaultValue={rates?.COP?.rate || ''}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                  placeholder="e.g., 4000.00"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="success" fullWidth>
                  Set Rate
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowCOPForm(false)}
                  variant="secondary"
                  fullWidth
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Today's VES Rate History */}
      {vesHistory.length > 1 && (
        <div className="border-t border-gray-700 pt-4">
          <h4 className="font-semibold text-white mb-4">📊 Today's VES Rate Changes</h4>
          <div className="space-y-2">
            {vesHistory.map((rate) => (
              <div key={rate.id} className="flex justify-between items-center text-sm bg-[#151932] p-3 rounded-lg border border-gray-700">
                <span className="text-gray-400">
                  {new Date(rate.created_at).toLocaleTimeString()}
                </span>
                <span className="font-semibold text-purple-400">{Number(rate.rate).toLocaleString()} VES/USDT</span>
                {rate.orders_count !== undefined && rate.orders_count > 0 && (
                  <span className="text-xs text-gray-500">
                    ({rate.orders_count} orders)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
