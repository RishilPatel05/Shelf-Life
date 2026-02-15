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
