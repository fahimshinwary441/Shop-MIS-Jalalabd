import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  Plus, 
  User, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  Calendar, 
  Info, 
  Hash, 
  DollarSign,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  Search,
  ChevronRight,
  Printer,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { KataTransaction, KataSummary, Customer } from '../types';

interface KataProps {
  transactions: KataTransaction[];
  summaries: KataSummary[];
  customers: Customer[];
  t: any;
  query: string;
  dateFilter: { start: string; end: string };
  billFilter: string;
  onAdd: (data: any) => Promise<void>;
  onAddClick: () => void;
  onEdit: (entry: any) => void;
  onDelete: (id: number) => Promise<void>;
}

export default function Kata({ transactions, summaries, customers, t, query, dateFilter, billFilter, onAdd, onAddClick, onEdit, onDelete }: KataProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<KataSummary | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [summaryPage, setSummaryPage] = useState(1);
  const itemsPerPage = 10; // Reduced from 30 for better visibility
  const summariesPerPage = 6;

  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => 
      s.customer_name?.toLowerCase().includes(query.toLowerCase())
    );
  }, [summaries, query]);

  const paginatedSummaries = useMemo(() => {
    const start = (summaryPage - 1) * summariesPerPage;
    return filteredSummaries.slice(start, start + summariesPerPage);
  }, [filteredSummaries, summaryPage]);

  const totalSummaryPages = Math.ceil(filteredSummaries.length / summariesPerPage);

  const filteredTransactions = useMemo(() => {
    const data = selectedCustomer 
      ? transactions.filter(t => t.customer_id === selectedCustomer.customer_id)
      : transactions;

    return data.filter(e => {
      const customerName = customers.find(c => c.id === e.customer_id)?.name || '';
      const matchesQuery = customerName.toLowerCase().includes(query.toLowerCase()) || 
                          e.bill_number?.includes(query) ||
                          e.description?.toLowerCase().includes(query.toLowerCase());
      
      const entryDate = format(new Date(e.date), 'yyyy-MM-dd');
      const matchesDate = (!dateFilter.start || entryDate >= dateFilter.start) &&
                          (!dateFilter.end || entryDate <= dateFilter.end);
      
      const matchesBill = !billFilter || e.bill_number?.toLowerCase().includes(billFilter.toLowerCase());

      return matchesQuery && matchesDate && matchesBill;
    });
  }, [transactions, selectedCustomer, query, dateFilter, billFilter, customers]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const title = selectedCustomer ? `${selectedCustomer.customer_name} - Kata Report` : 'Kata All Transactions Report';
    const dateRange = dateFilter.start || dateFilter.end ? ` (${dateFilter.start || 'Start'} to ${dateFilter.end || 'End'})` : '';

    let tableRows = filteredTransactions.map(tx => `
      <tr>
        <td>${format(new Date(tx.date), 'MMM dd, yyyy')}</td>
        ${!selectedCustomer ? `<td>${customers.find(c => c.id === tx.customer_id)?.name || 'Unknown'}</td>` : ''}
        <td>${tx.type === 'purchase' ? t.purchase : t.payment}</td>
        <td>${tx.bill_number || '-'}</td>
        <td style="color: ${tx.type === 'purchase' ? '#ef4444' : '#22c55e'}; font-weight: bold;">
          ${tx.type === 'purchase' ? '+' : '-'}${tx.amount.toLocaleString()}
        </td>
        <td>${tx.description || '-'}</td>
      </tr>
    `).join('');

    const summaryHtml = selectedCustomer ? `
      <div style="margin-bottom: 30px; display: grid; grid-template-cols: repeat(3, 1fr); gap: 20px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <div><strong>Total Purchase:</strong> ${selectedCustomer.total_purchase.toLocaleString()}</div>
        <div><strong>Total Paid:</strong> ${selectedCustomer.total_paid.toLocaleString()}</div>
        <div><strong>Remaining Balance:</strong> ${selectedCustomer.remaining_balance.toLocaleString()}</div>
      </div>
    ` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { text-align: center; margin-bottom: 10px; }
            h2 { text-align: center; color: #666; font-size: 16px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #eee; padding: 12px; text-align: left; font-size: 12px; }
            th { background-color: #f9f9f9; font-weight: bold; text-transform: uppercase; }
            .footer { margin-top: 50px; text-align: right; font-size: 12px; color: #999; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <h2>Generated on ${format(new Date(), 'PPP')}${dateRange}</h2>
          ${summaryHtml}
          <table>
            <thead>
              <tr>
                <th>Date</th>
                ${!selectedCustomer ? '<th>Customer</th>' : ''}
                <th>Type</th>
                <th>Bill #</th>
                <th>Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="footer">
            Printed by Shop MIS System
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-500">
              <Wallet size={32} />
            </div>
            {t.kata}
          </h2>
          <p className="text-muted-foreground font-medium mt-1">Automatic balance tracking & Roznamcha sync</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20"
          >
            <Plus size={20} />
            {t.add_entry}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2.5 rounded-xl font-bold transition-all border border-border"
          >
            <Printer size={18} />
            {t.print || 'Print'}
          </button>
          {selectedCustomer && (
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setCurrentPage(1);
              }}
              className="flex items-center gap-2 text-sm font-bold text-brand-500 hover:underline"
            >
              <ChevronRight className="rotate-180" size={16} />
              View All Customers
            </button>
          )}
        </div>
      </div>

      {/* Summaries Grid */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {!selectedCustomer ? (
            paginatedSummaries.map((summary, index) => (
              <SummaryCard 
                key={summary.customer_id} 
                summary={summary} 
                t={t} 
                onClick={() => setSelectedCustomer(summary)}
                index={index}
              />
            ))
          ) : (
            <>
              <StatCard 
                title={t.total_purchase} 
                value={selectedCustomer.total_purchase} 
                icon={ArrowUpRight} 
                color="red" 
              />
              <StatCard 
                title={t.total_paid} 
                value={selectedCustomer.total_paid} 
                icon={ArrowDownLeft} 
                color="green" 
              />
              <StatCard 
                title={t.remaining} 
                value={selectedCustomer.remaining_balance} 
                icon={Wallet} 
                color="brand" 
                isBalance
              />
            </>
          )}
        </div>

        {/* Summary Pagination */}
        {!selectedCustomer && totalSummaryPages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setSummaryPage(prev => Math.max(1, prev - 1))}
              disabled={summaryPage === 1}
              className="p-2 rounded-xl border border-border bg-card disabled:opacity-50 hover:bg-muted transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalSummaryPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setSummaryPage(i + 1)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-sm font-bold transition-all",
                    summaryPage === i + 1 
                      ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" 
                      : "bg-card border border-border hover:bg-muted text-muted-foreground"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSummaryPage(prev => Math.min(totalSummaryPages, prev + 1))}
              disabled={summaryPage === totalSummaryPages}
              className="p-2 rounded-xl border border-border bg-card disabled:opacity-50 hover:bg-muted transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Transactions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="text-brand-500" size={20} />
            {selectedCustomer ? `${selectedCustomer.customer_name}'s ${t.transaction_history}` : t.recent_entries}
          </h3>
        </div>

        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-start">{t.date}</th>
                  {!selectedCustomer && <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-start">{t.customer_name}</th>}
                  <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-start">{t.type}</th>
                  <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-start">{t.bill_number}</th>
                  <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-start">{t.amount}</th>
                  <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-start">{t.description}</th>
                  <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest text-end">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedTransactions.map((tx, index) => (
                  <motion.tr 
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="p-5 text-sm font-bold text-muted-foreground">
                      {format(new Date(tx.date), 'MMM dd, yyyy')}
                    </td>
                    {!selectedCustomer && (
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
                            <User size={14} />
                          </div>
                          <span className="text-sm font-bold">{customers.find(c => c.id === tx.customer_id)?.name || 'Unknown'}</span>
                        </div>
                      </td>
                    )}
                    <td className="p-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        tx.type === 'purchase' 
                          ? "bg-red-500/10 text-red-500 border-red-500/20" 
                          : "bg-green-500/10 text-green-500 border-green-500/20"
                      )}>
                        {tx.type === 'purchase' ? t.purchase : t.payment}
                      </span>
                    </td>
                    <td className="p-5 text-sm font-mono text-muted-foreground">
                      {tx.bill_number || '-'}
                    </td>
                    <td className={cn(
                      "p-5 font-black text-sm",
                      tx.type === 'purchase' ? "text-red-500" : "text-green-500"
                    )}>
                      {tx.type === 'purchase' ? '+' : '-'}{tx.amount.toLocaleString()}
                    </td>
                    <td className="p-5 text-sm text-foreground/70 font-medium">
                      {tx.description}
                    </td>
                    <td className="p-5 text-end">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onDelete(tx.id)}
                          className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTransactions.length === 0 && (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
                <Search size={40} />
              </div>
              <h4 className="text-xl font-bold mb-2">No transactions found</h4>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/30">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-border bg-background disabled:opacity-50 hover:bg-muted transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                        currentPage === i + 1 
                          ? "bg-brand-500 text-white shadow-md shadow-brand-500/20" 
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-border bg-background disabled:opacity-50 hover:bg-muted transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const SummaryCard: React.FC<{ summary: KataSummary, t: any, onClick: () => void, index: number }> = ({ summary, t, onClick, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className="bg-card border border-border rounded-3xl p-6 shadow-soft hover:border-brand-500/30 transition-all group cursor-pointer relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 transition-transform group-hover:scale-110">
            <User size={24} />
          </div>
          <div>
            <h4 className="font-black tracking-tight">{summary.customer_name}</h4>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Customer ID: #{summary.customer_id}</p>
          </div>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
          summary.remaining_balance <= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
        )}>
          {summary.remaining_balance <= 0 ? t.paid : t.unpaid || 'Unpaid'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t.total_purchase}</p>
          <p className="text-lg font-black">{summary.total_purchase.toLocaleString()}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t.remaining}</p>
          <p className={cn("text-lg font-black", summary.remaining_balance > 0 ? "text-red-500" : "text-green-500")}>
            {summary.remaining_balance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
        <Wallet size={80} />
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, icon: Icon, color, isBalance }: { title: string, value: number, icon: any, color: string, isBalance?: boolean }) {
  const colorClasses = {
    green: "bg-green-500/10 text-green-500",
    red: "bg-red-500/10 text-red-500",
    brand: "bg-brand-500/10 text-brand-500"
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-8 shadow-soft relative overflow-hidden group">
      <div className="flex items-center justify-between mb-6">
        <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-500", colorClasses[color as keyof typeof colorClasses])}>
          <Icon size={28} />
        </div>
      </div>
      <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">{title}</p>
      <h4 className={cn(
        "text-4xl font-black tracking-tighter",
        isBalance && (value > 0 ? "text-red-500" : "text-green-500")
      )}>
        {value.toLocaleString()}
      </h4>
      
      <div className="absolute -bottom-4 -right-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-500">
        <Icon size={120} />
      </div>
    </div>
  );
}
