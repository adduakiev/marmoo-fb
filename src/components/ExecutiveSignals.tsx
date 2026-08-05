import {CalendarDays,Clock3,CupSoda,ShoppingBasket,ShieldAlert} from 'lucide-react';
import type {IntelligencePayload} from '../sales/intelligence';
import {num,pct} from '../sales/data';

type Signal={title:string;detail:string;action:string;kind:'positive'|'warning'|'neutral';icon:any};

export default function ExecutiveSignals({data}:{data:IntelligencePayload|null}){
 const signals:Signal[]=[];
 const drinks=[...(data?.drinkAttachment||[])].sort((a,b)=>a.attachmentRate-b.attachmentRate);
 const weakestDrink=drinks[0];
 if(weakestDrink){const target=weakestDrink.channel==='Зал'?60:weakestDrink.channel==='Самовивіз'?40:45;const gap=weakestDrink.attachmentRate-target;signals.push({title:`Напої: ${weakestDrink.channel}`,detail:`Напій є лише у ${pct(weakestDrink.attachmentRate)} чеків. ${pct(weakestDrink.foodOnlyRate)} чеків містять тільки їжу.`,action:gap<0?'Додати обов’язкову крос-пропозицію напою та перевірити комбо.':'Зберегти поточну механіку допродажу.',kind:gap<0?'warning':'positive',icon:CupSoda})}
 const pair=[...(data?.basketPairs||[])].filter(x=>x.coOccurrence>=5).sort((a,b)=>b.coOccurrence-a.coOccurrence||b.lift-a.lift)[0];
 if(pair)signals.push({title:'Найсильніша комбінація',detail:`«${pair.itemA}» + «${pair.itemB}» зустрілись у ${num(pair.coOccurrence)} чеках, lift ${pair.lift.toFixed(2)}.`,action:'Перевірити цю пару як готове комбо або підказку персоналу.',kind:'positive',icon:ShoppingBasket});
 const heat=data?.heatmap||[];
 const peak=[...heat].sort((a,b)=>b.orders-a.orders)[0],weak=[...heat].filter(x=>x.orders>0).sort((a,b)=>a.orders-b.orders)[0];
 if(peak)signals.push({title:'Пік навантаження',detail:`${peak.weekday}, ${peak.hour}:00 — ${num(peak.orders)} чеків у вибірці.`,action:'Посилити готовність кухні, заготівлі та команду перед цим слотом.',kind:'neutral',icon:Clock3});
 if(weak)signals.push({title:'Слабкий операційний слот',detail:`${weak.weekday}, ${weak.hour}:00 — лише ${num(weak.orders)} чеків у вибірці.`,action:'Розглянути точкову активацію без знижки на весь день.',kind:'warning',icon:CalendarDays});
 const risk=(data?.customerProfiles||[]).filter(x=>x.segment==='У ризику'||x.segment==='Сплячі');
 if(risk.length)signals.push({title:'Клієнти для повернення',detail:`У сегментах ризику та сплячих — ${num(risk.length)} клієнтів.`,action:'Підготувати окрему реактиваційну комунікацію без масової розсилки всій базі.',kind:'warning',icon:ShieldAlert});
 return <section className="mb-6 rounded-[28px] border border-white/10 bg-white/[.055] p-5 md:p-7"><div className="mb-5"><h2 className="text-2xl font-black text-[#d8f4f2]">Сигнали з усієї системи</h2><p className="mt-1 text-sm text-white/50">Кошик, клієнти, напої та операційне навантаження · без COST</p></div><div className="grid gap-4 lg:grid-cols-2">{signals.length?signals.slice(0,6).map((x,i)=>{const Icon=x.icon;return <div key={`${x.title}-${i}`} className={`rounded-2xl border p-5 ${x.kind==='positive'?'border-emerald-200/20 bg-emerald-100/10':x.kind==='warning'?'border-rose-200/20 bg-rose-100/10':'border-white/10 bg-white/[.04]'}`}><div className="flex items-start gap-3"><Icon className={x.kind==='warning'?'mt-1 text-rose-200':x.kind==='positive'?'mt-1 text-emerald-200':'mt-1 text-[#cfeeed]'}/><div><h3 className="font-black">{x.title}</h3><p className="mt-2 text-sm text-white/65">{x.detail}</p><p className="mt-3 text-sm font-bold text-[#cfeeed]">Дія: {x.action}</p></div></div></div>}):<p className="text-sm text-white/45">Intelligence snapshot ще не згенерований.</p>}</div></section>
}
