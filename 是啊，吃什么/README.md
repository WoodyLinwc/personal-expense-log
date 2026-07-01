# 是啊，吃什么 · Personal Expense Log

A simple, intuitive calendar-based expense tracker for logging your daily meals and spending. Built around a monthly calendar view — just double-click a day to log an expense, and stick a note on the side whenever something needs remembering.

## ✨ Features

- 📅 **Calendar-based logging** — Browse a monthly view and double-click any date to add an expense record for that day
- 🏷️ **Categories** — Six built-in categories (Food 🍔, Work 💻, Family 🏠, Activity 🏃, Shopping 🛒, Other 📦), each with its own color for quick scanning on the calendar
- 🎨 **Custom color tags** — Mark a day with a custom color (no amount required) for mood tracking or special notes
- 📌 **Sticky notes panel** — A built-in sticky-notes panel for jotting down anything else, in multiple colors
- 💰 **Spending summaries** — See the current month's total and lifetime total at a glance, with a breakdown by month in the "Total Spent" view
- ⚡ **Frequent entry suggestions** — Automatically surfaces your most-used expense entries so you can add them with one click
- ⬇️⬆️ **Import / Export** — Export all records and notes as a JSON backup, and import them back with the choice to replace or merge with existing data
- 💾 **Local storage** — Data is saved directly in the browser's `localStorage` — no account or backend required, works out of the box

## 🛠️ Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 6](https://vitejs.dev/) for build tooling
- [Tailwind CSS 4](https://tailwindcss.com/) for styling
- [Motion](https://motion.dev/) for animations
- [Lucide React](https://lucide.dev/) for icons
- [Google Gemini API](https://ai.google.dev/) (`@google/genai`)

> This project was originally created with [Google AI Studio](https://ai.studio/).

## 🚀 Getting Started

**Prerequisites:** Node.js

1. Clone the repo and install dependencies

   ```bash
   git clone https://github.com/WoodyLinwc/personal-expense-log.git
   cd personal-expense-log
   npm install
   ```

2. Set up environment variables

   Copy `.env.example` to `.env.local` and set your Gemini API key:

   ```bash
   GEMINI_API_KEY="your_gemini_api_key"
   ```

3. Run the dev server

   ```bash
   npm run dev
   ```

   The app runs at `http://localhost:3000` by default.

### Available Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the local development server   |
| `npm run build`   | Build for production                 |
| `npm run preview` | Preview the production build locally |
| `npm run lint`    | Run TypeScript type checking         |
| `npm run clean`   | Remove build artifacts               |

## 📁 Project Structure

```
├── src/
│   ├── components/        # UI components (sidebar, add-entry modal, total-spent modal, sticky notes panel)
│   ├── hooks/              # Data logic (CRUD + localStorage persistence for records and notes)
│   ├── lib/                 # Date utility functions
│   ├── types.ts            # Type definitions and category/color constants
│   ├── App.tsx             # Main app logic and calendar view
│   └── main.tsx             # App entry point
├── index.html
├── vite.config.ts
└── package.json
```

## 💡 Usage

- **Add a record**: Double-click a day cell to open the add-entry modal, then fill in description, cost, and category
- **Edit a record**: Double-click an existing entry to edit or delete it
- **View totals**: Click "Total Spent" in the header to see a month-by-month breakdown of your spending history
- **Sticky notes**: Click "📌 Notes" in the header to open the notes panel and jot down anything else
- **Back up your data**: Click "↓ Export" to download a JSON backup of your records and notes; click "↑ Import" to restore a backup, choosing to either replace or merge with existing data

## 📄 License

This project doesn't currently include an explicit open-source license. Please reach out to the author to confirm usage or distribution terms.
