import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL, login } from '../helpers/auth.js';

export const options = {
  scenarios: {
    concurrent_race: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 1, // 10 parallel requests sent at the exact same moment
      maxDuration: '10s',
    },
  },
};

const raceDuration = new Trend('idempotency_race_duration');
const status201Count = new Counter('race_status_201');
const status409Count = new Counter('race_status_409');
const otherStatusCount = new Counter('race_status_other');

// Fixed shared key for the race
const SHARED_KEY = 'k6-race-shared-idempotency-key-' + Date.now();

export function setup() {
  const auth = login('anna.kowalski@example.com', 'Password123!');
  const headers = auth.headers;

  const walletRes = http.get(`${BASE_URL}/wallets/me`, { headers });
  const wallet = JSON.parse(walletRes.body);

  const benRes = http.get(`${BASE_URL}/beneficiaries`, { headers });
  const bens = JSON.parse(benRes.body);

  return {
    auth,
    walletId: wallet.id,
    beneficiaryId: bens[0].id,
    initialBalance: wallet.balance,
    sharedKey: SHARED_KEY,
  };
}

export default function (data) {
  const headers = {
    ...data.auth.headers,
    'Idempotency-Key': data.sharedKey,
  };

  const payload = JSON.stringify({
    sourceWalletId: data.walletId,
    beneficiaryId: data.beneficiaryId,
    sendAmount: 2.0,
    sendCurrency: 'EUR',
    destinationCurrency: 'EUR',
  });

  const res = http.post(`${BASE_URL}/transfers`, payload, { headers });
  raceDuration.add(res.timings.duration);

  if (res.status === 201) {
    status201Count.add(1);
  } else if (res.status === 409) {
    status409Count.add(1);
  } else {
    otherStatusCount.add(1);
  }

  check(res, {
    'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
    'status is not 500': (r) => r.status !== 500,
  });
}

export function teardown(data) {
  const res = http.get(`${BASE_URL}/wallets/me`, { headers: data.auth.headers });
  const currentWallet = JSON.parse(res.body);
  const totalDeducted = Math.round((data.initialBalance - currentWallet.balance) * 100) / 100;
  console.log(`Initial Balance: ${data.initialBalance} EUR, Ending Balance: ${currentWallet.balance} EUR, Total Deducted: ${totalDeducted} EUR`);
}
