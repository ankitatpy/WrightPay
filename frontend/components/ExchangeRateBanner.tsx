'use client';

import { useEffect, useState } from 'react';
import { getExchangeRates } from '@/lib/api/exchange-rates';
import { ExchangeRate } from '@/types';

export default function ExchangeRateBanner() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    getExchangeRates()
      .then((data) => {
        if (!isCancelled && Array.isArray(data) && data.length > 0) {
          setRates(data);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch live exchange rates:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (rates.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % rates.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [rates]);

  if (rates.length === 0) return null;

  const currentRate = rates[currentIndex];
  const rateNumeric = typeof currentRate.rate === 'string' ? parseFloat(currentRate.rate) : currentRate.rate;

  return (
    <div className="bg-slate-900 text-white py-3 px-8 overflow-hidden">
      <div className="flex items-center justify-center gap-2 font-mono text-sm">
        <span className="text-blue-400 font-bold" suppressHydrationWarning>{currentRate.from}</span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-300" suppressHydrationWarning>{currentRate.to}</span>
        <span className="mx-2 text-slate-600">→</span>
        <span className="text-slate-100 font-semibold" suppressHydrationWarning>{Number(rateNumeric).toFixed(4)}</span>
        <span className="text-slate-600 ml-2">•</span>
        <span className="text-slate-500 ml-2">Live rates</span>
      </div>
    </div>
  );
}

