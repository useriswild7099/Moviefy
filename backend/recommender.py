import sqlite3
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import threading

# ──────────────────────────────────────────────
# CACHED TF-IDF ENGINE (Singleton)
# Computes once at startup, reuses on every request
# ──────────────────────────────────────────────
_cache_lock = threading.Lock()
_cached_df = None
_cached_vectorizer = None
_cached_tfidf_matrix = None

def _load_and_cache():
    """Load the movie database and pre-compute the TF-IDF matrix once."""
    global _cached_df, _cached_vectorizer, _cached_tfidf_matrix
    
    conn = sqlite3.connect("movies.db")
    df = pd.read_sql_query("SELECT * FROM movies", conn)
    conn.close()
    
    if df.empty:
        return
    
    # Combine all movie features into a single rich text for vectorization
    df["combined_features"] = (
        df["career_skills"].fillna("") + " " +
        df["industry"].fillna("") + " " +
        df["career_stage"].fillna("") + " " +
        df["summary"].fillna("")
    )
    
    # Pre-compute the TF-IDF matrix
    vectorizer = TfidfVectorizer(
        stop_words='english',
        max_features=10000,   # Cap vocabulary for speed
        ngram_range=(1, 2),   # Include bigrams for better matching
        min_df=2,             # Ignore extremely rare terms
        sublinear_tf=True,    # Apply log normalization
    )
    tfidf_matrix = vectorizer.fit_transform(df["combined_features"])
    
    _cached_df = df
    _cached_vectorizer = vectorizer
    _cached_tfidf_matrix = tfidf_matrix
    
    print(f"[Recommender] TF-IDF cache warmed: {len(df)} movies, {tfidf_matrix.shape[1]} features")

def warm_cache():
    """Thread-safe cache warming. Called at app startup."""
    with _cache_lock:
        if _cached_df is None:
            _load_and_cache()

def _get_cache():
    """Get the cached data, loading it if necessary."""
    if _cached_df is None:
        warm_cache()
    return _cached_df, _cached_vectorizer, _cached_tfidf_matrix


# ──────────────────────────────────────────────
# MULTI-SIGNAL SCORING ENGINE
# ──────────────────────────────────────────────
def generate_recommendations(profile_data: dict, top_n: int = 10):
    """
    Generate career-matched movie recommendations using multi-signal scoring:
      Score = (0.50 × cosine_similarity)    → content relevance
            + (0.25 × industry_match)       → industry alignment 
            + (0.15 × stage_match)          → career stage alignment
            + (0.10 × education_value)      → educational value score
    """
    df, vectorizer, tfidf_matrix = _get_cache()
    
    if df is None or df.empty:
        return []
    
    # ── Build a rich query from the profile ──
    skill_gaps = profile_data.get("skill_gaps", [])
    found_skills = profile_data.get("found_skills", [])
    industry = profile_data.get("industry", "")
    career_stage = profile_data.get("career_stage", "")
    
    # Weight skill gaps 3x more than found skills (we want to LEARN gaps)
    query_parts = []
    query_parts.extend(skill_gaps * 3)      # Triple-weight gaps
    query_parts.extend(found_skills)         # Single-weight existing skills
    query_parts.append(industry * 2)         # Double-weight industry
    query_parts.append(career_stage)
    
    profile_query = " ".join(query_parts)
    
    if not profile_query.strip():
        return []
    
    # ── Signal 1: Cosine Similarity (content relevance) ──
    user_vector = vectorizer.transform([profile_query])
    cosine_scores = cosine_similarity(user_vector, tfidf_matrix).flatten()
    
    # ── Signal 2: Industry Match (exact + partial) ──
    industry_lower = industry.lower()
    industry_scores = np.zeros(len(df))
    for idx, row in df.iterrows():
        movie_industry = str(row.get("industry", "")).lower()
        if industry_lower and industry_lower in movie_industry:
            industry_scores[idx] = 1.0
        elif any(word in movie_industry for word in industry_lower.split()):
            industry_scores[idx] = 0.5
    
    # ── Signal 3: Career Stage Match ──
    stage_lower = career_stage.lower()
    stage_scores = np.zeros(len(df))
    for idx, row in df.iterrows():
        movie_stage = str(row.get("career_stage", "")).lower()
        if stage_lower and stage_lower in movie_stage:
            stage_scores[idx] = 1.0
        elif "all" in movie_stage:
            stage_scores[idx] = 0.5
    
    # ── Signal 4: Educational Value Score ──
    edu_scores = np.zeros(len(df))
    for idx, row in df.iterrows():
        edu_scores[idx] = min(row.get("educational_value_score", 5) / 10.0, 1.0)
    
    # ── Weighted Composite Score ──
    composite = (
        0.50 * cosine_scores +
        0.25 * industry_scores +
        0.15 * stage_scores +
        0.10 * edu_scores
    )
    
    # ── Normalize to 0–100% ──
    max_score = composite.max()
    if max_score > 0:
        normalized = (composite / max_score) * 100
    else:
        normalized = composite * 100
    
    df_scored = df.copy()
    df_scored["match_score"] = normalized
    
    # ── Rank and select top N ──
    top_matches = df_scored.sort_values(by="match_score", ascending=False).head(top_n)
    
    # ── Diverse Phrase Templates ──
    # Each list is cycled through so no two notes sound alike
    GAP_PHRASES = [
        "A masterclass in {skills} — exactly the areas where your resume shows room to grow.",
        "Watch this to sharpen your edge in {skills}. These are the gaps standing between you and your next level.",
        "This one puts {skills} front and center, giving you a blueprint for the competencies you're still building.",
        "If you want to close the gap in {skills}, this is your cinematic crash course.",
        "The narrative here is built around {skills} — precisely the muscles your career profile needs to develop.",
        "Think of this as a case study in {skills}. It's the missing chapter in your professional playbook.",
        "The protagonist's journey mirrors the exact {skills} challenges you'll face at your next milestone.",
        "A deep dive into {skills}. By the end, you'll see these gaps as your greatest opportunities.",
    ]
    INDUSTRY_PHRASES = [
        "Deeply rooted in the {ind} world, so the lessons translate directly to your day-to-day.",
        "Set squarely in {ind}, making every scene a mirror of the dynamics you navigate professionally.",
        "The {ind} backdrop isn't just a setting — it's an education in how your industry actually operates.",
        "A rare insider's look at {ind} that you won't find in any textbook or LinkedIn post.",
        "Built for {ind} professionals who want to understand the forces shaping their field.",
        "The {ind} context makes this more than entertainment — it's professional development disguised as a story.",
        "Every twist in this narrative reflects a real-world {ind} scenario you're likely to encounter.",
        "Tailor-made for someone in {ind}. The parallels to your career path are unmistakable.",
    ]
    STRENGTH_PHRASES = [
        "Plus, it reinforces your existing command of {skills} — a reminder of how far you've already come.",
        "It also doubles down on {skills}, validating the strengths that already set you apart.",
        "Your expertise in {skills} will make this resonate on a deeper level than most viewers experience.",
        "As someone already strong in {skills}, you'll pick up nuances here that others might miss entirely.",
        "Bonus: your background in {skills} means you'll extract even more strategic insight from this one.",
        "Your foundation in {skills} gives you a head start — this builds on what you already know.",
        "It speaks directly to your strengths in {skills}, reinforcing the expertise your resume already showcases.",
        "The {skills} themes will feel familiar — because you've lived them. That's what makes it powerful.",
    ]
    GENERIC_PHRASES = [
        "A compelling study in professional growth that speaks to ambitious careers across every field.",
        "The themes of resilience, strategy, and human ambition here transcend any single industry.",
        "Sometimes the most powerful career lessons come from the most unexpected stories. This is one of them.",
        "Not an obvious pick — but the leadership and decision-making themes make it essential viewing.",
        "A story about what it takes to rise, adapt, and outperform. Your career stage makes this especially timely.",
        "The kind of narrative that rewires how you think about professional challenges and opportunities.",
        "Career growth isn't always about hard skills. This explores the intangibles that separate good from great.",
        "A hidden gem for professionals who understand that the best mentors aren't always in the boardroom.",
    ]

    # ── Generate Rich Explanations ──
    recommendations = []
    rec_index = 0
    for _, row in top_matches.iterrows():
        # Find which skill gaps this movie addresses
        movie_skills = str(row.get("career_skills", "")).lower()
        matched_gaps = [g for g in skill_gaps if g.lower() in movie_skills]
        matched_existing = [s for s in found_skills if s.lower() in movie_skills]
        
        # Build contextual explanation using varied phrases
        explanation_parts = []
        
        if matched_gaps:
            template = GAP_PHRASES[rec_index % len(GAP_PHRASES)]
            explanation_parts.append(template.format(skills=", ".join(matched_gaps[:3])))
        
        if industry_lower and industry_lower in str(row.get("industry", "")).lower():
            template = INDUSTRY_PHRASES[rec_index % len(INDUSTRY_PHRASES)]
            explanation_parts.append(template.format(ind=industry))
        
        if matched_existing:
            template = STRENGTH_PHRASES[rec_index % len(STRENGTH_PHRASES)]
            explanation_parts.append(template.format(skills=", ".join(matched_existing[:2])))
        
        if not explanation_parts:
            explanation_parts.append(GENERIC_PHRASES[rec_index % len(GENERIC_PHRASES)])
        
        rec = {
            "id": int(row["id"]),
            "title": row["title"],
            "career_skills": row["career_skills"],
            "industry": row["industry"],
            "summary": row["summary"],
            "explanation": " ".join(explanation_parts),
            "match_score": round(float(row["match_score"]) / 100.0, 4),  # Keep 0-1 for frontend
        }
        recommendations.append(rec)
        rec_index += 1
    
    return recommendations
