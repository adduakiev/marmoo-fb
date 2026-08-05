const rules:Array<[RegExp,string]>=[
 [/зал|без доставки|restaurant|offline/iu,'Зал'],
 [/glovo/iu,'Glovo'],
 [/bolt/iu,'Bolt'],
 [/самовив|pickup|takeaway/iu,'Самовивіз'],
 [/власна доставка|кур.?єр|курьер|own delivery/iu,'Власна доставка']
];

export function normalizeChannel(value:unknown){
 const raw=String(value??'').trim();
 if(!raw)return'Без каналу';
 const match=rules.find(([pattern])=>pattern.test(raw));
 return match?.[1]||raw;
}

export const STANDARD_CHANNELS=['Зал','Glovo','Bolt','Самовивіз','Власна доставка'];
