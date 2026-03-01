import sqlite3
import os
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import threading
import hashlib

# ──────────────────────────────────────────────
# CACHED TF-IDF ENGINE (Singleton)
# Computes once per cold start, reuses on every request
# ──────────────────────────────────────────────
_cache_lock = threading.Lock()
_cached_df = None
_cached_vectorizer = None
_cached_tfidf_matrix = None

# Resolve movies.db path relative to this file
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "movies.db")

def _load_and_cache():
    """Load the movie database and pre-compute the TF-IDF matrix once."""
    global _cached_df, _cached_vectorizer, _cached_tfidf_matrix
    
    try:
        if not os.path.exists(DB_PATH):
            print(f"[Recommender ERROR] movies.db not found at {DB_PATH}")
            return
        
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query("SELECT * FROM movies", conn)
        conn.close()
    except Exception as e:
        print(f"[Recommender ERROR] Failed to load movies.db: {e}")
        return
    
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
        max_features=10000,
        ngram_range=(1, 2),
        min_df=1,
        sublinear_tf=True,
    )
    tfidf_matrix = vectorizer.fit_transform(df["combined_features"])
    
    _cached_df = df
    _cached_vectorizer = vectorizer
    _cached_tfidf_matrix = tfidf_matrix
    
    print(f"[Recommender] TF-IDF cache warmed: {len(df)} movies, {tfidf_matrix.shape[1]} features")

def warm_cache():
    """Thread-safe cache warming. Called lazily on first request."""
    with _cache_lock:
        if _cached_df is None:
            _load_and_cache()

def _get_cache():
    """Get the cached data, loading it if necessary."""
    if _cached_df is None:
        warm_cache()
    return _cached_df, _cached_vectorizer, _cached_tfidf_matrix


# ──────────────────────────────────────────────
# MASSIVE PHRASE LIBRARY (30+ templates per category)
# Each movie gets a UNIQUE combination based on a hash
# ──────────────────────────────────────────────

GAP_PHRASES = [
    "A masterclass in {skills} — exactly the areas where your resume shows room to grow.",
    "Watch this to sharpen your edge in {skills}. These are the gaps standing between you and your next level.",
    "This one puts {skills} front and center, giving you a blueprint for the competencies you're still building.",
    "If you want to close the gap in {skills}, this is your cinematic crash course.",
    "The narrative here is built around {skills} — precisely the muscles your career profile needs to develop.",
    "Think of this as a case study in {skills}. It's the missing chapter in your professional playbook.",
    "The protagonist's journey mirrors the exact {skills} challenges you'll face at your next milestone.",
    "A deep dive into {skills}. By the end, you'll see these gaps as your greatest opportunities.",
    "Your career trajectory needs {skills} — and this story delivers a visceral education in all of them.",
    "Consider this your pre-training montage for {skills}. The skills you lack today are the superpowers of your tomorrow.",
    "The hero here conquered {skills} under impossible odds. Their playbook is now yours.",
    "Every scene is an implicit workshop in {skills}. You'll absorb it without even trying.",
    "This is the content equivalent of a senior mentor sitting you down and teaching you {skills} over a weekend.",
    "The {skills} themes are woven so deeply into the fabric of this story, you'll walk away with a new mental model.",
    "Forget textbooks — the most memorable lesson in {skills} is a story that stays with you forever.",
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
    "If you've ever felt like nobody outside {ind} understands your world, this film gets it.",
    "The {ind} ecosystem is captured here with a fidelity that most documentaries can't match.",
    "This is the film that {ind} veterans recommend to each other when no one else is listening.",
    "The {ind} power dynamics, the politics, the breakthroughs — it's all here, unfiltered.",
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
    "With your established {skills} mastery, you'll see layers in this story that most audiences never notice.",
    "This isn't just entertainment for you — with your {skills} background, it's a strategic debrief.",
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
    "This is the kind of story that subtly rearranges your priorities and sharpens your ambition.",
    "The central theme — doing what others consider impossible — is the exact energy your career trajectory demands.",
    "It's a meditation on excellence, discipline, and the cost of greatness. Every professional needs this perspective.",
    "Don't be fooled by the genre. The core message is a direct challenge to anyone with ambition.",
]

VIBE_PHRASES = {
    "Strategic Visionary": [
        "Your visionary outlook matches the high-stakes, forward-thinking world of {title}.",
        "As a strategic thinker, {title} will feel like a roadmap for the kind of disruption you chase professionally.",
        "Visionaries like you don't just watch — they decode. {title} is rich with strategic subtext waiting to be mined.",
        "This matches your future-first mindset. The narrative arc in {title} mirrors how paradigm-shifters actually think.",
        "Your instinct for the long game will make {title} resonate on a level casual viewers never reach.",
        "The world-building in {title} is essentially a strategy deck in disguise — tailor-made for how you process information.",
        "Few films capture the tension between bold vision and calculated risk like {title}. That's your daily operating system.",
        "{title} explores the lonely burden of seeing what others can't yet. Every strategic leader knows this feeling.",
        "The arc in {title} is a masterclass in turning a contrarian bet into an industry-defining move — sound familiar?",
        "This is the movie that founders and executives whisper about at off-sites. {title} captures the strategic mindset perfectly.",
        "If strategic thinking were a sport, {title} would be its highlight reel. You'll see plays you've already run.",
        "The protagonist in {title} operates three moves ahead — the same way you approach every initiative.",
    ],
    "Analytical Stoic": [
        "A perfect match for your logical precision — {title} offers a complex, data-rich puzzle worth dissecting.",
        "The methodical unraveling in {title} will satisfy your analytical appetite like few films can.",
        "Your systematic mind will appreciate how {title} constructs its thesis — evidence first, emotion second.",
        "{title} rewards the kind of patient, precise thinking that defines your professional identity.",
        "For someone who thinks in frameworks and models, {title} is essentially a case study set to cinema.",
        "The layers of logic in {title} are stacked so precisely, only an analytical mind would catch all of them.",
        "Where others see drama, you'll see data structures. {title} is built for the way your brain works.",
        "{title} treats truth like a variable to be isolated. Your methodology-first mindset will love this.",
        "The rigor in {title} mirrors the discipline you bring to every analysis — nothing is left to chance.",
        "Most viewers absorb {title} emotionally. You'll process it like a research paper — and gain twice as much.",
        "{title} unfolds with the kind of logical inevitability that makes analytical professionals nod in recognition.",
        "The protagonist's approach in {title} — measure twice, act once — is basically your career philosophy visualized.",
    ],
    "Creative Free-Spirit": [
        "Designed for the creative mind, {title} is a masterclass in visual storytelling and fluid expression.",
        "Your creative instincts will absorb {title} differently — you'll see the craft behind every frame and feel the intention.",
        "{title} captures the tension between creative freedom and commercial constraint that you navigate daily.",
        "This film speaks the language of design, narrative, and human experience — your native tongue.",
        "The artistic choices in {title} are so deliberate, only a creative professional would fully appreciate them.",
        "Every visual decision in {title} is intentional — and your trained eye will decode the entire design system.",
        "{title} is what happens when raw creative energy meets disciplined craft. It's your process, externalized.",
        "The color theory, composition, and pacing in {title} are a director's portfolio piece. You'll notice what civilians miss.",
        "Creatives like you don't just consume {title} — you reverse-engineer it. And it's worth every second.",
        "{title} validates the creative struggle: the gap between the idea in your head and what actually ships.",
        "The emotional texture in {title} is so nuanced, it reads like a creative brief written just for you.",
        "Where engineers see plot mechanics, you'll see the soul of {title}. That's your superpower as a creative.",
    ],
    "The Relentless Hustler": [
        "This matches your high-velocity drive. {title} is all about the grind and the ultimate payoff.",
        "The protagonist's relentless energy in {title} mirrors the pace you bring to every sprint, every quarter, every target.",
        "{title} is pure ambition fuel. The hustle ethic on display here is a direct reflection of your own.",
        "Results-driven professionals like you will see {title} as a validation — proof that velocity wins.",
        "If your career were a movie, it would have the same intensity as {title}. That's why this is your pick.",
        "The stakes in {title} escalate at the same pace as your KPIs. Buckle up — this one doesn't coast.",
        "{title} is the kind of content that makes you grab a notebook mid-scene. Pure operational gold.",
        "Every setback in {title} is a setup for a bigger comeback. You know this rhythm — you live it.",
        "The velocity of decision-making in {title} will feel like a Tuesday in your world. That's the point.",
        "Hustlers don't watch {title} for relaxation — they watch it for the adrenaline. And the blueprints.",
        "{title} captures the specific breed of exhaustion and exhilaration that only high-performers truly understand.",
        "The conversion rate in {title}? 100% effort, zero shortcuts. That's your operating manual in cinematic form.",
    ],
    "Empathic Leader": [
        "Resonates with your focus on people and culture — a story of deep human connection and stewardship.",
        "The people-first leadership in {title} mirrors the way you build and nurture teams.",
        "{title} explores exactly what makes empathic leadership transformative, not just nice.",
        "For someone who leads with trust and psychological safety, {title} validates your entire philosophy.",
        "The human dynamics in {title} are so textured, only someone with your EQ will catch every subtext.",
        "{title} proves what you already know: the best leaders don't command — they cultivate. This is your story.",
        "The emotional intelligence on display in {title} is professional-grade. It takes one to know one.",
        "{title} is a meditation on the kind of leadership that builds legacies, not just results. Your lane.",
        "Where others see a movie, you'll see a case study in psychological safety and team dynamics.",
        "The mentor-student relationship in {title} captures the essence of how you develop people — with intention and care.",
        "{title} shows what happens when empathy scales. As a people-first leader, you'll feel seen.",
        "The trust-building arc in {title} is so authentic, you'll recognize it from your own leadership playbook.",
    ],
    "Pragmatic Builder": [
        "As a builder of robust systems, you'll appreciate the execution-focused narrative in {title}.",
        "{title} is about the unsexy, essential work of making something real. You know this story because you live it.",
        "Builders like you will recognize the core struggle in {title}: reliability vs. perfection under constraint.",
        "The attention to operational detail in {title} speaks directly to your professional DNA.",
        "This isn't about flash — it's about substance. {title} respects the craft of building things that last.",
        "{title} captures the builder's dilemma perfectly: ship fast or ship right? You've solved this equation before.",
        "The infrastructure thinking in {title} is so tangible, you can almost feel the architecture diagrams.",
        "Pragmatists like you will appreciate that {title} doesn't romanticize the process — it shows the real work.",
        "{title} validates your belief that great outcomes come from great systems, not great speeches.",
        "The engineering discipline in {title} is the kind of storytelling that makes builders feel understood.",
        "Where others see a plot twist, you'll see a deployment strategy. {title} was made for minds like yours.",
        "{title} is proof that the most impactful work happens in the engine room, not on stage. Your world.",
    ],
}


def _make_phrase_sequence(phrases, seed_str):
    """Create a deterministic shuffled sequence from phrases.
    Returns a list where index i gives the phrase for recommendation i.
    This GUARANTEES no two recommendations share the same phrase."""
    import random as _rng
    seq = list(range(len(phrases)))
    _rng.Random(seed_str).shuffle(seq)
    # If we need more than len(phrases) recs, extend with a second shuffle
    if len(seq) < 15:
        seq2 = list(range(len(phrases)))
        _rng.Random(seed_str + "_ext").shuffle(seq2)
        seq.extend(seq2)
    return seq

def _get_phrase(phrases, sequence, rec_index):
    """Get a phrase from a pre-shuffled sequence by rec_index."""
    idx = sequence[rec_index % len(sequence)]
    return phrases[idx]


# ──────────────────────────────────────────────
# MULTI-SIGNAL SCORING ENGINE
# ──────────────────────────────────────────────
def generate_recommendations(profile_data: dict, top_n: int = 10):
    """
    Generate career-matched movie recommendations using 6-signal scoring.
    Each recommendation gets a unique, deeply personalized explanation.
    """
    df, vectorizer, tfidf_matrix = _get_cache()
    
    if df is None or df.empty:
        return []
    
    # ── Build a rich query from the profile ──
    skill_gaps = profile_data.get("skill_gaps", [])
    found_skills = profile_data.get("found_skills", [])
    industry = profile_data.get("industry", "")
    secondary_industry = profile_data.get("secondary_industry", "")
    career_stage = profile_data.get("career_stage", "")
    technologies = profile_data.get("technologies", [])
    vibe = profile_data.get("vibe", "Pragmatic Builder")
    
    # Build a multi-dimensional query
    query_parts = []
    query_parts.extend(skill_gaps * 3)       # Gaps weighted 3x
    query_parts.extend(found_skills)          # Existing skills 1x
    query_parts.extend(technologies)          # Tech tools 1x
    query_parts.append(industry * 2)          # Primary industry 2x
    if secondary_industry:
        query_parts.append(secondary_industry)
    query_parts.append(career_stage)
    
    profile_query = " ".join(query_parts)
    
    if not profile_query.strip():
        return []
    
    # ── Signal 1: Cosine Similarity (content relevance) ──
    user_vector = vectorizer.transform([profile_query])
    cosine_scores = cosine_similarity(user_vector, tfidf_matrix).flatten()
    
    # ── Signal 2: Industry Match (exact + partial) ──
    industry_lower = industry.lower()
    secondary_ind_lower = secondary_industry.lower() if secondary_industry else ""
    industry_scores = np.zeros(len(df))
    for idx, row in df.iterrows():
        movie_industry = str(row.get("industry", "")).lower()
        if industry_lower and industry_lower in movie_industry:
            industry_scores[idx] = 1.0
        elif secondary_ind_lower and secondary_ind_lower in movie_industry:
            industry_scores[idx] = 0.7
        elif any(word in movie_industry for word in industry_lower.split()):
            industry_scores[idx] = 0.3
    
    # ── Signal 3: Career Stage Match ──
    stage_lower = career_stage.lower()
    stage_scores = np.zeros(len(df))
    for idx, row in df.iterrows():
        movie_stage = str(row.get("career_stage", "")).lower()
        if stage_lower and stage_lower in movie_stage:
            stage_scores[idx] = 1.0
        elif "all" in movie_stage:
            stage_scores[idx] = 0.5

    # ── Signal 4: Vibe-to-Genre Alignment ──
    vibe_mapping = {
        "Strategic Visionary": ["sci-fi", "biography", "epic", "future", "visionary", "pioneer", "revolution", "empire"],
        "Analytical Stoic": ["mystery", "thriller", "documentary", "technical", "logic", "investigation", "puzzle", "heist"],
        "Creative Free-Spirit": ["animation", "fantasy", "art", "music", "musical", "indie", "experimental", "surreal"],
        "The Relentless Hustler": ["crime", "drama", "action", "competition", "business", "wall street", "hustle", "rise"],
        "Empathic Leader": ["romance", "family", "social", "community", "leadership", "mentor", "sacrifice", "unity"],
        "Pragmatic Builder": ["war", "adventure", "construction", "survival", "endurance", "engineering", "mission"],
    }
    relevant_genres = vibe_mapping.get(vibe, [])
    vibe_scores = np.zeros(len(df))
    if relevant_genres:
        for idx, row in df.iterrows():
            movie_text = (str(row.get("summary", "")) + " " + str(row.get("career_skills", ""))).lower()
            hits = sum(1 for g in relevant_genres if g in movie_text)
            vibe_scores[idx] = min(hits / 3.0, 1.0)  # Graduated scoring

    # ── Signal 5: Skill Overlap Depth ──
    skill_depth_scores = np.zeros(len(df))
    all_user_skills = set(s.lower() for s in found_skills + skill_gaps + technologies)
    for idx, row in df.iterrows():
        movie_skills = str(row.get("career_skills", "")).lower()
        overlap = sum(1 for s in all_user_skills if s in movie_skills)
        skill_depth_scores[idx] = min(overlap / max(len(all_user_skills), 1), 1.0)

    # ── Signal 6: Educational Value Score ──
    edu_scores = np.zeros(len(df))
    for idx, row in df.iterrows():
        edu_scores[idx] = min(row.get("educational_value_score", 5) / 10.0, 1.0)
    
    # ── Weighted Composite Score ──
    composite = (
        0.35 * cosine_scores +
        0.20 * industry_scores +
        0.15 * vibe_scores +
        0.15 * skill_depth_scores +
        0.10 * stage_scores +
        0.05 * edu_scores
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

    # ── Build deterministic phrase sequences (unique per profile) ──
    seed_base = vibe + industry + career_stage
    vibe_pool = VIBE_PHRASES.get(vibe, VIBE_PHRASES["Pragmatic Builder"])
    vibe_seq = _make_phrase_sequence(vibe_pool, seed_base + "_vibe")
    gap_seq = _make_phrase_sequence(GAP_PHRASES, seed_base + "_gap")
    ind_seq = _make_phrase_sequence(INDUSTRY_PHRASES, seed_base + "_ind")
    str_seq = _make_phrase_sequence(STRENGTH_PHRASES, seed_base + "_str")
    gen_seq = _make_phrase_sequence(GENERIC_PHRASES, seed_base + "_gen")

    # ── Generate Rich, UNIQUE Explanations ──
    recommendations = []
    rec_index = 0
    for _, row in top_matches.iterrows():
        movie_title = row["title"]
        movie_summary = str(row.get("summary", "")).lower()
        movie_skills = str(row.get("career_skills", "")).lower()
        
        # Heuristic for Content Type
        is_series = any(kw in movie_title.lower() or kw in movie_summary 
                        for kw in ["series", "season", "episode", "part ", "vol ", "miniseries"])
        content_type = "Web Series" if is_series else "Movie"

        matched_gaps = [g for g in skill_gaps if g.lower() in movie_skills]
        matched_existing = [s for s in found_skills if s.lower() in movie_skills]
        
        explanation_parts = []
        
        # 1. Vibe phrase (guaranteed unique via shuffled sequence)
        explanation_parts.append(
            _get_phrase(vibe_pool, vibe_seq, rec_index).format(title=movie_title)
        )

        # 2. Skill gap phrase
        if matched_gaps:
            phrase = _get_phrase(GAP_PHRASES, gap_seq, rec_index)
            explanation_parts.append(phrase.format(skills=", ".join(matched_gaps[:3])))
        
        # 3. Industry phrase
        if industry_lower and industry_lower in str(row.get("industry", "")).lower():
            phrase = _get_phrase(INDUSTRY_PHRASES, ind_seq, rec_index)
            explanation_parts.append(phrase.format(ind=industry))
        
        # 4. Strength phrase
        if matched_existing:
            phrase = _get_phrase(STRENGTH_PHRASES, str_seq, rec_index)
            explanation_parts.append(phrase.format(skills=", ".join(matched_existing[:2])))
        
        # 5. If nothing matched beyond vibe, use a generic phrase
        if len(explanation_parts) <= 1:
            explanation_parts.append(_get_phrase(GENERIC_PHRASES, gen_seq, rec_index))
        
        rec = {
            "id": int(row["id"]),
            "title": movie_title,
            "type": content_type,
            "career_skills": row["career_skills"],
            "vibe": vibe,
            "industry": row["industry"],
            "summary": row["summary"],
            "explanation": " ".join(explanation_parts),
            "match_score": round(float(row["match_score"]) / 100.0, 4),
        }
        recommendations.append(rec)
        rec_index += 1
    
    return recommendations
