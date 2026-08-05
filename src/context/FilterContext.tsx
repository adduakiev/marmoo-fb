import React,{createContext,useContext,useEffect,useMemo,useState,type ReactNode}from'react';
import type{PeriodKey}from'../sales/data';

export interface FilterState{
  period:PeriodKey;
  compareLFL:boolean;
  selectedChannels:string[];
  selectedCategories:string[];
  selectedProducts:string[];
  selectedDates:string[];
  selectedHours:number[];
  selectedWeekdays:number[];
  normalizeProducts:boolean;
  hideServiceItems:boolean;
  searchQuery:string;
}

interface FilterContextType{
  filters:FilterState;
  setFilters:React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters:()=>void;
  toggleChannel:(channel:string)=>void;
  toggleCategory:(category:string)=>void;
  toggleProduct:(product:string)=>void;
  toggleDate:(date:string)=>void;
  toggleHour:(hour:number)=>void;
  toggleWeekday:(weekday:number)=>void;
  toggleHeatCell:(weekday:number,hour:number)=>void;
  clearCrossFilters:()=>void;
}

const STORAGE_KEY='marmoo-intelligence-filters-v4';
const initialFilters:FilterState={
  period:'30d',
  compareLFL:true,
  selectedChannels:[],
  selectedCategories:[],
  selectedProducts:[],
  selectedDates:[],
  selectedHours:[],
  selectedWeekdays:[],
  normalizeProducts:true,
  hideServiceItems:true,
  searchQuery:''
};

function list<T>(value:unknown):T[]{return Array.isArray(value)?value as T[]:[]}
function toggle<T>(items:T[],value:T){return items.includes(value)?items.filter(item=>item!==value):[...items,value]}

function loadInitialFilters():FilterState{
  try{
    const raw=window.localStorage.getItem(STORAGE_KEY);
    if(!raw)return initialFilters;
    const saved=JSON.parse(raw)as Partial<FilterState>;
    return{
      ...initialFilters,
      ...saved,
      selectedChannels:list<string>(saved.selectedChannels),
      selectedCategories:list<string>(saved.selectedCategories),
      selectedProducts:list<string>(saved.selectedProducts),
      selectedDates:list<string>(saved.selectedDates),
      selectedHours:list<number>(saved.selectedHours).map(Number).filter(Number.isFinite),
      selectedWeekdays:list<number>(saved.selectedWeekdays).map(Number).filter(x=>Number.isFinite(x)&&x>=1&&x<=7)
    };
  }catch{return initialFilters}
}

const FilterContext=createContext<FilterContextType|undefined>(undefined);

export function FilterProvider({children}:{children:ReactNode}){
  const[filters,setFilters]=useState<FilterState>(loadInitialFilters);

  useEffect(()=>{
    try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(filters))}catch{}
  },[filters]);

  const value=useMemo<FilterContextType>(()=>({
    filters,
    setFilters,
    resetFilters:()=>{
      setFilters(initialFilters);
      try{window.localStorage.removeItem(STORAGE_KEY)}catch{}
    },
    toggleChannel:(channel:string)=>setFilters(prev=>({...prev,selectedChannels:toggle(prev.selectedChannels,channel)})),
    toggleCategory:(category:string)=>setFilters(prev=>({...prev,selectedCategories:toggle(prev.selectedCategories,category)})),
    toggleProduct:(product:string)=>setFilters(prev=>({...prev,selectedProducts:toggle(prev.selectedProducts,product)})),
    toggleDate:(date:string)=>setFilters(prev=>({...prev,selectedDates:toggle(prev.selectedDates,date)})),
    toggleHour:(hour:number)=>setFilters(prev=>({...prev,selectedHours:toggle(prev.selectedHours,hour)})),
    toggleWeekday:(weekday:number)=>setFilters(prev=>({...prev,selectedWeekdays:toggle(prev.selectedWeekdays,weekday)})),
    toggleHeatCell:(weekday:number,hour:number)=>setFilters(prev=>{
      const active=prev.selectedWeekdays.includes(weekday)&&prev.selectedHours.includes(hour);
      if(active)return{...prev,selectedWeekdays:prev.selectedWeekdays.filter(x=>x!==weekday),selectedHours:prev.selectedHours.filter(x=>x!==hour)};
      return{...prev,selectedWeekdays:[weekday],selectedHours:[hour]};
    }),
    clearCrossFilters:()=>setFilters(prev=>({...prev,selectedChannels:[],selectedCategories:[],selectedProducts:[],selectedDates:[],selectedHours:[],selectedWeekdays:[]}))
  }),[filters]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(){
  const context=useContext(FilterContext);
  if(!context)throw new Error('useFilters must be used within FilterProvider');
  return context;
}

export{initialFilters};
