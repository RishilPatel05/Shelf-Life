import React from 'react';
import { FoodItem, Category } from '../types';

interface FoodCardProps {
  item: FoodItem;
  onDelete: (id: string) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item, onDelete }) => {
  const expiry = new Date(item.expiryDate);
  const today = new Date();
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  let statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
  let statusText = `${diffDays}d left`;
  let dotColor = "bg-emerald-500";
  
  if (diffDays < 0) {
    statusColor = "bg-rose-50 text-rose-700 border-rose-100";
    statusText = "Expired";
    dotColor = "bg-rose-500";
  } else if (diffDays <= 3) {
    statusColor = "bg-amber-50 text-amber-700 border-amber-100";
    statusText = "Warning";
    dotColor = "bg-amber-500";
  }

  const categoryLabels: Record<Category, string> = {
    'Fridge': 'Fridge',
    'Pantry': 'Pantry',
    'Freezer': 'Freezer',
    'Cabinet': 'Cabinet',
    'Countertop': 'Counter',
    'Spice Rack': 'Spices'
  };

  const formattedPrice = item.price !== undefined ? `$${item.price.toFixed(2)}` : '--';

  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative">
      <div className="flex justify-between items-start mb-6">
        <div className="max-w-[75%]">
          <div className="flex items-center gap-2.5 mb-2">
             <h3 className="font-bold text-slate-900 text-lg capitalize truncate group-hover:text-emerald-600 transition-colors">
              {item.name}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">
              {categoryLabels[item.category]}
            </span>
            <span className="text-slate-200 font-bold">•</span>
            <span className="text-xs font-semibold text-slate-500">
              {item.quantity}
            </span>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-[10px] font-black uppercase tracking-wider ${statusColor}`}>
          <div className={`w-2 h-2 rounded-full ${dotColor} ${diffDays <= 3 ? 'animate-pulse' : ''}`}></div>
          {statusText}
        </div>
      </div>
      
      <div className="mt-8 pt-5 border-t border-slate-50 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Value</span>
          <span className="text-sm font-bold text-emerald-600">
            {formattedPrice}
          </span>
        </div>
        
        <div className="flex flex-col items-end mr-auto ml-6">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Expires</span>
          <span className="text-sm font-bold text-slate-700">
            {new Date(item.expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="bg-slate-50 p-3 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90 border border-transparent hover:border-rose-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};