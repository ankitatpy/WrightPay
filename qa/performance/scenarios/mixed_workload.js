import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, login } from '../helpers/auth.js';

export const options = {
  scenarios: {
    mixed_traffic: {
      executor: 'constant-vus',
      vus: 10,
      duration: '20s',
    },
  },
};

const mixedReqDuration = new Trend('mixed_req_duration');
const transferCount = new Counter('mixed_transfers_count');

function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function setup() {
  const anna = login('anna.kowalski@example.com', 'Password123!');
  const tariq = login('tariq.al-fayed@example.com', 'Password123!');
  const acme = login('finance@acmecorp.example.com', 'Password123!');

  const annaWallet = JSON.parse(http.get(`${BASE_URL}/wallets/me`, { headers: anna.headers }).body);
  const annaBens = JSON.parse(http.get(`${BASE_URL}/beneficiaries`, { headers: anna.headers }).body);

  return {
    users: [anna, tariq, acme],
    annaWalletId: annaWallet.id,
    annaBenId: annaBens[0] ? annaBens[0].id : null,
  };
}

export default function (data) {
  // Select random user
  const user = data.users[Math.floor(Math.random() * data.users.length)];
  const headers = user.headers;

  // Decide action based on traffic weight
  const rand = Math.random();

  if (rand < 0.40) {
    // 40% Wallet read
    const res = http.get(`${BASE_URL}/wallets/me`, { headers });
    mixedReqDuration.add(res.timings.duration);
    check(res, { 'wallet ok': (r) => r.status === 200 });
  } else if (rand < 0.65) {
    // 25% Transactions read
    const res = http.get(`${BASE_URL}/transactions?limit=10&offset=0`, { headers });
    mixedReqDuration.add(res.timings.duration);
    check(res, { 'transactions ok': (r) => r.status === 200 });
  } else if (rand < 0.85) {
    // 20% Exchange rates read
    const res = http.get(`${BASE_URL}/exchange-rates`);
    mixedReqDuration.add(res.timings.duration);
    check(res, { 'rates ok': (r) => r.status === 200 });
  } else if (rand < 0.95) {
    // 10% Beneficiaries read
    const res = http.get(`${BASE_URL}/beneficiaries`, { headers });
    mixedReqDuration.add(res.timings.duration);
    check(res, { 'beneficiaries ok': (r) => r.status === 200 });
  } else {
    // 5% Transfer write (Anna to Maria Rossi)
    if (data.annaWalletId && data.annaBenId) {
      const transferHeaders = {
        ...data.users[0].headers,
        'Idempotency-Key': generateUuid(),
      };
      const payload = JSON.stringify({
        sourceWalletId: data.annaWalletId,
        beneficiaryId: data.annaBenId,
        sendAmount: 1.0,
        sendCurrency: 'EUR',
        destinationCurrency: 'EUR',
      });
      const res = http.post(`${BASE_URL}/transfers`, payload, { headers: transferHeaders });
      mixedReqDuration.add(res.timings.duration);
      check(res, { 'transfer ok': (r) => r.status === 201 });
      transferCount.add(1);
    }
  }

  sleep(0.01);
}
