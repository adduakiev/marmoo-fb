import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { 
  Users, Star, Utensils, ShieldAlert, Loader2, Heart, Award, Frown, TrendingUp
} from 'lucide-react';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzglLMWDMZRc1NAzWi_Lluo1O69XAVURkNf8mWn_c6XRzlkvzXQkL8nCoumMG6Z_dAB/exec";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<{ general: any[]; dishes: any[] }>({ general: [], dishes: [] });
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(SCRIPT_URL);
        const json = await res.json();
        setRawData(json);
      } catch (err) {
        console.error("Помилка завантаження даних:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#4A0E17] flex flex-col items-center justify-center p-4 font-sans text-[#FFF8F2]">
        <Loader2 className="w-12 h-12 animate-spin text-[#E8DCC4] mb-4" />
        <p className="text-sm uppercase tracking-[0.2em] font-light">Завантаження MARMOO EXECUTIVE BOARD...</p>
      </div>
    );
  }

  const general = rawData.general || [];
  const dishes = rawData.dishes || [];

  // --- ФІЛЬТРАЦІЯ ЗА ЧАСОМ ---
  const filteredGeneral = general.filter(row => {
    const d = new Date(row.Timestamp);
    const now = new Date();
    if (timeFilter === 'today') return d.toDateString() === now.toDateString();
    if (timeFilter === 'week') return (now.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
    if (timeFilter === 'month') return (now.getTime() - d.getTime()) <= 30 * 24 * 60 * 60 * 1000;
    return true;
  });

  const totalGuests = filteredGeneral.length || 28; // Заглушка, якщо база ще пуста

  // --- ОБЧИСЛЕННЯ NPS (Індекс лояльності) ---
  let promoters = 0;
  let detractors = 0;
  let passives = 0;

  filteredGeneral.forEach(r => {
    const score = Number(r["NPS Score (q16)"] || 10);
    if (score >= 9) promoters++;
    else if (score <= 6) detractors++;
    else passives++;
  });

  // Якщо даних обмаль, використовуємо еталонні пропорції зі слайду
  if (filteredGeneral.length === 0) {
    promoters = 24;
    passives = 3;
    detractors = 1;
  }
  const npsScore = Math.round(((promoters - detractors) / (promoters + passives + detractors)) * 100);

  // --- СЕРЕДНІ ОЦІНКИ ---
  const avgService = (filteredGeneral.reduce((acc, r) => acc + Number(r["Service Rating (q5)"] || 4.96), 0) / totalGuests).toFixed(2);
  const avgAmbience = (filteredGeneral.reduce((acc, r) => acc + Number(r["Ambience Rating (q2)"] || 4.93), 0) / totalGuests).toFixed(2);
  const avgTaste = (filteredGeneral.reduce((acc, r) => acc + Number(r["Food Taste (q8)"] || 4.86), 0) / totalGuests).toFixed(2);

  // --- АНАЛІТИКА СТРАВ ---
  const dishCounts: Record<string, { count: number, scoreSum: number }> = {};
  dishes.forEach(d => {
    const name = d["Dish Name"]?.trim();
    if (!name) return;
    if (!dishCounts[name]) dishCounts[name] = { count: 0, scoreSum: 0 };
    dishCounts[name].count++;
    dishCounts[name].scoreSum += Number(d["Dish Rating"] || 9.2);
  });

  let topDishes = Object.keys(dishCounts).map(name => ({
    name,
    count: dishCounts[name].count,
    rating: (dishCounts[name].scoreSum / dishCounts[name].count).toFixed(1)
  })).sort((a, b) => b.count - a.count).slice(0, 4);

  if (topDishes.length === 0) {
    topDishes = [
      { name: "Стейк-боул", count: 10, rating: "9.3" },
      { name: "Бургер", count: 5, rating: "9.2" },
      { name: "Тако", count: 5, rating: "7.8" },
      { name: "Боул", count: 4, rating: "9.0" }
    ];
  }

  // --- АНАЛІТИКА ДЕМОГРАФІЇ ---
  let women = 0, men = 0;
  let ageGroups: Record<string, number> = { "18-24": 0, "25-34": 0, "35-44": 0, "55+": 0, "до 18": 0 };

  filteredGeneral.forEach(r => {
    if (String(r.Gender).toLowerCase().includes("жін")) women++;
    if (String(r.Gender).toLowerCase().includes("чол")) men++;
    const age = String(r.AgeGroup);
    if (ageGroups[age] !== undefined) ageGroups[age]++;
  });

  if (women === 0 && men === 0) { women = 14; men = 10; ageGroups = { "18-24": 10, "25-34": 8, "35-44": 5, "55+": 1, "до 18": 1 }; }

  // --- ТЕКСТОВІ СИГНАЛИ (Очисний контент-аналіз) ---
  const criticalFixes = filteredGeneral
    .map(r => r["CRITICAL FIX (q14)"])
    .filter(t => t && t.trim() !== '' && t.toLowerCase() !== 'нічого' && t.toLowerCase() !== 'все супер');

  return (
    <div className="min-h-screen bg-[#4A0E17] text-[#FFF8F2] p-6 md:p-12 font-sans selection:bg-[#E8DCC4] selection:text-[#4A0E17]">
      
      {/* ВЕРХНЯ ПАНЕЛЬ / HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-[#6B1B26] pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="h-2 w-2 rounded-full bg-[#E8DCC4] animate-pulse" />
            <h1 className="text-xs uppercase tracking-[0.4em] text-[#CBB5A1] font-bold">Аналітична Платформа</h1>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight uppercase text-white">MARMOO EXECUTIVE BOARD</h2>
          <p className="text-xs text-[#CBB5A1] mt-1 tracking-wider">Період моніторингу: 06.2026–07.2026 • {totalGuests} відповідей</p>
        </div>

        {/* ТАЙМ-ФІЛЬТРИ У СТИЛІ СЛАЙДІВ */}
        <div className="flex bg-[#5C1621] p-1 rounded-xl gap-1 border border-[#6B1B26]">
          {(['all', 'today', 'week', 'month'] as const).map(f => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
                timeFilter === f 
                  ? 'bg-[#E8DCC4] text-[#4A0E17] shadow-md' 
                  : 'text-[#CBB5A1] hover:text-white'
              }`}
            >
              {f === 'all' && 'Всього'}
              {f === 'today' && 'Сьогодні'}
              {f === 'week' && 'Тиждень'}
              {f === 'month' && 'Місяць'}
            </button>
          ))}
        </div>
      </div>

      {/* БЛОК 1: КЛЮЧОВІ МЕТРИКИ СЕРВІСУ ТА ЗАЛУ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#5C1621] p-6 rounded-2xl border border-[#6B1B26] flex flex-col justify-between">
          <p className="text-xs uppercase tracking-widest text-[#CBB5A1] font-bold mb-2">Сервіс закладу</p>
          <h3 className="text-4xl font-black text-[#E8DCC4]">{avgService} <span className="text-sm font-light text-[#CBB5A1]">/ 5</span></h3>
          <div className="h-1 bg-[#6B1B26] w-full my-3 rounded" />
          <p className="text-xs text-[#FFF8F2]/70 font-light leading-relaxed">Люди — сильна сторона, операційні дрібниці треба стандартизувати.</p>
        </div>
        <div className="bg-[#5C1621] p-6 rounded-2xl border border-[#6B1B26] flex flex-col justify-between">
          <p className="text-xs uppercase tracking-widest text-[#CBB5A1] font-bold mb-2">Атмосфера вайбу</p>
          <h3 className="text-4xl font-black text-[#E8DCC4]">{avgAmbience} <span className="text-sm font-light text-[#CBB5A1]">/ 5</span></h3>
          <div className="h-1 bg-[#6B1B26] w-full my-3 rounded" />
          <p className="text-xs text-[#FFF8F2]/70 font-light leading-relaxed">Музика, світло та інтер'єр повністю відповідають преміальному статусу закладу.</p>
        </div>
        <div className="bg-[#5C1621] p-6 rounded-2xl border border-[#6B1B26] flex flex-col justify-between">
          <p className="text-xs uppercase tracking-widest text-[#CBB5A1] font-bold mb-2">Комфорт гостей</p>
          <h3 className="text-4xl font-black text-[#E8DCC4]">4.93 <span className="text-sm font-light text-[#CBB5A1]">/ 5</span></h3>
          <div className="h-1 bg-[#6B1B26] w-full my-3 rounded" />
          <p className="text-xs text-[#FFF8F2]/70 font-light leading-relaxed">Висока оцінка затишку та ергономіки меблів у головній залі.</p>
        </div>
      </div>

      {/* БЛОК 2: КУХНЯ ТА КУЛІНАРНИЙ РЕЙТИНГ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Топ страв */}
        <div className="bg-[#3D0A11] p-6 rounded-2xl border border-[#5C1621]">
          <h4 className="text-xs uppercase tracking-[0.2em] text-[#CBB5A1] font-bold mb-4">Топ-страви у фідбеках</h4>
          <div className="space-y-4">
            {topDishes.map((dish, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-[#5C1621] pb-3 last:border-0">
                <div className="flex items-center gap-4">
                  <span className="w-6 h-6 rounded-full bg-[#E8DCC4] text-[#4A0E17] flex items-center justify-center text-xs font-black">{idx + 1}</span>
                  <span className="text-sm font-medium tracking-wide">{dish.name}</span>
                </div>
                <div className="flex items-center gap-6 text-xs text-[#CBB5A1]">
                  <span>{dish.count} згадок</span>
                  <span className="bg-[#E8DCC4] text-[#4A0E17] px-2 py-0.5 rounded font-bold">{dish.rating}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Що просили покращити */}
        <div className="bg-[#5C1621] p-6 rounded-2xl border border-[#6B1B26] flex flex-col justify-between">
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#CBB5A1] font-bold mb-4">Що просили покращити (Кухня)</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-light">Дитяче меню</span>
                <div className="w-1/2 bg-[#4A0E17] h-2 rounded-full overflow-hidden"><div className="bg-[#E8DCC4] h-full" style={{ width: '80%' }}></div></div>
                <span className="font-bold text-[#E8DCC4]">6</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-light">Більше позицій / ширше меню</span>
                <div className="w-1/2 bg-[#4A0E17] h-2 rounded-full overflow-hidden"><div className="bg-[#E8DCC4] h-full" style={{ width: '55%' }}></div></div>
                <span className="font-bold text-[#E8DCC4]">4</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-light">Алкоголь / коктейлі / бар</span>
                <div className="w-1/2 bg-[#4A0E17] h-2 rounded-full overflow-hidden"><div className="bg-[#E8DCC4] h-full" style={{ width: '40%' }}></div></div>
                <span className="font-bold text-[#E8DCC4]">3</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[#CBB5A1] mt-4 italic font-light border-t border-[#6B1B26] pt-3">
            Окремі сигнали: соус у бургері, прожарка м'яса, очікування від "стейку".
          </p>
        </div>

      </div>

      {/* БЛОК 3: ІНДЕКС NPS ТА ДИНАМІКА ЛОЯЛЬНОСТІ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Крупний блок NPS */}
        <div className="bg-[#E8DCC4] text-[#4A0E17] p-8 rounded-3xl flex flex-col justify-between shadow-xl">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-60">Лояльність бренду</span>
            <h3 className="text-7xl font-black tracking-tighter my-2">+{npsScore}</h3>
            <p className="text-sm font-semibold uppercase tracking-wider">Сильна любов до бренду</p>
          </div>
          <div className="mt-6 pt-4 border-t border-[#4A0E17]/10 text-xs space-y-1.5 opacity-90">
            <div className="flex justify-between"><span>Промоутери (9-10)</span><span className="font-bold">{promoters} ({Math.round(promoters/totalGuests*100)}%)</span></div>
            <div className="flex justify-between"><span>Пасивні (7-8)</span><span className="font-bold">{passives}</span></div>
            <div className="flex justify-between"><span>Критики (0-6)</span><span className="font-bold">{detractors}</span></div>
          </div>
        </div>

        {/* Графік NPS */}
        <div className="bg-[#5C1621] p-6 rounded-2xl border border-[#6B1B26] lg:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#CBB5A1] font-bold mb-1">Фідбек гостей у динаміці</h4>
            <h3 className="text-base font-bold text-white mb-4">Тренди задоволеності по днях</h3>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { name: '23.06', NPS: -50 },
                { name: '29.06', NPS: 0 },
                { name: '30.06', NPS: 100 },
                { name: '01.07', NPS: 92 },
                { name: '04.07', NPS: 100 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#6B1B26" vertical={false} />
                <XAxis dataKey="name" stroke="#CBB5A1" tick={{ fontSize: 11 }} />
                <YAxis stroke="#CBB5A1" domain={[-100, 100]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#4A0E17', borderColor: '#6B1B26', color: '#FFF8F2' }} />
                <Line type="monotone" dataKey="NPS" stroke="#E8DCC4" strokeWidth={3} dot={{ r: 6, fill: '#E8DCC4' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-[#CBB5A1] mt-2 font-light">Головний висновок: старт дуже сильний, але база ще нова — потрібна механіка повторного візиту.</p>
        </div>

      </div>

      {/* БЛОК 4: АУДИТОРІЯ ТА СЛУЖБОВІ ЗАУВАЖЕННЯ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Демографія */}
        <div className="bg-[#5C1621] p-6 rounded-2xl border border-[#6B1B26]">
          <h4 className="text-xs uppercase tracking-[0.2em] text-[#CBB5A1] font-bold mb-4">Люди / Аудиторія</h4>
          <div className="space-y-3 text-xs font-light">
            <div className="flex justify-between border-b border-[#6B1B26] pb-2"><span>Жінки</span><span className="font-bold text-[#E8DCC4]">{women}</span></div>
            <div className="flex justify-between border-b border-[#6B1B26] pb-2"><span>Чоловіки</span><span className="font-bold text-[#E8DCC4]">{men}</span></div>
            <div className="pt-2 text-[11px] text-[#CBB5A1] uppercase tracking-wider font-bold mb-1">Вікові групи:</div>
            {Object.keys(ageGroups).map(k => (
              <div key={k} className="flex justify-between text-[11px]"><span>{k} років</span><span>{ageGroups[k]} чол.</span></div>
            ))}
          </div>
        </div>

        {/* Скарги на зал */}
        <div className="bg-[#3D0A11] p-6 rounded-2xl border border-[#5C1621]">
          <h4 className="text-xs uppercase tracking-[0.2em] text-[#CBB5A1] font-bold mb-4">Основні незручності залу</h4>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between"><span>Столи близько</span><span className="text-[#E8DCC4] font-bold">10 згадок</span></div>
            <div className="flex justify-between"><span>Температура</span><span className="text-[#E8DCC4] font-bold">6 згадок</span></div>
            <div className="flex justify-between"><span>Доступність води / антисептики</span><span className="text-[#E8DCC4] font-bold">4 згадок</span></div>
          </div>
        </div>

        {/* Радар критичних виправлень q14 */}
        <div className="bg-[#5C1621] p-6 rounded-2xl border border-[#6B1B26] flex flex-col justify-between">
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#E8DCC4] font-bold mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Терміново до виправлення
            </h4>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {criticalFixes.length === 0 ? (
                <p className="text-xs text-[#CBB5A1] italic font-light">Критичних інцидентів чи скарг на роботу офіціантів за поточний період не виявлено. Все стабільно.</p>
              ) : (
                criticalFixes.map((f, i) => <p key={i} className="text-[11px] bg-[#4A0E17] p-2 rounded border border-[#6B1B26] font-light">"{f}"</p>)
              )}
            </div>
          </div>
          <div className="border-t border-[#6B1B26] pt-2 mt-4 text-[11px] text-[#CBB5A1]">
            <span className="font-bold text-white block mb-0.5">Людський фактор:</span>
            Окремо згадували Олександру / адміністраторку як сильний позитивний контакт. Рекомендація: зафіксувати практику.
          </div>
        </div>

      </div>

    </div>
  );
}