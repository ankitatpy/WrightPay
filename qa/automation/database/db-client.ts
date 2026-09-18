import { Pool, QueryResult, QueryResultRow, PoolConfig } from 'pg';
import { config } from '../config/env.config';

export class DbClient {
  private pool!: Pool;
  private connectionString: string;
  private options?: Omit<PoolConfig, 'connectionString'>;

  constructor(connectionString?: string, options?: Omit<PoolConfig, 'connectionString'>) {
    this.connectionString = connectionString || config.databaseUrl;
    this.options = options;
    this.initPool();
  }

  private initPool(): void {
    this.pool = new Pool({
      connectionString: this.connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ...this.options,
    });

    this.pool.on('error', (err) => {
      console.error('[DbClient] Unexpected error on idle PostgreSQL client:', err.message);
    });
  }

  private getActivePool(): Pool {
    if ((this.pool as any).ended) {
      this.initPool();
    }
    return this.pool;
  }

  /**
   * Execute a parameterized SQL query safely.
   * Never interpolate values directly into the query string.
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    values?: any[],
  ): Promise<QueryResult<T>> {
    return this.getActivePool().query<T>(text, values);
  }

  /**
   * Convenience helper to execute a query and return the first row, or null if no rows matched.
   */
  async queryOne<T extends QueryResultRow = any>(
    text: string,
    values?: any[],
  ): Promise<T | null> {
    const result = await this.query<T>(text, values);
    return result.rows[0] || null;
  }

  /**
   * Perform a lightweight health check to confirm PostgreSQL connectivity.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as alive');
      return result.rows.length > 0 && result.rows[0].alive === 1;
    } catch (error) {
      console.error('[DbClient] Health check failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Gracefully close all connections in the pool.
   */
  async close(): Promise<void> {
    if (this.pool && !(this.pool as any).ended) {
      await this.pool.end();
    }
  }

  /**
   * Access the underlying pg.Pool if needed.
   */
  getPool(): Pool {
    return this.getActivePool();
  }
}

export const dbClient = new DbClient();
export default dbClient;
