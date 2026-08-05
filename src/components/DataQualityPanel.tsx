import {useEffect,useState} from 'react';
import {BadgeCheck,Database,ShieldCheck,TriangleAlert,UsersRound} from 'lucide-react';
import {loadIntelligence,type IntelligenceDataQuality} from '../sales/intelligence';
import {money,num,pct} from '../sales/data';

export default function DataQualityPanel(){
 const[quality,setQuality]=useState<IntelligenceDataQuality|null>(null);
 useEffect(()=>{void loadIntelligence().then(data=>setQuality(data.dataQuality||null)).catch(()=>setQuality(null))},[]);
 if(!quality)return null;
 const warnings=quality.zeroRevenueOrders+quality.duplicateOrderIds+quality.missingDateOrders+quality.ambiguousPhoneOrders;
 return <section className="mx-auto mb-6 max-w-[1600px] px-4 md:px-8"><div className="rounded-[28px] border border-white/10 bg-white/[.055] p-5 text-white md:p-7"><div className="mb-5 flex items-start gap-3"><Database className="mt-1 text-[#cfeeed]"/><div><h2 className="text-2xl font-black text-[#d8f4f2]">Якість даних</h2><p className="mt-1 text-sm text-white/50">Контроль джерела, повноти та приватності Intelligence snapshot</p></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><QualityCard icon={BadgeCheck} label="Контроль обороту" value={quality.revenueControlPassed?'Пройдено':'Помилка'} note={`${money(quality.revenueTotal)} · Δ ${money(quality.revenueControlDelta)}`} good={quality.revenueControlPassed}/><QualityCard icon={Database} label="Валідні чеки" value={num(quality.validOrders)} note={`${num(quality.totalOrders)} рядків у джерелі`} good={quality.duplicateOrderIds===0&&quality.missingDateOrders===0}/><QualityCard icon={UsersRound} label="Покриття клієнтів" value={pct(quality.phoneCoverage)} note={`${num(quality.identifiedOrders)} чеків · ${num(quality.uniqueCustomers)} клієнтів`} good={quality.phoneCoverage>=10}/><QualityCard icon={ShieldCheck} label="Приватність" value={quality.publicPhoneFieldsExposed?'Ризик':'Захищено'} note="Контакти не публікуються" good={!quality.publicPhoneFieldsExposed}/><QualityCard icon={TriangleAlert} label="Попередження" value={num(warnings)} note={`${quality.zeroRevenueOrders} нульових · ${quality.ambiguousPhoneOrders} неоднозначних`} good={warnings===0}/></div></div></section>
}

function QualityCard({icon:Icon,label,value,note,good}:{icon:any;label:string;value:string;note:string;good:boolean}){return <div className={`rounded-2xl border p-5 ${good?'border-emerald-200/20 bg-emerald-100/10':'border-amber-200/20 bg-amber-100/10'}`}><div className="flex items-center justify-between"><p className="text-xs font-black uppercase text-white/45">{label}</p><Icon size={18} className={good?'text-emerald-200':'text-amber-200'}/></div><div className="mt-2 text-2xl font-black text-[#d8f4f2]">{value}</div><p className="mt-2 text-xs text-white/50">{note}</p></div>}
