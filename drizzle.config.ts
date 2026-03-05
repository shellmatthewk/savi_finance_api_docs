import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Path to the schema file(s)
  schema: './src/db/schema.ts',

  // Output directory for generated migrations
  out: './src/db/migrations',

  // Database dialect
  dialect: 'postgresql',

  // Database connection configuration
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },

  // Enable verbose logging during migrations
  verbose: true,

  // Enable strict mode for better type safety
  strict: true,
});
