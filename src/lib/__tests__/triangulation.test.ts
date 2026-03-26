import {
  triangulateRate,
  calculateTriangulation,
  canTriangulate,
  parseCrossPair,
  isCrossPair
} from '../triangulation';

describe('triangulateRate', () => {
  it('calculates correct cross rate', () => {
    // USD -> EUR = 0.92, USD -> JPY = 149.50
    // EUR -> JPY = 149.50 / 0.92 = 162.5
    const result = triangulateRate(0.92, 149.5);
    expect(result).toBeCloseTo(162.5, 1);
  });

  it('handles same rate (1:1)', () => {
    const result = triangulateRate(1.5, 1.5);
    expect(result).toBe(1);
  });

  it('throws on zero rate', () => {
    expect(() => triangulateRate(0, 1)).toThrow();
    expect(() => triangulateRate(1, 0)).toThrow();
  });

  it('throws on negative rate', () => {
    expect(() => triangulateRate(-1, 1)).toThrow();
  });
});

describe('calculateTriangulation', () => {
  it('returns complete result object', () => {
    const result = calculateTriangulation('EUR', 'JPY', 0.92, 149.5);

    expect(result.baseCurrency).toBe('EUR');
    expect(result.quoteCurrency).toBe('JPY');
    expect(result.triangulated).toBe(true);
    expect(result.rate).toBeCloseTo(162.5, 1);
    expect(result.inverseRate).toBeCloseTo(0.00615, 4);
  });
});

describe('canTriangulate', () => {
  const symbols = new Set(['EUR', 'JPY', 'USD', 'GBP']);

  it('returns valid for supported pair', () => {
    expect(canTriangulate('EUR', 'JPY', symbols).valid).toBe(true);
  });

  it('rejects same currency', () => {
    const result = canTriangulate('EUR', 'EUR', symbols);
    expect(result.valid).toBe(false);
  });

  it('rejects unsupported currency', () => {
    const result = canTriangulate('EUR', 'XYZ', symbols);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('XYZ');
  });
});

describe('parseCrossPair', () => {
  it('parses slash format EUR/JPY', () => {
    const result = parseCrossPair('EUR/JPY');
    expect(result).toEqual({ base: 'EUR', quote: 'JPY' });
  });

  it('parses concatenated format EURJPY', () => {
    const result = parseCrossPair('EURJPY');
    expect(result).toEqual({ base: 'EUR', quote: 'JPY' });
  });

  it('parses dash format EUR-JPY', () => {
    const result = parseCrossPair('EUR-JPY');
    expect(result).toEqual({ base: 'EUR', quote: 'JPY' });
  });

  it('handles lowercase input', () => {
    const result = parseCrossPair('eur/jpy');
    expect(result).toEqual({ base: 'EUR', quote: 'JPY' });
  });

  it('returns null for invalid format', () => {
    expect(parseCrossPair('EURUSD')).toBe(null); // 6 chars but no separator
    expect(parseCrossPair('EUR')).toBe(null);
    expect(parseCrossPair('EUR/J')).toBe(null); // Quote too short
  });
});

describe('isCrossPair', () => {
  it('returns true for valid cross pairs', () => {
    expect(isCrossPair('EUR/JPY')).toBe(true);
    expect(isCrossPair('EURJPY')).toBe(true);
    expect(isCrossPair('EUR-JPY')).toBe(true);
  });

  it('returns false for invalid cross pairs', () => {
    expect(isCrossPair('EURUSD')).toBe(false);
    expect(isCrossPair('EUR')).toBe(false);
  });
});
