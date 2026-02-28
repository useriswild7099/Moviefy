<p align="center">
  <img src="frontend/public/assets/favicon-32.png" alt="MOVIEFY Logo" width="80" />
</p>

<h1 align="center">MOVIEFY</h1>
<p align="center"><strong>Brainwash your mind with the right content.</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-6750+%20titles-003B57?logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" />
</p>

---

## 🧠 The Philosophy

We live in the golden age of content — and the dark age of attention.

Every day, billions of hours are surrendered to algorithms optimized for one thing: **keeping you watching**. Not learning. Not growing. Not building. Just watching. The average person spends 2+ hours daily on content that leaves them no smarter, no more skilled, and no closer to their goals. We call it entertainment, but it's really just **anesthesia for ambition**.

**MOVIEFY was born from a simple, almost rebellious question:**

> *What if the time you already spend watching screens could actually accelerate your career?*

Not through boring tutorials or LinkedIn courses. Through the most powerful learning technology humans have ever invented: **storytelling**.

### The Core Thesis

Every great movie or web series is a **compressed life experience**. When you watch a founder navigate a hostile board in a film, your brain processes the same strategic frameworks as if you lived it. When a character overcomes imposter syndrome, your neural pathways fire the same way they would in a real situation.

The problem isn't that people watch too much. **The problem is that nobody is curating what they watch based on where they're going professionally.**

MOVIEFY fixes that. Upload your resume, and our engine doesn't just read your skills — it **understands your trajectory**. It identifies:
- **Where you are** (your industry, your seniority, your strengths)
- **Where you need to go** (your skill gaps, your growth areas)
- **What to watch tonight** to close that gap faster than any textbook

This isn't a recommendation engine. It's a **career accelerator disguised as a streaming queue**.

### Why This Matters

The internet has made it trivially easy to consume. MOVIEFY makes it meaningful.

We believe:
- 📺 **Binge-watching can be a career strategy**, not a guilty pleasure
- 🧬 **Algorithms should mentor you**, not manipulate you
- 🎯 **Your feed should reflect your future**, not just your past clicks
- 🧠 **The right story at the right time** can be more valuable than any certification

We're not anti-entertainment. We're anti-*empty* entertainment. There's a difference between watching 8 hours of content and *wasting* 8 hours on content. MOVIEFY ensures every hour counts.

---

## ⚡ How It Works

```
Resume Upload → AI Parsing → Multi-Signal Matching → Curated Watchlist
```

1. **Upload your resume** (PDF or DOCX)
2. Our parser extracts **164 career skills**, detects your **industry** (13 categories), and identifies your **career stage**
3. The recommendation engine scores **6,750+ movies and web series** using 4 weighted signals:
   - `50%` Content relevance (TF-IDF cosine similarity)
   - `25%` Industry alignment
   - `15%` Career stage match
   - `10%` Educational value
4. You receive a personalized **Curated Watchlist** with match percentages and Mentor's Notes explaining *exactly* why each title matters for your trajectory

---

## 🏗️ Architecture

```
├── backend/
│   ├── main.py              # FastAPI app with lifespan management
│   ├── parser.py             # Resume parser (164 skills, 13 industries, spaCy NER)
│   ├── recommender.py        # Cached TF-IDF engine with multi-signal scoring
│   ├── auto_updater.py       # Wikipedia scraper for movie data
│   ├── init_db.py            # SQLite schema + indexed tables
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Full SPA with glassmorphic + neumorphic UI
│   │   └── App.css           # Custom animations, neumorphism, transitions
│   ├── index.html            # SEO-optimized entry point
│   └── public/assets/        # Images, videos, cloud layers
│
└── .gitignore
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend** | FastAPI + Python 3.10+ | Async-ready, auto-docs, Pydantic validation |
| **NLP** | scikit-learn TF-IDF + spaCy NER | Fast vectorization + entity extraction |
| **Database** | SQLite (indexed) | Zero-config, portable, 6750+ titles |
| **Frontend** | React 18 + Vite | Lightning-fast HMR, optimized builds |
| **Styling** | Tailwind CSS 4 | Utility-first with custom design tokens |
| **Animation** | GSAP + Lenis | Scroll-triggered reveals, smooth scrolling |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- pip / npm

### Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python -m spacy download en_core_web_sm
python init_db.py
python main.py
```
The API runs at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🎨 Design Philosophy

MOVIEFY's interface is built on three design principles:

1. **Neumorphism** — Soft, extruded card shadows that feel tactile and alive. Every card, tag, and chip has dual-shadow depth.
2. **Glassmorphism** — Frosted glass overlays with `backdrop-blur` for the loading screen, modals, and hero CTAs.
3. **Cinematic Transitions** — No jarring page changes. The loading overlay blurs the world, shows a motivational quote, scrolls to results underneath, then gracefully fades away. You never see a jump.

---

## 🧪 The Recommendation Engine

The engine goes beyond basic keyword matching:

```python
Score = (0.50 × cosine_similarity)    # How relevant is the content?
      + (0.25 × industry_match)       # Is it in your industry?
      + (0.15 × career_stage_match)   # Does it match your seniority?
      + (0.10 × educational_value)    # How much can you learn from it?
```

- **Skill gap triple-weighting**: Movies that teach what you *lack* score 3× higher than those reinforcing what you already know
- **Bigram TF-IDF**: Catches phrases like "machine learning" and "project management" as single concepts
- **Cached at startup**: The TF-IDF matrix for all 6,750 titles is pre-computed once, making per-request scoring near-instant
- **8 unique Mentor's Note templates** per category — no two recommendations sound alike

---

## 💬 Loading Screen Quotes

While your resume is being analyzed, MOVIEFY displays one of **50 handcrafted quotes** across 5 categories — from anti-doomscrolling mantras to cheeky one-liners:

> *"If knowledge is power, our platform is a nuclear reactor in your living room."*

> *"Yes, I watched 8 hours of video today. Yes, I'm putting it on my resume."*

> *"Your algorithm should be a mentor, not a distraction."*

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">
  <strong>Stop giving your screen time to people who aren't paying your bills.</strong><br/>
  <em>Start watching like it matters. Because it does.</em>
</p>
