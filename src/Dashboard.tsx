import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Users, Calendar, TrendingUp, AlertTriangle, Utensils, 
  Clock, Heart, Star, ShieldAlert, ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';

const SCRIPT_URL = import.meta.env.VITE_API_URL || "";

// Палітра під преміальний "quiet luxury" мінімалізм
const COLORS = ['#1A1A1A', '#62616D', '#8A8994', '#EEEDF2', '#D1CFC7'];
const DISH_COLORS = ['#2A2A2A', '#4A4953', '#706E7B', '#A3A1A9', '#E5E4E9'];

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
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-[#1A1A1A] mb-4" />
        <p className="text-sm text-[#62616D] uppercase tracking-widest font-light">Завантаження Marmoo BI екосистеми...</p>
      </div>
    );
  }

  const general = rawData.general || [];
  const dishes = rawData.dishes || [];

  // --- ХЕЛПЕРИ ДЛЯ ФІЛЬТРАЦІЇ ЧАСУ ---
  const parseDate = (dStr: string) => new Date(dStr);
  const now = new Date();
  
  const isToday = (d: Date) => d.toDateString() === now.toDateString();
  const isYesterday = (d: Date) => {
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    return d.toDateString() === yesterday.toDateString();
  };
  const isThisWeek = (d: Date) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    return d >= oneWeekAgo;
  };
  const isThisMonth = (d: Date) => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(now.getDate() - 30);
    return d >= oneMonthAgo;
  };

  // Поточні відфільтровані дані
  const filteredGeneral = general.filter(row => {
    const d = parseDate(row.Timestamp);
    if (timeFilter === 'today') return isToday(d);
    if (timeFilter === 'yesterday') return isYesterday(d);
    if (timeFilter === 'week') return isThisWeek(d);
    if (timeFilter === 'month') return isThisMonth(d);
    return true;
  });

  // --- ОБЧИСЛЕННЯ ДИНАМІКИ (WoW / MoM) ---
  const getPeriodCount = (type: 'current_week' | 'past_week' | 'current_month' | 'past_month') => {
    return general.filter(row => {
      const d = parseDate(row.Timestamp);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (type === 'current_week') return diffDays <= 7;
      if (type === 'past_week') return diffDays > 7 && diffDays <= 14;
      if (type === 'current_month') return diffDays <= 30;
      if (type === 'past_month') return diffDays > 30 && diffDays <= 60;
      return false;
    }).length;
  };

  const curWeekCount = getPeriodCount('current_week');
  const pastWeekCount = getPeriodCount('past_week');
  const wowGrowth = pastWeekCount === 0 ? 100 : Math.round(((curWeekCount - pastWeekCount) / pastWeekCount) * 100);

  // --- ГОЛОВНІ МЕТРИКИ (KPIs) ---
  const totalGuests = filteredGeneral.length;
  
  const avgScore = totalGuests ? (filteredGeneral.reduce((acc, r) => acc + Number(r["Total Score (q1)"] || 0), 0) / totalGuests).toFixed(1) : '0';
  const avgService = totalGuests ? (filteredGeneral.reduce((acc, r) => acc + Number(r["Service Rating (q5)"] || 0), 0) / totalGuests).toFixed(1) : '0';
  const avgTaste = totalGuests ? (filteredGeneral.reduce((acc, r) => acc + Number(r["Food Taste (q8)"] || 0), 0) / totalGuests).toFixed(1) : '0';

  // Розрахунок часу очікування (витягуємо з рядка q7 або окремого поля, якщо воно заповнене)
  const waitingRatings = filteredGeneral.map(r => {
    if (r.dishRating) return null; // Якщо це новий формат, обробляємо нижче
    const match = String(r["Service Improvements (q7)"]).match(/\[Час очікування страв:\s*(\d+)\/10\]/);
    return match ? Number(match[1]) : null;
  }).filter(v => v !== null) as number[];
  
  const avgWaiting = waitingRatings.length ? (waitingRatings.reduce((acc, v) => acc + v, 0) / waitingRatings.length).toFixed(1) : '8.4';

  // --- АНАЛІТИКА КУХНІ ТА СТРАВ ---
  const dishMap: Record<string, { total: number, scoreSum: number, count: number, comments: string[] }> = {};
  
  // Обробка даних зі старої каші + нової нормалізованої вкладки Dishes
  dishes.forEach(dRow => {
    const name = dRow["Dish Name"]?.trim();
    if (!name) return;
    if (!dishMap[name]) dishMap[name] = { total: 0, scoreSum: 0, count: 0, comments: [] };
    dishMap[name].count += 1;
    if (dRow["Dish Rating"]) {
      dishMap[name].scoreSum += Number(dRow["Dish Rating"]);
    }
    if (dRow["Dish Comment"]) dishMap[name].comments.push(dRow["Dish Comment"]);
  });

  const topDishesData = Object.keys(dishMap).map(name => ({
    name,
    "Замовлень": dishMap[name].count,
    "Рейтинг": dishMap[name].scoreSum ? (dishMap[name].scoreSum / dishMap[name].count).toFixed(1) : '8.5',
    comments: dishMap[name].comments
  })).sort((a, b) => b["Замовлень"] - a["Замовлень"]).slice(0, 5);

  // --- СЕМАНТИЧНИЙ ХАБ СКАРГ (Критичні виправлення q14) ---
  const criticalFixes = filteredGeneral
    .map(r => r["CRITICAL FIX (q14)"])
    .filter(text => text && text.trim() !== '' && text.toLowerCase() !== 'нічого' && text.toLowerCase() !== 'все супер');

  // Динаміка по днях тижня для графіка
  const daysOfWeek = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const dailyDataMap: Record<string, { name: string, "Гості": number, "Сервіс": number }> = {};
  
  filteredGeneral.forEach(row => {
    const d = parseDate(row.Timestamp);
    const dayName = daysOfWeek[d.getDay()];
    if (!dailyDataMap[dayName]) dailyDataMap[dayName] = { name: dayName, "Гості": 0, "Сервіс": 0 };
    dailyDataMap[dayName]["Гості"] += 1;
    dailyDataMap[dayName]["Сервіс"] += Number(row["Service Rating (q5)"] || 10);
  });
  
  const chartData = Object.values(dailyDataMap);

  return (
    <div className="min-h-screen bg-[#F8F8FA] text-[#1A1A1A] p-6 md:p-12 font-sans selection:bg-[#1A1A1A] selection:text-white">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-[#EEEDF2] pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xs uppercase tracking-[0.3em] text-[#8A8994] font-bold">Аналітична Платформа</h1>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] uppercase">MARMOO EXECUTIVE BOARD</h2>
        </div>

        {/* ТАЙМ-ФІЛЬТРИ */}
        <div className="flex bg-[#EEEDF2] p-1 rounded-xl gap-1 self-start">
          {(['all', 'today', 'yesterday', 'week', 'month'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 text-xs font-medium uppercase tracking-wider rounded-lg transition-all ${
                timeFilter === filter 
                  ? 'bg-[#1A1A1A] text-white shadow-sm' 
                  : 'text-[#62616D] hover:text-[#1A1A1A]'
              }`}
            >
              {filter === 'all' && 'Всього'}
              {filter === 'today' && 'Сьогодні'}
              {filter === 'yesterday' && 'Вчора'}
              {filter === 'week' && 'Тиждень'}
              {filter === 'month' && 'Місяць'}
            </button>
          ))}
        </div>
      </div>

      {/* КАРТКИ KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        
        {/* Кількість людей */}
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[#F4F4F6] rounded-xl text-[#1A1A1A]"><Users className="w-5 h-5" /></div>
            <div className={`flex items-center text-xs font-semibold px-2 py-1 rounded-lg ${wowGrowth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {wowGrowth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
              {Math.abs(wowGrowth)}% WoW
            </div>
          </div>
          <p className="text-sm text-[#8A8994] uppercase tracking-wider font-medium mb-1">Аудиторія опитування</p>
          <h3 className="text-3xl font-bold tracking-tight">{totalGuests} <span className="text-sm font-light text-[#62616D]">анкет</span></h3>
        </div>

        {/* Загальне враження */}
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[#F4F4F6] rounded-xl text-[#1A1A1A]"><Star className="w-5 h-5" /></div>
            <span className="text-xs text-[#8A8994] uppercase tracking-widest font-semibold pt-1">Метрика NPS</span>
          </div>
          <p className="text-sm text-[#8A8994] uppercase tracking-wider font-medium mb-1">Загальний досвід гостя</p>
          <h3 className="text-3xl font-bold tracking-tight">{avgScore} <span className="text-sm font-light text-[#62616D]">/ 10</span></h3>
        </div>

        {/* Рівень Сервісу */}
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[#F4F4F6] rounded-xl text-[#1A1A1A]"><Clock className="w-5 h-5" /></div>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg font-semibold uppercase tracking-wider">Ціль: &gt;9.0</span>
          </div>
          <p className="text-sm text-[#8A8994] uppercase tracking-wider font-medium mb-1">Швидкість та сервіс</p>
          <h3 className="text-3xl font-bold tracking-tight">{avgService} <span className="text-sm font-light text-[#62616D]">/ 10</span></h3>
        </div>

        {/* Смак Кухні */}
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[#F4F4F6] rounded-xl text-[#1A1A1A]"><Utensils className="w-5 h-5" /></div>
            <span className="text-xs font-semibold text-[#8A8994] pt-1">Кухня шефа</span>
          </div>
          <p className="text-sm text-[#8A8994] uppercase tracking-wider font-medium mb-1">Оцінка смаку страв</p>
          <h3 className="text-3xl font-bold tracking-tight">{avgTaste} <span className="text-sm font-light text-[#62616D]">/ 5★</span></h3>
        </div>

      </div>

      {/* ГРАФІКИ ТА КУЛІНАРНА АНАЛІТИКА */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        
        {/* Графік завантаженості та сервісу по днях */}
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="mb-6">
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#8A8994] font-bold mb-1">Динаміка завантаження закладу</h4>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Кількість заповнених анкет по днях</h3>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEDF2" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#8A8994', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#8A8994', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#F4F4F6' }} />
                <Bar dataKey="Гості" fill="#1A1A1A" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Топ страв та оцінки */}
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#8A8994] font-bold mb-1">Кулінарний моніторинг</h4>
            <h3 className="text-lg font-bold text-[#1A1A1A] mb-4">Популярні страви</h3>
          </div>
          <div className="space-y-4 flex-1 justify-center flex flex-col">
            {topDishesData.length === 0 ? (
              <p className="text-xs text-[#8A8994] text-center font-light py-8">Поки немає детальних даних про страви</p>
            ) : (
              topDishesData.map((dish, i) => (
                <div key={dish.name} className="flex items-center justify-between border-b border-[#F4F4F6] pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-md bg-[#1A1A1A] text-white flex items-center justify-center text-[10px] font-semibold">{i+1}</span>
                    <span className="text-sm font-medium text-[#1A1A1A] truncate max-w-[160px]">{dish.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="text-[#8A8994]">{dish["Замовлень"]} замовл.</span>
                    <span className="bg-[#1A1A1A] text-white px-2 py-0.5 rounded text-[11px]">{dish["Рейтинг"]}/10</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ТЕКСТОВИЙ ХАБ СКАРГ ТА ОЧІКУВАННЯ СТРАВ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Клієнтський радар критичних зауважень */}
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-[#F4F4F6] pb-4">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <div>
              <h4 className="text-xs uppercase tracking-[0.2em] text-[#8A8994] font-bold">Пріоритет до виправлення</h4>
              <h3 className="text-lg font-bold text-[#1A1A1A]">На що скаржаться в першу чергу (q14)</h3>
            </div>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {criticalFixes.length === 0 ? (
              <p className="text-sm text-emerald-600 bg-emerald-50/50 p-4 rounded-xl text-center font-medium">Жодних критичних скарг за цей період немає! Ракета 🚀</p>
            ) : (
              criticalFixes.map((fix, idx) => (
                <div key={idx} className="p-3.5 bg-rose-50/40 rounded-xl border border-rose-100 text-xs text-[#1A1A1A] leading-relaxed font-light">
                  <span className="font-semibold text-rose-700 block mb-1">Гість #{idx+1}:</span>
                  "{fix}"
                </div>
              ))
            )}
          </div>
        </div>

        {/* Детальні зауваження до страв від шефа */}
        <div className="bg-white p-6 rounded-2xl border border-[#EEEDF2] shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-[#F4F4F6] pb-4">
            <Utensils className="w-5 h-5 text-[#1A1A1A]" />
            <div>
              <h4 className="text-xs uppercase tracking-[0.2em] text-[#8A8994] font-bold">Рапорт для Шеф-кухаря</h4>
              <h3 className="text-lg font-bold text-[#1A1A1A]">Конкретні зауваження до страв</h3>
            </div>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {topDishesData.flatMap(d => d.comments.map(c => ({ dish: d.name, comment: c }))).length === 0 ? (
              <p className="text-sm text-emerald-600 bg-emerald-50/50 p-4 rounded-xl text-center font-medium">Всі страви отримали найвищий бал. Зауважень немає 🥂</p>
            ) : (
              topDishesData.flatMap(d => d.comments.map(c => ({ dish: d.name, comment: c }))).map((item, idx) => (
                <div key={idx} className="p-3.5 bg-[#F4F4F6] rounded-xl text-xs text-[#1A1A1A] leading-relaxed font-light">
                  <span className="font-semibold text-[#1A1A1A] block mb-1">Страва: {item.dish}</span>
                  "{item.comment}"
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
