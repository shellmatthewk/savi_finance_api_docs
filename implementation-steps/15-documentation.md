# Step 15: Documentation

## Goal
Create comprehensive API documentation and OpenAPI specification.

## Prerequisites
- All API endpoints implemented

---

## Tasks

### Task 15.1: Create OpenAPI Specification
Create `public/openapi.yaml`.

```yaml
# public/openapi.yaml
openapi: 3.0.3
info:
  title: FinFlux API
  description: |
    Real-time and historical financial data API covering fiat currencies,
    cryptocurrencies, stocks, and precious metals.
  version: 1.0.0
  contact:
    name: FinFlux Support
    email: support@finflux.io

servers:
  - url: https://api.finflux.io/api/v1
    description: Production
  - url: http://localhost:3000/api/v1
    description: Development

security:
  - ApiKeyAuth: []

paths:
  /rates:
    get:
      summary: Get current rate
      description: |
        Returns the current exchange rate for a symbol.
        Supports direct rates (e.g., EUR) and cross-rates (e.g., EUR/JPY).
      parameters:
        - name: symbol
          in: query
          required: true
          schema:
            type: string
          examples:
            direct:
              value: EUR
              summary: Direct rate (USD to EUR)
            cross:
              value: EUR/JPY
              summary: Cross rate (triangulated)
        - name: date
          in: query
          required: false
          schema:
            type: string
            format: date
          description: Historical date (YYYY-MM-DD)
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RateResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
        '429':
          $ref: '#/components/responses/RateLimited'

  /rates/history:
    get:
      summary: Get historical rates
      description: Returns rate history for a date range
      parameters:
        - name: symbol
          in: query
          required: true
          schema:
            type: string
        - name: start
          in: query
          required: true
          schema:
            type: string
            format: date
        - name: end
          in: query
          required: true
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HistoryResponse'

  /assets:
    get:
      summary: List supported assets
      description: Returns all supported symbols and asset classes
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AssetsResponse'

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: x-api-key

  schemas:
    RateResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            symbol:
              type: string
              example: EUR
            rate:
              type: number
              example: 0.92
            date:
              type: string
              format: date
              example: '2024-03-15'
        meta:
          type: object
          properties:
            triangulated:
              type: boolean
            stale:
              type: boolean
            cache:
              type: string
              enum: [HIT, MISS]

    HistoryResponse:
      type: object
      properties:
        data:
          type: array
          items:
            type: object
            properties:
              date:
                type: string
                format: date
              rate:
                type: number

    AssetsResponse:
      type: object
      properties:
        count:
          type: integer
        assetClasses:
          type: array
          items:
            type: string
        assets:
          type: array
          items:
            type: object
            properties:
              symbol:
                type: string
              name:
                type: string
              class:
                type: string

    Error:
      type: object
      properties:
        error:
          type: string
        code:
          type: string

  responses:
    BadRequest:
      description: Invalid request parameters
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Unauthorized:
      description: Invalid or missing API key
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    RateLimited:
      description: Rate limit exceeded
      headers:
        X-RateLimit-Remaining:
          schema:
            type: integer
        Retry-After:
          schema:
            type: integer
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

### Task 15.2: Create API Documentation Page
Update `src/app/docs/page.tsx`.

```tsx
// src/app/docs/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation | FinFlux',
  description: 'Complete API reference for FinFlux financial data API'
};

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">API Documentation</h1>

      {/* Quick Start */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
        <div className="bg-gray-900 rounded-lg p-4 text-gray-100">
          <pre className="overflow-x-auto">
{`curl -H "x-api-key: YOUR_API_KEY" \\
  "https://api.finflux.io/api/v1/rates?symbol=EUR"`}
          </pre>
        </div>
      </section>

      {/* Authentication */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
        <p className="mb-4">
          All API requests require an API key passed in the
          <code className="bg-gray-100 px-2 py-1 rounded">x-api-key</code> header.
        </p>
        <p>
          Get your API key from the{' '}
          <a href="/dashboard/keys" className="text-blue-600 hover:underline">
            Developer Dashboard
          </a>.
        </p>
      </section>

      {/* Endpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Endpoints</h2>

        {/* GET /rates */}
        <div className="border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-mono">
              GET
            </span>
            <code className="text-lg">/api/v1/rates</code>
          </div>
          <p className="text-gray-600 mb-4">Get current or historical exchange rate</p>

          <h4 className="font-semibold mb-2">Parameters</h4>
          <table className="w-full mb-4">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Name</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2"><code>symbol</code></td>
                <td>string</td>
                <td>Yes</td>
                <td>Asset symbol (e.g., EUR, BTC, EUR/JPY)</td>
              </tr>
              <tr>
                <td className="py-2"><code>date</code></td>
                <td>string</td>
                <td>No</td>
                <td>Historical date (YYYY-MM-DD)</td>
              </tr>
            </tbody>
          </table>

          <h4 className="font-semibold mb-2">Response</h4>
          <div className="bg-gray-900 rounded-lg p-4 text-gray-100">
            <pre className="overflow-x-auto text-sm">
{`{
  "data": {
    "symbol": "EUR",
    "rate": 0.92,
    "date": "2024-03-15"
  },
  "meta": {
    "triangulated": false,
    "stale": false,
    "cache": "HIT"
  }
}`}
            </pre>
          </div>
        </div>

        {/* More endpoints... */}
      </section>

      {/* Rate Limits */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Rate Limits</h2>
        <table className="w-full border rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4">Plan</th>
              <th className="text-left py-3 px-4">Requests/Day</th>
              <th className="text-left py-3 px-4">Requests/Min</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="py-3 px-4">Free</td>
              <td>100</td>
              <td>10</td>
            </tr>
            <tr className="border-t">
              <td className="py-3 px-4">Pro</td>
              <td>10,000</td>
              <td>100</td>
            </tr>
            <tr className="border-t">
              <td className="py-3 px-4">Enterprise</td>
              <td>Unlimited</td>
              <td>1,000</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Error Codes */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Error Codes</h2>
        <table className="w-full border rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4">Code</th>
              <th className="text-left py-3 px-4">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="py-3 px-4">400</td>
              <td>Bad Request - Invalid parameters</td>
            </tr>
            <tr className="border-t">
              <td className="py-3 px-4">401</td>
              <td>Unauthorized - Invalid or missing API key</td>
            </tr>
            <tr className="border-t">
              <td className="py-3 px-4">404</td>
              <td>Not Found - Symbol not supported</td>
            </tr>
            <tr className="border-t">
              <td className="py-3 px-4">429</td>
              <td>Rate Limited - Too many requests</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* OpenAPI */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">OpenAPI Specification</h2>
        <p>
          Download the full OpenAPI specification:{' '}
          <a href="/openapi.yaml" className="text-blue-600 hover:underline">
            openapi.yaml
          </a>
        </p>
      </section>
    </div>
  );
}
```

### Task 15.3: Add Swagger UI
Install and configure Swagger UI.

```bash
npm install swagger-ui-react
```

```tsx
// Create src/app/docs/swagger/page.tsx
'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function SwaggerPage() {
  return (
    <div className="min-h-screen">
      <SwaggerUI url="/openapi.yaml" />
    </div>
  );
}
```

### Task 15.4: Create Developer Quickstart Guide
Add quickstart content to docs.

```tsx
// Add to docs page or create separate page

const quickstartGuide = `
# FinFlux API Quickstart

## 1. Get Your API Key

Sign up at [finflux.io](https://finflux.io) and generate an API key from your dashboard.

## 2. Make Your First Request

\`\`\`bash
curl -H "x-api-key: YOUR_API_KEY" \\
  "https://api.finflux.io/api/v1/rates?symbol=EUR"
\`\`\`

## 3. Use in Your Application

### JavaScript/TypeScript

\`\`\`typescript
const response = await fetch(
  'https://api.finflux.io/api/v1/rates?symbol=EUR',
  {
    headers: { 'x-api-key': process.env.FINFLUX_API_KEY }
  }
);
const data = await response.json();
console.log(data.data.rate); // 0.92
\`\`\`

### Python

\`\`\`python
import requests

response = requests.get(
    'https://api.finflux.io/api/v1/rates',
    params={'symbol': 'EUR'},
    headers={'x-api-key': 'YOUR_API_KEY'}
)
data = response.json()
print(data['data']['rate'])  # 0.92
\`\`\`
`;
```

### Task 15.5: Add Code Examples
Create example code snippets.

```typescript
// Create src/data/codeExamples.ts

export const codeExamples = {
  curl: {
    label: 'cURL',
    getRate: `curl -H "x-api-key: YOUR_KEY" \\
  "https://api.finflux.io/api/v1/rates?symbol=EUR"`,
    getHistory: `curl -H "x-api-key: YOUR_KEY" \\
  "https://api.finflux.io/api/v1/rates/history?symbol=EUR&start=2024-01-01&end=2024-03-15"`,
  },

  javascript: {
    label: 'JavaScript',
    getRate: `const response = await fetch(
  'https://api.finflux.io/api/v1/rates?symbol=EUR',
  { headers: { 'x-api-key': 'YOUR_KEY' } }
);
const { data } = await response.json();
console.log(\`1 USD = \${data.rate} EUR\`);`,
  },

  python: {
    label: 'Python',
    getRate: `import requests

response = requests.get(
    'https://api.finflux.io/api/v1/rates',
    params={'symbol': 'EUR'},
    headers={'x-api-key': 'YOUR_KEY'}
)
data = response.json()
print(f"1 USD = {data['data']['rate']} EUR")`,
  },

  go: {
    label: 'Go',
    getRate: `req, _ := http.NewRequest("GET",
    "https://api.finflux.io/api/v1/rates?symbol=EUR", nil)
req.Header.Set("x-api-key", "YOUR_KEY")
resp, _ := http.DefaultClient.Do(req)`,
  },
};
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `public/openapi.yaml` |
| Modify | `src/app/docs/page.tsx` |
| Create | `src/app/docs/swagger/page.tsx` |
| Create | `src/data/codeExamples.ts` |

---

## Acceptance Criteria

- [ ] OpenAPI spec covers all endpoints
- [ ] Swagger UI accessible at `/docs/swagger`
- [ ] Documentation page has quickstart guide
- [ ] Code examples in 4+ languages
- [ ] Rate limit documentation
- [ ] Error codes documented

---

## Next Step
Proceed to `16-production-deploy.md`
