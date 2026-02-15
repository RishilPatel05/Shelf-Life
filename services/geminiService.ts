import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem, Recipe, ScannedItem, Category } from "../types";

// Helper to ensure we always use the latest key if it changes at runtime
const getApiKey = () => process.env.API_KEY || '';

// --- CONFIGURATION ---
// The URL of the Python Backend (FastAPI)
const BACKEND_URL = 'https://shelf-life-sfhacks.vercel.app';

// --- FALLBACK MOCK DATA ---
const MOCK_SCANNED_ITEMS: ScannedItem[] = [
  { name: "Organic Bananas", quantity: "1 bunch", category: "Countertop", estimatedExpiryDays: 5, estimatedPrice: 2.99 },
  { name: "Avocados", quantity: "3 units", category: "Countertop", estimatedExpiryDays: 4, estimatedPrice: 4.50 },
  { name: "Sourdough Bread", quantity: "1 loaf", category: "Pantry", estimatedExpiryDays: 5, estimatedPrice: 5.49 },
  { name: "Cage-Free Eggs", quantity: "12 count", category: "Fridge", estimatedExpiryDays: 21, estimatedPrice: 6.99 },
  { name: "Almond Milk", quantity: "1 carton", category: "Fridge", estimatedExpiryDays: 7, estimatedPrice: 3.99 },
  { name: "Greek Yogurt", quantity: "2 cups", category: "Fridge", estimatedExpiryDays: 14, estimatedPrice: 1.50 }
];

const MOCK_RECIPES: Recipe[] = [
  {
    title: "Quick Pantry Pasta",
    ingredients: ["Pasta", "Olive Oil", "Garlic", "Chili Flakes", "Parmesan"],
    instructions: [
      "Boil pasta in salted water until al dente.",
      "Sauté sliced garlic and chili flakes in generous olive oil.",
      "Toss pasta with the oil, add some pasta water to emulsify.",
      "Serve topped with parmesan cheese."
    ],
    estimatedTime: "15 mins",
    difficulty: "Easy",
    youtubeUrl: "https://www.youtube.com/results?search_query=aglio+e+olio+pasta"
  },
  {
    title: "Everything Fried Rice",
    ingredients: ["Rice", "Eggs", "Soy Sauce", "Mixed Vegetables", "Onion"],
    instructions: [
      "Sauté onions and any hard vegetables until soft.",
      "Push veggies to side, scramble eggs in the pan.",
      "Add cooked rice and soy sauce, mix everything together on high heat.",
      "Season with pepper and sesame oil if available."
    ],
    estimatedTime: "20 mins",
    difficulty: "Easy",
    youtubeUrl: "https://www.youtube.com/results?search_query=easy+fried+rice"
  },
  {
    title: "Classic Grilled Cheese & Tomato Soup",
    ingredients: ["Bread", "Cheese", "Butter", "Tomato Soup (Canned or Fresh)"],
    instructions: [
      "Butter bread slices on the outside.",
      "Place cheese between slices and grill in a pan until golden brown.",
      "Heat up tomato soup gently.",
      "Serve the crispy sandwich with soup for dipping."
    ],
    estimatedTime: "10 mins",
    difficulty: "Easy",
    youtubeUrl: "https://www.youtube.com/results?search_query=grilled+cheese+and+tomato+soup"
  }
];

/**
 * Standard International Shelf Life (Days) for common food items.
 */
const STANDARD_SHELF_LIFE: Record<string, number> = {
  // Produce
  'tomato': 5, 'tomatoes': 5,
  'milk': 7,
  'egg': 21, 'eggs': 21,
  'bread': 5,
  'spinach': 5, 'lettuce': 7, 'kale': 7,
  'cucumber': 7,
  'apple': 30, 'apples': 30,
  'banana': 5, 'bananas': 5,
  'strawberry': 3, 'strawberries': 3,
  'blueberry': 7, 'blueberries': 7,
  'raspberry': 2, 'raspberries': 2,
  'grapes': 10,
  'orange': 14, 'oranges': 14,
  'lemon': 21, 'lemons': 21,
  'avocado': 4, 'avocados': 4,
  'broccoli': 7, 'cauliflower': 7,
  'mushroom': 5, 'mushrooms': 5,
  'potato': 60, 'potatoes': 60,
  'onion': 30, 'onions': 30,
  'garlic': 90,
  'carrot': 21, 'carrots': 21,
  'bell pepper': 7, 'peppers': 7,
  'zucchini': 5, 'asparagus': 4, 'celery': 14, 'corn': 3,
  
  // Proteins
  'chicken': 2, 'beef': 3, 'pork': 3, 'fish': 2,
  'ham': 5, 'salami': 30, 'bacon': 7, 'tofu': 7,
  
  // Dairy/Fridge
  'yogurt': 14, 'cheese': 21, 'butter': 60, 'cream': 7,
  'hummus': 7, 'juice': 10,
  
  // Pantry
  'rice': 365, 'pasta': 365, 'flour': 365, 'sugar': 730,
  'salt': 1000, 'pepper': 365, 'spice': 365, 'oil': 180,
  'cereal': 180, 'coffee': 365, 'tea': 730,
};

export const getStandardShelfLifeDays = (name: string): number => {
  const normalized = name.toLowerCase().trim();
  if (STANDARD_SHELF_LIFE[normalized]) return STANDARD_SHELF_LIFE[normalized];
  for (const [key, days] of Object.entries(STANDARD_SHELF_LIFE)) {
    if (normalized.includes(key)) return days;
  }
  return 7;
};

const calculateDaysUntil = (dateStr: string | null | undefined, itemName?: string): number => {
  if (!dateStr || dateStr.trim() === "") {
    return itemName ? getStandardShelfLifeDays(itemName) : 7;
  }
  try {
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) {
      console.warn(`Invalid date format received: ${dateStr}, using standard shelf life.`);
      return itemName ? getStandardShelfLifeDays(itemName) : 7;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    return itemName ? getStandardShelfLifeDays(itemName) : 7;
  }
};

/**
 * Normalizes the category string from the API/Backend to match the app's internal Category type.
 */
const normalizeCategory = (inputCategory: string | undefined | null): Category => {
  if (!inputCategory) return 'Fridge';
  
  const cat = inputCategory.toLowerCase().trim();
  
  // Freezers
  if (cat.includes('freez') || cat.includes('ice') || cat.includes('frozen')) return 'Freezer';
  
  // Spice Rack
  if (cat.includes('spice') || cat.includes('herb') || cat.includes('season') || cat.includes('salt') || cat.includes('pepper')) return 'Spice Rack';
  
  // Countertop
  if (cat.includes('counter') || cat.includes('fruit') || cat.includes('banana') || cat.includes('bread') || cat.includes('avocado')) return 'Countertop';
  
  // Pantry
  if (
    cat.includes('pantry') || cat.includes('can') || cat.includes('dry') || 
    cat.includes('box') || cat.includes('snack') || cat.includes('baking') || 
    cat.includes('cereal') || cat.includes('rice') || cat.includes('pasta') || 
    cat.includes('oil') || cat.includes('sugar') || cat.includes('flour')
  ) return 'Pantry';
  
  // Cabinet (Dishes, non-food, or specific storage)
  if (cat.includes('cabinet') || cat.includes('plate') || cat.includes('dish') || cat.includes('utensil')) return 'Cabinet';
  
  // Default to Fridge for most perishables (Produce, Dairy, Meat)
  // Logic: if it's not any of the above specific ones, assume it needs cooling.
  return 'Fridge'; 
};

export const analyzeReceiptOrGroceryImage = async (base64Image: string): Promise<ScannedItem[]> => {
  try {
    console.log(`Starting OCR analysis using backend at: ${BACKEND_URL}`);
    
    // Prepare File object for Multipart Upload
    const res = await fetch(`data:image/jpeg;base64,${base64Image}`);
    const blob = await res.blob();
    const file = new File([blob], "receipt.jpg", { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', file);

    // 1. Attempt Connection to Backend
    // This connects the frontend to the backend repo provided.
    let data;
    try {
      const response = await fetch(`${BACKEND_URL}/ai-ocr`, {
        method: 'POST',
        body: formData,
        headers: { 
          'Accept': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error(`Backend responded with status ${response.status}: ${response.statusText}`);
      }
      
      data = await response.json();
      console.log("Backend Connection Successful. Data:", data);

    } catch (backendError) {
      console.warn("Primary backend unavailable. Switching to Gemini Fallback.");
      throw new Error("BACKEND_CONNECTION_FAILED"); // Trigger fallback
    }

    // Process Backend Data
    const itemsArray = Array.isArray(data) ? data : (data.items || data.grocery_list || data.list || []);
    
    return itemsArray.map((item: any) => {
      const name = item.name || item.item || item.food_item || "Unidentified Item";
      const rawDate = item.expiration_date || item.expiry_date || item.expiry || item.expires_on;
      
      // Improve price extraction: prefer total_price, then price, then cost
      // Ensure we don't accidentally pick up unit_price if total_price is available
      const price = parseFloat(item.total_price || item.total || item.price || item.cost || item.estimatedPrice || 0);
      
      // Normalize category to ensure it fits into Fridge, Pantry, etc.
      const category = normalizeCategory(item.category || item.type);

      return {
        name,
        quantity: item.quantity || item.qty || "1 unit",
        category: category,
        estimatedExpiryDays: calculateDaysUntil(rawDate, name),
        estimatedPrice: price
      };
    });

  } catch (error: any) {
    // 2. Fallback: Google Gemini API (Direct)
    console.log("Attempting Direct Gemini Fallback...");
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: `Extract food items from this receipt. 
            Return a JSON array with these exact fields:
            - name (string)
            - quantity (string, e.g. "1 unit", "10 count")
            - category (string, exactly one of: Fridge, Pantry, Freezer, Cabinet, Countertop, Spice Rack)
            - estimatedExpiryDays (number)
            - estimatedPrice (number, ONLY use the final total price for the line item. Do NOT use the unit price. Example: if line says "2 @ $0.89 $1.78", use 1.78).
            
            Ignore non-food items like "Tax", "Total", "Subtotal", "Card", "Auth", "Change".` }
          ]
        },
        config: { responseMimeType: "application/json", temperature: 0.1 }
      });
      const parsed = JSON.parse(fallbackResponse.text || "[]");
      if (parsed.length > 0) return parsed;
      throw new Error("Empty Gemini response");

    } catch (geminiError: any) {
      // 3. Ultimate Fallback: Mock Data
      // Gracefully handle Quota limits (429) or other API errors
      console.warn("Gemini API unavailable (Quota/Error). Using offline mock data.", geminiError.message);
      return MOCK_SCANNED_ITEMS;
    }
  }
};

export const generateRecipes = async (items: FoodItem[]): Promise<Recipe[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const itemNames = items.map(i => `${i.name}`).join(", ");
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 3 recipes for: ${itemNames}. 
      Return a JSON array with these exact fields:
      - title (string)
      - ingredients (array of strings)
      - instructions (array of strings)
      - estimatedTime (string)
      - difficulty (string)
      - youtubeSearchQuery (string: a concise search query to find a video tutorial for this specific recipe, e.g. "how to make creamy mushroom pasta")`,
      config: { responseMimeType: "application/json" }
    });
    
    const rawRecipes = JSON.parse(response.text || "[]");
    
    // Transform to ensure valid YouTube Search URLs
    return rawRecipes.map((r: any) => ({
      title: r.title,
      ingredients: r.ingredients,
      instructions: r.instructions,
      estimatedTime: r.estimatedTime,
      difficulty: r.difficulty,
      // Fallback to a constructed search URL using the title if the specific query is missing
      youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(r.youtubeSearchQuery || r.title + " recipe tutorial")}`
    }));

  } catch (error: any) {
    console.warn("Recipe Generation API unavailable. Using offline mock recipes.", error.message);
    return MOCK_RECIPES;
  }
};