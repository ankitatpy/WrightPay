import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, login } from '../helpers/auth.js';

export const options = {
  scenarios: {
    read_concurrency: {
      executor: 'constant-vus',
      vus: 10,
      duration: '15s',
    },
  },
};

const walletTrend = new Trend('read_wallet_duration');
const txTrend = new Trend('read_tx_duration');
const benTrend = new Trend('read_ben_duration');
const ratesTrend = new Trend('read_rates_duration');
const quoteTrend = new Trend('read_quote_duration');

export function setup() {
  const auth = login();
  return { auth };
}

export default function (data) {
  const headers = data.auth.headers;

  // 1. GET /wallets/me
  const resWallet = http.get(`${BASE_URL}/wallets/me`, { headers });
  walletTrend.add(resWallet.timings.duration);
  check(resWallet, { 'wallets 200': (r) => r.status === 200 });

  // 2. GET /transactions
  const resTx = http.get(`${BASE_URL}/transactions?limit=10&offset=0`, { headers });
  txTrend.add(resTx.timings.duration);
  check(resTx, { 'transactions 200': (r) => r.status === 200 });

  // 3. GET /beneficiaries
  const resBen = http.get(`${BASE_URL}/beneficiaries`, { headers });
  benTrend.add(resBen.timings.duration);
  check(resBen, { 'beneficiaries 200': (r) => r.status === 200 });

  // 4. GET /exchange-rates
  const resRates = http.get(`${BASE_URL}/exchange-rates`);
  ratesTrend.add(resRates.timings.duration);
  check(resRates, { 'rates 200': (r) => r.status === 200 });

  // 5. GET /exchange-rates/quote
  const resQuote = http.get(`${BASE_URL}/exchange-rates/quote?from=EUR&to=USD&amount=100`);
  quoteTrend.add(resQuote.timings.duration);
  check(resQuote, { 'quote 200': (r) => r.status === 200 });
}
