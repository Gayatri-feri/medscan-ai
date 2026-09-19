import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

export interface ScanRow {
  id: number;
  scanId: string;
  imageUrl: string;
  scannedAt: string;
  createdAt: string;
}

export interface MedicineRecordRow {
  id: number;
  scanId: string;
  medicineName: string | null;
  productType: string | null;
  activeIngredient: string | null;
  strength: string | null;
  generalIndication: string | null;
  brandName: string | null;
  manufacturer: string | null;
  batchNumber: string | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
  mrp: string | null;
  quantity: string | null;
  packSize: string | null;
  prescriptionStatus: string | null;
  confidence: string | null; // JSON string
  rawText: string | null;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'medscan.sqlite');

let dbInstance: any = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('Could not read existing SQLite file, creating fresh database:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Initialize schema
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scanId TEXT UNIQUE NOT NULL,
      imageUrl TEXT,
      scannedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medicine_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scanId TEXT NOT NULL,
      medicineName TEXT,
      productType TEXT,
      activeIngredient TEXT,
      strength TEXT,
      generalIndication TEXT,
      brandName TEXT,
      manufacturer TEXT,
      batchNumber TEXT,
      manufacturingDate TEXT,
      expiryDate TEXT,
      mrp TEXT,
      quantity TEXT,
      packSize TEXT,
      prescriptionStatus TEXT,
      confidence TEXT,
      rawText TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (scanId) REFERENCES scans (scanId) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_records_scanId ON medicine_records(scanId);
    CREATE INDEX IF NOT EXISTS idx_records_name ON medicine_records(medicineName);
    CREATE INDEX IF NOT EXISTS idx_records_batch ON medicine_records(batchNumber);
    CREATE INDEX IF NOT EXISTS idx_scans_scannedAt ON scans(scannedAt);
  `);

  saveDb();
  return dbInstance;
}

export function saveDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite to disk:', err);
  }
}

// Helper to convert sql.js QueryResult to objects
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function execute(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  const rowidRes = dbInstance.exec("SELECT last_insert_rowid() AS id, changes() AS changes;");
  const lastInsertRowid = rowidRes?.[0]?.values?.[0]?.[0] || 0;
  const changes = rowidRes?.[0]?.values?.[0]?.[1] || 0;
  saveDb();
  return { lastInsertRowid, changes };
}
