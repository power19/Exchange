import { useState, useEffect } from 'react';
import * as api from '../services/api';
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
      alert('Rate must be greater than 0');
      return;
    }

    try {
      await api.setExchangeRate({ currency, rate, set_by: 'admin' });
      alert(`${currency} rate updated successfully!`);
      setShowVESForm(false);
      setShowCOPForm(false);
      loadRates();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || 'Failed to update rate'}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Loading rates...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">💱 Exchange Rate Management</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* VES Rate */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-600 font-medium">VES Rate</p>
              <p className="text-3xl font-bold text-purple-600">
                {rates?.VES ? Number(rates.VES.rate).toLocaleString() : 'Not Set'}
              </p>
              {rates?.VES && (
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {new Date(rates.VES.created_at).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowVESForm(!showVESForm)}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
            >
              Update
            </button>
          </div>

          {showVESForm && (
            <form onSubmit={(e) => handleSetRate(e, 'VES')} className="mt-4 pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New VES Rate (VES/USDT)
              </label>
              <input
                type="number"
                name="rate"
                step="0.01"
                defaultValue={rates?.VES?.rate || ''}
                className="w-full px-3 py-2 border rounded mb-2"
                required
              />
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                >
                  Set Rate
                </button>
                <button
                  type="button"
                  onClick={() => setShowVESForm(false)}
                  className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* COP Rate */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-600 font-medium">COP Rate</p>
              <p className="text-3xl font-bold text-blue-600">
                {rates?.COP ? Number(rates.COP.rate).toLocaleString() : 'Not Set'}
              </p>
              {rates?.COP && (
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {new Date(rates.COP.created_at).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCOPForm(!showCOPForm)}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Update
            </button>
          </div>

          {showCOPForm && (
            <form onSubmit={(e) => handleSetRate(e, 'COP')} className="mt-4 pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New COP Rate (COP/USDT)
              </label>
              <input
                type="number"
                name="rate"
                step="0.01"
                defaultValue={rates?.COP?.rate || ''}
                className="w-full px-3 py-2 border rounded mb-2"
                required
              />
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Set Rate
                </button>
                <button
                  type="button"
                  onClick={() => setShowCOPForm(false)}
                  className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Today's VES Rate History */}
      {vesHistory.length > 1 && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-700 mb-2">📊 Today's VES Rate Changes</h4>
          <div className="space-y-2">
            {vesHistory.map((rate) => (
              <div key={rate.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                <span className="text-gray-600">
                  {new Date(rate.created_at).toLocaleTimeString()}
                </span>
                <span className="font-semibold">{Number(rate.rate).toLocaleString()} VES/USDT</span>
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
    </div>
  );
}
