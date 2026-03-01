import pdfplumber
import docx2txt
import io
import random
import re
import traceback
from collections import Counter

# ──────────────────────────────────────────────
# DEEP SKILL TAXONOMY  (150+ skills, categorized)
# ──────────────────────────────────────────────
CAREER_SKILLS_TAXONOMY = {
    "Technology & Engineering": [
        "analytics", "data science", "machine learning", "artificial intelligence",
        "deep learning", "natural language processing", "computer vision",
        "software engineering", "programming", "web development", "mobile development",
        "cloud computing", "devops", "cybersecurity", "database management",
        "system design", "algorithm design", "api development", "microservices",
        "blockchain", "iot", "embedded systems", "hardware engineering",
        "quality assurance", "testing", "automation", "agile", "scrum",
        "ai prompting", "large language models", "generative ai", "cloud architecture",
        "serverless", "edge computing", "data engineering", "devsecops",
        "full stack development", "frontend development", "backend development",
        "distributed systems", "containerization", "ci/cd", "version control",
    ],
    "Business & Management": [
        "leadership", "strategic planning", "project management", "product management",
        "product development", "business development", "entrepreneurship",
        "operations management", "supply chain", "logistics", "process improvement",
        "change management", "restructuring", "mergers and acquisitions",
        "stakeholder management", "vendor management", "risk management",
        "decision making", "strategic decision making", "crisis management",
        "scaling startups", "market expansion", "organizational design",
        "executive presence", "p&l management", "go-to-market strategy",
        "cross-functional leadership", "board management",
    ],
    "Finance & Accounting": [
        "financial analysis", "financial modeling", "investment banking",
        "portfolio management", "corporate finance", "accounting", "auditing",
        "budgeting", "forecasting", "tax planning", "wealth management",
        "trading", "private equity", "venture capital", "fintech", "cryptocurrency",
        "financial reporting", "compliance", "risk assessment",
    ],
    "Sales & Marketing": [
        "sales", "marketing", "digital marketing", "content marketing",
        "social media marketing", "seo", "sem", "brand management", "branding",
        "market research", "competitive analysis", "customer acquisition",
        "growth hacking", "public relations", "advertising", "copywriting",
        "email marketing", "influencer marketing", "conversion optimization",
    ],
    "Healthcare & Science": [
        "patient care", "diagnostics", "clinical research", "pharmacology",
        "epidemiology", "biostatistics", "medical imaging", "surgery",
        "nursing", "public health", "biotechnology", "genomics",
        "laboratory management", "drug development", "triage", "mental health advocacy",
    ],
    "Legal & Compliance": [
        "legal research", "litigation", "contract law", "intellectual property",
        "regulatory compliance", "corporate governance", "advocacy",
        "mediation", "arbitration", "ethics",
    ],
    "Creative & Media": [
        "creativity", "performing arts", "graphic design", "ux design", "ui design",
        "video production", "photography", "animation", "storytelling",
        "content creation", "music production", "film production",
        "brand identity", "motion graphics", "3d modeling",
    ],
    "Education & Research": [
        "teaching", "curriculum development", "academic research",
        "mentorship", "training", "e-learning", "educational technology",
        "scientific writing", "peer review",
    ],
    "Soft Skills & Universal": [
        "communication", "negotiation", "public speaking", "persuasion",
        "teamwork", "collaboration", "networking", "empathy",
        "problem solving", "critical thinking", "adaptability", "resilience",
        "time management", "conflict resolution", "emotional intelligence",
        "discipline", "consistency", "focus", "vision", "perseverance",
        "overcoming adversity", "mastery", "human resources",
        "cross-cultural communication", "remote work", "efficiency",
        "innovation", "scaling", "growth mindset", "storytelling",
        "interpersonal skills", "active listening", "work ethic",
        "strategic communication", "delegation",
    ],
}

# Flatten for quick lookup
ALL_SKILLS = []
for cat_skills in CAREER_SKILLS_TAXONOMY.values():
    ALL_SKILLS.extend(cat_skills)

# ──────────────────────────────────────────────
# TECHNOLOGY/TOOL EXTRACTION (detects specific tools)
# ──────────────────────────────────────────────
TECH_TOOLS = [
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "ruby",
    "swift", "kotlin", "scala", "r", "matlab", "perl", "php", "dart", "lua",
    "react", "angular", "vue", "next.js", "svelte", "django", "flask", "fastapi",
    "spring", "express", "node.js", "rails", "laravel",
    "aws", "azure", "gcp", "google cloud", "heroku", "vercel", "netlify",
    "docker", "kubernetes", "terraform", "ansible", "jenkins", "github actions",
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra",
    "tableau", "power bi", "looker", "grafana",
    "tensorflow", "pytorch", "scikit-learn", "keras", "hugging face", "langchain",
    "figma", "sketch", "adobe xd", "photoshop", "illustrator", "after effects",
    "jira", "confluence", "notion", "slack", "salesforce", "hubspot",
    "excel", "sql", "nosql", "graphql", "rest api", "grpc",
    "git", "linux", "windows server", "nginx", "apache",
]

# ──────────────────────────────────────────────
# PROFESSIONAL VIBE DETECTION (The "Soul" of the Resume)
# ──────────────────────────────────────────────
VIBE_PATTERNS = {
    "Strategic Visionary": [
        "vision", "strategic", "pioneer", "innovate", "future", "transformation",
        "scaling", "disrupt", "global", "ecosystem", "founding", "roadmap",
        "long-term", "north star", "10x", "paradigm", "thought leader",
    ],
    "Analytical Stoic": [
        "data-driven", "metrics", "optimization", "accuracy", "statistical", "rigorous",
        "precision", "validation", "logic", "quantitative", "audit", "efficiency",
        "measured", "regression", "hypothesis", "benchmark", "systematic",
    ],
    "Creative Free-Spirit": [
        "creativity", "storytelling", "experience", "design", "beautiful", "intuitive",
        "conceptual", "fluid", "artistic", "expression", "curation", "vibrant",
        "human-centric", "aesthetics", "narrative", "visual", "immersive",
    ],
    "The Relentless Hustler": [
        "growth", "acquisition", "aggressive", "target", "outperformed", "scaling",
        "pipeline", "velocity", "conversion", "revenue", "fast-paced", "milestone",
        "grind", "exceeded", "quota", "results-driven", "high-growth",
    ],
    "Empathic Leader": [
        "culture", "mentorship", "empower", "coaching", "community", "inclusion",
        "well-being", "empathy", "collaboration", "team-centric", "nurture", "support",
        "diversity", "psychological safety", "servant leadership", "people-first",
    ],
    "Pragmatic Builder": [
        "delivery", "robust", "maintainable", "implementation", "architect", "stable",
        "reliable", "functional", "execution", "infrastructure", "deployment",
        "production", "scalable", "performance", "uptime", "refactor",
    ],
}

# ──────────────────────────────────────────────
# COMPREHENSIVE INDUSTRY KEYWORDS (12+ industries)
# ──────────────────────────────────────────────
INDUSTRY_KEYWORDS = {
    "Technology": [
        "software", "engineer", "developer", "programming", "coding", "tech",
        "computer", "IT", "data", "machine learning", "AI", "cloud", "devops",
        "fullstack", "frontend", "backend", "SaaS", "platform", "digital",
        "cyber", "database", "api", "microservice", "agile", "scrum",
        "python", "java", "javascript", "react", "node", "aws", "azure",
        "google cloud", "docker", "kubernetes", "linux", "git", "sql",
    ],
    "Healthcare": [
        "medical", "health", "hospital", "clinic", "patient", "doctor",
        "nurse", "pharma", "biotech", "clinical", "therapy", "diagnostic",
        "surgery", "radiology", "oncology", "cardiology", "pediatric",
        "mental health", "healthcare", "dental", "veterinary",
    ],
    "Finance": [
        "finance", "banking", "investment", "trading", "hedg", "portfolio",
        "asset management", "wealth", "insurance", "accounting", "audit",
        "tax", "revenue", "capital", "equity", "financial", "fintech",
        "cryptocurrency", "blockchain", "mortgage", "credit",
    ],
    "Law": [
        "legal", "law", "attorney", "lawyer", "litigation", "compliance",
        "regulatory", "patent", "intellectual property", "contract",
        "arbitration", "counsel", "paralegal", "judicial",
    ],
    "Education": [
        "education", "university", "college", "school", "teacher", "professor",
        "academic", "curriculum", "research", "student", "faculty", "dean",
        "training", "instructor", "tutor", "e-learning",
    ],
    "Media": [
        "media", "journalism", "news", "editor", "reporter", "broadcast",
        "publishing", "content", "advertising", "PR", "public relation",
        "social media", "influencer", "podcast", "film", "television",
    ],
    "Engineering": [
        "mechanical", "civil", "electrical", "chemical", "aerospace",
        "automotive", "industrial", "structural", "manufacturing",
        "construction", "architecture", "CAD", "robotics",
    ],
    "Government": [
        "government", "public sector", "policy", "administration",
        "military", "defense", "intelligence", "diplomat", "federal",
        "state", "municipal", "NGO", "nonprofit",
    ],
    "Retail": [
        "retail", "e-commerce", "merchandise", "store", "consumer",
        "supply chain", "logistics", "warehouse", "inventory",
        "procurement", "wholesale", "fashion",
    ],
    "Real Estate": [
        "real estate", "property", "construction", "architecture",
        "urban planning", "facility", "leasing", "mortgage",
    ],
    "Sports": [
        "sports", "athletics", "coaching", "fitness", "gym",
        "tournament", "competition", "athlete", "trainer",
    ],
    "Arts": [
        "art", "design", "creative", "music", "performance",
        "theater", "gallery", "animation", "illustration",
        "photography", "fashion design", "graphic design",
    ],
    "Business": [
        "business", "management", "consulting", "strategy", "operations",
        "executive", "CEO", "COO", "CFO", "CTO", "director",
        "enterprise", "startup", "entrepreneur", "venture",
        "product manager", "brand", "market", "sales",
    ],
}

# ──────────────────────────────────────────────
# ACTION VERB EXTRACTION (measures accomplishments)
# ──────────────────────────────────────────────
ACTION_VERBS = {
    "leadership": ["led", "managed", "directed", "oversaw", "spearheaded", "mentored", "coached", "delegated"],
    "achievement": ["achieved", "exceeded", "delivered", "accomplished", "earned", "won", "awarded", "surpassed"],
    "creation": ["built", "created", "designed", "developed", "launched", "founded", "established", "authored"],
    "improvement": ["improved", "optimized", "enhanced", "streamlined", "reduced", "increased", "accelerated", "scaled"],
    "analysis": ["analyzed", "evaluated", "researched", "assessed", "diagnosed", "investigated", "audited", "measured"],
    "collaboration": ["collaborated", "partnered", "coordinated", "facilitated", "negotiated", "mediated", "aligned"],
}

# ──────────────────────────────────────────────
# CAREER STAGE DETECTION
# ──────────────────────────────────────────────
SENIOR_KEYWORDS = [
    "senior", "director", "VP", "vice president", "chief", "head of",
    "principal", "staff", "distinguished", "fellow", "partner",
    "C-suite", "CEO", "CTO", "CFO", "COO", "CIO", "CMO",
    "executive", "president", "founder", "co-founder",
]
MID_KEYWORDS = [
    "lead", "manager", "supervisor", "coordinator", "specialist",
    "years of experience", "3+ years", "5+ years", "7+ years",
    "team lead", "tech lead", "associate director",
]
ENTRY_KEYWORDS = [
    "intern", "junior", "entry", "graduate", "fresher", "trainee",
    "apprentice", "associate", "1 year", "0-1 year",
]

# ──────────────────────────────────────────────
# CORE FUNCTIONS
# ──────────────────────────────────────────────
def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        text = ""
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    except Exception as e:
        print(f"[PARSER ERROR] PDF extraction failed: {e}")
        return ""

def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        result = docx2txt.process(io.BytesIO(file_bytes))
        return result if result else ""
    except Exception as e:
        print(f"[PARSER ERROR] DOCX extraction failed: {e}")
        return ""

def detect_industry(text_lower: str) -> list:
    """Score each industry and return top 2 matches."""
    scores = {}
    for industry, keywords in INDUSTRY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw.lower() in text_lower)
        if score > 0:
            scores[industry] = score
    
    if not scores:
        return ["General"]
    
    sorted_industries = sorted(scores, key=scores.get, reverse=True)
    return sorted_industries[:2]  # Return top 2

def detect_career_stage(text_lower: str) -> str:
    """Detect career stage from seniority keywords."""
    senior_hits = sum(1 for kw in SENIOR_KEYWORDS if kw.lower() in text_lower)
    mid_hits = sum(1 for kw in MID_KEYWORDS if kw.lower() in text_lower)
    entry_hits = sum(1 for kw in ENTRY_KEYWORDS if kw.lower() in text_lower)
    
    if senior_hits >= mid_hits and senior_hits >= entry_hits and senior_hits > 0:
        return "Senior"
    elif mid_hits >= entry_hits and mid_hits > 0:
        return "Mid-Level"
    else:
        return "Entry-level"

def detect_vibe(text_lower: str) -> dict:
    """Detect the professional 'vibe' with scores for all matching types."""
    scores = {}
    for vibe, keywords in VIBE_PATTERNS.items():
        score = sum(1 for kw in keywords if kw.lower() in text_lower)
        if score > 0:
            scores[vibe] = score
    
    if not scores:
        return {"primary": "Pragmatic Builder", "secondary": None, "all_scores": {}}
    
    sorted_vibes = sorted(scores, key=scores.get, reverse=True)
    return {
        "primary": sorted_vibes[0],
        "secondary": sorted_vibes[1] if len(sorted_vibes) > 1 else None,
        "all_scores": scores,
    }

def extract_technologies(text_lower: str) -> list:
    """Extract specific technologies and tools mentioned in the resume."""
    found = []
    for tool in TECH_TOOLS:
        if tool.lower() in text_lower:
            found.append(tool)
    return found

def extract_action_profile(text_lower: str) -> dict:
    """Analyze the action verbs to understand the person's work style."""
    profile = {}
    for category, verbs in ACTION_VERBS.items():
        hits = sum(1 for v in verbs if v in text_lower)
        if hits > 0:
            profile[category] = hits
    return profile

def extract_entities(text: str) -> dict:
    """Lightweight regex-based entity extraction."""
    entities = {"organizations": [], "titles": [], "locations": []}
    
    org_patterns = [
        r'\b(?:at|with|for|from)\s+([A-Z][A-Za-z&.]+(?:\s+[A-Z][A-Za-z&.]+)*)',
        r'\b([A-Z][A-Za-z]+(?:\s+(?:Inc|Corp|LLC|Ltd|Co|Company|Group|Technologies|Solutions|Systems|Services|Bank|University|College|Institute)\.?))\\b',
    ]
    for pattern in org_patterns:
        matches = re.findall(pattern, text[:10000])
        entities["organizations"].extend(matches)
    
    title_patterns = [
        r'\b((?:Senior|Junior|Lead|Chief|Head|Principal|Staff|Associate)\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\b',
        r'\b([A-Z][a-z]+\s+(?:Engineer|Developer|Manager|Director|Analyst|Consultant|Designer|Scientist|Architect|Specialist|Coordinator))\b',
    ]
    for pattern in title_patterns:
        matches = re.findall(pattern, text[:10000])
        entities["titles"].extend(matches)
    
    for key in entities:
        entities[key] = list(set(entities[key]))[:10]
    
    return entities

def extract_years_of_experience(text: str) -> int:
    """Try to detect total years of experience from the resume."""
    patterns = [
        r'(\d{1,2})\+?\s*years?\s+(?:of\s+)?experience',
        r'experience\s*(?:of\s+)?(\d{1,2})\+?\s*years?',
        r'(\d{1,2})\+?\s*yrs?\s+(?:of\s+)?exp',
    ]
    years = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        years.extend([int(m) for m in matches])
    
    if years:
        return max(years)
    
    # Fallback: count distinct years in date ranges (e.g., 2018 - 2024)
    year_matches = re.findall(r'\b(20\d{2})\b', text)
    if len(year_matches) >= 2:
        years_seen = sorted(set(int(y) for y in year_matches))
        return years_seen[-1] - years_seen[0]
    
    return 0


def parse_resume(filename: str, file_bytes: bytes) -> dict:
    """
    Deep resume analysis: extracts skills, technologies, action profile,
    vibe, industry, career stage, entities, and years of experience.
    """
    try:
        if filename.lower().endswith(".pdf"):
            text = extract_text_from_pdf(file_bytes)
        elif filename.lower().endswith(".docx"):
            text = extract_text_from_docx(file_bytes)
        else:
            text = file_bytes.decode("utf-8", errors="ignore")

        if not text or not text.strip():
            return {
                "found_skills": [], "skill_categories": {},
                "skill_gaps": [],
                "technologies": [],
                "action_profile": {},
                "industry": "General", "secondary_industry": None,
                "vibe": "Pragmatic Builder", "secondary_vibe": None,
                "career_stage": "Entry-level",
                "years_of_experience": 0,
                "raw_text_length": 0,
                "entities": {"organizations": [], "titles": [], "locations": []},
                "_warning": "Could not extract text. The file may be image-based or encrypted.",
            }

        lower_text = text.lower()

        # 1. Deep skill matching with category tracking
        found_skills = set()
        skill_categories = {}
        for category, skills in CAREER_SKILLS_TAXONOMY.items():
            matched_in_cat = []
            for skill in skills:
                if skill in lower_text:
                    found_skills.add(skill)
                    matched_in_cat.append(skill)
            if matched_in_cat:
                skill_categories[category] = matched_in_cat

        # 2. Technology/Tool Extraction
        technologies = extract_technologies(lower_text)

        # 3. Action Verb Profile (work style analysis)
        action_profile = extract_action_profile(lower_text)

        # 4. Industry detection (top 2)
        industries = detect_industry(lower_text)
        primary_industry = industries[0]
        secondary_industry = industries[1] if len(industries) > 1 else None

        # 5. Career stage detection
        career_stage = detect_career_stage(lower_text)

        # 6. Professional Vibe Detection (with scores)
        vibe_result = detect_vibe(lower_text)

        # 7. Entity extraction
        entities = extract_entities(text)

        # 8. Years of experience
        years_exp = extract_years_of_experience(text)

        # 9. Smarter Skill Gap Inference
        industry_relevant_skills = set()
        industry_kw = INDUSTRY_KEYWORDS.get(primary_industry, [])
        for skill in ALL_SKILLS:
            skill_words = set(skill.lower().split())
            for kw in industry_kw:
                if any(sw in kw.lower() or kw.lower() in sw for sw in skill_words):
                    industry_relevant_skills.add(skill)
                    break

        relevant_gaps = list(industry_relevant_skills - found_skills)
        general_gaps = list(set(ALL_SKILLS) - found_skills - industry_relevant_skills)

        if len(relevant_gaps) >= 5:
            random.seed(len(lower_text))
            selected_gaps = random.sample(relevant_gaps, min(7, len(relevant_gaps)))
        else:
            random.seed(len(lower_text))
            fill_count = min(7 - len(relevant_gaps), len(general_gaps))
            selected_gaps = relevant_gaps + (random.sample(general_gaps, fill_count) if fill_count > 0 else [])

        return {
            "found_skills": list(found_skills),
            "skill_categories": skill_categories,
            "skill_gaps": selected_gaps,
            "technologies": technologies,
            "action_profile": action_profile,
            "industry": primary_industry,
            "secondary_industry": secondary_industry,
            "vibe": vibe_result["primary"],
            "secondary_vibe": vibe_result["secondary"],
            "career_stage": career_stage,
            "years_of_experience": years_exp,
            "raw_text_length": len(text),
            "entities": entities,
        }

    except Exception as e:
        print(f"[PARSER ERROR] parse_resume failed: {traceback.format_exc()}")
        return {
            "found_skills": [], "skill_categories": {},
            "skill_gaps": ["leadership", "communication", "problem solving", "teamwork", "adaptability"],
            "technologies": [],
            "action_profile": {},
            "industry": "General", "secondary_industry": None,
            "vibe": "Pragmatic Builder", "secondary_vibe": None,
            "career_stage": "Entry-level",
            "years_of_experience": 0,
            "raw_text_length": 0,
            "entities": {"organizations": [], "titles": [], "locations": []},
            "_warning": "An error occurred during parsing. Showing default recommendations.",
        }
