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
   ```bash
   git clone https://github.com/yourusername/shelf-life.git
   cd shelf-life

   Install dependencies
code
Bash
npm install
Configure Environment Variables
Create a .env file in the root directory and add your Google Gemini API key:
code
Env
API_KEY=your_google_gemini_api_key_here
Run the Application
code
Bash
npm run dev
Open in Browser
Visit http://localhost:5173 (or the port shown in your terminal).
📂 Project Structure
code
Text
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
🧠 How It Works
Scanning: When an image is uploaded, geminiService.ts first attempts to send it to the external Python backend.
Fallback: If the backend is unreachable, it sends the image directly to Google Gemini Flash with a specific prompt to extract JSON data.
Processing: The app normalizes the data (categories, dates) and calculates expiration based on a hardcoded dictionary of standard shelf lives (STANDARD_SHELF_LIFE).
Merging: The App.tsx logic checks for existing items and sums up quantities/prices if a match is found.
Recipes: The "Smart Recipes" tab sends a list of your current inventory names to Gemini to generate cooking ideas.
