import pdfplumber
import docx2txt
import io
import random
import re
import traceback

# ──────────────────────────────────────────────
# EXPANDED SKILL TAXONOMY (100+ skills)
# ──────────────────────────────────────────────
CAREER_SKILLS_TAXONOMY = [
    # ── Technology & Engineering ──
    "analytics", "data science", "machine learning", "artificial intelligence",
    "deep learning", "natural language processing", "computer vision",
    "software engineering", "programming", "web development", "mobile development",
    "cloud computing", "devops", "cybersecurity", "database management",
    "system design", "algorithm design", "api development", "microservices",
    "blockchain", "iot", "embedded systems", "hardware engineering",
    "quality assurance", "testing", "automation", "agile", "scrum",
    
    # ── Business & Management ──
    "leadership", "strategic planning", "project management", "product management",
    "product development", "business development", "entrepreneurship",
    "operations management", "supply chain", "logistics", "process improvement",
    "change management", "restructuring", "mergers and acquisitions",
    "stakeholder management", "vendor management", "risk management",
    "decision making", "strategic decision making", "crisis management",
    
    # ── Finance & Accounting ──
    "financial analysis", "financial modeling", "investment banking",
    "portfolio management", "corporate finance", "accounting", "auditing",
    "budgeting", "forecasting", "tax planning", "wealth management",
    "trading", "private equity", "venture capital",
    
    # ── Sales & Marketing ──
    "sales", "marketing", "digital marketing", "content marketing",
    "social media marketing", "seo", "sem", "brand management", "branding",
    "market research", "competitive analysis", "customer acquisition",
    "growth hacking", "public relations", "advertising", "copywriting",
    
    # ── Healthcare & Science ──
    "patient care", "diagnostics", "clinical research", "pharmacology",
    "epidemiology", "biostatistics", "medical imaging", "surgery",
    "nursing", "public health", "biotechnology", "genomics",
    "laboratory management", "drug development", "triage",
    
    # ── Legal & Compliance ──
    "legal research", "litigation", "contract law", "intellectual property",
    "regulatory compliance", "corporate governance", "advocacy",
    "mediation", "arbitration", "ethics",
    
    # ── Creative & Media ──
    "creativity", "performing arts", "graphic design", "ux design", "ui design",
    "video production", "photography", "animation", "storytelling",
    "content creation", "music production", "film production",
    
    # ── Education & Research ──
    "teaching", "curriculum development", "academic research",
    "mentorship", "training", "e-learning", "educational technology",
    
    # ── Soft Skills & Universal ──
    "communication", "negotiation", "public speaking", "persuasion",
    "teamwork", "collaboration", "networking", "empathy",
    "problem solving", "critical thinking", "adaptability", "resilience",
    "time management", "conflict resolution", "emotional intelligence",
    "discipline", "consistency", "focus", "vision", "perseverance",
    "overcoming adversity", "mastery", "human resources",
    "cross-cultural communication", "remote work", "efficiency",
    "innovation", "scaling",
    
    # ── Government & Defense ──
    "policy analysis", "diplomacy", "public administration",
    "intelligence analysis", "national security", "military strategy",
    "leadership under pressure", "geopolitics",
    
    # ── Sports & Performance ──
    "coaching", "sports management", "performance optimization",
    "team building", "competition strategy", "mental toughness",
]

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

def detect_industry(text_lower: str) -> str:
    """Score each industry by keyword hit count and return the best match."""
    scores = {}
    for industry, keywords in INDUSTRY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw.lower() in text_lower)
        if score > 0:
            scores[industry] = score
    
    if not scores:
        return "General"
    
    return max(scores, key=scores.get)

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

def extract_entities(text: str) -> dict:
    """Lightweight regex-based entity extraction (replaces spaCy NER)."""
    entities = {"organizations": [], "titles": [], "locations": []}
    
    # Extract potential organization names (capitalized multi-word phrases)
    org_patterns = [
        r'\b(?:at|with|for|from)\s+([A-Z][A-Za-z&.]+(?:\s+[A-Z][A-Za-z&.]+)*)',
        r'\b([A-Z][A-Za-z]+(?:\s+(?:Inc|Corp|LLC|Ltd|Co|Company|Group|Technologies|Solutions|Systems|Services|Bank|University|College|Institute)\.?))\b',
    ]
    for pattern in org_patterns:
        matches = re.findall(pattern, text[:10000])
        entities["organizations"].extend(matches)
    
    # Extract potential job titles
    title_patterns = [
        r'\b((?:Senior|Junior|Lead|Chief|Head|Principal|Staff|Associate)\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\b',
        r'\b([A-Z][a-z]+\s+(?:Engineer|Developer|Manager|Director|Analyst|Consultant|Designer|Scientist|Architect|Specialist|Coordinator))\b',
    ]
    for pattern in title_patterns:
        matches = re.findall(pattern, text[:10000])
        entities["titles"].extend(matches)
    
    # Deduplicate and limit
    for key in entities:
        entities[key] = list(set(entities[key]))[:10]
    
    return entities

def parse_resume(filename: str, file_bytes: bytes) -> dict:
    """
    Parses a resume file and extracts a comprehensive career profile
    using rule-based keyword matching and regex entity extraction.
    """
    try:
        if filename.lower().endswith(".pdf"):
            text = extract_text_from_pdf(file_bytes)
        elif filename.lower().endswith(".docx"):
            text = extract_text_from_docx(file_bytes)
        else:
            text = file_bytes.decode("utf-8", errors="ignore")

        # Guard against empty extraction
        if not text or not text.strip():
            return {
                "found_skills": [],
                "skill_gaps": random.sample(CAREER_SKILLS_TAXONOMY, min(7, len(CAREER_SKILLS_TAXONOMY))),
                "industry": "General",
                "career_stage": "Entry-level",
                "raw_text_length": 0,
                "entities": {"organizations": [], "titles": [], "locations": []},
                "_warning": "Could not extract text. The file may be image-based or encrypted.",
            }

        lower_text = text.lower()

        # 1. Match skills from expanded taxonomy
        found_skills = set()
        for skill in CAREER_SKILLS_TAXONOMY:
            if skill in lower_text:
                found_skills.add(skill)

        # 2. Smart industry detection (scored keyword matching)
        industry = detect_industry(lower_text)

        # 3. Career stage detection (seniority keyword matching)
        career_stage = detect_career_stage(lower_text)

        # 4. Lightweight regex NER for richer context
        entities = extract_entities(text)

        # 5. Smarter Skill Gap Inference
        industry_relevant_skills = set()
        industry_kw = INDUSTRY_KEYWORDS.get(industry, [])
        for skill in CAREER_SKILLS_TAXONOMY:
            skill_words = set(skill.lower().split())
            for kw in industry_kw:
                if any(sw in kw.lower() or kw.lower() in sw for sw in skill_words):
                    industry_relevant_skills.add(skill)
                    break

        # Gaps = skills relevant to industry that the user DOESN'T have
        relevant_gaps = list(industry_relevant_skills - found_skills)
        general_gaps = list(set(CAREER_SKILLS_TAXONOMY) - found_skills - industry_relevant_skills)

        # Prioritize industry-relevant gaps, then fill with general ones
        if len(relevant_gaps) >= 5:
            random.seed(len(lower_text))
            selected_gaps = random.sample(relevant_gaps, min(7, len(relevant_gaps)))
        else:
            random.seed(len(lower_text))
            fill_count = min(7 - len(relevant_gaps), len(general_gaps))
            selected_gaps = relevant_gaps + (random.sample(general_gaps, fill_count) if fill_count > 0 else [])

        return {
            "found_skills": list(found_skills),
            "skill_gaps": selected_gaps,
            "industry": industry,
            "career_stage": career_stage,
            "raw_text_length": len(text),
            "entities": entities,
        }

    except Exception as e:
        print(f"[PARSER ERROR] parse_resume failed: {traceback.format_exc()}")
        # Return a safe fallback so the frontend doesn't crash
        return {
            "found_skills": [],
            "skill_gaps": ["leadership", "communication", "problem solving", "teamwork", "adaptability"],
            "industry": "General",
            "career_stage": "Entry-level",
            "raw_text_length": 0,
            "entities": {"organizations": [], "titles": [], "locations": []},
            "_warning": "An error occurred during parsing. Showing default recommendations.",
        }
