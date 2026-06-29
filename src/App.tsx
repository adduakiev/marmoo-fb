import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { defaultFeedbackData, FeedbackData } from './types';
import { Button, Pill, StarRating, ScaleRating, TextInput, QuestionLabel } from './components/ui';
import { Loader2, RefreshCw } from 'lucide-react';

const SCRIPT_URL = import.meta.env.VITE_API_URL || "";
const TOTAL_STEPS = 9; 

export default function App() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FeedbackData>(defaultFeedbackData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [q3Text, setQ3Text] = useState(''); 
  const [q6Text, setQ6Text] = useState(''); 
  
  const [dishRating, setDishRating] = useState<number | null>(null);
  const [dishComment, setDishComment] = useState('');
  
  const [menuRating, setMenuRating] = useState<number | null>(null);
  const [menuComment, setMenuComment] = useState('');

  const [q13Text, setQ13Text] = useState(''); 
  const [priceRating, setPriceRating] = useState<string | null>(null); 

  // Нові стани для демографії (необов'язкові)
  const [gender, setGender] = useState<string | null>(null);
  const [ageGroup, setAgeGroup] = useState<string | null>(null);

  const handleNext = () => {
    if (step < 10) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleReset = () => {
    setData(defaultFeedbackData);
    setQ3Text('');
    setQ6Text('');
    setDishRating(null);
    setDishComment('');
    setMenuRating(null);
    setMenuComment('');
    setQ13Text('');
    setPriceRating(null);
    setGender(null);
    setAgeGroup(null);
    setStep(1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let finalQ6 = data.q6 || '';
      if (q6Text.trim()) {
        finalQ6 = finalQ6 ? `${finalQ6} (Свій варіант: ${q6Text.trim()})` : `Свій варіант: ${q6Text.trim()}`;
      }

      let finalQ10 = data.q10 || '';
      if (dishRating !== null) {
        finalQ10 = `Страва: ${finalQ10} [Оцінка: ${dishRating}/10]`;
        if (dishRating < 7 && dishComment.trim()) {
          finalQ10 += ` | Зауваження: ${dishComment.trim()}`;
        }
      }

      const finalQ11 = [...data.q11];
      if (menuRating !== null) {
        let menuReport = `Оцінка меню: ${menuRating}/10`;
        if (menuRating < 7 && menuComment.trim()) {
          menuReport += ` (Чого не вистачило: ${menuComment.trim()})`;
        }
        finalQ11.unshift(menuReport);
      }

      const finalQ3 = [...data.q3];
      if (q3Text.trim()) finalQ3.push(`Свій варіант: ${q3Text.trim()}`);

      const finalQ13 = [...data.q13];
      if (q13Text.trim()) finalQ13.push(`Коментар: ${q13Text.trim()}`);

      let finalQ17 = data.q17 || '';
      if (priceRating) {
        finalQ17 = `[Оцінка ціна/якість: ${priceRating}] ${finalQ17}`.trim();
      }

      // Елегантне додавання демографічних даних на початок фінального коментаря
      let demoPrefix = '';
      if (gender) demoPrefix += `[Стать: ${gender}] `;
      if (ageGroup) demoPrefix += `[Вік: ${ageGroup}] `;
      
      if (demoPrefix) {
        finalQ17 = `${demoPrefix}${finalQ17}`.trim();
      }

      const payload = {
        q1: data.q1,
        q2: data.q2,
        q3: finalQ3.join(', '),
        q4: data.q4,
        q5: data.q5,
        q6: finalQ6,
        q7: Array.isArray(data.q7) ? data.q7.join(', ') : data.q7,
        q8: data.q8,
        q9: data.q9,
        q10: finalQ10,
        q11: finalQ11.join(', '),
        q12: data.q12,
        q13: finalQ13.join(', '),
        q14: data.q14,
        q15: data.q15,
        q16: data.q16,
        q17: finalQ17,
      };

      if (SCRIPT_URL) {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
      }
      setStep(10);
    } catch (error) {
      console.error("Submission failed", error);
      alert("Виникла помилка під час відправки.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateData = <K extends keyof FeedbackData>(key: K, value: FeedbackData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const toggleMulti = (key: keyof FeedbackData, option: string) => {
    setData(prev => {
      const arr = prev[key] as string[];
      if (arr.includes(option)) {
        return { ...prev, [key]: arr.filter(o => o !== option) };
      }
      return { ...prev, [key]: [...arr, option] };
    });
  };

  const isStepValid = () => {
    switch (step) {
      case 2: return data.q1 !== null;
      case 3: return data.q2 !== null;
      case 4: return (data.q6 !== null || q6Text.trim() !== '') && data.q5 !== null;
      case 5: return data.q8 !== null && data.q9 !== null && data.q10.trim() !== '' && dishRating !== null && (dishRating >= 7 || dishComment.trim() !== '');
      case 6: return menuRating !== null && (menuRating >= 7 || menuComment.trim() !== '');
      case 7: return data.q12 !== null;
      case 8: return data.q14.trim() !== '' && data.q15 !== null && data.q16 !== null && priceRating !== null;
      case 9: return true; 
      default: return true;
    }
  };

  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-[680px] bg-white/95 backdrop-blur-md rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden relative min-h-[660px] flex flex-col border border-white/40 z-20">
        
        {/* Progress Bar */}
        {step > 1 && step < 10 && (
          <div className="px-6 md:px-12 pt-10 pb-2">
            <div className="flex justify-between items-center text-[11px] uppercase tracking-[0.2em] text-[#8A8994] mb-3 font-semibold">
              <span>Крок {step - 1} з {TOTAL_STEPS}</span>
            </div>
            <div className="w-full bg-[#EEEDF2] rounded-full h-[4px]">
              <div 
                className="bg-[#1A1A1A] h-full rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${((step - 1) / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 relative overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col flex-1 pb-24"
            >
              <div className="px-6 md:px-12 py-6 space-y-8">
                {step === 1 && (
                  <div className="text-center space-y-6 py-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-6 tracking-wide uppercase">
                      Привіт від команди Marmoo! 🥂
                    </h1>
                    <p className="text-lg text-[#62616D] leading-relaxed max-w-lg mx-auto font-light">
                      Дякуємо, що завітали до молодого закладу MARMOO. Ваша чесна думка допоможе нам стати ідеальними.
                    </p>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <QuestionLabel required>Як ви оцінюєте ваш загальний досвід сьогодні?</QuestionLabel>
                    <ScaleRating value={data.q1} onChange={(v) => updateData('q1', v)} minLabel="Жахливо" maxLabel="Ідеально" />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-8">
                    <div className="bg-white/70 p-6 rounded-2xl border border-[#EEEDF2] space-y-3">
                      <QuestionLabel required>Як вам атмосфера закладу?</QuestionLabel>
                      <StarRating value={data.q2} onChange={(v) => updateData('q2', v)} />
                    </div>
                    <div className="space-y-4">
                      <QuestionLabel>Що саме вам сподобалось в атмосфері?</QuestionLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {['Музика та її гучність', 'Освітлення', "Інтер'єр та декор", 'Чистота', 'Комфортна температура', 'Усе сподобалось'].map(opt => (
                          <Pill key={opt} label={opt} selected={data.q3.includes(opt)} onClick={() => toggleMulti('q3', opt)} />
                        ))}
                      </div>
                      <TextInput value={q3Text} onChange={(v) => setQ3Text(v)} placeholder="Свій варіант чи коментар..." />
                    </div>
                    <div className="space-y-3">
                      <QuestionLabel>Що ми можемо покращити в залі? (Опційно)</QuestionLabel>
                      <TextInput value={data.q4} onChange={(v) => updateData('q4', v)} placeholder="Наприклад: було трохи прохолодно..." />
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-8">
                    <div className="bg-white/70 p-6 rounded-2xl border border-[#EEEDF2] space-y-3">
                      <QuestionLabel required>Як ви оцінюєте роботу команди (сервіс)?</QuestionLabel>
                      <StarRating value={data.q5} onChange={(v) => updateData('q5', v)} />
                    </div>
                    <div className="space-y-4">
                      <QuestionLabel required>Чи було вам комфортно взаємодіяти з персоналом?</QuestionLabel>
                      <div className="flex flex-col gap-2.5">
                        {['Так, усі були привітні', 'Загалом все ок, але були непорозуміння', 'Ні, виникли труднощі'].map(opt => (
                          <Pill key={opt} label={opt} selected={data.q6 === opt} onClick={() => updateData('q6', opt)} />
                        ))}
                      </div>
                      <TextInput value={q6Text} onChange={(v) => setQ6Text(v)} placeholder="Або напишіть свій варіант..." />
                    </div>
                    <div className="space-y-3">
                      <QuestionLabel>Що варто покращити в обслуговуванні?</QuestionLabel>
                      <div className="flex flex-wrap gap-2">
                        {['Швидкість винесення страв', 'Уважність офіціанта', 'Знання меню', 'Швидкість розрахунку', 'Усе було супер'].map(opt => (
                          <Pill key={opt} label={opt} selected={data.q7.includes(opt)} onClick={() => toggleMulti('q7', opt)} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-6">
                    <div className="bg-white/70 p-6 rounded-2xl border border-[#EEEDF2] space-y-4">
                      <QuestionLabel required>Як ви оцінюєте смак страв?</QuestionLabel>
                      <StarRating value={data.q8} onChange={(v) => updateData('q8', v)} />
                    </div>

                    <div className="bg-white/70 p-6 rounded-2xl border border-[#EEEDF2] space-y-4">
                      <QuestionLabel required>Як ви оцінюєте подачу та вигляд страв?</QuestionLabel>
                      <StarRating value={data.q9} onChange={(v) => updateData('q9', v)} />
                    </div>

                    <div className="bg-white/70 p-6 rounded-2xl border border-[#EEEDF2] space-y-5">
                      <div className="space-y-2">
                        <QuestionLabel required>Яку страву ви куштували сьогодні (першу)?</QuestionLabel>
                        <TextInput value={data.q10} onChange={(v) => updateData('q10', v)} placeholder="Назва страви..." />
                      </div>
                      
                      {data.q10.trim() !== '' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-2 border-t border-[#EEEDF2]">
                          <QuestionLabel required>Наскільки оціните цю страву за 10-бальною шкалою?</QuestionLabel>
                          <ScaleRating value={dishRating} onChange={(v) => setDishRating(v)} start={1} end={10} />
                        </motion.div>
                      )}

                      {dishRating !== null && dishRating < 7 && (
                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pt-2">
                          <QuestionLabel required>Що саме не сподобалось і потребує доопрацювання?</QuestionLabel>
                          <TextInput value={dishComment} onChange={(v) => setDishComment(v)} placeholder="Опишіть детально зауваження до страви..." />
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {step === 6 && (
                  <div className="space-y-6">
                    <div className="bg-white/70 p-6 rounded-2xl border border-[#EEEDF2] space-y-5">
                      <div className="space-y-2">
                        <QuestionLabel required>Наскільки ви задоволені меню загалом (асортимент)?</QuestionLabel>
                        <ScaleRating 
                          value={menuRating} 
                          onChange={(v) => setMenuRating(v)} 
                          start={1} end={10}
                          minLabel="Повністю не задовільняє" maxLabel="Повністю задовільняє" 
                        />
                      </div>

                      {menuRating !== null && menuRating < 7 && (
                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pt-2 border-t border-[#EEEDF2]">
                          <QuestionLabel required>Чого саме вам не вистачило в меню? (Ключове питання):</QuestionLabel>
                          <TextInput value={menuComment} onChange={(v) => setMenuComment(v)} placeholder="Яких страв або категорій бракує..." />
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {step === 7 && (
                  <div className="space-y-6">
                    <div className="bg-white/70 p-6 rounded-2xl border border-[#EEEDF2] space-y-4">
                      <QuestionLabel required>Наскільки зручно було перебувати в закладі?</QuestionLabel>
                      <StarRating value={data.q12} onChange={(v) => updateData('q12', v)} />
                    </div>
                    <div className="space-y-4">
                      <QuestionLabel>Що саме викликало дискомфорт? (Опційно)</QuestionLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {['Незручні стільці', 'Столи надто близько', 'Незручне меню', 'Нюанси у вбиральні', 'Все було зручно'].map(opt => (
                          <Pill key={opt} label={opt} selected={data.q13.includes(opt)} onClick={() => toggleMulti('q13', opt)} />
                        ))}
                      </div>
                      <TextInput value={q13Text} onChange={(v) => setQ13Text(v)} placeholder="Ваш варіант або уточнення..." />
                    </div>
                  </div>
                )}

                {step === 8 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <QuestionLabel required>Назвіть ОДНУ річ, яку нам варто виправити в першу чергу:</QuestionLabel>
                      <TextInput value={data.q14} onChange={(v) => updateData('q14', v)} placeholder="Ваша відповідь..." />
                    </div>
                    <div className="space-y-3">
                      <QuestionLabel required>Чи повернулися б ви до Marmoo знову?</QuestionLabel>
                      <div className="flex flex-col gap-2.5">
                        {["Обов'язково", 'Скоріш за все так', 'Є сумніви / Поки ні'].map(opt => (
                          <Pill key={opt} label={opt} selected={data.q15 === opt} onClick={() => updateData('q15', opt)} />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <QuestionLabel required>Як ви оцінюєте співвідношення ціни та якості?</QuestionLabel>
                      <div className="flex flex-col gap-2.5">
                        {['Дорого для такої якості', 'Ціна повністю виправдана', 'Дуже вигідно'].map(opt => (
                          <Pill key={opt} label={opt} selected={priceRating === opt} onClick={() => setPriceRating(opt)} />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <QuestionLabel required>Чи порекомендуєте ви Marmoo друзям?</QuestionLabel>
                      <ScaleRating value={data.q16} onChange={(v) => updateData('q16', v)} start={0} end={10} minLabel="Точно ні" maxLabel="Обов'язково" />
                    </div>
                  </div>
                )}

                {step === 9 && (
                  <div className="space-y-6">
                    {/* Питання про стать */}
                    <div className="space-y-3">
                      <QuestionLabel>Ваша стать (Опційно):</QuestionLabel>
                      <div className="flex gap-3">
                        {['Жіноча', 'Чоловіча'].map(opt => (
                          <Pill key={opt} label={opt} selected={gender === opt} onClick={() => setGender(gender === opt ? null : opt)} />
                        ))}
                      </div>
                    </div>

                    {/* Питання про вік */}
                    <div className="space-y-3 pt-2">
                      <QuestionLabel>Ваш вік (Опційно):</QuestionLabel>
                      <div className="flex flex-wrap gap-2">
                        {['до 18', '18-24', '25-34', '35-44', '45-54', '55+'].map(opt => (
                          <Pill key={opt} label={opt} selected={ageGroup === opt} onClick={() => setAgeGroup(ageGroup === opt ? null : opt)} />
                        ))}
                      </div>
                    </div>

                    {/* Поле коментаря */}
                    <div className="space-y-3 pt-2">
                      <QuestionLabel>Ваші коментарі або слова підтримки для команди (Опційно):</QuestionLabel>
                      <TextInput multiline value={data.q17} onChange={(v) => updateData('q17', v)} placeholder="Пишіть все, що думаєте..." />
                    </div>
                  </div>
                )}

                {step === 10 && (
                  <div className="text-center space-y-6 py-16 flex flex-col items-center justify-center min-h-[420px]">
                     <div className="w-20 h-20 bg-[#F4F4F6] text-[#1A1A1A] rounded-full flex items-center justify-center mb-2">
                       <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                     </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-2 tracking-wide uppercase">Дякуємо! ❤️</h1>
                    <p className="text-lg text-[#62616D] max-w-md mx-auto mb-6 font-light">
                      Ваш фідбек вже летить до шеф-кухаря та менеджерів закладу!
                    </p>
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333333] font-medium transition-all duration-200 shadow-md mt-2 text-xs uppercase tracking-[0.15em]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Заповнити ще раз
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Bottom Bar */}
        {step < 10 && (
          <div className="absolute bottom-0 w-full left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#EEEDF2] p-5 md:px-12 flex justify-between gap-4 items-center z-10">
            <div className="flex-1">
              {step > 1 && (
                <button 
                  onClick={handleBack} 
                  className="font-semibold text-sm text-[#8A8994] hover:text-[#1A1A1A] transition-colors py-2 uppercase tracking-wider" 
                  disabled={isSubmitting}
                >
                  ← Назад
                </button>
              )}
            </div>
            <div className="flex-1 flex justify-end">
              {step === 1 ? (
                <Button onClick={handleNext}>Розпочати</Button>
              ) : step === TOTAL_STEPS ? (
                <Button onClick={handleSubmit} disabled={!isStepValid() || isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Відправити"}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!isStepValid()}>Далі →</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}