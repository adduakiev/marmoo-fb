export type SemanticProductRow={
  date:string;
  productCode:string;
  productName:string;
  category:string;
  quantity:number;
  revenue:number;
  markup:number;
  markupPercent?:number;
};

const SERVICE_PATTERNS=[
  /(^|\s)доставка($|\s)/u,
  /(^|\s)самовивіз($|\s)/u,
  /(^|\s)пакет($|\s)/u,
  /пакуван/u,
  /знижк/u,
  /комплімент/u,
  /сервісн(ий|ого)?\s+збір/u,
  /чайов/u,
  /набір\s+вилка\s+ніж/u,
  /(^|\s)вилка($|\s|,)/u,
  /(^|\s)ніж($|\s|,)/u,
  /сервет/u,
  /палички/u,
  /прибор/u,
  /одноразов/u,
  /контейнер/u,
  /хозяйствен/u,
  /хозка/u
];

const DELIVERY_CATEGORY_PATTERNS=[/достав/u,/хоз/u,/пакув/u,/без категор/u];

export function normalizeProductName(rawName:string){
  let name=String(rawName||'').replace(/\s+/g,' ').trim();

  // Delivery / technical duplicate prefix.
  name=name.replace(/^\s*[ДD]\s+[\-–—:]?\s*/u,'');

  // Promotional duplicate prefixes. They represent the same dish in BI.
  name=name.replace(/^\s*(?:АКЦ(?:ІЯ)?|АКЦИЯ|АКЦІЯ|PROMO|ПРОМО)\s*[\-–—:]?\s*/iu,'');

  return name.replace(/\s+/g,' ').trim();
}

export function isServiceProduct(name:string){
  const normalized=normalizeProductName(name).toLowerCase();
  return SERVICE_PATTERNS.some(pattern=>pattern.test(normalized));
}

export function isPreferredCategory(category:string){
  const normalized=String(category||'').trim().toLowerCase();
  if(!normalized)return false;
  return !DELIVERY_CATEGORY_PATTERNS.some(pattern=>pattern.test(normalized));
}

export function selectSemanticCategory(currentCategory:string,nextCategory:string){
  const current=String(currentCategory||'').trim();
  const next=String(nextCategory||'').trim();
  if(isPreferredCategory(current))return current;
  if(isPreferredCategory(next))return next;
  return current||next||'Без категорії';
}

export function cleanProductRows<T extends SemanticProductRow>(rows:T[]):T[]{
  return rows
    .filter(row=>Number(row.quantity)>0&&Number(row.revenue)>0)
    .filter(row=>!isServiceProduct(row.productName))
    .map(row=>({
      ...row,
      productName:normalizeProductName(row.productName)
    }));
}

export function mergeSemanticProducts<T extends SemanticProductRow>(rows:T[]){
  const grouped=new Map<string,SemanticProductRow>();
  rows.forEach(row=>{
    const productName=normalizeProductName(row.productName);
    const category=String(row.category||'Без категорії').trim()||'Без категорії';
    const key=productName.toLowerCase();
    const current=grouped.get(key)||{
      date:row.date,
      productCode:row.productCode,
      productName,
      category,
      quantity:0,
      revenue:0,
      markup:0
    };
    current.category=selectSemanticCategory(current.category,category);
    current.quantity+=Number(row.quantity)||0;
    current.revenue+=Number(row.revenue)||0;
    current.markup+=Number(row.markup)||0;
    grouped.set(key,current);
  });
  return [...grouped.values()].map(row=>({
    ...row,
    markupPercent:row.revenue?row.markup/row.revenue*100:0
  }));
}
