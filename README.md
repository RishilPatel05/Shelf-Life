# 🥦 Shelf Life

**Master Your Kitchen. Waste Less. Eat Better.**

Shelf Life is an intelligent pantry and fridge manager designed to help users track their groceries, reduce food waste, and save money. By leveraging AI (Google Gemini) and Optical Character Recognition (OCR), it streamlines the process of adding items via receipt scanning and suggests recipes based on what you currently have in stock.

---

## ✨ Features

### 📸 Smart Receipt Scanning
- **AI-Powered OCR:** Upload a photo of your grocery receipt. The app identifies food items, quantities, and prices automatically.
- **Intelligent Fallback:** Uses a custom Python backend for OCR, with a robust fallback to Google Gemini 2.5 Flash if the backend is unavailable.
- **Price Extraction:** Accurately extracts total line-item prices (handling cases like "2 @ $0.89") to track your spending.

### 📦 Inventory Management
- **Expiration Tracking:** Automatically estimates shelf life based on international standards if no date is found on the receipt.
- **Visual Indicators:** Color-coded cards show freshness status (Fresh, Warning, Expired).
- **Smart Merging:** Automatically detects duplicate items (same name, category, and expiry) and merges them by summing quantities and prices.
- **Categorization:** Organize items by Fridge, Pantry, Freezer, Countertop, Cabinet, or Spice Rack.

### 💰 Money Management
- **Financial Dashboard:** Real-time calculation of your **Total Inventory Value**.
- **Waste Calculator:** Tracks the exact dollar amount lost to expired food, helping you visualize the cost of food waste.

### 👨‍🍳 AI Chef & Recipe Generation
- **Smart Suggestions:** Generates recipes based *specifically* on the ingredients you currently have.
- **Detailed Instructions:** Provides difficulty levels, estimated times, step-by-step instructions, and YouTube tutorial links.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript
- **Styling:** Tailwind CSS
- **AI & Intelligence:** Google Gemini API (`@google/genai`)
- **Backend (OCR):** Python FastAPI (External Service)
- **Build Tool:** Vite (Recommended)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A Google Gemini API Key

### Installation

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/shelf-life.git
   cd shelf-life
   ```

## 🚀 Getting Started

### 1) Install Dependencies
```
npm install
```
2) Configure Environment Variables

Create a .env file in the root directory and add your Google Gemini API key:
```
API_KEY=your_google_gemini_api_key_here
```
3) Run the Application
```
npm run dev
```
4) Open in Browser
 ```
Visit http://localhost:5173 (or the port shown in your terminal).
```

📂 Project Structure
```
/
├── index.html              # Entry point
├── index.tsx               # React Root
├── App.tsx                 # Main Application Logic & UI
├── types.ts                # TypeScript Interfaces
├── metadata.json           # App metadata & permissions
├── components/
│   ├── Button.tsx          # Reusable Button component
│   ├── FoodCard.tsx        # Item display card with expiry logic
│   └── RecipeCard.tsx      # Recipe display with modal view
└── services/
    └── geminiService.ts    # AI integration & OCR logic
```

## 🧠 How It Works

### 📤 Scanning
When a receipt image is uploaded, `services/geminiService.ts` first attempts to process it through the external Python OCR backend for structured data extraction.

### 🔁 Intelligent Fallback
If the backend is unavailable or fails, the app seamlessly sends the image to **Google Gemini Flash** with a carefully engineered prompt to extract structured **JSON** data.

### ⚙️ Processing
The extracted data is normalized (categories, dates, formatting), and expiration dates are calculated using a predefined `STANDARD_SHELF_LIFE` dictionary for common grocery items.

### 🔄 Smart Merging
Inside `App.tsx`, the app checks for existing inventory matches and automatically merges items by summing quantities and prices to prevent duplicates.

### 🍳 Recipe Generation
The **Smart Recipes** tab sends your current inventory item names to Gemini to generate personalized cooking ideas based on what you already have.
