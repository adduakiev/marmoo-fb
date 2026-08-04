import React,{createContext,useContext,useMemo,useState,type ReactNode}from'react';
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

const initialFilters:FilterState={
  period:'30d',
  compareLFL:true,
  selectedChannels:[],
  selectedCategories:[],
  normalizeProducts:true,
  hideServiceItems:true,
  searchQuery:''
};

const FilterContext=createContext<FilterContextType|undefined>(undefined);

export function FilterProvider({children}:{children:ReactNode}){
  const[filters,setFilters]=useState<FilterState>(initialFilters);

  const value=useMemo<FilterContextType>(()=>({
    filters,
    setFilters,
    resetFilters:()=>setFilters(initialFilters),
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
