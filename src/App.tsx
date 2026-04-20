import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, convertPersianDigits } from './lib/utils';
import { translations } from './lib/translations';
import { RoznamchaEntry, KataTransaction, KataSummary, StockEntry, Stats, Language, Customer } from './types';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Roznamcha from './pages/Roznamcha';
import Kata from './pages/Kata';
import Stock from './pages/Stock';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Backup from './pages/Backup';
import Login from './pages/Login';
import DeveloperDashboard from './pages/DeveloperDashboard';
import LicenseGuard from './components/LicenseGuard';
import CustomerSelect from './components/CustomerSelect';
import NumericInput from './components/NumericInput';
import SmartInput from './components/SmartInput';
import { User as UserType } from './types';

export default function App() {
  return (
    <LicenseGuard>
      <AppContent />
    </LicenseGuard>
  );
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [shopInfo, setShopInfo] = useState({
    name: 'Kabul Electronics',
    address: 'Jade-e-Maiwand, Kabul, Afghanistan'
  });
  const [adminSettings, setAdminSettings] = useState({
    username: 'admin',
    password: 'admin123'
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalIncome: 0, totalExpense: 0, totalStockIn: 0, totalStockOut: 0, balance: 0 });
  const [roznamcha, setRoznamcha] = useState<RoznamchaEntry[]>([]);
  const [kataTransactions, setKataTransactions] = useState<KataTransaction[]>([]);
  const [kataSummaries, setKataSummaries] = useState<KataSummary[]>([]);
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});
  const [customerModalError, setCustomerModalError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [billFilter, setBillFilter] = useState('');

  const t = translations[language];
  const isRTL = language === 'ps' || language === 'dr';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    if (isAuthenticated) {
      fetchData();
    }
  }, [language, isRTL, isAuthenticated]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogin = (user: UserType) => {
    setIsAuthenticated(true);
    setUser(user);
    if (user.role === 'developer') {
      setActiveTab('developer');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setActiveTab('dashboard');
  };

  const fetchData = async () => {
    try {
      console.log('Fetching data...');
      const timestamp = Date.now();
      if (window.electronAPI) {
        const [statsData, rozData, kataTransData, kataSumData, stockData, customersData, shopInfoData] = await Promise.all([
          window.electronAPI.getStats(),
          window.electronAPI.getRoznamcha(),
          window.electronAPI.getKataTransactions(),
          window.electronAPI.getKataSummaries(),
          window.electronAPI.getStock(),
          window.electronAPI.getCustomers(),
          window.electronAPI.getSettings()
        ]);
        setStats(statsData);
        setRoznamcha(rozData);
        setKataTransactions(kataTransData);
        setKataSummaries(kataSumData);
        setStock(stockData);
        setCustomers(customersData);
        
        const shopInfo = shopInfoData.find((s: any) => s.key === 'shop_info');
        if (shopInfo) setShopInfo(JSON.parse(shopInfo.value));
      } else {
        const responses = await Promise.all([
          fetch(`/api/stats?t=${timestamp}`),
          fetch(`/api/roznamcha?t=${timestamp}`),
          fetch(`/api/kata/transactions?t=${timestamp}`),
          fetch(`/api/kata/summaries?t=${timestamp}`),
          fetch(`/api/stock?t=${timestamp}`),
          fetch(`/api/customers?t=${timestamp}`),
          fetch(`/api/settings/shop_info?t=${timestamp}`)
        ]);
        
        const results = await Promise.all(responses.map(async (res) => {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return res.json();
          }
          return null;
        }));

        const [statsData, rozData, kataTransData, kataSumData, stockData, customersData, shopInfoData] = results;

        setStats(statsData || {});
        setRoznamcha(Array.isArray(rozData) ? rozData : []);
        setKataTransactions(Array.isArray(kataTransData) ? kataTransData : []);
        setKataSummaries(Array.isArray(kataSumData) ? kataSumData : []);
        setStock(Array.isArray(stockData) ? stockData : []);
        setCustomers(Array.isArray(customersData) ? customersData : []);
        if (shopInfoData) setShopInfo(shopInfoData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    const saveSettings = async () => {
      if (!window.electronAPI && isAuthenticated) {
        try {
          await fetch('/api/settings/shop_info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shopInfo)
          });
        } catch (e) {
          console.error('Failed to save settings');
        }
      }
    };
    saveSettings();
  }, [shopInfo, isAuthenticated]);

  const handleUpdateAdminSettings = async (newSettings: typeof adminSettings) => {
    setAdminSettings(newSettings);
    if (!window.electronAPI && isAuthenticated && user?.role === 'admin') {
      try {
        await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newSettings,
            role: 'admin',
            language: language
          })
        });
      } catch (e) {
        console.error('Failed to update admin credentials');
      }
    }
  };

  const handleAddEntry = async (data: any) => {
    const entryData = { ...data, date: data.date || (editingEntry ? editingEntry.date : new Date().toISOString()) };
    
    setIsSubmitting(true);
    try {
      if (window.electronAPI) {
        if (editingEntry) {
          if (activeTab === 'roznamcha') await window.electronAPI.updateRoznamcha(editingEntry.id, entryData);
          else if (activeTab === 'stock') await window.electronAPI.updateStock(editingEntry.id, entryData);
        } else {
          if (activeTab === 'roznamcha') await window.electronAPI.createRoznamcha(entryData);
          else if (activeTab === 'kata') await window.electronAPI.createKataTransaction(entryData);
          else if (activeTab === 'stock') await window.electronAPI.createStock(entryData);
        }
      } else {
        let endpoint = '';
        if (activeTab === 'roznamcha') endpoint = '/api/roznamcha';
        else if (activeTab === 'kata') endpoint = '/api/kata/transactions';
        else if (activeTab === 'stock') endpoint = '/api/stock';

        if (editingEntry) {
          await fetch(`${endpoint}/${editingEntry.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData)
          });
        } else {
          await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData)
          });
        }
      }
      setIsModalOpen(false);
      setEditingEntry(null);
      setModalErrors({});
      await fetchData();
      setNotification({ message: t.success_save || 'Saved successfully', type: 'success' });
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    setEntryToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (entryToDelete === null) return;

    try {
      if (window.electronAPI) {
        if (activeTab === 'roznamcha') await window.electronAPI.deleteRoznamcha(entryToDelete);
        else if (activeTab === 'kata') await window.electronAPI.deleteKataTransaction(entryToDelete);
        else if (activeTab === 'stock') await window.electronAPI.deleteStock(entryToDelete);
        else if (activeTab === 'customers') await window.electronAPI.deleteCustomer(entryToDelete);
      } else {
        let endpoint = '';
        if (activeTab === 'roznamcha') endpoint = `/api/roznamcha/${entryToDelete}`;
        else if (activeTab === 'kata') endpoint = `/api/kata/transactions/${entryToDelete}`;
        else if (activeTab === 'stock') endpoint = `/api/stock/${entryToDelete}`;
        else if (activeTab === 'customers') endpoint = `/api/customers/${entryToDelete}`;

        const res = await fetch(endpoint, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to delete');
        }
      }
      setIsDeleteModalOpen(false);
      setEntryToDelete(null);
      await fetchData();
      setNotification({ 
        message: activeTab === 'customers' ? (t.success_delete || 'Customer deleted successfully') : (t.success_delete_entry || 'Deleted successfully'), 
        type: 'success' 
      });
    } catch (error: any) {
      console.error('Error deleting:', error);
      setNotification({ message: error.message || 'Failed to delete', type: 'error' });
    }
  };

  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const validateModal = (formData: FormData) => {
    const newErrors: Record<string, string> = {};
    
    if (activeTab === 'roznamcha') {
      const amount = formData.get('amount') as string;
      const description = formData.get('description') as string;
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) newErrors.amount = t.error_invalid_amount || 'Invalid amount';
      if (!description || description.trim().length < 3) newErrors.description = t.error_invalid_description || 'Invalid description';
    } else if (activeTab === 'kata') {
      const amount = formData.get('amount') as string;
      const description = formData.get('description') as string;
      const type = formData.get('type') as string;
      if (!selectedCustomerId) newErrors.customer_id = t.customer_required || 'Customer is required';
      if (!type) newErrors.type = t.type_required || 'Type is required';
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) newErrors.amount = t.error_invalid_amount || 'Invalid amount';
      if (!description || description.trim().length < 3) newErrors.description = t.error_invalid_description || 'Invalid description';
    } else if (activeTab === 'stock') {
      const item = formData.get('item_name') as string;
      const type = formData.get('type') as string;
      const qty = formData.get('quantity') as string;
      const description = formData.get('description') as string;
      if (!item || item.trim().length < 2) newErrors.item_name = t.error_invalid_item_name || 'Invalid item name';
      if (!type) newErrors.type = 'Type is required';
      if (!qty || isNaN(Number(qty)) || Number(qty) <= 0) newErrors.quantity = t.error_invalid_quantity || 'Invalid quantity';
      if (!description || description.trim().length < 3) newErrors.description = t.error_invalid_description || 'Invalid description';
    }

    setModalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(e.currentTarget);
    if (!validateModal(formData)) return;
    
    const data = Object.fromEntries(formData.entries());
    
    if (activeTab === 'kata') {
      const customer = customers.find(c => c.id === selectedCustomerId);
      data.customer_id = selectedCustomerId as any;
      data.customer_name = customer?.name || '';
    }
    
    await handleAddEntry(data);
    setSelectedCustomerId(undefined);
  };

  const handleDeleteCustomer = (id: number) => {
    setEntryToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleCustomerSubmit = async (data: any) => {
    setIsSubmitting(true);
    setCustomerModalError(null);
    try {
      // Local check for unique name
      const nameExists = customers.some(c => 
        c.name.toLowerCase() === data.name.toLowerCase() && 
        (!editingCustomer || c.id !== editingCustomer.id)
      );
      
      if (nameExists) {
        setCustomerModalError(t.error_customer_exists || 'Customer name already exists');
        setIsSubmitting(false);
        return;
      }

      if (window.electronAPI) {
        if (editingCustomer) {
          await window.electronAPI.updateCustomer(editingCustomer.id, data);
        } else {
          await window.electronAPI.createCustomer(data);
        }
      } else {
        const method = editingCustomer ? 'PUT' : 'POST';
        const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!res.ok) {
          const errData = await res.json();
          if (res.status === 400 && errData.error === 'Customer name already exists') {
            setCustomerModalError(t.error_customer_exists || 'Customer name already exists');
            return;
          }
          throw new Error(errData.error || 'Failed to save customer');
        }
      }
      setIsCustomerModalOpen(false);
      setEditingCustomer(null);
      setCustomerModalError(null);
      setSearchQuery(''); // Clear search to show new customer
      await fetchData();
      setNotification({ message: t.success_save || 'Saved successfully', type: 'success' });
    } catch (error: any) {
      console.error('Error saving customer:', error);
      setCustomerModalError(error.message || 'An error occurred while saving');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async (data: any) => {
    try {
      setRoznamcha(data.roznamcha || []);
      setCustomers(data.customers || []);
      setKataTransactions(data.kataTransactions || []);
      setStock(data.stock || []);
      if (data.shopInfo) setShopInfo(data.shopInfo);
      if (data.adminSettings) setAdminSettings(data.adminSettings);
      await fetchData();
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard stats={stats} roznamcha={roznamcha} t={t} />;
      case 'roznamcha':
        return (
          <Roznamcha 
            data={roznamcha} 
            customers={customers}
            t={t} 
            query={searchQuery} 
            dateFilter={dateFilter}
            billFilter={billFilter}
            isAdmin={user?.role === 'admin' || user?.role === 'developer'}
            onAdd={handleAddEntry} 
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
          />
        );
      case 'kata':
        return (
          <Kata 
            transactions={kataTransactions}
            summaries={kataSummaries}
            customers={customers}
            t={t} 
            query={searchQuery} 
            dateFilter={dateFilter}
            billFilter={billFilter}
            onAdd={handleAddEntry} 
            onAddClick={() => {
              setEditingEntry(null);
              setIsModalOpen(true);
            }}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
          />
        );
      case 'customers':
        return (
          <Customers 
            t={t} 
            query={searchQuery} 
            customers={customers}
            onAdd={() => {
              setEditingCustomer(null);
              setCustomerModalError(null);
              setIsCustomerModalOpen(true);
            }}
            onEdit={(c) => {
              setEditingCustomer(c);
              setCustomerModalError(null);
              setIsCustomerModalOpen(true);
            }}
            onDelete={handleDeleteCustomer}
          />
        );
      case 'backup':
        return (
          <Backup 
            roznamcha={roznamcha}
            customers={customers}
            kataTransactions={kataTransactions}
            stock={stock}
            shopInfo={shopInfo}
            adminSettings={adminSettings}
            t={t}
            onRestore={handleRestore}
            onNotify={(msg, type) => setNotification({ message: msg, type })}
          />
        );
      case 'developer':
        return <DeveloperDashboard t={t} onNotify={(msg, type) => setNotification({ message: msg, type: type })} />;
      case 'stock':
        return (
          <Stock 
            data={stock} 
            t={t} 
            query={searchQuery} 
            dateFilter={dateFilter}
            billFilter={billFilter}
            onAdd={handleAddEntry} 
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
          />
        );
      case 'settings':
        return (
          <Settings 
            language={language} 
            setLanguage={setLanguage} 
            theme={theme} 
            toggleTheme={toggleTheme} 
            t={t}
            shopInfo={shopInfo}
            setShopInfo={setShopInfo}
            adminSettings={adminSettings}
            setAdminSettings={handleUpdateAdminSettings}
            fetchData={fetchData}
          />
        );
      default:
        return <Dashboard stats={stats} roznamcha={roznamcha} t={t} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} t={t} language={language} />;
  }

  return (
    <div className="relative min-h-screen">
      <MainLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        language={language}
        setLanguage={setLanguage}
        t={t}
        theme={theme}
        toggleTheme={toggleTheme}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        billFilter={billFilter}
        setBillFilter={setBillFilter}
        onAddEntry={activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'kata' && activeTab !== 'backup' ? () => {
          if (activeTab === 'customers') {
            setEditingCustomer(null);
            setIsCustomerModalOpen(true);
          } else {
            setEditingEntry(null);
            setIsModalOpen(true);
          }
        } : undefined}
        onLogout={handleLogout}
        shopName={shopInfo.name}
        shopAddress={shopInfo.address}
        userName={user?.username || 'Admin'}
        userRole={user?.role || 'admin'}
      >
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50, x: '-50%' }}
              animate={{ opacity: 1, y: 20, x: '-50%' }}
              exit={{ opacity: 0, y: -50, x: '-50%' }}
              className={cn(
                "fixed top-0 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold",
                notification.type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
              )}
            >
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              {notification.message}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </MainLayout>

      {/* Customer Modal */}
      <AnimatePresence>
        {isCustomerModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomerModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#1a1a1a] border border-[#262626] rounded-3xl p-8 w-full max-w-2xl relative z-[101] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{editingCustomer ? t.edit_customer : t.add_customer}</h2>
                <button onClick={() => setIsCustomerModalOpen(false)} className="p-2 hover:bg-[#262626] rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {customerModalError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
                  <AlertCircle size={20} />
                  <span className="text-sm font-bold">{customerModalError}</span>
                </div>
              )}

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleCustomerSubmit({
                    name: formData.get('name'),
                    address: formData.get('address'),
                    contact: formData.get('contact')
                  });
                }} 
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.customer_name} *</label>
                    <input
                      name="name"
                      type="text"
                      defaultValue={editingCustomer?.name || ''}
                      className="w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none transition-colors"
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <SmartInput
                      name="contact"
                      type="text"
                      defaultValue={editingCustomer?.contact || ''}
                      label={t.customer_contact}
                      placeholder="Enter phone number"
                      className="bg-[#0d0d0d] border-[#262626]"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.customer_address}</label>
                    <textarea
                      name="address"
                      defaultValue={editingCustomer?.address || ''}
                      className="w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none h-24 resize-none transition-colors"
                      placeholder="Enter address"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsCustomerModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl border border-[#262626] hover:bg-[#262626] transition-colors font-bold"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2",
                      isSubmitting && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Entry Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setEditingEntry(null);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#1a1a1a] border border-[#262626] rounded-3xl p-8 w-full max-w-4xl relative z-[101] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold tracking-tight">{editingEntry ? t.edit_entry : t.add_entry}</h2>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingEntry(null);
                  }} 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </motion.button>
              </div>
              
              <form onSubmit={handleModalSubmit} className="space-y-6">
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.date}</label>
                    <input 
                      name="date" 
                      type="date" 
                      required
                      defaultValue={editingEntry?.date ? format(new Date(editingEntry.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                      className="w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none transition-colors"
                    />
                  </motion.div>

                  {activeTab === 'roznamcha' && (
                    <>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.type}</label>
                        <select 
                          name="type" 
                          defaultValue={editingEntry?.type || 'income'}
                          className="w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none transition-colors"
                        >
                          <option value="income">{t.income}</option>
                          <option value="expense">{t.expense}</option>
                        </select>
                      </motion.div>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <NumericInput 
                          name="amount" 
                          required 
                          defaultValue={editingEntry?.amount || ''}
                          label={t.amount}
                          error={modalErrors.amount}
                          className="bg-[#0d0d0d] border-[#262626]"
                        />
                      </motion.div>
                    </>
                  )}

                  {activeTab === 'kata' && (
                    <>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <CustomerSelect 
                          customers={customers}
                          selectedId={selectedCustomerId || editingEntry?.customer_id}
                          onSelect={(c) => setSelectedCustomerId(c.id)}
                          onQuickAdd={() => {
                            setIsModalOpen(false);
                            setActiveTab('customers');
                          }}
                          t={t}
                          error={modalErrors.customer_id}
                        />
                      </motion.div>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.type}</label>
                        <select 
                          name="type" 
                          required 
                          defaultValue={editingEntry?.type || 'purchase'}
                          className={cn(
                            "w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none transition-colors",
                            modalErrors.type && "border-red-500 focus:border-red-500"
                          )}
                        >
                          <option value="purchase">{t.purchase || 'Purchase'}</option>
                          <option value="payment">{t.payment || 'Payment'}</option>
                        </select>
                        {modalErrors.type && <p className="text-[10px] text-red-500 font-bold mt-1">{modalErrors.type}</p>}
                      </motion.div>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <NumericInput 
                          name="amount" 
                          required 
                          defaultValue={editingEntry?.amount || ''}
                          label={t.amount}
                          error={modalErrors.amount}
                          className="bg-[#0d0d0d] border-[#262626]"
                        />
                      </motion.div>
                    </>
                  )}

                  {activeTab === 'stock' && (
                    <>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.item_name}</label>
                        <input 
                          name="item_name" 
                          type="text" 
                          required 
                          defaultValue={editingEntry?.item_name || ''}
                          className={cn(
                            "w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none transition-colors",
                            modalErrors.item_name && "border-red-500 focus:border-red-500"
                          )} 
                        />
                        {modalErrors.item_name && <p className="text-[10px] text-red-500 font-bold mt-1">{modalErrors.item_name}</p>}
                      </motion.div>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.type}</label>
                        <select 
                          name="type" 
                          defaultValue={editingEntry?.type || 'in'}
                          className="w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none transition-colors"
                        >
                          <option value="in">{t.stock_in}</option>
                          <option value="out">{t.stock_out}</option>
                        </select>
                      </motion.div>
                      <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                        <NumericInput 
                          name="quantity" 
                          required 
                          defaultValue={editingEntry?.quantity || ''}
                          label={t.quantity}
                          error={modalErrors.quantity}
                        />
                      </motion.div>
                    </>
                  )}

                  <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                    <SmartInput 
                      name="bill_number" 
                      defaultValue={editingEntry?.bill_number || ''}
                      label={t.bill_number}
                      className="bg-[#0d0d0d] border-[#262626]"
                    />
                  </motion.div>
                  <motion.div variants={{ hidden: { x: -10, opacity: 0 }, visible: { x: 0, opacity: 1 } }} className="lg:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t.description}</label>
                    <textarea 
                      name="description" 
                      defaultValue={editingEntry?.description || ''}
                      className={cn(
                        "w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3 focus:border-blue-500 outline-none h-12 transition-colors resize-none",
                        modalErrors.description && "border-red-500 focus:border-red-500"
                      )} 
                    />
                    {modalErrors.description && <p className="text-[10px] text-red-500 font-bold mt-1">{modalErrors.description}</p>}
                  </motion.div>

                  <motion.div 
                    variants={{ hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                    className="lg:col-span-3 flex gap-3 pt-4"
                  >
                    <motion.button 
                      type="button" 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingEntry(null);
                      }} 
                      className="flex-1 px-6 py-3 rounded-xl border border-[#262626] hover:bg-[#262626] transition-colors font-bold"
                    >
                      {t.cancel}
                    </motion.button>
                    <motion.button 
                      type="submit" 
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2",
                        isSubmitting && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t.saving || 'Saving...'}
                        </>
                      ) : (
                        t.save
                      )}
                    </motion.button>
                  </motion.div>
                </motion.div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#1a1a1a] border border-[#262626] rounded-3xl p-8 w-full max-w-sm relative z-[111] shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <X size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">{t.confirm_delete_title || t.delete}</h3>
              <p className="text-gray-400 mb-8">
                {activeTab === 'customers' 
                  ? (t.confirm_delete_customer_desc || 'Are you sure you want to delete this customer? All their kata history will also be removed.') 
                  : (t.confirm_delete || 'Are you sure you want to delete this entry?')}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-[#262626] hover:bg-[#262626] transition-colors font-bold"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 transition-colors font-bold"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
