import React, { useState, useRef } from 'react';
import { Languages, Settings as SettingsIcon, Sun, Moon, Store, MapPin, User, Lock, Save, CheckCircle2, Download, Upload, Database as DbIcon, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, convertPersianDigits } from '../lib/utils';
import { Language } from '../types';

interface SettingsProps {
  language: Language;
  setLanguage: (l: Language) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  t: any;
  shopInfo: { name: string; address: string };
  setShopInfo: (info: { name: string; address: string }) => void;
  adminSettings: { username: string; password: string };
  setAdminSettings: (settings: { username: string; password: string }) => void;
  fetchData: () => void;
}

export default function Settings({ 
  language, 
  setLanguage, 
  theme, 
  toggleTheme, 
  t,
  shopInfo,
  setShopInfo,
  adminSettings,
  setAdminSettings,
  fetchData
}: SettingsProps) {
  const [localShopInfo, setLocalShopInfo] = useState(shopInfo);
  const [localAdminSettings, setLocalAdminSettings] = useState(adminSettings);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setShopInfo(localShopInfo);
    setAdminSettings(localAdminSettings);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleBackup = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.backup();
      if (result.success) {
        alert('Backup saved successfully!');
      }
    } else {
      window.location.href = '/api/backup';
    }
  };

  const handleRestoreClick = () => {
    if (window.electronAPI) {
      handleElectronRestore();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleElectronRestore = async () => {
    if (!confirm('Are you sure you want to restore? This will replace all current data!')) return;
    
    setIsRestoring(true);
    const result = await window.electronAPI.restore();
    setIsRestoring(false);
    
    if (result.success) {
      alert('Database restored successfully! The app will now refresh.');
      window.location.reload();
    } else {
      alert(result.error || 'Failed to restore database.');
    }
  };

  const handleWebRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Are you sure you want to restore? This will replace all current data!')) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    const formData = new FormData();
    formData.append('database', file);

    try {
      const response = await fetch('/api/restore', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Database restored successfully! The app will now refresh.');
        window.location.reload();
      } else {
        alert('Failed to restore database.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      alert('An error occurred during restore.');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{t.settings}</h2>
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-2 rounded-xl border border-green-500/20 text-sm font-medium"
            >
              <CheckCircle2 size={18} />
              {t.success_save}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shop Information */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-soft"
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Store size={24} className="text-brand-500" />
            {t.shop_info}
          </h3>
          <form className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.shop_name}</label>
              <div className="relative">
                <Store className="absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  value={localShopInfo.name}
                  onChange={(e) => setLocalShopInfo({ ...localShopInfo, name: convertPersianDigits(e.target.value) })}
                  className="w-full bg-muted border border-border rounded-xl py-2.5 ps-10 pe-4 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.shop_address}</label>
              <div className="relative">
                <MapPin className="absolute inset-s-3 top-3 text-muted-foreground" size={18} />
                <textarea
                  value={localShopInfo.address}
                  onChange={(e) => setLocalShopInfo({ ...localShopInfo, address: convertPersianDigits(e.target.value) })}
                  className="w-full bg-muted border border-border rounded-xl py-2.5 ps-10 pe-4 focus:outline-none focus:border-brand-500 transition-colors h-24 resize-none"
                />
              </div>
            </div>
          </form>
        </motion.div>

        {/* Admin Credentials */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-soft"
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <User size={24} className="text-brand-500" />
            {t.admin_creds}
          </h3>
          <form className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.username}</label>
              <div className="relative">
                <User className="absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  value={localAdminSettings.username}
                  onChange={(e) => setLocalAdminSettings({ ...localAdminSettings, username: convertPersianDigits(e.target.value) })}
                  className="w-full bg-muted border border-border rounded-xl py-2.5 ps-10 pe-4 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.password}</label>
              <div className="relative">
                <Lock className="absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="password"
                  value={localAdminSettings.password}
                  onChange={(e) => setLocalAdminSettings({ ...localAdminSettings, password: convertPersianDigits(e.target.value) })}
                  className="w-full bg-muted border border-border rounded-xl py-2.5 ps-10 pe-4 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
          </form>
        </motion.div>

        {/* Backup & Restore */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-soft lg:col-span-2"
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <DbIcon size={24} className="text-brand-500" />
            Backup & Restore
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-muted rounded-2xl border border-border space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Download size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">Backup Database</p>
                  <p className="text-xs text-muted-foreground">Download a copy of your data</p>
                </div>
              </div>
              <button 
                onClick={handleBackup}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all"
              >
                <Download size={18} />
                Download Backup
              </button>
            </div>

            <div className="p-6 bg-muted rounded-2xl border border-border space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Upload size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">Restore Database</p>
                  <p className="text-xs text-muted-foreground">Upload and replace current data</p>
                </div>
              </div>
              <button 
                onClick={handleRestoreClick}
                disabled={isRestoring}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {isRestoring ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Upload size={18} />
                )}
                {isRestoring ? 'Restoring...' : 'Restore from File'}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleWebRestore} 
                accept=".db" 
                className="hidden" 
              />
              <div className="flex items-start gap-2 text-[10px] text-amber-600 font-medium bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                Warning: Restoring will overwrite all current data. This action cannot be undone.
              </div>
            </div>
          </div>
        </motion.div>

        {/* Language & Theme */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-soft lg:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Languages size={24} className="text-brand-500" />
                {t.language}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {(['en', 'ps', 'dr'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      "p-3 rounded-xl border transition-all font-bold text-sm",
                      language === lang 
                        ? "bg-brand-500/10 border-brand-500 text-brand-500" 
                        : "bg-muted border-border text-muted-foreground hover:border-brand-500/50"
                    )}
                  >
                    {lang === 'en' ? 'English' : lang === 'ps' ? 'پښتو' : 'دری'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <SettingsIcon size={24} className="text-brand-500" />
                {t.appearance}
              </h3>
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
                <div>
                  <p className="font-bold text-sm">{t.theme_mode}</p>
                  <p className="text-xs text-muted-foreground">Toggle between light and dark</p>
                </div>
                <button 
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                  <span className="text-xs font-bold uppercase">{theme}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
        >
          <Save size={20} />
          {t.save_changes}
        </motion.button>
      </div>
    </div>
  );
}
