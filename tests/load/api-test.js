import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,           // Virtual users
  duration: '5m',     // Duration
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // <1% failure rate
  },
};

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.vaultline.io';
const API_KEY = __ENV.API_KEY || '';

// Test data
const symbols = [
  'EUR',
  'GBP',
  'JPY',
  'BTC/USD',
  'ETH/USD',
  'AAPL',
  'GOOGL',
  'XAU/USD',
  'XAG/USD',
  'USDT/USD',
];

function getRandomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function getRandomDate() {
  const today = new Date();
  const daysAgo = Math.floor(Math.random() * 30) + 1;
  const date = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

export default function () {
  // Scenario 1: Get current rates (70% of traffic)
  if (__VU % 10 < 7) {
    const symbol = getRandomSymbol();
    const res = http.get(
      `${BASE_URL}/api/v1/rates?symbols=${symbol}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'response has data': (r) => r.json('data') !== null,
      'response is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
    });
  }
  // Scenario 2: Get multiple rates (20% of traffic)
  else if (__VU % 10 < 9) {
    const symbol1 = getRandomSymbol();
    const symbol2 = getRandomSymbol();
    const res = http.get(
      `${BASE_URL}/api/v1/rates?symbols=${symbol1},${symbol2}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'response has data': (r) => r.json('data') !== null,
    });
  }
  // Scenario 3: Get historical rates (10% of traffic)
  else {
    const symbol = getRandomSymbol();
    const toDate = getRandomDate();
    const fromDate = new Date(new Date(toDate).getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const res = http.get(
      `${BASE_URL}/api/v1/rates/history?symbol=${symbol}&from=${fromDate}&to=${toDate}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'response has history data': (r) => r.json('history') !== null,
    });
  }

  // Small delay between requests
  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options = {}) {
  const { indent = '', enableColors = true } = options;
  let summary = '\n=== Load Test Summary ===\n';

  if (data.metrics) {
    const metrics = data.metrics;

    if (metrics.http_req_duration) {
      const dur = metrics.http_req_duration.values;
      summary += `${indent}HTTP Request Duration:\n`;
      summary += `${indent}  p(50): ${dur.p50?.toFixed(2)}ms\n`;
      summary += `${indent}  p(95): ${dur.p95?.toFixed(2)}ms\n`;
      summary += `${indent}  p(99): ${dur.p99?.toFixed(2)}ms\n`;
    }

    if (metrics.http_req_failed) {
      const failed = metrics.http_req_failed.values.rate;
      summary += `${indent}Failure Rate: ${(failed * 100).toFixed(2)}%\n`;
    }

    if (metrics.http_reqs) {
      const reqs = metrics.http_reqs.values.count;
      summary += `${indent}Total Requests: ${reqs}\n`;
    }
  }

  summary += '\n';
  return summary;
}
