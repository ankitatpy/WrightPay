import { Currency } from '@/types';

export const formatCurrency = (amount: number, currency: Currency): string => {
  const currencySymbols: Record<Currency, string> = {
    EUR: '€',
    GBP: '£',
    USD: '$',
    AED: 'د.إ',
    PLN: 'zł',
    INR: '₹',
  };

  return `${currencySymbols[currency]}${amount.toFixed(2)}`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatAccountNumber = (accountNumber: string): string => {
  if (accountNumber.length <= 4) return accountNumber;
  const lastFour = accountNumber.slice(-4);
  return `•••• ${lastFour}`;
};
