import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, TrendingUp, TrendingDown, Receipt, Calendar, Info, Hash, DollarSign, Pencil, Trash2, MoreVertical, Printer, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, convertPersianDigits } from '../lib/utils';
import { RoznamchaEntry, Customer } from '../types';
import CustomerSelect from '../components/CustomerSelect';
import NumericInput from '../components/NumericInput';
import SmartInput from '../components/SmartInput';

interface RoznamchaProps {
  data: RoznamchaEntry[];
  customers: Customer[];
  t: any;
  query: string;
  dateFilter: { start: string; end: string };
  billFilter: string;
  isAdmin?: boolean;
  onAdd: (data: any) => Promise<void>;
  onEdit: (entry: RoznamchaEntry) => void;
  onDelete: (id: number) => Promise<void>;
}

export default function Roznamcha({ data, customers, t, query, dateFilter, billFilter, isAdmin, onAdd, onEdit, onDelete }: RoznamchaProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = useMemo(() => {
    return data.filter(e => {
      const matchesQuery = e.description.toLowerCase().includes(query.toLowerCase()) || 
                          e.bill_number?.includes(query);
      const matchesFilter = activeFilter === 'all' || e.type === activeFilter;
      
      const entryDate = format(new Date(e.date), 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // If no date filter is set, show only today's data
      const matchesDate = (dateFilter.start || dateFilter.end) 
        ? ((!dateFilter.start || entryDate >= dateFilter.start) && (!dateFilter.end || entryDate <= dateFilter.end))
        : (entryDate === today);
      
      const matchesBill = !billFilter || e.bill_number?.toLowerCase().includes(billFilter.toLowerCase());

      return matchesQuery && matchesFilter && matchesDate && matchesBill;
    });
  }, [data, query, activeFilter, dateFilter, billFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totals = useMemo(() => {
    return filtered.reduce((acc, curr) => {
      if (curr.type === 'income') acc.income += curr.amount;
      else acc.expense += curr.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filtered]);

  const validate = (formData: FormData) => {
    const newErrors: Record<string, string> = {};
    const amount = formData.get('amount') as string;
    const description = formData.get('description') as string;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = t.error_invalid_amount || 'Please enter a valid amount greater than 0';
    }
    if (!description || description.trim().length < 3) {
      newErrors.description = t.error_invalid_description || 'Description must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(e.currentTarget);
    
    if (!validate(formData)) return;

    setIsSubmitting(true);
    try {
      const entryData = Object.fromEntries(formData.entries());
      if (selectedCustomerId) {
        entryData.customer_id = selectedCustomerId as any;
      }
      await onAdd(entryData);
      setIsFormOpen(false);
      setErrors({});
      setSelectedCustomerId(undefined);
      (e.target as HTMLFormElement).reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isRTL = document.documentElement.dir === 'rtl';
    
    const html = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>${t.roznamcha} ${t.report}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #000; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          .summary { display: grid; grid-template-cols: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .summary-card { border: 1px solid #eee; padding: 15px; border-radius: 8px; }
          .summary-card h3 { margin: 0; font-size: 12px; color: #666; text-transform: uppercase; }
          .summary-card p { margin: 5px 0 0; font-size: 18px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #eee; padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; font-size: 13px; }
          th { background: #f9f9f9; font-weight: bold; }
          .income { color: #10b981; }
          .expense { color: #ef4444; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${t.roznamcha} ${t.report}</h1>
          <p>${dateFilter.start || t.all} ${t.to} ${dateFilter.end || format(new Date(), 'yyyy-MM-dd')}</p>
        </div>
        
        <div class="summary">
          <div class="summary-card">
            <h3>${t.total_income}</h3>
            <p class="income">${totals.income.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h3>${t.total_expense}</h3>
            <p class="expense">${totals.expense.toLocaleString()}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${t.date}</th>
              <th>${t.type}</th>
              <th>${t.amount}</th>
              <th>${t.bill_number}</th>
              <th>${t.description}</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(e => `
              <tr>
                <td>${format(new Date(e.date), 'MMM dd, yyyy')}</td>
                <td class="${e.type === 'income' ? 'income' : 'expense'}">${e.type === 'income' ? t.income : t.expense}</td>
                <td class="${e.type === 'income' ? 'income' : 'expense'}">${e.type === 'income' ? '+' : '-'}${e.amount.toLocaleString()}</td>
                <td>${e.bill_number || '-'}</td>
                <td>${e.description}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Generated on ${format(new Date(), 'PPP p')}</p>
        </div>
        
        <script>
          window.onload = () => {
            window.print();
            window.onafterprint = () => window.close();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center bg-muted border border-border rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeFilter === 'all' ? "bg-background text-brand-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('income')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              activeFilter === 'income' ? "bg-background text-green-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp size={16} />
            {t.income}
          </button>
          <button
            onClick={() => setActiveFilter('expense')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              activeFilter === 'expense' ? "bg-background text-red-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingDown size={16} />
            {t.expense}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-6 py-2.5 rounded-xl font-bold transition-all border border-border"
            >
              <Printer size={20} />
              {t.report}
            </button>
          )}
          
          <button
            onClick={() => {
              setIsFormOpen(!isFormOpen);
              setErrors({});
            }}
            className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
          >
            <Plus size={20} className={cn("transition-transform", isFormOpen && "rotate-45")} />
            {isFormOpen ? t.cancel : t.add_entry}
          </button>
        </div>
      </div>

      {/* Quick Add Form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-visible"
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-soft mb-6">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={12} />
                    {t.date}
                  </label>
                  <input 
                    name="date" 
                    type="date" 
                    required
                    defaultValue={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp size={12} />
                    {t.type}
                  </label>
                  <select 
                    name="type" 
                    required
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors text-sm"
                  >
                    <option value="income">{t.income}</option>
                    <option value="expense">{t.expense}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <CustomerSelect 
                    customers={customers}
                    selectedId={selectedCustomerId}
                    onSelect={(c) => setSelectedCustomerId(c.id)}
                    onQuickAdd={() => {
                      // Handle quick add if needed, or just let them go to customers page
                    }}
                    t={t}
                    error={errors.customer_id}
                  />
                </div>
                <NumericInput 
                  name="amount" 
                  required 
                  placeholder="0.00"
                  label={t.amount}
                  icon={<DollarSign size={12} />}
                  error={errors.amount}
                />
                <SmartInput 
                  name="bill_number" 
                  label={t.bill_number}
                  icon={<Hash size={12} />}
                  placeholder="Optional"
                />
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Info size={12} />
                    {t.description}
                  </label>
                  <input 
                    name="description" 
                    type="text" 
                    required
                    placeholder="Enter details..."
                    className={cn(
                      "w-full bg-muted border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors text-sm",
                      errors.description && "border-red-500 focus:border-red-500"
                    )} 
                  />
                  {errors.description && <p className="text-[10px] text-red-500 font-bold">{errors.description}</p>}
                </div>
                <div className="lg:col-span-6 flex justify-end pt-2">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "bg-brand-500 hover:bg-brand-600 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2",
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
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-soft"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.income}</p>
              <p className="text-xl font-bold text-green-500">{totals.income.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-soft"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
              <TrendingDown size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.expense}</p>
              <p className="text-xl font-bold text-red-500">{totals.expense.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Table View */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    {t.date}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} />
                    {t.type}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} />
                    {t.amount}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <Receipt size={14} />
                    {t.bill_number}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-start">
                  <div className="flex items-center gap-2">
                    <Info size={14} />
                    {t.description}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-end">
                  {t.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.map((entry, index) => (
                <motion.tr 
                  key={entry.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  <td className="p-4 text-sm font-medium text-muted-foreground">
                    {format(new Date(entry.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                      entry.type === 'income' 
                        ? "bg-green-500/10 text-green-500 border-green-500/20" 
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                    )}>
                      {entry.type === 'income' ? t.income : t.expense}
                    </span>
                  </td>
                  <td className={cn(
                    "p-4 font-bold text-sm",
                    entry.type === 'income' ? "text-green-500" : "text-red-500"
                  )}>
                    {entry.type === 'income' ? '+' : '-'}{entry.amount.toLocaleString()}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground font-mono">
                    {entry.bill_number || '-'}
                  </td>
                  <td className="p-4 text-sm text-foreground/80 font-medium">
                    {entry.description}
                  </td>
                  <td className="p-4 text-end">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onEdit(entry)}
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                        title={t.edit}
                      >
                        <Pencil size={14} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onDelete(entry.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        title={t.delete}
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-muted/30">
            <p className="text-xs text-muted-foreground font-medium">
              Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-foreground">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="text-foreground">{filtered.length}</span> entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg border border-border text-xs font-bold disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                      currentPage === i + 1 ? "bg-brand-500 text-white" : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg border border-border text-xs font-bold disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <Receipt size={32} />
            </div>
            <p className="text-muted-foreground font-medium">{t.no_data}</p>
          </div>
        )}
      </div>
    </div>
  );
}
