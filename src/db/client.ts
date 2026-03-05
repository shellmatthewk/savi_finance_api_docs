import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

/**
 * Database client singleton
 *
 * Uses Neon serverless driver with WebSocket transport (works over port 443,
 * bypassing firewalls that block port 5432).
 */

neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'Database configuration missing. Please set DATABASE_URL environment variable.'
      );
    }

    pool = new Pool({ connectionString });
  }

  return pool;
}

/**
 * Drizzle database client
 */
export function getDb() {
  return drizzle(getPool());
}

/**
 * Check if database is available and responsive
 */
export async function pingDb(): Promise<boolean> {
  try {
    const pool = getPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gracefully close database connections
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
