import { safeQuery } from './db.ts';
import { RoznamchaEntry, KataTransaction, KataSummary, StockEntry, Customer } from '../types.ts';

// Helper to update kata summary
const updateKataSummary = (customerId: number) => {
  safeQuery((db) => {
    const transactions = db.prepare('SELECT type, amount FROM kata_transactions WHERE customer_id = ?').all(customerId) as any[];
    
    let totalPurchase = 0;
    let totalPaid = 0;
    
    transactions.forEach(t => {
      if (t.type === 'purchase') totalPurchase += t.amount;
      else totalPaid += t.amount;
    });
    
    const remainingBalance = totalPurchase - totalPaid;
    
    db.prepare(`
      INSERT INTO kata_summary (customer_id, total_purchase, total_paid, remaining_balance)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(customer_id) DO UPDATE SET
        total_purchase = excluded.total_purchase,
        total_paid = excluded.total_paid,
        remaining_balance = excluded.remaining_balance
    `).run(customerId, totalPurchase, totalPaid, remainingBalance);
  });
};

// Roznamcha CRUD
export const roznamcha = {
  getAll: () => {
    return safeQuery((db) => {
      console.log('Fetching all roznamcha entries');
      return db.prepare('SELECT * FROM roznamcha ORDER BY date DESC').all();
    });
  },
  create: (entry: Omit<RoznamchaEntry, 'id'>) => {
    return safeQuery((db) => {
      console.log('Creating roznamcha entry:', entry);
      const { date, type, amount, description, bill_number, customer_id } = entry;
      
      const info = db.prepare('INSERT INTO roznamcha (date, type, amount, description, bill_number, customer_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(date, type, amount, description, bill_number, customer_id);
      
      const roznamchaId = info.lastInsertRowid as number;

      // Automatic sync with Kata
      if (customer_id) {
        const kataType = type === 'income' ? 'payment' : 'purchase';
        db.prepare('INSERT INTO kata_transactions (customer_id, date, type, amount, bill_number, description, roznamcha_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(customer_id, date, kataType, amount, bill_number, description, roznamchaId);
        updateKataSummary(Number(customer_id));
      }
      
      return info;
    });
  },
  update: (id: number, entry: Omit<RoznamchaEntry, 'id'>) => {
    return safeQuery((db) => {
      const { date, type, amount, description, bill_number, customer_id } = entry;
      
      // Delete old linked kata transaction if exists
      const oldEntry = db.prepare('SELECT customer_id FROM roznamcha WHERE id = ?').get(id) as any;
      db.prepare('DELETE FROM kata_transactions WHERE roznamcha_id = ?').run(id);
      
      const info = db.prepare('UPDATE roznamcha SET date = ?, type = ?, amount = ?, description = ?, bill_number = ?, customer_id = ? WHERE id = ?')
        .run(date, type, amount, description, bill_number, customer_id, id);

      // Re-create linked kata transaction if customer_id exists
      if (customer_id) {
        const kataType = type === 'income' ? 'payment' : 'purchase';
        db.prepare('INSERT INTO kata_transactions (customer_id, date, type, amount, bill_number, description, roznamcha_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(customer_id, date, kataType, amount, bill_number, description, id);
        updateKataSummary(Number(customer_id));
      }
      
      if (oldEntry?.customer_id && oldEntry.customer_id !== customer_id) {
        updateKataSummary(Number(oldEntry.customer_id));
      }
      
      return info;
    });
  },
  delete: (id: number) => {
    return safeQuery((db) => {
      const entry = db.prepare('SELECT customer_id FROM roznamcha WHERE id = ?').get(id) as any;
      
      db.prepare('DELETE FROM kata_transactions WHERE roznamcha_id = ?').run(id);
      const info = db.prepare('DELETE FROM roznamcha WHERE id = ?').run(id);
      
      if (entry?.customer_id) {
        updateKataSummary(Number(entry.customer_id));
      }
      
      return info;
    });
  }
};

// Kata CRUD
export const kata = {
  getTransactions: (customerId?: number) => {
    return safeQuery((db) => {
      if (customerId) {
        return db.prepare('SELECT * FROM kata_transactions WHERE customer_id = ? ORDER BY date DESC').all(customerId);
      }
      return db.prepare('SELECT * FROM kata_transactions ORDER BY date DESC').all();
    });
  },
  getSummaries: () => {
    return safeQuery((db) => {
      return db.prepare(`
        SELECT ks.*, c.name as customer_name 
        FROM kata_summary ks
        JOIN customers c ON ks.customer_id = c.id
      `).all();
    });
  },
  createTransaction: (entry: Omit<KataTransaction, 'id'>) => {
    return safeQuery((db) => {
      const { customer_id, date, type, amount, bill_number, description } = entry;
      
      // Automatic sync with Roznamcha
      const rozType = type === 'payment' ? 'income' : 'expense';
      const rozInfo = db.prepare('INSERT INTO roznamcha (date, type, amount, description, bill_number, customer_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(date, rozType, amount, description, bill_number, customer_id);
      
      const roznamchaId = rozInfo.lastInsertRowid as number;

      const info = db.prepare('INSERT INTO kata_transactions (customer_id, date, type, amount, bill_number, description, roznamcha_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(customer_id, date, type, amount, bill_number, description, roznamchaId);
      
      updateKataSummary(Number(customer_id));
      return info;
    });
  },
  deleteTransaction: (id: number) => {
    return safeQuery((db) => {
      const transaction = db.prepare('SELECT customer_id, roznamcha_id FROM kata_transactions WHERE id = ?').get(id) as any;
      
      if (transaction?.roznamcha_id) {
        db.prepare('DELETE FROM roznamcha WHERE id = ?').run(transaction.roznamcha_id);
      }
      
      const info = db.prepare('DELETE FROM kata_transactions WHERE id = ?').run(id);
      
      if (transaction?.customer_id) {
        updateKataSummary(Number(transaction.customer_id));
      }
      
      return info;
    });
  }
};

// Customer CRUD
export const customers = {
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare('SELECT * FROM customers ORDER BY id DESC').all();
    });
  },
  create: (entry: Omit<Customer, 'id'>) => {
    return safeQuery((db) => {
      const { name, address, contact } = entry;
      return db.prepare('INSERT INTO customers (name, address, contact) VALUES (?, ?, ?)')
        .run(name, address, contact);
    });
  },
  update: (id: number, entry: Omit<Customer, 'id'>) => {
    return safeQuery((db) => {
      const { name, address, contact } = entry;
      return db.prepare('UPDATE customers SET name = ?, address = ?, contact = ? WHERE id = ?')
        .run(name, address, contact, id);
    });
  },
  delete: (id: number) => {
    return safeQuery((db) => {
      const deleteTx = db.transaction((customerId: number) => {
        // Cleanup related data
        db.prepare('DELETE FROM kata_summary WHERE customer_id = ?').run(customerId);
        db.prepare('DELETE FROM kata_transactions WHERE customer_id = ?').run(customerId);
        db.prepare('UPDATE roznamcha SET customer_id = NULL WHERE customer_id = ?').run(customerId);
        return db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
      });
      
      return deleteTx(id);
    });
  }
};

// Stock CRUD
export const stock = {
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare('SELECT * FROM stock ORDER BY date DESC').all();
    });
  },
  create: (entry: Omit<StockEntry, 'id'>) => {
    return safeQuery((db) => {
      const { item_name, date, type, quantity, description, bill_number } = entry;
      return db.prepare('INSERT INTO stock (item_name, date, type, quantity, description, bill_number) VALUES (?, ?, ?, ?, ?, ?)')
        .run(item_name, date, type, quantity, description, bill_number);
    });
  },
  update: (id: number, entry: Omit<StockEntry, 'id'>) => {
    return safeQuery((db) => {
      const { item_name, date, type, quantity, description, bill_number } = entry;
      return db.prepare('UPDATE stock SET item_name = ?, date = ?, type = ?, quantity = ?, description = ?, bill_number = ? WHERE id = ?')
        .run(item_name, date, type, quantity, description, bill_number, id);
    });
  },
  delete: (id: number) => {
    return safeQuery((db) => {
      return db.prepare('DELETE FROM stock WHERE id = ?').run(id);
    });
  }
};

// Stats
export const stats = {
  getOverview: () => {
    return safeQuery((db) => {
      const income = db.prepare("SELECT SUM(amount) as total FROM roznamcha WHERE type = 'income'").get() as any;
      const expense = db.prepare("SELECT SUM(amount) as total FROM roznamcha WHERE type = 'expense'").get() as any;
      const stockIn = db.prepare("SELECT SUM(quantity) as total FROM stock WHERE type = 'in'").get() as any;
      const stockOut = db.prepare("SELECT SUM(quantity) as total FROM stock WHERE type = 'out'").get() as any;
      
      return {
        totalIncome: income?.total || 0,
        totalExpense: expense?.total || 0,
        totalStockIn: stockIn?.total || 0,
        totalStockOut: stockOut?.total || 0,
        balance: (income?.total || 0) - (expense?.total || 0)
      };
    });
  }
};

// Users CRUD
export const users = {
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare('SELECT id, username, role, language FROM users').all();
    });
  },
  create: (user: any) => {
    return safeQuery((db) => {
      const { username, password, role, language } = user;
      return db.prepare('INSERT INTO users (username, password, role, language) VALUES (?, ?, ?, ?)')
        .run(username, password, role, language || 'en');
    });
  },
  update: (id: number, user: any) => {
    return safeQuery((db) => {
      const { username, password, role, language } = user;
      if (password) {
        return db.prepare('UPDATE users SET username = ?, password = ?, role = ?, language = ? WHERE id = ?')
          .run(username, password, role, language, id);
      }
      return db.prepare('UPDATE users SET username = ?, role = ?, language = ? WHERE id = ?')
        .run(username, role, language, id);
    });
  },
  delete: (id: number) => {
    return safeQuery((db) => {
      return db.prepare('DELETE FROM users WHERE id = ?').run(id);
    });
  },
  authenticate: (username: string, password: string) => {
    return safeQuery((db) => {
      return db.prepare('SELECT id, username, role, language FROM users WHERE username = ? AND password = ?')
        .get(username, password);
    });
  }
};

// Logs CRUD
export const logs = {
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare('SELECT * FROM system_logs ORDER BY date DESC LIMIT 100').all();
    });
  },
  add: (module: string, message: string, type: string = 'error') => {
    return safeQuery((db) => {
      return db.prepare('INSERT INTO system_logs (date, module, message, type) VALUES (?, ?, ?, ?)')
        .run(new Date().toISOString(), module, message, type);
    });
  }
};

// Settings CRUD
export const settings = {
  get: (key: string) => {
    return safeQuery((db) => {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
      return row ? JSON.parse(row.value) : null;
    });
  },
  set: (key: string, value: any) => {
    return safeQuery((db) => {
      return db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .run(key, JSON.stringify(value));
    });
  },
  getAll: () => {
    return safeQuery((db) => {
      return db.prepare('SELECT * FROM settings').all();
    });
  }
};

// Developer Tools
export const developer = {
  executeRaw: (query: string) => {
    return safeQuery((db) => {
      const stmt = db.prepare(query);
      if (query.trim().toUpperCase().startsWith('SELECT') || query.trim().toUpperCase().startsWith('PRAGMA')) {
        return stmt.all();
      } else {
        return stmt.run();
      }
    });
  }
};
