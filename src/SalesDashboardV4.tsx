import React,{useEffect}from'react';
import SalesDashboardV3 from'./SalesDashboardV3';
import{cleanProductRows,normalizeProductName,selectSemanticCategory}from'./sales/semantic';

const nativeFetch=window.fetch.bind(window);
let installed=false;

function normalizeProducts(payload:any){
  if(!payload||!Array.isArray(payload.productsDaily))return payload;
  const cleaned=cleanProductRows(payload.productsDaily);
  const grouped=new Map<string,any>();

  cleaned.forEach((row:any)=>{
    const productName=normalizeProductName(row.productName);
    const category=String(row.category||'Без категорії').trim()||'Без категорії';
    const date=String(row.date||'');

    // Same dish is merged across delivery, promo and normal categories.
    const key=`${date}|${productName.toLowerCase()}`;
    const current=grouped.get(key)||{
      ...row,
      productCode:`semantic:${productName.toLowerCase()}`,
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
    current.markupPercent=current.revenue?current.markup/current.revenue*100:0;
    grouped.set(key,current);
  });

  return{
    ...payload,
    productsDaily:[...grouped.values()]
  };
}

function installSemanticFetch(){
  if(installed)return;
  installed=true;
  window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
    const response=await nativeFetch(input,init);
    const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
    if(!url.includes('sales-data.json'))return response;
    const raw=await response.clone().json();
    const normalized=normalizeProducts(raw);
    return new Response(JSON.stringify(normalized),{
      status:response.status,
      statusText:response.statusText,
      headers:{'Content-Type':'application/json','Cache-Control':'no-store'}
    });
  };
}

export default function SalesDashboardV4(){
  installSemanticFetch();
  useEffect(()=>()=>{},[]);
  return <SalesDashboardV3/>;
}
