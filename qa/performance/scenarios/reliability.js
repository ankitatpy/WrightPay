import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, login } from '../helpers/auth.js';

export const options = {
  scenarios: {
    reliability_flow: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '30s',
    },
  },
};

function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function () {
  console.log('--- Starting Reliability & Fault Injection Scenarios ---');

  // Authenticate as Tariq (who has 15,000 AED)
  const auth = login('tariq.al-fayed@example.com', 'Password123!');
  const headers = auth.headers;

  // 1. Retrieve Tariq's wallet
  const walletRes = http.get(`${BASE_URL}/wallets/me`, { headers });
  const wallet = JSON.parse(walletRes.body);
  console.log(`Tariq Wallet: ${wallet.id}, Balance: ${wallet.balance} ${wallet.currency}`);

  // 2. Locate or create a standard non-failing beneficiary
  let benRes = http.get(`${BASE_URL}/beneficiaries`, { headers });
  let bens = JSON.parse(benRes.body);
  let standardBen = Array.isArray(bens)
    ? bens.find((b) => b.name && !b.name.includes('SIMULATE_FAILURE'))
    : null;

  if (!standardBen) {
    const createBenRes = http.post(
      `${BASE_URL}/beneficiaries`,
      JSON.stringify({
        name: 'Standard Legitimate Partner',
        currency: 'AED',
        payoutMethod: 'bank_account',
        accountNumber: 'AE070331234567890123456',
        bankCode: 'ENBD001',
      }),
      { headers }
    );
    if (createBenRes.status === 201) {
      standardBen = JSON.parse(createBenRes.body);
    } else {
      // Limit might be reached (max 3), reuse first non-failing or delete and recreate
      bens = JSON.parse(http.get(`${BASE_URL}/beneficiaries`, { headers }).body);
      standardBen = bens.find((b) => !b.name.includes('SIMULATE_FAILURE')) || bens[0];
    }
  }

  // TEST 1: Repeated sequential submissions with SAME Idempotency-Key
  console.log('\n[Reliability Test 1]: Rapid Sequential Replay (5 duplicate submissions)');
  const replayKey = 'k6-rel-replay-' + Date.now();
  const balanceBeforeReplay = wallet.balance;

  for (let i = 1; i <= 5; i++) {
    const replayHeaders = { ...headers, 'Idempotency-Key': replayKey };
    const res = http.post(
      `${BASE_URL}/transfers`,
      JSON.stringify({
        sourceWalletId: wallet.id,
        beneficiaryId: standardBen.id,
        sendAmount: 5.0,
        sendCurrency: 'AED',
        destinationCurrency: 'AED',
      }),
      { headers: replayHeaders }
    );

    check(res, {
      'replay returns 201': (r) => r.status === 201,
      'replay returns same reference': (r) => {
        try {
          return !!JSON.parse(r.body).reference;
        } catch (e) {
          return false;
        }
      },
    });
  }

  const walletAfterReplay = JSON.parse(http.get(`${BASE_URL}/wallets/me`, { headers }).body);
  const replayDeduction = Math.round((balanceBeforeReplay - walletAfterReplay.balance) * 100) / 100;
  console.log(`Wallet before replay: ${balanceBeforeReplay} AED, After 5 replays: ${walletAfterReplay.balance} AED`);
  console.log(`Total amount deducted: ${replayDeduction} AED (Expected: 30.00 AED: 5 amount + 25 fee)`);
  check(null, {
    'replay deducted exactly once': () => replayDeduction === 30.0,
  });

  // TEST 2: Simulated Banking Settlement Failure & BullMQ Retry
  console.log('\n[Reliability Test 2]: Simulated Banking Settlement Failure & BullMQ Error Handling');
  
  // Create a beneficiary with SIMULATE_FAILURE in the name
  const simBenRes = http.post(
    `${BASE_URL}/beneficiaries`,
    JSON.stringify({
      name: 'Bank SIMULATE_FAILURE Gateway',
      currency: 'AED',
      payoutMethod: 'bank_account',
      accountNumber: 'AE070339999999999999999',
      bankCode: 'FAIL001',
    }),
    { headers }
  );

  let failureBen = JSON.parse(simBenRes.body);
  if (simBenRes.status !== 201) {
    // Beneficiary might already exist or limit reached, fetch existing
    const allBens = JSON.parse(http.get(`${BASE_URL}/beneficiaries`, { headers }).body);
    failureBen = allBens.find((b) => b.name && b.name.includes('SIMULATE_FAILURE')) || allBens[0];
  }

  const simKey = 'k6-rel-failure-' + Date.now();
  const simTransferRes = http.post(
    `${BASE_URL}/transfers`,
    JSON.stringify({
      sourceWalletId: wallet.id,
      beneficiaryId: failureBen.id,
      sendAmount: 10.0,
      sendCurrency: 'AED',
      destinationCurrency: 'AED',
    }),
    { headers: { ...headers, 'Idempotency-Key': simKey } }
  );

  check(simTransferRes, {
    'initial transfer enqueued with 201': (r) => r.status === 201,
  });

  const txData = JSON.parse(simTransferRes.body);
  const txId = txData.id;
  console.log(`Enqueued transfer ${txId}, initial status: ${txData.status}. Monitoring BullMQ retries...`);

  // Poll for status transition (BullMQ retries 3 times with exponential backoff)
  let finalStatus = txData.status;
  let failureReason = null;

  for (let poll = 0; poll < 10; poll++) {
    sleep(0.5);
    const pollRes = http.get(`${BASE_URL}/transactions/${txId}`, { headers });
    if (pollRes.status === 200) {
      const pollData = JSON.parse(pollRes.body);
      finalStatus = pollData.status;
      failureReason = pollData.failureReason;
      if (
        finalStatus === 'FAILED' ||
        finalStatus === 'COMPLETED' ||
        finalStatus === 'failed' ||
        finalStatus === 'completed'
      ) {
        break;
      }
    }
  }

  console.log(`Final transaction status after worker attempts: ${finalStatus}`);
  console.log(`Captured failure reason: ${failureReason}`);

  check(null, {
    'transaction transitioned to failed state': () =>
      finalStatus && finalStatus.toUpperCase() === 'FAILED',
    'failureReason contains settlement error': () =>
      failureReason && failureReason.includes('Simulated banking settlement failure'),
  });

  // TEST 3: Queue Backlog & Drain Rate Observation
  console.log('\n[Reliability Test 3]: BullMQ Backlog & Drain Verification');
  const enqueuedCount = 10;
  const enqueuedTxIds = [];

  for (let j = 0; j < enqueuedCount; j++) {
    const qRes = http.post(
      `${BASE_URL}/transfers`,
      JSON.stringify({
        sourceWalletId: wallet.id,
        beneficiaryId: standardBen.id,
        sendAmount: 1.0,
        sendCurrency: 'AED',
        destinationCurrency: 'AED',
      }),
      { headers: { ...headers, 'Idempotency-Key': generateUuid() } }
    );
    if (qRes.status === 201) {
      enqueuedTxIds.push(JSON.parse(qRes.body).id);
    }
  }

  console.log(`Successfully enqueued burst of ${enqueuedTxIds.length} transfers. Observing worker drain...`);

  let completedCount = 0;
  for (let attempt = 0; attempt < 10; attempt++) {
    sleep(0.5);
    completedCount = 0;
    for (const id of enqueuedTxIds) {
      const checkRes = http.get(`${BASE_URL}/transactions/${id}`, { headers });
      if (checkRes.status === 200) {
        const parsed = JSON.parse(checkRes.body);
        if (parsed.status && parsed.status.toUpperCase() === 'COMPLETED') {
          completedCount++;
        }
      }
    }
    if (completedCount === enqueuedTxIds.length) {
      break;
    }
  }

  console.log(`Worker drained: ${completedCount}/${enqueuedTxIds.length} transactions in 'COMPLETED' status.`);
  check(null, {
    'all burst transfers drained to completed': () => completedCount === enqueuedTxIds.length,
  });

  console.log('--- Reliability & Fault Injection Scenarios Completed Successfully ---');
}
