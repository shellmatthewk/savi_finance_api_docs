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
  { symbol: 'EUR', name: 'Euro', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'GBP', name: 'British Pound', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'JPY', name: 'Japanese Yen', assetClass: 'fiat', unit: 'currency', decimals: 0 },
  { symbol: 'CAD', name: 'Canadian Dollar', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'AUD', name: 'Australian Dollar', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'CHF', name: 'Swiss Franc', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'CNY', name: 'Chinese Yuan', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'INR', name: 'Indian Rupee', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'MXN', name: 'Mexican Peso', assetClass: 'fiat', unit: 'currency', decimals: 2 },
  { symbol: 'BRL', name: 'Brazilian Real', assetClass: 'fiat', unit: 'currency', decimals: 2 },
];

// ===== Crypto Assets =====
export const CRYPTO_ASSETS: Asset[] = [
  { symbol: 'BTC/USD', name: 'Bitcoin', assetClass: 'crypto', unit: 'currency', decimals: 2 },
  { symbol: 'ETH/USD', name: 'Ethereum', assetClass: 'crypto', unit: 'currency', decimals: 2 },
  { symbol: 'SOL/USD', name: 'Solana', assetClass: 'crypto', unit: 'currency', decimals: 4 },
  { symbol: 'ADA/USD', name: 'Cardano', assetClass: 'crypto', unit: 'currency', decimals: 4 },
  { symbol: 'DOT/USD', name: 'Polkadot', assetClass: 'crypto', unit: 'currency', decimals: 4 },
];

// ===== Stock Assets =====
export const STOCK_ASSETS: Asset[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
  { symbol: 'META', name: 'Meta Platforms Inc.', assetClass: 'stocks', unit: 'USD', decimals: 2 },
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
