import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, login } from '../helpers/auth.js';

export const options = {
  scenarios: {
    controlled_transfers: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 5, // 5 VUs * 5 iterations = 25 total valid transfers
      maxDuration: '30s',
    },
  },
};

const transferDuration = new Trend('transfer_request_duration');
const successfulTransfers = new Counter('transfers_successful');

function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function setup() {
  const auth = login('anna.kowalski@example.com', 'Password123!');
  const headers = auth.headers;

  // Retrieve default wallet
  const walletRes = http.get(`${BASE_URL}/wallets/me`, { headers });
  const wallet = JSON.parse(walletRes.body);

  // Retrieve beneficiaries
  const benRes = http.get(`${BASE_URL}/beneficiaries`, { headers });
  const bens = JSON.parse(benRes.body);
  const beneficiary = bens[0];

  if (!beneficiary) {
    throw new Error('No beneficiaries found for Anna');
  }

  return {
    auth,
    walletId: wallet.id,
    beneficiaryId: beneficiary.id,
    initialBalance: wallet.balance,
  };
}

export default function (data) {
  const headers = {
    ...data.auth.headers,
    'Idempotency-Key': generateUuid(),
  };

  const payload = JSON.stringify({
    sourceWalletId: data.walletId,
    beneficiaryId: data.beneficiaryId,
    sendAmount: 1.0,
    sendCurrency: 'EUR',
    destinationCurrency: 'EUR',
  });

  const res = http.post(`${BASE_URL}/transfers`, payload, { headers });
  transferDuration.add(res.timings.duration);

  const ok = check(res, {
    'transfer status is 201': (r) => r.status === 201,
    'transfer response has reference': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.reference && body.reference.startsWith('WP-');
      } catch (e) {
        return false;
      }
    },
    'transfer has fee 25': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Number(body.fee) === 25;
      } catch (e) {
        return false;
      }
    },
  });

  if (ok) {
    successfulTransfers.add(1);
  }
}

export function teardown(data) {
  const res = http.get(`${BASE_URL}/wallets/me`, { headers: data.auth.headers });
  const currentWallet = JSON.parse(res.body);
  console.log(`Initial wallet balance: ${data.initialBalance} EUR, Ending balance: ${currentWallet.balance} EUR`);
}
