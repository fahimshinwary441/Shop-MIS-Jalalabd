import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import * as crud from '../src/database/crud';
import { dbPath, reinitDatabase } from '../src/database/db';

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (dialog) {
    dialog.showErrorBox('Critical Error', error.message || 'An unexpected error occurred in the main process.');
  }
});

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
      },
      backgroundColor: '#0a0a0a',
      title: 'Soft Touch Technology',
      show: false,
    });

    // Fallback: Show window after 5 seconds if ready-to-show doesn't fire
    const showTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
      }
    }, 5000);

    mainWindow.once('ready-to-show', () => {
      clearTimeout(showTimeout);
      if (mainWindow) {
        mainWindow.show();
      }
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
      if (!isDev) {
        dialog.showErrorBox(
          'Load Error',
          `Failed to load application content: ${errorDescription} (${errorCode})`
        );
      }
    });

    if (isDev) {
      mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools();
    } else {
      const indexPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      } else {
        dialog.showErrorBox(
          'Startup Error',
          'The application assets (dist/index.html) could not be found. Please ensure the application was built correctly.'
        );
      }
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  // ... (rest of the IPC handlers)

// IPC Handlers for Database
ipcMain.handle('db:getStats', () => crud.stats.getOverview());

ipcMain.handle('db:getRoznamcha', () => crud.roznamcha.getAll());
ipcMain.handle('db:createRoznamcha', (_, entry) => crud.roznamcha.create(entry));
ipcMain.handle('db:updateRoznamcha', (_, id, entry) => crud.roznamcha.update(id, entry));
ipcMain.handle('db:deleteRoznamcha', (_, id) => crud.roznamcha.delete(id));

ipcMain.handle('db:getKataTransactions', (_, customerId) => crud.kata.getTransactions(customerId));
ipcMain.handle('db:getKataSummaries', () => crud.kata.getSummaries());
ipcMain.handle('db:createKataTransaction', (_, entry) => crud.kata.createTransaction(entry));
ipcMain.handle('db:deleteKataTransaction', (_, id) => crud.kata.deleteTransaction(id));

ipcMain.handle('db:getStock', () => crud.stock.getAll());
ipcMain.handle('db:createStock', (_, entry) => crud.stock.create(entry));
ipcMain.handle('db:updateStock', (_, id, entry) => crud.stock.update(id, entry));
ipcMain.handle('db:deleteStock', (_, id) => crud.stock.delete(id));

ipcMain.handle('db:getCustomers', () => crud.customers.getAll());
ipcMain.handle('db:createCustomer', (_, entry) => crud.customers.create(entry));
ipcMain.handle('db:updateCustomer', (_, id, entry) => crud.customers.update(id, entry));
ipcMain.handle('db:deleteCustomer', (_, id) => crud.customers.delete(id));

// User Management
ipcMain.handle('db:getUsers', () => crud.users.getAll());
ipcMain.handle('db:createUser', (_, user) => crud.users.create(user));
ipcMain.handle('db:deleteUser', (_, id) => crud.users.delete(id));
ipcMain.handle('db:authenticate', (_, { username, password }) => {
  // Developer Login (Hardcoded)
  if (username === 'admin' && password === 'NewCode@ShopMIS') {
    return { 
      id: 0, 
      username: 'admin', 
      role: 'developer', 
      language: 'en' 
    };
  }
  return crud.users.authenticate(username, password);
});

// Logs
ipcMain.handle('db:getLogs', () => crud.logs.getAll());

// Developer Tools
ipcMain.handle('db:executeRaw', (_, query) => crud.developer.executeRaw(query));

ipcMain.handle('db:exportJson', async () => {
  const [roz, kataT, kataS, stock, cust, sett] = await Promise.all([
    crud.roznamcha.getAll(),
    crud.kata.getTransactions(),
    crud.kata.getSummaries(),
    crud.stock.getAll(),
    crud.customers.getAll(),
    crud.settings.getAll()
  ]);
  return {
    roznamcha: roz,
    kataTransactions: kataT,
    kataSummaries: kataS,
    stock: stock,
    customers: cust,
    settings: sett,
    exportDate: new Date().toISOString()
  };
});

ipcMain.handle('db:getSettings', () => crud.settings.getAll());
ipcMain.handle('db:setSetting', (_, { key, value }) => crud.settings.set(key, value));

ipcMain.handle('db:backup', async (event) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Backup Database',
    defaultPath: 'shop_mis_backup.db',
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  });

  if (filePath) {
    fs.copyFileSync(dbPath, filePath);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('db:restore', async (event) => {
  console.log('Restore request received...');
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Restore Database',
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    properties: ['openFile']
  });

  if (filePaths && filePaths.length > 0) {
    try {
      console.log(`Starting restore from: ${filePaths[0]}`);
      
      // Close existing connection
      reinitDatabase();
      
      // Ensure file exists and is accessible
      if (!fs.existsSync(filePaths[0])) {
        throw new Error('Source backup file does not exist.');
      }

      // Explicitly delete old DB and journals
      if (fs.existsSync(dbPath)) {
        console.log('Unlinking old database file...');
        fs.unlinkSync(dbPath);
      }
      
      // Copy new file
      console.log('Copying new database file...');
      fs.copyFileSync(filePaths[0], dbPath);
      
      // Verify copy
      if (!fs.existsSync(dbPath)) {
        throw new Error('Database file copy failed - file not found at destination.');
      }

      console.log('Restore successful, re-initializing...');
      return { success: true };
    } catch (error: any) {
      console.error('Restore error in Main Process:', error);
      return { success: false, error: error.message || 'Failed to restore database' };
    }
  }
  return { success: false };
});

// License IPC Handlers
ipcMain.handle('license:status', () => {
  const status = crud.settings.get('system_license');
  const activationDate = crud.settings.get('license_activation_date');
  
  if (status !== 'NewCode@ShopMIS' || !activationDate) {
    return { activated: false };
  }

  const activatedAt = new Date(activationDate);
  const expiresAt = new Date(activatedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  
  const now = new Date();
  const isExpired = now > expiresAt;

  return { 
    activated: !isExpired,
    activationDate,
    expiresAt: expiresAt.toISOString(),
    remainingDays: Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  };
});

ipcMain.handle('license:activate', (_, key) => {
  if (key === 'NewCode@ShopMIS') {
    crud.settings.set('system_license', key);
    const existingDate = crud.settings.get('license_activation_date');
    if (!existingDate) {
      crud.settings.set('license_activation_date', new Date().toISOString());
    }
    return { success: true };
  }
  return { success: false };
});

app.whenReady().then(() => {
  try {
    createWindow();
  } catch (error: any) {
    dialog.showErrorBox('Initialization Error', error.message || 'Failed to create main window');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
}
