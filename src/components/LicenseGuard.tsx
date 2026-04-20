import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LICENSE_KEY = 'NewCode@ShopMIS';

interface LicenseGuardProps {
  children: React.ReactNode;
}

export default function LicenseGuard({ children }: LicenseGuardProps) {
  const [isLicensed, setIsLicensed] = useState<boolean | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    checkLicense();
    // Check every hour
    const interval = setInterval(checkLicense, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, []);

  const checkLicense = async () => {
    try {
      let data;
      if (window.electronAPI) {
        data = await window.electronAPI.getLicenseStatus();
      } else {
        const res = await fetch('/api/license/status');
        data = await res.json();
      }
      
      setIsLicensed(data.activated);
      if (data.activationDate && !data.activated) {
        setIsExpired(true);
      }
    } catch (e) {
      // Fallback to localStorage if server is not reachable
      const savedKey = localStorage.getItem('shop_mis_license');
      setIsLicensed(savedKey === LICENSE_KEY);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey === LICENSE_KEY) {
      try {
        if (window.electronAPI) {
          const res = await window.electronAPI.activateLicense(inputKey);
          if (res.success) {
            localStorage.setItem('shop_mis_license', LICENSE_KEY);
            setIsLicensed(true);
            setError(false);
          } else {
            setError(true);
          }
        } else {
          const res = await fetch('/api/license/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: inputKey })
          });
          if (res.ok) {
            localStorage.setItem('shop_mis_license', LICENSE_KEY);
            setIsLicensed(true);
            setError(false);
          } else {
            setError(true);
          }
        }
      } catch (e) {
        // Fallback
        localStorage.setItem('shop_mis_license', LICENSE_KEY);
        setIsLicensed(true);
        setError(false);
      }
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  if (isLicensed === null) return null;

  if (!isLicensed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#111] border border-[#222] rounded-3xl p-8 w-full max-w-md relative z-10 shadow-2xl"
        >
          <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center text-brand-500 mx-auto mb-6 border border-brand-500/20">
            <Lock size={32} />
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-2">
            {isExpired ? 'License Expired' : 'License Required'}
          </h1>
          <p className="text-muted-foreground text-center mb-8 text-sm">
            {isExpired 
              ? 'Your system license has expired. Please contact the developer to renew.' 
              : 'Please enter your license key to activate the system.'}
          </p>

          {isExpired && (
            <div className="mb-8 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Developer Contact</p>
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">Contact: +93794820308, +93772743175</p>
                <p className="text-xs text-muted-foreground">Email: fahimshinwary4@gmail.com</p>
                <p className="text-xs text-muted-foreground">Email: masihshafy@gmail.com</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">License Key</label>
              <div className="relative">
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  className={cn(
                    "w-full bg-[#1a1a1a] border rounded-xl py-3 px-4 focus:outline-none transition-all font-mono text-center tracking-widest",
                    error ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-[#333] focus:border-brand-500"
                  )}
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-red-500 text-xs font-bold justify-center"
                >
                  <AlertCircle size={14} />
                  Invalid License Key
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
            >
              <ShieldCheck size={20} />
              Activate System
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#222] text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              © 2026 Soft Touch Technology
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
