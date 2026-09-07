import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/apexcare_db';

const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const useSsl = !isLocal && (connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || process.env.NODE_ENV === 'production');

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
