import React, { useState } from 'react';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 h-full flex flex-col group hover:shadow-xl transition-all duration-300">
        <div className="p-6 pb-2 border-b border-slate-50 relative">
          <div className="flex justify-between items-start mb-4">
             <div className="bg-slate-900 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-wider">
              {recipe.difficulty}
            </div>
          </div>
          <h3 className="font-bold text-slate-800 text-xl leading-tight group-hover:text-emerald-600 transition-colors">
            {recipe.title}
          </h3>
        </div>
        
        <div className="p-6 pt-4 flex-1 flex flex-col">
          <div className="flex items-center gap-4 mb-6 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {recipe.estimatedTime}
            </div>
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              {recipe.ingredients.length} Ingredients
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Ingredient Highlights</h4>
              <div className="flex flex-wrap gap-2">
                {recipe.ingredients.slice(0, 3).map((ing, i) => (
                  <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100 font-medium">
                    {ing}
                  </span>
                ))}
                {recipe.ingredients.length > 3 && (
                  <span className="text-xs text-slate-400 font-semibold self-center ml-1">+ {recipe.ingredients.length - 3} more</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-auto flex gap-3">
            <button 
              onClick={() => setShowModal(true)}
              className="flex-1 py-3 bg-slate-900 text-white font-bold text-sm rounded-2xl hover:bg-emerald-600 transition-all duration-300 shadow-md active:scale-[0.98]"
            >
              Step-by-Step
            </button>
            {recipe.youtubeUrl && (
              <a 
                href={recipe.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all flex items-center justify-center border border-rose-100"
                title="Watch on YouTube"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white w-full max-w-2xl max-h-[92vh] rounded-[40px] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{recipe.title}</h2>
                <div className="flex gap-3 mt-2">
                  <span className="text-emerald-600 text-xs font-bold uppercase tracking-widest">{recipe.estimatedTime}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">{recipe.difficulty}</span>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-3 bg-white hover:bg-slate-100 rounded-full shadow-sm transition-colors text-slate-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-10">
              <section>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                  <span className="w-8 h-[1px] bg-slate-200"></span>
                  Ingredients
                  <span className="w-8 h-[1px] bg-slate-200"></span>
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-600 font-medium text-sm bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0"></div>
                      {ing}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                  <span className="w-8 h-[1px] bg-slate-200"></span>
                  Method
                  <span className="w-8 h-[1px] bg-slate-200"></span>
                </h3>
                <div className="space-y-6">
                  {recipe.instructions.map((step, i) => (
                    <div key={i} className="flex gap-6 p-5 rounded-[32px] hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100">
                      <span className="font-black text-slate-200 text-4xl leading-none group-hover:text-emerald-500 transition-colors">{(i + 1).toString().padStart(2, '0')}</span>
                      <p className="text-slate-700 text-sm leading-relaxed font-medium pt-1">{step}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-4 bg-emerald-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-95"
              >
                Done
              </button>
              {recipe.youtubeUrl && (
                <a 
                  href={recipe.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-4 bg-rose-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                  </svg>
                  YouTube Guide
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};