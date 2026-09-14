/**
 * ClearFlow Section 5 (F-29 to F-33) Automated Verification Test Suite
 * Validates Visual Quality Verification, Workload Forecasting, Smart Dispatch Scoring,
 * Anomaly Detection, and Waste Environmental Impact Estimation.
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('======================================================');
  console.log('🧪 CLEARFLOW F-29 TO F-33 (AI & ML FEATURES) TEST SUITE');
  console.log('======================================================\n');

  let adminToken = '';
  let fieldToken = '';

  // [AUTH] Log into Admin & Field Team
  console.log('▶ [AUTH] Logging into Admin & Field Team demo accounts...');
  const adminLogin = await makeRequest('/api/auth/login', 'POST', {
    email: 'admin@clearflow.com',
    password: 'Admin@123',
  });
  adminToken = adminLogin.body.data?.token;

  const fieldLogin = await makeRequest('/api/auth/login', 'POST', {
    email: 'field@clearflow.com',
    password: 'Demo@123',
  });
  fieldToken = fieldLogin.body.data?.token;

  if (!adminToken || !fieldToken) {
    console.error('  ❌ Auth failed: Could not acquire tokens');
    process.exit(1);
  }
  console.log('  Admin Token Acquired: true');
  console.log('  Field Team Token Acquired: true\n');

  // [TEST 1] F-29: Visual Quality Verification & Duplicate Fraud Detection
  console.log('▶ [TEST 1] F-29: Visual Quality Verification & Fraud Detection');
  
  // 1a. Legitimate inspection with distinct before and after photos
  const verifyValidRes = await makeRequest('/api/ai/verify', 'POST', {
    beforeUrl: 'https://res.cloudinary.com/clearflow/image/upload/v1/samples/clean_before.jpg',
    afterUrl: 'https://res.cloudinary.com/clearflow/image/upload/v1/samples/clean_after.jpg',
    threshold: 0.75,
  }, adminToken);

  console.log('  Valid Verification Status:', verifyValidRes.statusCode);
  console.log('  Confidence Score:', verifyValidRes.body.data?.confidenceScore);
  console.log('  Result:', verifyValidRes.body.data?.result);
  console.log('  Structural Difference:', verifyValidRes.body.data?.details?.structuralDifference);

  if (verifyValidRes.statusCode === 200 && verifyValidRes.body.data?.result === 'Pass') {
    console.log('  ✅ F-29a Passed: Distinct before/after photos successfully verified (Pass).');
  } else {
    console.error('  ❌ F-29a Failed');
    process.exit(1);
  }

  // 1b. Suspected fraud with identical before and after photos
  const verifyFraudRes = await makeRequest('/api/ai/verify', 'POST', {
    beforeUrl: 'https://res.cloudinary.com/clearflow/image/upload/v1/samples/identical_shot.jpg',
    afterUrl: 'https://res.cloudinary.com/clearflow/image/upload/v1/samples/identical_shot.jpg',
  }, adminToken);

  console.log('  Fraud Verification Status:', verifyFraudRes.statusCode);
  console.log('  Fraud Confidence Score:', verifyFraudRes.body.data?.confidenceScore);
  console.log('  Fraud Result:', verifyFraudRes.body.data?.result);
  console.log('  Fraud Reason:', verifyFraudRes.body.data?.details?.reason);

  if (
    verifyFraudRes.statusCode === 200 &&
    verifyFraudRes.body.data?.confidenceScore === 0 &&
    verifyFraudRes.body.data?.result === 'Fail' &&
    verifyFraudRes.body.data?.details?.fraudAlert === true
  ) {
    console.log('  ✅ F-29b Passed: Identical photos flagged as fraud (0.0 confidence, Fail).\n');
  } else {
    console.error('  ❌ F-29b Failed');
    process.exit(1);
  }

  // [TEST 2] F-30: Workload & Demand Forecasting Engine
  console.log('▶ [TEST 2] F-30: 7-Day Rolling Workload & Staffing Forecasting');
  const forecastRes = await makeRequest('/api/ai/forecast', 'GET', null, adminToken);

  console.log('  Forecast Status:', forecastRes.statusCode);
  console.log('  Forecasting Model:', forecastRes.body.data?.model);
  console.log('  Forecast Horizon Days:', forecastRes.body.data?.forecast?.length);
  console.log('  Overall Confidence R²:', forecastRes.body.data?.overallConfidence);
  
  const sampleDay = forecastRes.body.data?.forecast?.[0];
  console.log(`  Day 1 Sample (${sampleDay?.dayOfWeek} ${sampleDay?.date}): ${sampleDay?.predictedRequests} Requests, ${sampleDay?.recommendedStaff} Recommended Staff`);

  if (
    forecastRes.statusCode === 200 &&
    forecastRes.body.data?.forecast?.length === 7 &&
    sampleDay?.predictedRequests > 0 &&
    sampleDay?.recommendedStaff > 0
  ) {
    console.log('  ✅ F-30 Passed: 7-day predictive workload and staffing forecast verified.\n');
  } else {
    console.error('  ❌ F-30 Failed');
    process.exit(1);
  }

  // [TEST 3] F-31: Smart Dispatch Multi-Factor Candidate Ranking
  console.log('▶ [TEST 3] F-31: Smart Dispatch Multi-Factor Candidate Ranking');
  const dispatchRes = await makeRequest('/api/ai/dispatch-recommendations/65f000000000000000000201', 'GET', null, adminToken);

  console.log('  Dispatch Scoring Status:', dispatchRes.statusCode);
  console.log('  Scoring Formula:', dispatchRes.body.data?.formula);
  console.log('  Candidate Crews Evaluated:', dispatchRes.body.data?.candidates?.length);
  
  const topCandidate = dispatchRes.body.data?.optimalCandidate;
  console.log(`  Top Recommended Crew: ${topCandidate?.name} (Composite Score: ${topCandidate?.compositeScore})`);
  console.log(`  Breakdown -> Proximity: ${topCandidate?.proximityScore} | Workload: ${topCandidate?.workloadScore} | Rating: ${topCandidate?.ratingScore}`);

  if (
    dispatchRes.statusCode === 200 &&
    dispatchRes.body.data?.candidates?.length > 0 &&
    topCandidate?.compositeScore > 0
  ) {
    console.log('  ✅ F-31 Passed: Multi-factor smart dispatch candidate ranking verified.\n');
  } else {
    console.error('  ❌ F-31 Failed');
    process.exit(1);
  }

  // [TEST 4] F-32: Operational Anomaly & Outlier Detection
  console.log('▶ [TEST 4] F-32: Operational Anomaly & Outlier Detection');
  const anomaliesRes = await makeRequest('/api/ai/anomalies', 'GET', null, adminToken);

  console.log('  Anomaly Scanner Status:', anomaliesRes.statusCode);
  console.log('  Total Work Orders Scanned:', anomaliesRes.body.data?.summary?.totalScanned);
  console.log('  Anomalies Detected:', anomaliesRes.body.data?.summary?.totalAnomalies);
  console.log(`  Breakdown -> Critical: ${anomaliesRes.body.data?.summary?.criticalCount} | High: ${anomaliesRes.body.data?.summary?.highCount} | Medium: ${anomaliesRes.body.data?.summary?.mediumCount}`);

  if (anomaliesRes.statusCode === 200 && anomaliesRes.body.data?.summary) {
    if (anomaliesRes.body.data.anomalies?.length > 0) {
      console.log('  Top Detected Anomaly:', anomaliesRes.body.data.anomalies[0].title);
      console.log('  Remediation:', anomaliesRes.body.data.anomalies[0].recommendedAction);
    }
    console.log('  ✅ F-32 Passed: Automated operational anomaly and outlier detection active.\n');
  } else {
    console.error('  ❌ F-32 Failed');
    process.exit(1);
  }

  // [TEST 5] F-33: Automated Waste Classification & Environmental Impact Estimator
  console.log('▶ [TEST 5] F-33: Automated Waste Classification & Environmental Estimator');
  
  // 5a. E-Waste Evaluation
  const ewasteRes = await makeRequest('/api/ai/waste/estimate', 'POST', {
    wasteType: 'Desktop Computer / Monitor',
    weightKg: 45,
    deviceDescription: '3x Dell OptiPlex workstations and 2x LCD monitors for decommissioning',
  }, adminToken);

  console.log('  E-Waste Estimate Status:', ewasteRes.statusCode);
  console.log('  Classification:', ewasteRes.body.data?.classification);
  console.log('  Landfill Diversion:', ewasteRes.body.data?.metrics?.landfillDiversionKg, 'kg');
  console.log('  GHG Carbon Offset (CO2e):', ewasteRes.body.data?.metrics?.carbonOffsetKgCo2e, 'kg');
  console.log('  Equivalent Urban Tree-Years:', ewasteRes.body.data?.metrics?.equivalentTreesPlantedYear);
  console.log('  Recycling Material Value:', `$ ${ewasteRes.body.data?.metrics?.financialImpactUsd}`);

  if (
    ewasteRes.statusCode === 200 &&
    ewasteRes.body.data?.classification === 'Hazardous/E-Waste' &&
    ewasteRes.body.data?.metrics?.landfillDiversionKg > 35 &&
    ewasteRes.body.data?.metrics?.carbonOffsetKgCo2e > 70
  ) {
    console.log('  ✅ F-33a Passed: E-waste environmental impact correctly computed.');
  } else {
    console.error('  ❌ F-33a Failed');
    process.exit(1);
  }

  // 5b. Cardboard / Packaging Evaluation
  const paperRes = await makeRequest('/api/ai/waste/estimate', 'POST', {
    wasteType: 'Cardboard & Packaging Boxes',
    weightKg: 60,
  }, adminToken);

  console.log('  Cardboard Recyclability:', ewasteRes.body.data?.recyclabilityPercentage, '%');
  console.log('  Cardboard Landfill Diversion:', paperRes.body.data?.metrics?.landfillDiversionKg, 'kg');
  console.log('  Cardboard Carbon Offset:', paperRes.body.data?.metrics?.carbonOffsetKgCo2e, 'kg CO2e');

  if (
    paperRes.statusCode === 200 &&
    paperRes.body.data?.classification === 'Recyclable' &&
    paperRes.body.data?.metrics?.landfillDiversionKg === 57
  ) {
    console.log('  ✅ F-33b Passed: Recyclable packaging impact correctly computed.\n');
  } else {
    console.error('  ❌ F-33b Failed');
    process.exit(1);
  }

  console.log('======================================================');
  console.log('🎉 ALL F-29 TO F-33 (AI & ML) SPECIFICATION TESTS PASSED 100%!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
