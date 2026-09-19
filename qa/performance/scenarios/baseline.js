import http from 'k6/http';
import { check, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, login } from '../helpers/auth.js';

export const options = {
  scenarios: {
    baseline_benchmarks: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 30,
      maxDuration: '1m',
    },
  },
  thresholds: {
    // Collect stats without forcing unrealistic thresholds
    'http_req_duration': ['p(50)>=0', 'p(95)>=0', 'p(99)>=0'],
  },
};

const loginTrend = new Trend('trend_login');
const walletTrend = new Trend('trend_wallet');
const txTrend = new Trend('trend_transactions');
const benTrend = new Trend('trend_beneficiaries');
const ratesTrend = new Trend('trend_exchange_rates');
const quoteTrend = new Trend('trend_quote');

export function setup() {
  const auth = login();
  return { auth };
}

export default function (data) {
  const headers = data.auth.headers;

  // 1. Auth Login
  group('POST /auth/login', () => {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: 'anna.kowalski@example.com', password: 'Password123!' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    loginTrend.add(res.timings.duration);
    check(res, { 'login status is 200': (r) => r.status === 200 });
  });

  // 2. GET /wallets/me
  group('GET /wallets/me', () => {
    const res = http.get(`${BASE_URL}/wallets/me`, { headers });
    walletTrend.add(res.timings.duration);
    check(res, {
      'wallets status is 200': (r) => r.status === 200,
      'wallet has balance': (r) => JSON.parse(r.body).balance !== undefined,
    });
  });

  // 3. GET /transactions
  group('GET /transactions', () => {
    const res = http.get(`${BASE_URL}/transactions?limit=10&offset=0`, { headers });
    txTrend.add(res.timings.duration);
    check(res, {
      'transactions status is 200': (r) => r.status === 200,
      'transactions returns items': (r) => Array.isArray(JSON.parse(r.body).items),
    });
  });

  // 4. GET /beneficiaries
  group('GET /beneficiaries', () => {
    const res = http.get(`${BASE_URL}/beneficiaries`, { headers });
    benTrend.add(res.timings.duration);
    check(res, {
      'beneficiaries status is 200': (r) => r.status === 200,
    });
  });

  // 5. GET /exchange-rates
  group('GET /exchange-rates', () => {
    const res = http.get(`${BASE_URL}/exchange-rates`);
    ratesTrend.add(res.timings.duration);
    check(res, {
      'exchange-rates status is 200': (r) => r.status === 200,
    });
  });

  // 6. GET /exchange-rates/quote
  group('GET /exchange-rates/quote', () => {
    const res = http.get(`${BASE_URL}/exchange-rates/quote?from=EUR&to=USD&amount=100`);
    quoteTrend.add(res.timings.duration);
    check(res, {
      'quote status is 200': (r) => r.status === 200,
      'quote returns rate': (r) => JSON.parse(r.body).rate !== undefined,
    });
  });
}
