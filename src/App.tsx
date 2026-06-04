import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { defaultFeedbackData, FeedbackData } from './types';
import { Button, Pill, StarRating, ScaleRating, TextInput, QuestionLabel } from './components/ui';
import { Loader2 } from 'lucide-react';

// Зчитуємо URL-адресу з файлу .env (підставляється автоматично під час збірки Vite)
const SCRIPT_URL = import.meta.env.VITE_API_URL || "";
const TOTAL_STEPS = 8; // Крок 9 — це екран подяки "Thank you"

export default function App() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FeedbackData>(defaultFeedbackData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Додатковий локальний стан для текстового уточнення дискомфорту (Скріншот 2)
  const [q13Text, setQ13Text] = useState('');

  const handleNext = () => {
    if (step < 9) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Об'єднуємо вибрані пігулки дискомфорту та вільний текст в один рядок для Google Таблиці
      const finalQ13 = [...data.q13];
      if (q13Text.trim()) {
        finalQ13.push(`Коментар: ${q13Text.trim()}`);
      }

      // Перетворюємо масиви мультивибору у зручні рядки через кому для стовпців Google Таблиці
      const payload = {
        q1: data.q1,
        q2: data.q2,
        q3: Array.isArray(data.q3) ? data.q3.join(', ') : data.q3,
        q4: data.q4,
        q5: data.q5,
        q6: data.q6,
        q7: Array.isArray(data.q7) ? data.q7.join(', ') : data.q7,
        q8: data.q8,
        q9: data.q9,
        q10: data.q10,
        q11: Array.isArray(data.q11) ? data.q11.join(', ') : data.q11,
        q12: data.q12,
        q13: finalQ13.join(', '), // Надійно склеюємо чекбокси + твій новий текст з поля
        q14: data.q14,
        q15: data.q15,
        q16: data.q16,
        q17: data.q17,
      };

      if (SCRIPT_URL) {
        // Надсилаємо реальний POST-запит на Google Apps Script
        await fetch(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
      } else {
        await new Promise(r => setTimeout(r, 1500));
        console.log("Форму надіслано (Режим симуляції):", payload);
      }
      setStep(9);
    } catch (error) {
      console.error("Submission failed", error);
      alert("Виникла помилка під час відправки. Будь ласка, спробуйте ще раз.");
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
      case 4: return data.q5 !== null && data.q6 !== null;
      case 5: return data.q8 !== null && data.q9 !== null;
      case 6: return data.q12 !== null;
      case 7: return data.q14.trim() !== '' && data.q15 !== null && data.q16 !== null;
      default: return true;
    }
  };

  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="min-h-screen bg-bg-app text-ink flex flex-col items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-[680px] bg-card-bg rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden relative min-h-[640px] flex flex-col">
        
        {/* Header & Progress */}
        {step > 1 && step < 9 && (
          <div className="px-6 md:px-12 pt-10 pb-2">
            <div className="flex justify-between items-center text-[13px] uppercase tracking-[0.1em] text-muted mb-3 font-medium">
              <span>Крок {step - 1} з {TOTAL_STEPS - 1}</span>
            </div>
            <div className="w-full bg-border-line rounded-full h-[6px]">
              <div 
                className="bg-brand h-full rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Content Area */}
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
                  <div className="text-center space-y-6 py-12">
                    <div>
                      <h1 className="text-4xl md:text-5xl font-serif text-ink mb-6 font-medium">
                        Привіт від команди Marmoo! 🥂
                      </h1>
                      <p className="text-lg md:text-xl text-muted leading-relaxed max-w-lg mx-auto">
                        Дякуємо, що завітали на наше технічне відкриття. Ми ще налаштовуємо процеси, тому ваша чесна думка допоможе нам стати ідеальними. Опитування займе всього 2 хвилини!
                      </p>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <QuestionLabel required>Як ви оцінюєте ваш загальний досвід сьогодні?</QuestionLabel>
                    <ScaleRating 
                      value={data.q1} 
                      onChange={(v) => updateData('q1', v)} 
                      minLabel="Жахливо" 
                      maxLabel="Ідеально" 
                    />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-10">
                    <div>
                      <QuestionLabel required>Як вам атмосфера закладу?</QuestionLabel>
                      <StarRating value={data.q2} onChange={(v) => updateData('q2', v)} />
                    </div>
                    <div>
                      <QuestionLabel>Що саме вам сподобалось в атмосфері? (Можна декілька)</QuestionLabel>
                      <div className="flex flex-wrap gap-2.5">
                        {['Музика та її гучність', 'Освітлення', "Інтер'єр та декор", 'Чистота', 'Комфортна температура', 'Усе сподобалось'].map(opt => (
                          <Pill key={opt} label={opt} selected={data.q3.includes(opt)} onClick={() => toggleMulti('q3', opt)} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <QuestionLabel>Що ми можемо покращити в залі? (Опційно)</QuestionLabel>
                      <TextInput value={data.q4} onChange={(v) => updateData('q4', v)} placeholder="Наприклад: було трохи прохолодно..." />
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-10">
                    <div>
                      <QuestionLabel required>Як ви оцінюєте роботу команди (сервіс)?</QuestionLabel>
                      <StarRating value={data.q5} onChange={(v) => updateData('q5', v)} />
                    </div>
                    <div>
                      {/* Скріншот 4: Додано третій середній варіант */}
                      <QuestionLabel required>Чи було вам комфортно взаємодіяти з персоналом?</QuestionLabel>
                      <div className="flex flex-col gap-3">
                        {[
                          'Так, усі були привітні', 
                          'Загалом все ок, але були непорозуміння', 
                          'Ні, виникли труднощі'
                        ].map(opt => (
                          <Pill key={opt} label={opt} selected={data.q6 === opt} onClick={() => updateData('q6', opt)} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <QuestionLabel>Що варто покращити в обслуговуванні? (Можна декілька)</QuestionLabel>
                      <div className="flex flex-wrap gap-2.5">
                        {['Швидкість винесення страв', 'Уважність офіціанта', 'Знання меню', 'Швидкість розрахунку', 'Усе було супер'].map(opt => (
                          <Pill key={opt} label={opt} selected={data.q7.includes(opt)} onClick={() => toggleMulti('q7', opt)} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-10">
                    <div>
                      <QuestionLabel required>Як вам смак страв та напоїв?</QuestionLabel>
                      <StarRating value={data.q8} onChange={(v) => updateData('q8', v)} />
                    </div>
                    <div>
                      <QuestionLabel required>Як ви оцінюєте подачу та вигляд страв?</QuestionLabel>
                      <StarRating value={data.q9} onChange={(v) => updateData('q9', v)} />
                    </div>
                    <div>
                      <QuestionLabel>Яка страва/напій сподобались найбільше?</QuestionLabel>
                      <TextInput value={data.q10} onChange={(v) => updateData('q10', v)} placeholder="Назва страви..." />
                    </div>
                    <div>
                      {/* Скріншот 3: Додано варіант "Усе було смачно" */}
                      <QuestionLabel>Що сподобалось найменше або потребує доопрацювання?</QuestionLabel>
                      <div className="flex flex-wrap gap-2.5">
                        {['Температура страви', 'Баланс смаку', 'Розмір порції', 'Усе було смачно'].map(opt => (
                          <Pill key={opt} label={opt} selected={data.q11.includes(opt)} onClick={() => toggleMulti('q11', opt)} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 6 && (
                  <div className="space-y-10">
                    <div>
                      {/* Скріншот 1: Виправлено текстову помилку "было" -> "було" */}
                      <QuestionLabel required>Наскільки вам було зручно перебувати в закладі?</QuestionLabel>
                      <StarRating value={data.q12} onChange={(v) => updateData('q12', v)} />
                    </div>
                    <div>
                      <QuestionLabel>Що саме викликало дискомфорт? (Опційно)</QuestionLabel>
                      <div className="flex flex-wrap gap-2.5 mb-4">
                        {['Незручні стільці', 'Столи надто близько', 'Незручне меню', 'Нюанси у вбиральні', 'Все було зручно'].map(opt => (
                          <Pill key={opt} label={opt} selected={data.q13.includes(opt)} onClick={() => toggleMulti('q13', opt)} />
                        ))}
                      </div>
                      {/* Скріншот 2: Додано нове текстове поле для вільного опису дискомфорту */}
                      <div className="pt-2">
                        <QuestionLabel>Може ще щось було незручно? Напишіть коротко:</QuestionLabel>
                        <TextInput value={q13Text} onChange={(v) => setQ13Text(v)} placeholder="Ваш варіант або уточнення..." />
                      </div>
                    </div>
                  </div>
                )}

                {step === 7 && (
                  <div className="space-y-10">
                    <div>
                      <QuestionLabel required>Назвіть ОДНУ річ, яку нам варто виправити в першу чергу:</QuestionLabel>
                      <TextInput value={data.q14} onChange={(v) => updateData('q14', v)} placeholder="Ваша відповідь..." />
                    </div>
                    <div>
                      <QuestionLabel required>Чи повернулися б ви до Marmoo знову?</QuestionLabel>
                      <div className="flex flex-wrap gap-2.5">
                        {["Так, обов'язково", 'Скоріше так', 'Ні'].map(opt => (
                          <Pill key={opt} label={opt} selected={data.q15 === opt} onClick={() => updateData('q15', opt)} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <QuestionLabel required>Чи порекомендуєте ви Marmoo друзям?</QuestionLabel>
                      <ScaleRating 
                        value={data.q16} 
                        onChange={(v) => updateData('q16', v)} 
                        start={0} end={10} 
                        minLabel="Точно ні" maxLabel="Обов'язково" 
                      />
                    </div>
                  </div>
                )}

                {step === 8 && (
                  <div>
                    <QuestionLabel>Ваші коментарі, ідеї або слова підтримки для команди (Опційно):</QuestionLabel>
                    <TextInput multiline value={data.q17} onChange={(v) => updateData('q17', v)} placeholder="Пишіть все, що думаєте..." />
                  </div>
                )}

                {step === 9 && (
                  <div className="text-center space-y-6 py-16 flex flex-col items-center justify-center min-h-[400px]">
                     <div className="w-20 h-20 bg-brand-soft text-brand rounded-full flex items-center justify-center mb-2">
                       <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                     </div>
                    <h1 className="text-3xl md:text-4xl font-serif text-ink mb-2">Дякуємо! ❤️</h1>
                    <p className="text-lg md:text-xl text-muted leading-relaxed max-w-md mx-auto">
                      Ваш фідбек вже летить до шеф-кухаря та менеджерів. Чекаємо на вас знову на офіційному відкритті!
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Bottom Bar */}
        {step < 9 && (
          <div className="absolute bottom-0 w-full left-0 right-0 bg-card-bg/90 backdrop-blur-md border-t border-border-line p-5 md:px-12 flex justify-between gap-4 items-center">
            <div className="flex-1">
              {step > 1 && step < 9 && (
                <button 
                  onClick={handleBack}
                  className="font-medium text-base text-muted hover:text-ink transition-colors px-2 py-4"
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
                  {isSubmitting ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : "Відправити"}
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