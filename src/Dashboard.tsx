import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Users, Star, Clock, Utensils, ShieldAlert, Loader2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const SCRIPT_URL = import.meta.env.VITE_API_URL || "";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<{ general: any[]; dishes: any[] }>({ general: [], dishes: [] });
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(SCRIPT_URL);
        const json = await res.json();
        setRawData(json);
      } catch (err) {
        console.error("Помилка завантаження BI даних:", err);
      } finally {
        setLoading(false);
      }
    }
    if (SCRIPT_URL) fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1A1A1A] mb-4" />
        <p className="text-sm text-[#62616D] uppercase tracking-widest">Завантаження Marmoo BI...</p>
      </div>
    );
  }

  const general = rawData.general || [];
  const dishes = rawData.dishes || [];

  const filteredGeneral = general.filter(row => {
    const d = new Date(row.Timestamp);
    const now = new Date();
    if (timeFilter === 'today') return d.toDateString() === now.toDateString();
    if (timeFilter === 'week') return (now.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
    if (timeFilter === 'month') return (now.getTime() - d.getTime()) <= 30 * 24 * 60 * 60 * 1000;
    return true;
  });

  const totalGuests = filteredGeneral.length;
  const avgScore = totalGuests ? (filteredGeneral.reduce((acc, r) => acc + Number(r["Total Score (q1)"] || 0), 0) / totalGuests).toFixed(1) : '0';
  const avgService = totalGuests ? (filteredGeneral.reduce((acc, r) => acc + Number(r["Service Rating (q5)"] || 0), 0) / totalGuests).toFixed(1) : '0';
  const avgTaste = totalGuests ? (filteredGeneral.reduce((acc, r) => acc + Number(r["Food Taste (q8)"] || 0), 0) / totalGuests).toFixed(1) : '0';

  const topDishesData = Object.keys(
    dishes.reduce((acc: any, dRow) => {
      const name = dRow["Dish Name"]?.trim();
      if (name) acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {})
  ).map(name => ({ name, "Замовлень": 1 })).slice(0, 5);

  const criticalFixes = filteredGeneral
    .map(r => r["CRITICAL FIX (q14)"])
    .filter(text => text && text.trim() !== '' && text.toLowerCase() !== 'нічого');

  const daysOfWeek = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const dailyDataMap: Record<string, { name: string, "Гості": number }> = {};
  filteredGeneral.forEach(row => {
    const d = new Date(row.Timestamp);
    const dayName = daysOfWeek[d.getDay()];
    if (!dailyDataMap[dayName]) dailyDataMap[dayName] = { name: dayName, "Гості": 0 };
    dailyDataMap[dayName]["Гості"] += 1;
  });
  const chartData = Object.values(dailyDataMap);

  return (
    <div className="min-h-screen bg-[#F8F8FA] text-[#1A1A1A] p-6 md:p-12 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-[#EEEDF2] pb-8">
        <div>
          <h1 className="text-xs uppercase tracking-[0.3em] text-[#8A8994] font-bold mb-2">Аналітична Платформа</h1>
          <h2 className="text-3xl font-bold tracking-tight uppercase">MARMOO EXECUTIVE BOARD</h2>
        </div>
        <div className="flex bg-[#EEEDF2] p-1 rounded-xl gap-1">
          {['all', 'today', 'week', 'month'].map(f => (
            <button key={f} onClick={() => setTimeFilter(f as any)} className={`px-4 py-2 text-xs font-medium uppercase rounded-lg ${timeFilter === f ? 'bg-[#1A1A1A] text-white' : 'text-[#62616D]'}`}>
              {f === 'all' ? 'Всього' : f === 'today' ? 'Сьогодні' : f === 'week' ? 'Тиждень' : 'Місяць'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm">
          <p className="text-sm text-[#8A8994] uppercase tracking-wider mb-1">Аудиторія</p>
          <h3 className="text-3xl font-bold">{totalGuests}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm">
          <p className="text-sm text-[#8A8994] uppercase tracking-wider mb-1">Загальний досвід</p>
          <h3 className="text-3xl font-bold">{avgScore} / 10</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm">
          <p className="text-sm text-[#8A8994] uppercase tracking-wider mb-1">Сервіс</p>
          <h3 className="text-3xl font-bold">{avgService} / 10</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm">
          <p className="text-sm text-[#8A8994] uppercase tracking-wider mb-1">Смак Кухні</p>
          <h3 className="text-3xl font-bold">{avgTaste} / 5★</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold mb-4">Кількість анкет по днях</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Гості" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm">
          <h3 className="text-lg font-bold mb-4">Популярні страви</h3>
          <div className="space-y-3">
            {topDishesData.map((dish, i) => (
              <div key={i} className="flex justify-between border-b pb-2 text-sm">
                <span>{dish.name}</span>
                <span className="font-bold">{dish["Замовлень"]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm">
          <h3 className="text-lg font-bold mb-4 text-rose-600">Критичні скарги (q14)</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {criticalFixes.map((fix, idx) => (
              <p key={idx} className="p-3 bg-rose-50 rounded-xl text-xs">"{fix}"</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}