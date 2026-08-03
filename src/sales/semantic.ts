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

const SERVICE_NAMES=[
  'доставка',
  'пакет',
  'пакування',
  'знижка',
  'комплімент',
  'сервісний збір',
  'чайові'
];

export function normalizeProductName(rawName:string){
  return String(rawName||'')
    .replace(/^\s*[ДD]\s+[\-–—:]?\s*/u,'')
    .replace(/\s+/g,' ')
    .trim();
}

export function isServiceProduct(name:string){
  const normalized=normalizeProductName(name).toLowerCase();
  return SERVICE_NAMES.includes(normalized);
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
    const key=`${productName.toLowerCase()}|${category.toLowerCase()}`;
    const current=grouped.get(key)||{
      date:row.date,
      productCode:row.productCode,
      productName,
      category,
      quantity:0,
      revenue:0,
      markup:0
    };
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
