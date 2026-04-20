import React, { useMemo } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  PackageSearch,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Stats, RoznamchaEntry } from '../types';

interface DashboardProps {
  stats: Stats;
  roznamcha: RoznamchaEntry[];
  t: any;
}

export default function Dashboard({ stats, roznamcha, t }: DashboardProps) {
  const chartData = useMemo(() => {
    if (!Array.isArray(roznamcha)) return [];
    
    // Group by date for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, 'yyyy-MM-dd');
    }).reverse();

    return last7Days.map(date => {
      const dayEntries = roznamcha.filter(e => format(new Date(e.date), 'yyyy-MM-dd') === date);
      const income = dayEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
      const expense = dayEntries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
      return {
        name: format(new Date(date), 'MMM dd'),
        income,
        expense
      };
    });
  }, [roznamcha]);

  const pieData = [
    { name: t.income, value: stats?.totalIncome || 0, color: '#22c55e' },
    { name: t.expense, value: stats?.totalExpense || 0, color: '#ef4444' }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard 
          title={t.total_income} 
          value={stats.totalIncome} 
          icon={TrendingUp} 
          trend="+12.5%" 
          color="green" 
          variants={item}
        />
        <StatCard 
          title={t.total_expense} 
          value={stats.totalExpense} 
          icon={TrendingDown} 
          trend="+3.2%" 
          color="red" 
          variants={item}
        />
        <StatCard 
          title={t.balance} 
          value={stats.balance} 
          icon={Activity} 
          trend={stats.balance >= 0 ? "Healthy" : "Low"} 
          color="brand" 
          variants={item}
        />
        <StatCard 
          title={t.stock_in} 
          value={stats.totalStockIn} 
          icon={PackageSearch} 
          trend="Total received" 
          color="green" 
          variants={item}
        />
        <StatCard 
          title={t.stock_out} 
          value={stats.totalStockOut} 
          icon={PackageSearch} 
          trend="Total issued" 
          color="red" 
          variants={item}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <motion.div 
          variants={item}
          className="lg:col-span-2 bg-card border border-border rounded-3xl p-8 shadow-soft relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={120} />
          </div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold tracking-tight">{t.income} vs {t.expense}</h3>
              <p className="text-sm text-muted-foreground">Weekly performance overview</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs font-bold text-muted-foreground uppercase">{t.income}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-muted-foreground uppercase">{t.expense}</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.05} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="currentColor" 
                  opacity={0.5} 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="currentColor" 
                  opacity={0.5} 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(26, 26, 26, 0.8)', 
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#22c55e" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Distribution Chart */}
        <motion.div 
          variants={item}
          className="bg-card border border-border rounded-3xl p-8 shadow-soft flex flex-col"
        >
          <h3 className="text-xl font-bold tracking-tight mb-2">Distribution</h3>
          <p className="text-sm text-muted-foreground mb-8">Cash flow allocation</p>
          <div className="flex-1 flex items-center justify-center min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(26, 26, 26, 0.8)', 
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-sm font-bold">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={item} className="bg-card border border-border rounded-3xl p-8 shadow-soft">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500">
              <Clock size={20} />
            </div>
            <h3 className="text-xl font-bold tracking-tight">{t.recent_entries}</h3>
          </div>
          <button className="text-sm font-bold text-brand-500 hover:underline">View All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.isArray(roznamcha) && roznamcha.slice(0, 6).map((entry) => (
            <div 
              key={entry.id} 
              className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-border/50 hover:border-brand-500/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                  entry.type === 'income' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {entry.type === 'income' ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                </div>
                <div>
                  <p className="font-bold text-sm line-clamp-1">{entry.description || 'No description'}</p>
                  <p className="text-xs text-muted-foreground font-medium">{format(new Date(entry.date), 'MMM dd, HH:mm')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn("font-black text-sm", entry.type === 'income' ? "text-green-500" : "text-red-500")}>
                  {entry.type === 'income' ? '+' : '-'}{entry.amount.toLocaleString()}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{entry.bill_number || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color, variants }: { title: string, value: number, icon: any, trend: string, color: string, variants: any }) {
  const colorClasses = {
    green: "bg-green-500/10 text-green-500",
    red: "bg-red-500/10 text-red-500",
    brand: "bg-brand-500/10 text-brand-500",
    orange: "bg-orange-500/10 text-orange-500"
  };

  return (
    <motion.div 
      variants={variants}
      className="bg-card border border-border rounded-3xl p-6 shadow-soft hover:border-brand-500/30 transition-all group relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-500", colorClasses[color as keyof typeof colorClasses])}>
          <Icon size={28} />
        </div>
        <div className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
          color === 'green' ? "bg-green-500/10 text-green-500" : 
          color === 'red' ? "bg-red-500/10 text-red-500" : "bg-brand-500/10 text-brand-500"
        )}>
          {trend}
        </div>
      </div>
      <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1">{title}</p>
      <h4 className="text-3xl font-black tracking-tighter">{value.toLocaleString()}</h4>
      
      {/* Decorative background element */}
      <div className="absolute -bottom-4 -right-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-500">
        <Icon size={100} />
      </div>
    </motion.div>
  );
}
