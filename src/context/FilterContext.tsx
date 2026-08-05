import React,{createContext,useContext,useEffect,useMemo,useState,type ReactNode}from'react';
import type{PeriodKey}from'../sales/data';

export interface FilterState{
  period:PeriodKey;
  compareLFL:boolean;
  selectedChannels:string[];
  selectedCategories:string[];
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
}

const STORAGE_KEY='marmoo-intelligence-filters-v2';
const initialFilters:FilterState={
  period:'30d',
  compareLFL:true,
  selectedChannels:[],
  selectedCategories:[],
  normalizeProducts:true,
  hideServiceItems:true,
  searchQuery:''
};

function loadInitialFilters():FilterState{
  try{
    const raw=window.localStorage.getItem(STORAGE_KEY);
    if(!raw)return initialFilters;
    const saved=JSON.parse(raw) as Partial<FilterState>;
    return{
      ...initialFilters,
      ...saved,
      selectedChannels:Array.isArray(saved.selectedChannels)?saved.selectedChannels:[],
      selectedCategories:Array.isArray(saved.selectedCategories)?saved.selectedCategories:[]
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
    toggleChannel:(channel:string)=>setFilters(prev=>({
      ...prev,
      selectedChannels:prev.selectedChannels.includes(channel)
        ?prev.selectedChannels.filter(item=>item!==channel)
        :[...prev.selectedChannels,channel]
    })),
    toggleCategory:(category:string)=>setFilters(prev=>({
      ...prev,
      selectedCategories:prev.selectedCategories.includes(category)
        ?prev.selectedCategories.filter(item=>item!==category)
        :[...prev.selectedCategories,category]
    }))
  }),[filters]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(){
  const context=useContext(FilterContext);
  if(!context)throw new Error('useFilters must be used within FilterProvider');
  return context;
}

export{initialFilters};
