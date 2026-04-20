import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

// Use global require in CJS (Electron), or createRequire in ESM (Server)
// Vite will transform import.meta.url when bundling for CommonJS
const _require = typeof require !== 'undefined' ? require : createRequire(import.meta.url);

// Helper to get the database path
const getDatabasePath = () => {
  // In Cloud Run or similar container environments, /tmp is the only writable directory
  if (process.env.K_SERVICE || process.env.CLOUD_RUN_JOB) {
    return '/tmp/shop_mis.db';
  }

  const localPath = path.join(process.cwd(), 'shop_mis.db');
  
  if (process.env.NODE_ENV !== 'production') {
    return localPath;
  }

  if (process.versions.electron) {
    try {
      const { app } = _require('electron');
      if (app) {
        const userDataPath = app.getPath('userData');
        return path.join(userDataPath, 'shop_mis.db');
      }
    } catch (e) {}
  }

  try {
    fs.accessSync(process.cwd(), fs.constants.W_OK);
    return localPath;
  } catch (e) {
    return process.platform === 'win32' 
      ? path.join(process.env.APPDATA || '.', 'shop_mis.db')
      : '/tmp/shop_mis.db';
  }
};

export const dbPath = getDatabasePath();
console.log(`Database path: ${dbPath}`);

let dbInstance: any = null;

const resetDatabase = () => {
  console.warn('Database disk image is malformed. Resetting database...');
  if (dbInstance) {
    try { dbInstance.close(); } catch (e) {}
    dbInstance = null;
  }
  const corruptPath = `${dbPath}.corrupt-${Date.now()}`;
  if (fs.existsSync(dbPath)) {
    try {
      fs.renameSync(dbPath, corruptPath);
      console.log(`Corrupted database moved to: ${corruptPath}`);
    } catch (e) {
      console.error('Failed to rename corrupted database:', e);
      try { fs.unlinkSync(dbPath); } catch (unlinkErr) {}
    }
  }
};

export const getDb = () => {
  if (!dbInstance) {
    try {
      console.log(`Initializing database at: ${dbPath}`);
      dbInstance = new Database(dbPath);
    } catch (error: any) {
      console.error('Initial database connection failed:', error);
      if (error.message && error.message.includes('malformed')) {
        resetDatabase();
        dbInstance = new Database(dbPath);
      } else {
        throw error;
      }
    }

    try {
      // Initialize Database Tables
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT,
          role TEXT DEFAULT 'admin',
          language TEXT DEFAULT 'en'
        );

        CREATE TABLE IF NOT EXISTS roznamcha (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT,
          type TEXT, -- 'income' or 'expense'
          amount REAL,
          description TEXT,
          bill_number TEXT,
          customer_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS kata_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER,
          date TEXT,
          type TEXT, -- 'purchase' or 'payment'
          amount REAL,
          bill_number TEXT,
          description TEXT,
          roznamcha_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS kata_summary (
          customer_id INTEGER PRIMARY KEY,
          total_purchase REAL DEFAULT 0,
          total_paid REAL DEFAULT 0,
          remaining_balance REAL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS stock (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_name TEXT,
          date TEXT,
          type TEXT DEFAULT 'out', -- 'in' or 'out'
          quantity INTEGER,
          description TEXT,
          bill_number TEXT
        );

        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          address TEXT,
          contact TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        CREATE TABLE IF NOT EXISTS system_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT,
          module TEXT,
          message TEXT,
          type TEXT DEFAULT 'error'
        );

        -- Default admin if not exists
        INSERT OR IGNORE INTO users (username, password, role, language) 
        VALUES ('admin', 'admin123', 'admin', 'en');

        -- Fix for the bug that might have changed the password to 'admin'
        UPDATE users SET password = 'admin123' WHERE username = 'admin' AND password = 'admin';
      `);

      // Migrations
      const stockInfo = dbInstance.prepare("PRAGMA table_info(stock)").all() as any[];
      if (!stockInfo.find((c: any) => c.name === 'type')) {
        dbInstance.exec("ALTER TABLE stock ADD COLUMN type TEXT DEFAULT 'out'");
      }
      if (!stockInfo.find((c: any) => c.name === 'quantity')) {
        dbInstance.exec("ALTER TABLE stock ADD COLUMN quantity INTEGER");
        if (stockInfo.find((c: any) => c.name === 'quantity_out')) {
          dbInstance.exec("UPDATE stock SET quantity = quantity_out");
        }
      }

      const roznamchaInfo = dbInstance.prepare("PRAGMA table_info(roznamcha)").all() as any[];
      if (!roznamchaInfo.find((c: any) => c.name === 'customer_id')) {
        dbInstance.exec("ALTER TABLE roznamcha ADD COLUMN customer_id INTEGER");
      }

      console.log('Database initialized successfully.');
    } catch (error: any) {
       if (error.message && error.message.includes('malformed')) {
         resetDatabase();
         return getDb();
       }
       console.error('Failed to initialize database tables:', error);
       throw error;
    }
  }
  return dbInstance;
};

export const safeQuery = <T>(callback: (db: any) => T): T => {
  try {
    const db = getDb();
    return callback(db);
  } catch (error: any) {
    if (error.message && error.message.includes('malformed')) {
      resetDatabase();
      const newDb = getDb();
      return callback(newDb);
    }
    throw error;
  }
};

export const reinitDatabase = () => {
  if (dbInstance) {
    try { dbInstance.close(); } catch (e) {}
    dbInstance = null;
    console.log('Database connection closed.');
  }
  
  // Also delete journal files to prevent conflicts during restore
  const journalFiles = [`${dbPath}-journal`, `${dbPath}-wal`, `${dbPath}-shm`];
  journalFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`Deleted journal file: ${file}`);
      } catch (e) {
        console.error(`Failed to delete journal file ${file}:`, e);
      }
    }
  });
};
