/**
 * Stock utility functions
 */

export type Market = 'A_STOCK' | 'HK_STOCK' | 'US_STOCK';

export interface MarketInfo {
  name: string;
  currency: string;
  timezone: string;
  trading_hours: string;
}

/**
 * Detect market from stock code
 */
export function detectMarket(stockCode: string): Market {
  const code = stockCode.trim().toUpperCase();

  // A股: 6位数字
  if (/^\d{6}$/.test(code)) {
    return 'A_STOCK';
  }

  // 港股: 5位数字或HK前缀
  if (/^\d{5}$/.test(code) || /^HK\d{5}$/.test(code)) {
    return 'HK_STOCK';
  }

  // 美股: 1-5位字母
  if (/^[A-Z]{1,5}$/.test(code)) {
    return 'US_STOCK';
  }

  // Default to A股
  return 'A_STOCK';
}

/**
 * Normalize stock code
 */
export function normalizeStockCode(stockCode: string, market: Market | null = null): string {
  let code = stockCode.trim().toUpperCase();

  if (!market) {
    market = detectMarket(code);
  }

  if (market === 'HK_STOCK') {
    // Remove HK prefix if present
    if (code.startsWith('HK')) {
      code = code.substring(2);
    }
    // Pad to 5 digits
    if (code.length < 5) {
      code = code.padStart(5, '0');
    }
  }

  return code;
}

/**
 * Validate stock code format
 */
export function validateStockCode(stockCode: string): boolean {
  if (!stockCode || typeof stockCode !== 'string') {
    return false;
  }

  const code = stockCode.trim().toUpperCase();
  const market = detectMarket(code);

  switch (market) {
    case 'A_STOCK':
      return /^\d{6}$/.test(code);
    case 'HK_STOCK':
      return /^\d{5}$/.test(code) || /^HK\d{5}$/.test(code);
    case 'US_STOCK':
      return /^[A-Z]{1,5}$/.test(code);
    default:
      return false;
  }
}

/**
 * Get market info
 */
export function getMarketInfo(market: Market): MarketInfo {
  const markets: Record<Market, MarketInfo> = {
    A_STOCK: {
      name: 'A股',
      currency: 'CNY',
      timezone: 'Asia/Shanghai',
      trading_hours: '09:30-15:00',
    },
    HK_STOCK: {
      name: '港股',
      currency: 'HKD',
      timezone: 'Asia/Hong_Kong',
      trading_hours: '09:30-16:00',
    },
    US_STOCK: {
      name: '美股',
      currency: 'USD',
      timezone: 'America/New_York',
      trading_hours: '09:30-16:00',
    },
  };

  return markets[market] || markets.A_STOCK;
}

/**
 * Generate a fixed price based on stock code (hash-based)
 * Same stock code will always generate the same price
 */
export function generateFixedPrice(stockCode: string): number {
  let hash = 0;
  for (let i = 0; i < stockCode.length; i++) {
    const char = stockCode.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const price = 10 + (Math.abs(hash) % 100);
  return parseFloat(price.toFixed(2));
}

/**
 * Generate a fixed comprehensive score based on stock code (hash-based)
 * Same stock code will always generate the same score
 */
export function generateFixedScore(stockCode: string): number {
  let hash = 0;
  for (let i = 0; i < stockCode.length; i++) {
    const char = stockCode.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const score = 60 + (Math.abs(hash) % 40);
  return parseFloat(score.toFixed(2));
}

