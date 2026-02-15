export type Category = 'Fridge' | 'Pantry' | 'Freezer' | 'Cabinet' | 'Countertop' | 'Spice Rack';

export interface FoodItem {
  id: string;
  name: string;
  category: Category;
  expiryDate: string;
  quantity: string;
  addedAt: string;
  price?: number;
}

export interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  estimatedTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  servings?: string;
  youtubeUrl?: string;
}

export interface ScannedItem {
  name: string;
  quantity: string;
  category: Category;
  estimatedExpiryDays: number;
  estimatedPrice?: number;
}