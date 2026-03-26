/**
 * VaultLine API Client
 *
 * Usage:
 *   const client = new VaultLine('vl_your_api_key');
 *   const rates = await client.getRates(['BTC/USD', 'ETH/USD']);
 */

class VaultLine {
  constructor(apiKey, baseUrl = 'https://api.vaultline.io/api/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async request(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, value);
    });

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    // Extract rate limit info
    const rateLimit = {
      limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
      remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
      reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0'),
    };

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { data, rateLimit };
  }

  /**
   * Get available symbols grouped by asset class
   * @param {string} [assetClass] - Filter by: 'fiat', 'crypto', 'stocks', 'metals'
   */
  async getAssets(assetClass) {
    return this.request('/assets', { asset_class: assetClass });
  }

  /**
   * Get current rates for symbols
   * @param {string[]} symbols - Array of symbols, e.g. ['BTC/USD', 'AAPL']
   * @param {string} [date] - Optional ISO date (YYYY-MM-DD)
   */
  async getRates(symbols, date) {
    return this.request('/rates', {
      symbols: symbols.join(','),
      date,
    });
  }

  /**
   * Get historical rates for a symbol
   * @param {string} symbol - Symbol, e.g. 'BTC/USD'
   * @param {string} from - Start date (YYYY-MM-DD)
   * @param {string} to - End date (YYYY-MM-DD)
   */
  async getHistory(symbol, from, to) {
    return this.request('/rates/history', { symbol, from, to });
  }
}

// Example usage
async function _main() {
  const client = new VaultLine('vl_your_api_key_here');

  // Get all available assets
  const { data: assets } = await client.getAssets();
  console.log('Available assets:', assets.total_symbols);

  // Get current rates
  const { data: rates, rateLimit } = await client.getRates(['BTC/USD', 'ETH/USD', 'AAPL']);
  console.log('Rates:', rates.data);
  console.log('API calls remaining:', rateLimit.remaining);

  // Get historical data
  const { data: history } = await client.getHistory('BTC/USD', '2024-01-01', '2024-01-31');
  console.log('History points:', history.history.length);
}

// Uncomment to run:
// main().catch(console.error);

module.exports = VaultLine;
