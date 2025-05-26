import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1); // Exit if DATABASE_URL is not set
}

const pool = new Pool({
  connectionString: databaseUrl,
  // It's good practice to add SSL configuration for production environments
  // ssl: {
  //   rejectUnauthorized: false // Only for development/testing if using self-signed certs
  // }
});

pool.on('connect', () => {
  console.log('Connected to the PostgreSQL database!');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool; 