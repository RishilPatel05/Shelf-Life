import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem, Recipe, ScannedItem, Category } from "../types";

const API_KEY = process.env.API_KEY || '';

/**
 * Standard International Shelf Life (Days) for common food items.
 * These values represent typical freshness periods from purchase.
 */
const STANDARD_SHELF_LIFE: Record<string, number> = {
  'tomato': 5,
  'tomatoes': 5,
  'milk': 7,
  'egg': 21,
  'eggs': 21,
  'bread': 5,
  'spinach': 5,
  'lettuce': 7,
  'cucumber': 7,
  'apple': 30,
  'apples': 30,
  'banana': 5,
  'bananas': 5,
  'chicken': 2,
  'beef': 3,
  'pork': 3,
  'fish': 2,
  'yogurt': 14,
  'cheese': 21,
  'butter': 60,
  'potato': 60,
  'potatoes': 60,
  'onion': 30,
  'onions': 30,
  'garlic': 90,
  'carrot': 21,
  'carrots': 21,
  'broccoli': 7,
  'mushroom': 5,
  'mushrooms': 5,
  'rice': 365,
  'pasta': 365,
  'flour': 365,
  'sugar': 730,
  'salt': 1000,
  'pepper': 365,
  'spice': 365,
  'oil': 180,
  'strawberry': 3,
  'strawberries': 3,
  'blueberry': 7,
  'blueberries': 7,
  'raspberry': 2,
  'raspberries': 2,
  'grapes': 10,
  'orange': 14,
  'oranges': 14,
  'lemon': 21,
  'lemons': 21,
  'avocado': 4,
  'avocados': 4,
  'cream': 7,
  'ham': 5,
  'salami': 30,
  'bacon': 7,
  'bell pepper': 7,
  'peppers': 7,
  'zucchini': 5,
  'asparagus': 4,
  'celery': 14,
  'corn': 3,
  'kale': 7,
  'tofu': 7,
  'hummus': 7,
  'juice': 10,
  'cereal': 180,
  'coffee': 365,
  'tea': 730,
};

/**
 * Public helper to get standard shelf life days based on item name.
 */
export const getStandardShelfLifeDays = (name: string): number => {
  const normalized = name.toLowerCase().trim();
  
  // Direct match
  if (STANDARD_SHELF_LIFE[normalized]) return STANDARD_SHELF_LIFE[normalized];
  
  // Fuzzy match (check if standard key is contained in the name)
  for (const [key, days] of Object.entries(STANDARD_SHELF_LIFE)) {
    if (normalized.includes(key)) return days;
  }
  
  return 7; // Default fallback for unknown items
};

/**
 * Helper to calculate the difference in days between today and a target date string.
 * Falls back to international standards if date is missing or invalid.
 */
const calculateDaysUntil = (dateStr: string | null | undefined, itemName?: string): number => {
  if (!dateStr) {
    return itemName ? getStandardShelfLifeDays(itemName) : 7;
  }

  try {
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return itemName ? getStandardShelfLifeDays(itemName) : 7;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Sanity check: if date is in the past or way too far, check standards
    if (diffDays <= 0 && itemName) return getStandardShelfLifeDays(itemName);
    
    return diffDays > 0 ? diffDays : 0;
  } catch {
    return itemName ? getStandardShelfLifeDays(itemName) : 7;
  }
};

export const analyzeReceiptOrGroceryImage = async (base64Image: string): Promise<ScannedItem[]> => {
  try {
    const res = await fetch(`data:image/jpeg;base64,${base64Image}`);
    const blob = await res.blob();
    const file = new File([blob], "receipt.jpg", { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://shelf-life-sfhacks.vercel.app/ai-ocr', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR API responded with status ${response.status}`);
    }

    const data = await response.json();
    const itemsArray = Array.isArray(data) ? data : (data.items || data.grocery_list || []);
    
    return itemsArray.map((item: any) => {
      const name = item.name || item.item || item.food_item || "Unidentified Item";
      return {
        name,
        quantity: item.quantity || item.qty || "1 unit",
        category: (item.category as Category) || 'Fridge',
        estimatedExpiryDays: calculateDaysUntil(
          item.expiration_date || item.expiry_date || item.expiry || item.expires_on,
          name
        )
      };
    });
  } catch (error) {
    console.error("External OCR API failed (likely CORS or network), falling back to Gemini reasoning:", error);
    
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: "Identify food items from this receipt. For each item, estimate the shelf life using international standards if not visible (e.g. Tomatoes: 5 days). Return JSON array. Each object: { 'name': string, 'quantity': string, 'category': 'Fridge'|'Pantry'|'Freezer'|'Cabinet'|'Countertop'|'Spice Rack', 'estimatedExpiryDays': number }" }
          ]
        },
        config: { 
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });
      return JSON.parse(fallbackResponse.text || "[]");
    } catch (fallbackError) {
      console.error("Gemini fallback also failed:", fallbackError);
      return [];
    }
  }
};

export const generateRecipes = async (items: FoodItem[]): Promise<Recipe[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const itemNames = items.map(i => `${i.name} (expiring ${i.expiryDate})`).join(", ");
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Suggest 3 creative recipes using these ingredients, prioritizing those nearing expiration: ${itemNames}. For each recipe, provide a direct YouTube search URL. Provide response in JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
            estimatedTime: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
            youtubeUrl: { type: Type.STRING }
          },
          required: ["title", "ingredients", "instructions", "estimatedTime", "difficulty", "youtubeUrl"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Failed to parse AI response", error);
    return [];
  }
};