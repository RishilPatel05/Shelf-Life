import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FoodItem, Recipe, Category } from './types';
import { analyzeReceiptOrGroceryImage, generateRecipes, getStandardShelfLifeDays } from './services/geminiService';
import { Button } from './components/Button';
import { FoodCard } from './components/FoodCard';
import { RecipeCard } from './components/RecipeCard';

// Helper to merge quantity strings (e.g., "1 unit" + "2 units" -> "3 units")
const mergeQuantities = (qty1: string, qty2: string): string => {
  const parse = (str: string) => {
    // Matches "1.5 kg", "2 units", "10"
    const match = str.trim().match(/^([\d.]+)\s*(.*)$/);
    if (match) {
      const val = parseFloat(match[1]);
      if (isNaN(val)) return null;
      // Normalize unit: lowercase, remove trailing 's'
      const unit = match[2].trim().toLowerCase().replace(/s$/, '');
      return { val, unit };
    }
    return null;
  };

  const p1 = parse(qty1);
  const p2 = parse(qty2);

  // If both are parseable and have same (or empty) unit
  if (p1 && p2 && p1.unit === p2.unit) {
    const total = p1.val + p2.val;
    // Re-add 's' if plural and unit exists
    const unitSuffix = (p1.unit && total !== 1) ? 's' : '';
    const unit = p1.unit ? `${p1.unit}${unitSuffix}` : '';
    return `${total} ${unit}`.trim();
  }

  // Fallback: distinct units or non-numeric, just concatenate nicely
  return `${qty1} + ${qty2}`;
};

const App: React.FC = () => {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [view, setView] = useState<'inventory' | 'recipes' | 'scan'>('inventory');
  const [isScanning, setIsScanning] = useState(false);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expiring' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'expiry' | 'name' | 'added'>('expiry');
  
  // Quick Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<Category>('Fridge');
  const [newItemQuantity, setNewItemQuantity] = useState('1 unit');
  const [newItemExpiry, setNewItemExpiry] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(''); // New state for price
  const [isExpiryManuallySet, setIsExpiryManuallySet] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatic International Standard Expiry Lookup for Manual Entry
  useEffect(() => {
    if (isAddModalOpen && newItemName && !isExpiryManuallySet) {
      const days = getStandardShelfLifeDays(newItemName);
      const d = new Date();
      d.setDate(d.getDate() + days);
      setNewItemExpiry(d.toISOString().split('T')[0]);
    }
  }, [newItemName, isAddModalOpen, isExpiryManuallySet]);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('shelf-life-items');
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      const mockItems: FoodItem[] = [
        { id: '1', name: 'Almond Milk', category: 'Fridge', expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], quantity: '1L', addedAt: new Date().toISOString(), price: 3.99 },
        { id: '2', name: 'Fresh Spinach', category: 'Fridge', expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], quantity: '200g', addedAt: new Date().toISOString(), price: 2.49 },
        { id: '3', name: 'Basmati Rice', category: 'Pantry', expiryDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], quantity: '2kg', addedAt: new Date().toISOString(), price: 8.50 },
      ];
      setItems(mockItems);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('shelf-life-items', JSON.stringify(items));
  }, [items]);

  // Smart Add Function: Merges duplicates if name, category, and expiry match
  const addFoodItems = (newItemsData: Omit<FoodItem, 'id' | 'addedAt'>[]) => {
    setItems(prevItems => {
      let updatedItems = [...prevItems];
      const itemsToAdd: FoodItem[] = [];

      newItemsData.forEach(newItem => {
        // Find exact match
        const existingIndex = updatedItems.findIndex(i => 
          i.name.toLowerCase().trim() === newItem.name.toLowerCase().trim() &&
          i.category === newItem.category &&
          i.expiryDate === newItem.expiryDate
        );

        if (existingIndex !== -1) {
          // Merge with existing item
          const existingItem = updatedItems[existingIndex];
          updatedItems[existingIndex] = {
            ...existingItem,
            quantity: mergeQuantities(existingItem.quantity, newItem.quantity),
            price: (existingItem.price || 0) + (newItem.price || 0),
            addedAt: new Date().toISOString() // Update timestamp to reflect restocking
          };
        } else {
          // Add as new item
          itemsToAdd.push({
            ...newItem,
            id: Math.random().toString(36).substr(2, 9),
            addedAt: new Date().toISOString()
          });
        }
      });

      return [...itemsToAdd, ...updatedItems];
    });
    
    // Reset view filters to ensure user sees the update
    if (activeCategory !== 'All' && newItemsData.some(i => i.category !== activeCategory)) {
      setActiveCategory('All');
    }
    if (filterType !== 'all') {
      setFilterType('all');
    }
    setSearchQuery('');
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    let finalExpiry = newItemExpiry;
    
    // If the user didn't want to add/touch the expiry date, calculate it automatically
    if (!finalExpiry) {
      const days = getStandardShelfLifeDays(newItemName);
      const d = new Date();
      d.setDate(d.getDate() + days);
      finalExpiry = d.toISOString().split('T')[0];
    }
    
    addFoodItems([{
      name: newItemName.trim(),
      category: newItemCategory,
      quantity: newItemQuantity,
      expiryDate: finalExpiry,
      price: parseFloat(newItemPrice) || 0
    }]);
    
    // Reset state
    setNewItemName('');
    setNewItemQuantity('1 unit');
    setNewItemExpiry('');
    setNewItemPrice('');
    setIsExpiryManuallySet(false);
    setIsAddModalOpen(false);
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setView('scan');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result?.toString().split(',')[1];
      if (base64) {
        try {
          const scanned = await analyzeReceiptOrGroceryImage(base64);
          const newItems = scanned.map(s => ({
            name: s.name,
            category: s.category,
            quantity: s.quantity,
            expiryDate: new Date(Date.now() + s.estimatedExpiryDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price: s.estimatedPrice || 0
          }));
          
          addFoodItems(newItems);
          setView('inventory');
        } catch (error: any) {
          console.error(error);
          let msg = 'Error analyzing image. Please try again.';
          if (error.message.includes('Quota')) {
            msg = 'AI Limit Reached: The scanning service is currently busy. Please try manual add for now.';
          }
          alert(msg);
          setView('inventory');
        } finally {
          setIsScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateRecipes = async () => {
    if (items.length === 0) return;
    setIsGeneratingRecipes(true);
    setView('recipes');
    try {
      const results = await generateRecipes(items);
      setRecipes(results);
    } catch (error) {
      alert('Could not load recipes at this time.');
    } finally {
      setIsGeneratingRecipes(false);
    }
  };

  const filteredItems = useMemo(() => {
    const filtered = items.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || i.category === activeCategory;
      const expiry = new Date(i.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let matchesFilter = true;
      if (filterType === 'expiring') matchesFilter = diff <= 3 && diff >= 0;
      if (filterType === 'expired') matchesFilter = diff < 0;

      return matchesSearch && matchesCategory && matchesFilter;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'expiry':
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        case 'added':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        default:
          return 0;
      }
    });
  }, [items, searchQuery, activeCategory, filterType, sortBy]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const total = items.length;
    const expiredCount = items.filter(i => new Date(i.expiryDate) < today).length;
    
    // Calculate values
    const totalValue = items.reduce((sum, item) => sum + (item.price || 0), 0);
    const wastedValue = items.filter(i => new Date(i.expiryDate) < today).reduce((sum, item) => sum + (item.price || 0), 0);
    
    const freshPercent = total > 0 ? Math.round(((total - expiredCount) / total) * 100) : 100;

    return {
      total,
      expiring: items.filter(i => {
        const diff = Math.ceil((new Date(i.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff <= 3 && diff >= 0;
      }).length,
      expired: expiredCount,
      freshPercent,
      fridge: items.filter(i => i.category === 'Fridge').length,
      totalValue,
      wastedValue
    };
  }, [items]);

  const allCategories: (Category | 'All')[] = ['All', 'Fridge', 'Pantry', 'Freezer', 'Cabinet', 'Countertop', 'Spice Rack'];

  return (
    <div className="min-h-screen bg-[#FDFDFE] pb-24 md:pb-8 flex flex-col font-['Inter']">
      {/* Mesh Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200 blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-blue-100 blur-[100px]"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100 px-4 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-xl text-white shadow-lg shadow-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Shelf Life</h1>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Master Your Kitchen</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 bg-slate-100/50 p-1 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setView('inventory')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${view === 'inventory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Inventory
            </button>
            <button 
              onClick={() => setView('recipes')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${view === 'recipes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Smart Recipes
            </button>
          </div>

          <div className="hidden md:block">
            <Button variant="primary" className="rounded-xl px-6" onClick={() => fileInputRef.current?.click()}>
              Scan New Groceries
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {/* Dashboard Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div 
            onClick={() => {setFilterType('all'); setView('inventory');}}
            className={`p-5 rounded-3xl transition-all cursor-pointer border ${filterType === 'all' ? 'bg-white border-emerald-500 ring-4 ring-emerald-50 shadow-xl shadow-emerald-50' : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'}`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="p-2 bg-slate-50 rounded-lg text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
              </span>
              <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Total Assets</p>
          </div>

          <div 
            onClick={() => {setFilterType('expiring'); setView('inventory');}}
            className={`p-5 rounded-3xl transition-all cursor-pointer border ${filterType === 'expiring' ? 'bg-white border-amber-500 ring-4 ring-amber-50 shadow-xl shadow-amber-50' : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'}`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="p-2 bg-amber-50 rounded-lg text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="text-2xl font-black text-amber-600">{stats.expiring}</span>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Expiring Soon</p>
          </div>

          <div 
            onClick={() => {setFilterType('expired'); setView('inventory');}}
            className={`p-5 rounded-3xl transition-all cursor-pointer border ${filterType === 'expired' ? 'bg-white border-rose-500 ring-4 ring-rose-50 shadow-xl shadow-rose-50' : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'}`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="p-2 bg-rose-50 rounded-lg text-rose-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="text-2xl font-black text-rose-600">{stats.expired}</span>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Expired Items</p>
          </div>

          {/* MONEY MANAGEMENT CARD (Replaces Waste Impact) */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-5 rounded-3xl shadow-xl shadow-emerald-200 text-white relative overflow-hidden hidden lg:block transition-all duration-300 hover:scale-[1.02] cursor-default group">
            <svg className="absolute -right-6 -bottom-6 h-32 w-32 text-white/10 group-hover:scale-110 transition-transform duration-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1 opacity-80">Kitchen Value</p>
                <h3 className="text-3xl font-black tracking-tight animate-in fade-in">
                  ${stats.totalValue.toFixed(2)}
                </h3>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-bold uppercase text-emerald-200">Wasted Money</p>
                   <p className="text-lg font-bold text-rose-300">-${stats.wastedValue.toFixed(2)}</p>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-100" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                   </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {view === 'inventory' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="relative flex-1 max-w-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  type="text" 
                  placeholder="Search your ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 transition-all outline-none text-slate-700 shadow-sm"
                />
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
                <div className="relative min-w-[140px]">
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full appearance-none pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 cursor-pointer shadow-sm hover:border-emerald-200 transition-all"
                  >
                    <option value="expiry">Expiring Soon</option>
                    <option value="added">Recently Added</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200 whitespace-nowrap">
                  {allCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                        activeCategory === cat 
                        ? 'bg-white text-emerald-600 border-blue-600 shadow-md scale-[1.02]' 
                        : 'text-slate-500 hover:text-slate-700 border-transparent'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  className="rounded-xl whitespace-nowrap shadow-sm hover:border-emerald-500 hover:text-emerald-600"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  Quick Add
                </Button>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-slate-200 shadow-inner">
                <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 mb-2">No Items Found</h2>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">Try changing your filters, add an item manually, or scan a new receipt.</p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" className="rounded-2xl px-8" onClick={() => setIsAddModalOpen(true)}>Manual Add</Button>
                  <Button variant="primary" className="rounded-2xl px-10 py-4 shadow-xl" onClick={() => fileInputRef.current?.click()}>
                    Scan with AI
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(item => (
                  <FoodCard key={item.id} item={item} onDelete={deleteItem} />
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'recipes' && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">AI Chef Suggestions</h2>
                <p className="text-slate-500 text-sm">Personalized recipes based on what's in your pantry right now.</p>
              </div>
              
              <div className="flex items-center gap-4">
                <Button 
                  variant="primary" 
                  className="rounded-2xl shadow-xl shadow-emerald-100 px-8 py-3"
                  onClick={handleGenerateRecipes}
                  isLoading={isGeneratingRecipes}
                >
                  Refresh Suggestions
                </Button>
              </div>
            </div>
            
            {isGeneratingRecipes ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm h-[400px] flex flex-col space-y-4">
                    <div className="h-40 bg-slate-100 animate-pulse rounded-2xl w-full"></div>
                    <div className="h-6 bg-slate-100 animate-pulse rounded-lg w-3/4"></div>
                    <div className="h-4 bg-slate-100 animate-pulse rounded-lg w-1/2"></div>
                    <div className="h-20 bg-slate-100 animate-pulse rounded-2xl w-full"></div>
                    <div className="h-10 bg-slate-100 animate-pulse rounded-xl w-full mt-auto"></div>
                  </div>
                ))}
              </div>
            ) : recipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {recipes.map((recipe, idx) => (
                  <RecipeCard key={idx} recipe={recipe} />
                ))}
              </div>
            ) : (
              <div className="text-center py-32">
                <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Ready to Cook?</h2>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">AI will analyze your expiring items to give you the perfect meal plan.</p>
                <Button className="rounded-2xl px-12 py-4 shadow-xl" onClick={handleGenerateRecipes}>Ask AI Chef</Button>
              </div>
            )}
          </div>
        )}

        {view === 'scan' && isScanning && (
          <div className="flex flex-col items-center justify-center py-20 space-y-10 animate-in fade-in zoom-in-90 duration-500">
            <div className="relative">
              <div className="w-64 h-64 border-8 border-slate-100 rounded-[60px] relative overflow-hidden flex items-center justify-center bg-white shadow-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                <div className="absolute inset-x-0 h-1.5 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
              <div className="absolute -top-6 -right-6 bg-white p-3 rounded-full shadow-lg border border-slate-100 animate-bounce">
                <span className="text-2xl">🤖</span>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Processing Receipt</h2>
              <p className="text-slate-500 font-medium max-w-sm">We're identifying your grocery items, matching quantities, and calculating international shelf life...</p>
            </div>
            
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
      </main>

      {/* Manual Quick Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => {
             setIsAddModalOpen(false);
             setNewItemName('');
             setIsExpiryManuallySet(false);
             setNewItemPrice('');
          }}></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <form onSubmit={handleManualAdd}>
              <div className="p-6 border-b border-slate-100 bg-emerald-50 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Add Item Manually</h2>
                  <p className="text-emerald-700 text-xs font-medium">Auto-calculates expiry based on global standards</p>
                </div>
              </div>
              
              <div className="p-6 space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Name</label>
                    <span className="text-[9px] text-emerald-500 font-bold uppercase">Smart detection enabled</span>
                  </div>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Tomato, Milk, Chicken..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all text-slate-800 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Quantity</label>
                    <input 
                      type="text" 
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                      placeholder="1 unit"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all text-slate-800"
                    />
                  </div>
                  <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Price / Cost</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Expiry Date</label>
                    <input 
                      type="date" 
                      value={newItemExpiry}
                      onChange={(e) => {
                        setNewItemExpiry(e.target.value);
                        setIsExpiryManuallySet(true);
                      }}
                      placeholder="Optional"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all text-slate-800"
                    />
                    <p className="text-[9px] text-slate-400 mt-1">Leave empty to use international standard</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Category Location</label>
                  <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-2xl gap-1">
                    {allCategories.filter(c => c !== 'All').map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewItemCategory(cat as Category)}
                        className={`py-2 rounded-xl text-[10px] font-bold transition-all ${newItemCategory === cat ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setNewItemName('');
                    setIsExpiryManuallySet(false);
                    setNewItemPrice('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="flex-[2] rounded-xl shadow-lg shadow-emerald-100"
                >
                  Add to Inventory
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-slate-900/95 backdrop-blur-xl px-8 py-5 flex justify-between items-center rounded-3xl shadow-2xl z-[100] border border-slate-800">
        <button 
          onClick={() => {setView('inventory'); setFilterType('all');}}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'inventory' ? 'text-emerald-400' : 'text-slate-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span className="text-[9px] font-bold uppercase">List</span>
        </button>
        
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-emerald-500 text-white p-5 rounded-3xl -mt-16 border-8 border-[#FDFDFE] shadow-2xl active:scale-90 transition-all duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <button 
          onClick={() => {setView('recipes'); handleGenerateRecipes();}}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'recipes' ? 'text-emerald-400' : 'text-slate-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-[9px] font-bold uppercase">Recipes</span>
        </button>
      </nav>

      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default App;