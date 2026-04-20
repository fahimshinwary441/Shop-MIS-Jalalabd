import React, { useState } from 'react';
import { 
  Download, 
  Upload, 
  FileJson, 
  FileSpreadsheet, 
  Database, 
  ShieldCheck, 
  AlertTriangle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { 
  RoznamchaEntry, 
  Customer, 
  KataTransaction, 
  StockEntry 
} from '../types';

interface BackupProps {
  roznamcha: RoznamchaEntry[];
  customers: Customer[];
  kataTransactions: KataTransaction[];
  stock: StockEntry[];
  shopInfo: any;
  adminSettings: any;
  t: any;
  onRestore: (data: any) => Promise<void>;
  onNotify?: (msg: string, type: 'success' | 'error') => void;
}

export default function Backup({ 
  roznamcha, 
  customers, 
  kataTransactions, 
  stock, 
  shopInfo, 
  adminSettings, 
  t,
  onRestore,
  onNotify
}: BackupProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRestoringDb, setIsRestoringDb] = useState(false);
  const [isDbConfirmOpen, setIsDbConfirmOpen] = useState(false);
  const [pendingDbFile, setPendingDbFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const notify = (msg: string, type: 'success' | 'error') => {
    if (onNotify) onNotify(msg, type);
    else setStatus({ message: msg, type });
  };

  const exportToDb = async () => {
    setIsExporting(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.backup();
        if (res.success) {
          notify('Full database backup saved successfully', 'success');
        } else {
          notify('Database backup failed', 'error');
        }
      } else {
        // For web, download via /api/backup or just point regular backup
        window.location.href = '/api/backup';
      }
    } catch (error) {
      console.error(error);
      notify('Failed to export Database', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDbImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (window.electronAPI) {
      setIsDbConfirmOpen(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setPendingDbFile(file);
    setIsDbConfirmOpen(true);
    e.target.value = '';
  };

  const confirmRestoreDb = async () => {
    setIsDbConfirmOpen(false);
    setIsRestoringDb(true);
    
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.restore();
        if (res.success) {
          notify('Database restored successfully. Application will reload.', 'success');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          notify('Restore failed: ' + (res.error || 'Unknown error'), 'error');
        }
      } else {
        if (!pendingDbFile) return;
        const formData = new FormData();
        formData.append('database', pendingDbFile);

        const res = await fetch('/api/restore', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          notify('Database restored successfully. Application will reload.', 'success');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          const data = await res.json();
          notify('Restore failed: ' + (data.error || 'Unknown error'), 'error');
        }
      }
    } catch (e: any) {
      notify('Restore failed: ' + e.message, 'error');
    } finally {
      setIsRestoringDb(false);
      setPendingDbFile(null);
    }
  };

  const exportToJson = () => {
    setIsExporting(true);
    try {
      const data = {
        roznamcha,
        customers,
        kataTransactions,
        stock,
        shopInfo,
        adminSettings,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shop_mis_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus({ type: 'success', message: 'JSON backup downloaded successfully' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to export JSON' });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      
      // Roznamcha
      const roznamchaData = roznamcha.map(e => ({
        Date: e.date,
        Type: e.type,
        Amount: e.amount,
        Description: e.description,
        'Bill Number': e.bill_number || '',
        'Customer ID': e.customer_id || ''
      }));
      const wsRoznamcha = XLSX.utils.json_to_sheet(roznamchaData);
      XLSX.utils.book_append_sheet(wb, wsRoznamcha, 'Roznamcha');
      
      // Customers
      const customersData = customers.map(c => ({
        ID: c.id,
        Name: c.name,
        Address: c.address,
        Contact: c.contact
      }));
      const wsCustomers = XLSX.utils.json_to_sheet(customersData);
      XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');
      
      // Kata
      const kataData = kataTransactions.map(k => ({
        Date: k.date,
        'Customer ID': k.customer_id,
        Type: k.type,
        Amount: k.amount,
        'Bill Number': k.bill_number || '',
        Description: k.description || ''
      }));
      const wsKata = XLSX.utils.json_to_sheet(kataData);
      XLSX.utils.book_append_sheet(wb, wsKata, 'Kata');
      
      // Stock
      const stockData = stock.map(s => ({
        Date: s.date,
        'Item Name': s.item_name,
        Type: s.type,
        Quantity: s.quantity,
        'Bill Number': s.bill_number || '',
        Description: s.description
      }));
      const wsStock = XLSX.utils.json_to_sheet(stockData);
      XLSX.utils.book_append_sheet(wb, wsStock, 'Stock');
      
      XLSX.writeFile(wb, `shop_mis_backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setStatus({ type: 'success', message: 'Excel backup downloaded successfully' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to export Excel' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        // Basic validation
        if (!data.roznamcha || !data.customers) {
          throw new Error('Invalid backup file format');
        }
        
        if (window.confirm('This will overwrite current data. Are you sure you want to restore from this backup?')) {
          await onRestore(data);
          setStatus({ type: 'success', message: 'Data restored successfully' });
        }
      } catch (error) {
        setStatus({ type: 'error', message: 'Failed to import backup: ' + (error as Error).message });
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-500">
          <Database size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tighter">{t.backup_restore || 'Backup & Restore'}</h2>
          <p className="text-muted-foreground font-medium">Manage your data safety and portability</p>
        </div>
      </div>

      {status && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-2xl border flex items-center gap-3",
            status.type === 'success' 
              ? "bg-green-500/10 border-green-500/20 text-green-500" 
              : "bg-red-500/10 border-red-500/20 text-red-500"
          )}
        >
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span className="font-bold">{status.message}</span>
          <button onClick={() => setStatus(null)} className="ms-auto text-xs underline">Dismiss</button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-card border border-border rounded-3xl p-8 shadow-soft space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Download size={20} />
            </div>
            <h3 className="text-xl font-bold tracking-tight">Export Data</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Download a copy of your entire database. We recommend doing this regularly to prevent data loss.
          </p>

          <div className="space-y-3">
            <button
              onClick={exportToJson}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80 rounded-2xl border border-border transition-all group"
            >
              <div className="flex items-center gap-3">
                <FileJson className="text-yellow-500" size={24} />
                <div className="text-start">
                  <p className="font-bold">JSON Format</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Recommended for Restore</p>
                </div>
              </div>
              <Download size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            <button
              onClick={exportToDb}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80 rounded-2xl border border-border transition-all group border-blue-500/30"
            >
              <div className="flex items-center gap-3">
                <Database className="text-blue-500" size={24} />
                <div className="text-start">
                  <p className="font-bold">Database File (.db)</p>
                  <p className="text-[10px] text-blue-500/70 font-black uppercase tracking-widest">Complete System Copy</p>
                </div>
              </div>
              <Download size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            <button
              onClick={exportToExcel}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80 rounded-2xl border border-border transition-all group"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-green-500" size={24} />
                <div className="text-start">
                  <p className="font-bold">Excel Format</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">For viewing & reporting</p>
                </div>
              </div>
              <Download size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-card border border-border rounded-3xl p-8 shadow-soft space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <Upload size={20} />
            </div>
            <h3 className="text-xl font-bold tracking-tight">Restore Data</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Restore your database from a previously exported JSON file. 
            <span className="text-red-500 font-bold block mt-1">Warning: This will overwrite all current data!</span>
          </p>

          <div className="grid grid-cols-1 gap-4">
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className={cn(
                "w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-2xl bg-muted/30 transition-all",
                isImporting ? "opacity-50" : "hover:bg-muted/50 hover:border-brand-500/50"
              )}>
                {isImporting ? (
                  <RefreshCw size={24} className="text-brand-500 animate-spin mb-2" />
                ) : (
                  <FileJson size={24} className="text-muted-foreground mb-2" />
                )}
                <p className="font-bold text-xs">Restore from JSON</p>
              </div>
            </div>

            <div className="relative">
              <input
                type="file"
                accept=".db"
                onChange={handleDbImport}
                disabled={isRestoringDb}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className={cn(
                "w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-500/30 rounded-2xl bg-blue-500/5 transition-all",
                isRestoringDb ? "opacity-50" : "hover:bg-blue-500/10 hover:border-blue-500/50"
              )}>
                {isRestoringDb ? (
                  <RefreshCw size={24} className="text-blue-500 animate-spin mb-2" />
                ) : (
                  <Database size={24} className="text-blue-500 mb-2" />
                )}
                <p className="font-bold text-xs text-blue-500">Restore from .db File</p>
                <p className="text-[9px] text-blue-500/70 font-bold uppercase tracking-widest mt-1 text-center font-mono">Highly Recommended</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {isDbConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsDbConfirmOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-3xl p-8 w-full max-w-sm relative z-[101] shadow-2xl text-center"
          >
            <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">Overwrite Database?</h3>
            <p className="text-muted-foreground text-sm mb-6">
              This will **PERMANENTLY OVERWRITE** your current database. All current data will be replaced. Are you sure?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDbConfirmOpen(false)}
                className="flex-1 py-2 rounded-xl border border-border hover:bg-muted transition-all font-bold text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={confirmRestoreDb}
                className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all font-bold text-sm"
              >
                Yes, Restore
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Security Info */}
      <div className="bg-brand-500/5 border border-brand-500/10 rounded-3xl p-6 flex items-start gap-4">
        <div className="p-2 rounded-xl bg-brand-500/10 text-brand-500 shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h4 className="font-bold text-brand-500">Data Security</h4>
          <p className="text-sm text-muted-foreground mt-1">
            All backups are processed locally in your browser. Your data never leaves your computer. 
            Keep your backup files in a safe place as they contain sensitive financial information.
          </p>
        </div>
      </div>
    </div>
  );
}
