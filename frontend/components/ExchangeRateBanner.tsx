'use client';

import { mockExchangeRates } from '@/lib/mock-data';
import { useEffect, useState } from 'react';

export default function ExchangeRateBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mockExchangeRates.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const currentRate = mockExchangeRates[currentIndex];

  return (
    <div className="bg-slate-900 text-white py-3 px-8 overflow-hidden">
      <div className="flex items-center justify-center gap-2 font-mono text-sm">
        <span className="text-blue-400 font-bold">{currentRate.from}</span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-300">{currentRate.to}</span>
        <span className="mx-2 text-slate-600">→</span>
        <span className="text-slate-100 font-semibold">{currentRate.rate.toFixed(4)}</span>
        <span className="text-slate-600 ml-2">•</span>
        <span className="text-slate-500 ml-2">Live rates</span>
      </div>
    </div>
  );
}
