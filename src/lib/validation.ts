import { z } from 'zod';

/**
 * Validation schemas for input sanitization
 * Used across API endpoints to ensure data safety
 */

/**
 * Stock/crypto symbol validation
 * Format: uppercase letters, numbers, forward slash (BTC/USD), hyphen
 */
export const symbolSchema = z
  .string()
  .min(1, 'Symbol cannot be empty')
  .max(20, 'Symbol too long')
  .regex(/^[A-Z0-9/\-]+$/, 'Invalid symbol format. Use uppercase letters, numbers, / or -');

/**
 * Date validation (YYYY-MM-DD format)
 */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((date) => {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  }, 'Invalid date');

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email too long');

/**
 * Password validation
 * Minimum 8 characters, must contain uppercase, lowercase, and number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

/**
 * API key validation (basic format check)
 * Format: vl_<64 hex chars>
 */
export const apiKeySchema = z
  .string()
  .regex(/^vl_[a-f0-9]{64}$/, 'Invalid API key format');

/**
 * Generic string sanitization - trim and validate length
 */
export function sanitizeString(value: unknown, maxLength: number = 255): string {
  if (typeof value !== 'string') {
    throw new Error('Expected a string');
  }
  return value.trim().substring(0, maxLength);
}

/**
 * URL parameter extraction and validation
 */
export function extractAndValidateSymbol(value: unknown): string {
  return symbolSchema.parse(sanitizeString(value));
}

export function extractAndValidateDate(value: unknown): string {
  return dateSchema.parse(sanitizeString(value));
}

export function extractAndValidateEmail(value: unknown): string {
  return emailSchema.parse(sanitizeString(value, 255));
}

export function extractAndValidatePassword(value: unknown): string {
  return passwordSchema.parse(sanitizeString(value, 255));
}
