#!/usr/bin/env bash
set -e

echo "======================================================="
echo "  WrightPay Non-Functional Performance & Load Suite"
echo "======================================================="

echo ""
echo "--- Scenario A: Baseline Profiling (Uncontended) ---"
k6 run qa/performance/scenarios/baseline.js

echo ""
echo "--- Scenario B: Read Load (10 VUs Concurrent Reads) ---"
k6 run qa/performance/scenarios/read_load.js

echo ""
echo "--- Scenario C: Controlled Transfer Load (5 VUs) ---"
k6 run qa/performance/scenarios/transfer_load.js

echo ""
echo "--- Scenario D: Idempotency Race Condition (10 VUs) ---"
k6 run qa/performance/scenarios/idempotency_race.js

echo ""
echo "--- Scenario E: Mixed Workload Traffic (10 VUs) ---"
k6 run qa/performance/scenarios/mixed_workload.js

echo ""
echo "--- Scenario F: Reliability & Fault Injection ---"
k6 run qa/performance/scenarios/reliability.js

echo ""
echo "======================================================="
echo "  All Non-Functional Performance Scenarios Completed"
echo "======================================================="
