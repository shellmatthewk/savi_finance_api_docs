/**
 * Asset registry - comprehensive list of all supported assets
 * Used for validation and metadata lookups
 */

export interface Asset {
  symbol: string;
  name: string;
  assetClass: 'fiat' | 'crypto' | 'stocks' | 'metals';
  unit: string;
  decimals?: number;
}

// ===== Metals Assets =====
export const METAL_ASSETS: Asset[] = [
  {
    symbol: 'XAU',
    name: 'Gold',
    assetClass: 'metals',
    unit: 'troy oz',
    decimals: 2,
  },
  {
    symbol: 'XAG',
    name: 'Silver',
    assetClass: 'metals',
    unit: 'troy oz',
    decimals: 2,
  },
  {
    symbol: 'XPT',
    name: 'Platinum',
    assetClass: 'metals',
    unit: 'troy oz',
    decimals: 2,
  },
  {
    symbol: 'XPD',
    name: 'Palladium',
    assetClass: 'metals',
    unit: 'troy oz',
    decimals: 2,
  },
];

// ===== Fiat Assets =====
export const FIAT_ASSETS: Asset[] = [
  // Major currencies
  { symbol: 'USD', name: 'US Dollar', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'EUR', name: 'Euro', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'GBP', name: 'British Pound', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'JPY', name: 'Japanese Yen', assetClass: 'fiat', unit: 'currency', decimals: 0 },
  { symbol: 'CAD', name: 'Canadian Dollar', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'AUD', name: 'Australian Dollar', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'CHF', name: 'Swiss Franc', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'NZD', name: 'New Zealand Dollar', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  // Additional currencies
  { symbol: 'CNY', name: 'Chinese Yuan', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'HKD', name: 'Hong Kong Dollar', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'SGD', name: 'Singapore Dollar', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'SEK', name: 'Swedish Krona', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'NOK', name: 'Norwegian Krone', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'DKK', name: 'Danish Krone', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'MXN', name: 'Mexican Peso', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'BRL', name: 'Brazilian Real', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'INR', name: 'Indian Rupee', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'KRW', name: 'South Korean Won', assetClass: 'fiat', unit: 'currency', decimals: 0 },
  { symbol: 'ZAR', name: 'South African Rand', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'PLN', name: 'Polish Zloty', assetClass: 'fiat', unit: 'currency', decimals: 2 },
];

// ===== Crypto Assets =====
export const CRYPTO_ASSETS: Asset[] = [
  // Top tier
  { symbol: 'BTC/USD', name: 'Bitcoin', assetClass: 'crypto', unit: 'currency', decimals: 2 },
  { symbol: 'ETH/USD', name: 'Ethereum', assetClass: 'crypto', unit: 'currency', decimals: 2 },
  // Top 20 by market cap
  { symbol: 'BNB/USD', name: 'BNB', assetClass: 'crypto', unit: 'currency', decimals: 2 },
  { symbol: 'XRP/USD', name: 'XRP', assetClass: 'crypto', unit: 'currency', decimals: 4 },
  { symbol: 'SOL/USD', name: 'Solana', assetClass: 'crypto', unit: 'currency', decimals: 4 },
  { symbol: 'ADA/USD', name: 'Cardano', assetClass: 'crypto', unit: 'currency', decimals: 4 },
  { symbol: 'DOGE/USD', name: 'Dogecoin', assetClass: 'crypto', unit: 'currency', decimals: 4 },
  { symbol: 'TRX/USD', name: 'TRON', assetClass: 'crypto', unit: 'currency', decimals: 4 },
  { symbol: 'AVAX/USD', name: 'Avalanche', assetClass: 'crypto', unit: 'currency', decimals: 4 },
  { symbol: 'LINK/USD', name: 'Chainlink', assetClass: 'crypto', unit: 'currency', decimals: 2 },
  { symbol: 'DOT/USD', name: 'Polkadot', assetClass: 'crypto', unit: 'currency', decimals: 4 },
  { symbol: 'MATIC/USD', name: 'Polygon', assetClass: 'crypto', unit: 'currency', decimals: 4 },
  { symbol: 'LTC/USD', name: 'Litecoin', assetClass: 'crypto', unit: 'currency', decimals: 4 },
  { symbol: 'SHIB/USD', name: 'Shiba Inu', assetClass: 'crypto', unit: 'currency', decimals: 8 },
  { symbol: 'BCH/USD', name: 'Bitcoin Cash', assetClass: 'crypto', unit: 'currency', decimals: 2 },
  { symbol: 'UNI/USD', name: 'Uniswap', assetClass: 'crypto', unit: 'currency', decimals: 2 },
  { symbol: 'XLM/USD', name: 'Stellar', assetClass: 'crypto', unit: 'currency', decimals: 4 },
  { symbol: 'ATOM/USD', name: 'Cosmos', assetClass: 'crypto', unit: 'currency', decimals: 4 },
  { symbol: 'XMR/USD', name: 'Monero', assetClass: 'crypto', unit: 'currency', decimals: 2 },
  { symbol: 'ETC/USD', name: 'Ethereum Classic', assetClass: 'crypto', unit: 'currency', decimals: 2 },
];

// ===== Stock Assets =====
export const STOCK_ASSETS: Asset[] = [
  // Tech giants
  { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'META', name: 'Meta Platforms Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'TSLA', name: 'Tesla Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  // Semiconductors
  { symbol: 'AMD', name: 'Advanced Micro Devices', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'INTC', name: 'Intel Corporation', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'AVGO', name: 'Broadcom Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  // Financial
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'V', name: 'Visa Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'MA', name: 'Mastercard Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  // Healthcare
  { symbol: 'JNJ', name: 'Johnson & Johnson', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'UNH', name: 'UnitedHealth Group', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'PFE', name: 'Pfizer Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  // Consumer
  { symbol: 'WMT', name: 'Walmart Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'KO', name: 'The Coca-Cola Company', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'PEP', name: 'PepsiCo Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'COST', name: 'Costco Wholesale Corporation', assetClass: 'stocks', unit: 'USD', decimals: 2 },
];

// ===== Unified Registry =====
export const ALL_ASSETS: Asset[] = [
  ...METAL_ASSETS,
  ...FIAT_ASSETS,
  ...CRYPTO_ASSETS,
  ...STOCK_ASSETS,
];

/**
 * Get asset by symbol
 */
export function getAsset(symbol: string): Asset | undefined {
  return ALL_ASSETS.find((asset) => asset.symbol === symbol);
}

/**
 * Get all assets of a specific class
 */
export function getAssetsByClass(assetClass: Asset['assetClass']): Asset[] {
  return ALL_ASSETS.filter((asset) => asset.assetClass === assetClass);
}

/**
 * Check if a symbol is supported
 */
export function isAssetSupported(symbol: string): boolean {
  return ALL_ASSETS.some((asset) => asset.symbol === symbol);
}
