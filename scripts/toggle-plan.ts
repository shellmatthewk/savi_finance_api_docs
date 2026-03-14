#!/usr/bin/env npx tsx
/**
 * Admin script to toggle plan for finfluxapi@gmail.com
 *
 * Usage:
 *   npx tsx scripts/toggle-plan.ts           # Toggle between sandbox/standard
 *   npx tsx scripts/toggle-plan.ts sandbox   # Set to sandbox
 *   npx tsx scripts/toggle-plan.ts standard  # Set to standard
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
} catch {
  // .env.local not found, rely on environment
}

const EMAIL = 'finfluxapi@gmail.com';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get current plan
    const userResult = await pool.query(
      'SELECT id, email, plan FROM users WHERE email = $1',
      [EMAIL]
    );

    if (userResult.rows.length === 0) {
      console.error(`User ${EMAIL} not found`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    const currentPlan = user.plan;

    // Determine new plan
    const arg = process.argv[2]?.toLowerCase();
    let newPlan: string;

    if (arg === 'sandbox' || arg === 'standard') {
      newPlan = arg;
    } else {
      // Toggle
      newPlan = currentPlan === 'sandbox' ? 'standard' : 'sandbox';
    }

    if (newPlan === currentPlan) {
      console.log(`Already on ${currentPlan} plan. No changes made.`);
      process.exit(0);
    }

    // Update user plan
    await pool.query(
      'UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2',
      [newPlan, user.id]
    );

    // Update subscription
    await pool.query(
      'UPDATE subscriptions SET plan = $1, status = $2, updated_at = NOW() WHERE user_id = $3',
      [newPlan, 'active', user.id]
    );

    console.log(`✓ ${EMAIL}`);
    console.log(`  ${currentPlan} → ${newPlan}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
