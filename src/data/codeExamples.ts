export const codeExamples = {
  curl: {
    label: 'cURL',
    getRate: `curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "https://api.vaultline.io/api/v1/rates?symbols=EUR"`,
    getMultipleRates: `curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "https://api.vaultline.io/api/v1/rates?symbols=EUR,BTC/USD,AAPL"`,
    getHistoricalRate: `curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "https://api.vaultline.io/api/v1/rates?symbols=EUR&date=2024-03-15"`,
    getHistory: `curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "https://api.vaultline.io/api/v1/rates/history?symbol=EUR&from=2024-01-01&to=2024-03-15"`,
    getAssets: `curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "https://api.vaultline.io/api/v1/assets"`,
    getAssetsByClass: `curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "https://api.vaultline.io/api/v1/assets?asset_class=crypto"`,
  },

  javascript: {
    label: 'JavaScript',
    getRate: `const response = await fetch(
  'https://api.vaultline.io/api/v1/rates?symbols=EUR',
  {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  }
);
const result = await response.json();
console.log(result.data[0].rate); // e.g., 0.92`,
    getMultipleRates: `const response = await fetch(
  'https://api.vaultline.io/api/v1/rates?symbols=EUR,BTC/USD,AAPL',
  {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  }
);
const result = await response.json();
result.data.forEach(rate => {
  console.log(\`\${rate.symbol}: \${rate.rate}\`);
});`,
    getHistory: `const response = await fetch(
  'https://api.vaultline.io/api/v1/rates/history?symbol=EUR&from=2024-01-01&to=2024-03-15',
  {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  }
);
const result = await response.json();
console.log(result.history.length, 'data points');`,
    getAssets: `const response = await fetch(
  'https://api.vaultline.io/api/v1/assets',
  {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  }
);
const result = await response.json();
console.log('Total assets:', result.count);
console.log('Classes:', result.assetClasses);`,
  },

  typescript: {
    label: 'TypeScript',
    getRate: `interface Rate {
  symbol: string;
  rate: number;
  date: string;
}

interface RatesResponse {
  data: Rate[];
}

const fetchRates = async (symbols: string): Promise<Rate[]> => {
  const response = await fetch(
    \`https://api.vaultline.io/api/v1/rates?symbols=\${symbols}\`,
    {
      headers: {
        'Authorization': \`Bearer \${process.env.VAULTLINE_TOKEN}\`
      }
    }
  );
  const result: RatesResponse = await response.json();
  return result.data;
};

const rates = await fetchRates('EUR,BTC/USD');`,
    getHistory: `interface HistoryItem {
  symbol: string;
  date: string;
  rate: number;
}

const fetchHistory = async (
  symbol: string,
  from: string,
  to: string
): Promise<HistoryItem[]> => {
  const response = await fetch(
    \`https://api.vaultline.io/api/v1/rates/history?symbol=\${symbol}&from=\${from}&to=\${to}\`,
    {
      headers: {
        'Authorization': \`Bearer \${process.env.VAULTLINE_TOKEN}\`
      }
    }
  );
  const result = await response.json();
  return result.history;
};

const history = await fetchHistory('EUR', '2024-01-01', '2024-03-15');`,
  },

  python: {
    label: 'Python',
    getRate: `import requests
from typing import List, Optional

class VaultLineClient:
    def __init__(self, token: str):
        self.token = token
        self.base_url = "https://api.vaultline.io/api/v1"
        self.headers = {
            "Authorization": f"Bearer {token}"
        }

    def get_rates(self, symbols: str, date: Optional[str] = None) -> dict:
        url = f"{self.base_url}/rates?symbols={symbols}"
        if date:
            url += f"&date={date}"
        response = requests.get(url, headers=self.headers)
        return response.json()

    def get_history(self, symbol: str, from_date: str, to_date: str) -> dict:
        url = f"{self.base_url}/rates/history?symbol={symbol}&from={from_date}&to={to_date}"
        response = requests.get(url, headers=self.headers)
        return response.json()

# Usage
client = VaultLineClient("YOUR_TOKEN")
rates = client.get_rates("EUR,BTC/USD")
print(rates['data'])`,
    getHistory: `import requests
import pandas as pd

client = VaultLineClient("YOUR_TOKEN")
history = client.get_history("EUR", "2024-01-01", "2024-03-15")

# Convert to DataFrame for analysis
df = pd.DataFrame(history['history'])
print(df.describe())`,
    getAssets: `client = VaultLineClient("YOUR_TOKEN")
assets = client.get_assets()

print(f"Total assets: {assets['count']}")
print(f"Asset classes: {', '.join(assets['assetClasses'])}")

# Filter by class
crypto_assets = [a for a in assets['assets'] if a['class'] == 'crypto']
print(f"Crypto assets: {len(crypto_assets)}")`,
  },

  go: {
    label: 'Go',
    getRate: `package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Rate struct {
	Symbol string  \`json:"symbol"\`
	Rate   float64 \`json:"rate"\`
	Date   string  \`json:"date"\`
}

type RatesResponse struct {
	Data []Rate \`json:"data"\`
}

func getRate(symbols string, token string) (*RatesResponse, error) {
	req, _ := http.NewRequest(
		"GET",
		fmt.Sprintf("https://api.vaultline.io/api/v1/rates?symbols=%s", symbols),
		nil,
	)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result RatesResponse
	json.Unmarshal(body, &result)
	return &result, nil
}

func main() {
	rates, _ := getRate("EUR,BTC/USD", "YOUR_TOKEN")
	for _, rate := range rates.Data {
		fmt.Printf("%s: %f\\n", rate.Symbol, rate.Rate)
	}
}`,
    getHistory: `type HistoryResponse struct {
	Symbol  string \`json:"symbol"\`
	History []Rate \`json:"history"\`
}

func getHistory(symbol, from, to, token string) (*HistoryResponse, error) {
	req, _ := http.NewRequest(
		"GET",
		fmt.Sprintf(
			"https://api.vaultline.io/api/v1/rates/history?symbol=%s&from=%s&to=%s",
			symbol, from, to,
		),
		nil,
	)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result HistoryResponse
	json.Unmarshal(body, &result)
	return &result, nil
}`,
  },
};

export const planComparison = [
  {
    name: 'Sandbox',
    calls_per_day: '1,000',
    calls_per_minute: '10',
    history_days: '30',
    price: 'Free',
  },
  {
    name: 'Standard',
    calls_per_day: 'Unlimited',
    calls_per_minute: '100',
    history_days: '90',
    price: 'Starting at $49/mo',
  },
  {
    name: 'Enterprise',
    calls_per_day: 'Unlimited',
    calls_per_minute: '1,000+',
    history_days: 'Unlimited',
    price: 'Custom',
  },
];

export const errorCodes = [
  {
    code: '400',
    name: 'Bad Request',
    description: 'Invalid request parameters or malformed request',
  },
  {
    code: '401',
    name: 'Unauthorized',
    description: 'Invalid or missing authorization token',
  },
  {
    code: '404',
    name: 'Not Found',
    description: 'Symbol not supported or resource not found',
  },
  {
    code: '429',
    name: 'Rate Limited',
    description: 'Too many requests, rate limit exceeded',
  },
  {
    code: '500',
    name: 'Server Error',
    description: 'Internal server error',
  },
];
