import requests
import sqlite3
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Public TMDB API Key for testing/demo
TMDB_API_KEY = "3a002a246ecde4dfba187aa04f5e7178"

# Skill mapping for automated categorization
SKILLS_MAP = {
    "startup": ("entrepreneurship, aggressive growth, scaling, product development, risk management", "Technology, Business Startup", "Founder, Mid-level"),
    "tech": ("software engineering, programming, analytics, scaling, problem solving", "Technology, Software", "Entry-level, Mid-level"),
    "legal": ("advocacy, litigation, legal research, communication, ethics", "Law, Activism", "Mid-level, Senior"),
    "finance": ("financial analysis, risk management, corporate strategy, ethics, high-stakes negotiation", "Finance, Corporate Management", "Executive, Senior"),
    "scandal": ("crisis management, corporate governance, investigative journalism, whistleblowing, ethics", "Media, Journalism, Politics", "Mid-level, Senior"),
    "journalism": ("investigative journalism, persistence, data collection, interviewing", "Journalism, Media", "Entry-level, Mid-level"),
    "art": ("creativity, performing arts, extreme discipline, managing neurodiversity", "Arts, Media", "Junior, Mid-level"),
    "engineering": ("engineering, collaboration, project management, real-time problem solving, resourcefulness", "Engineering, Aerospace, Automotive", "Mid-level, Senior"),
    "business": ("marketing, branding, leadership, restructuring, efficiency", "Business, Management", "Mid-level, Executive"),
    "medical": ("patient care, triage, diagnostics, empathy, crisis management", "Healthcare, Medicine", "Entry-level, Senior"),
    "military": ("leadership under pressure, tactics, logistics, resilience, teamwork", "Defense, Government", "Mid-level, Senior"),
    "spy": ("intelligence, strategic empathy, risk management, deep analytics", "Government, Intelligence", "Mid-level, Senior"),
    "music": ("creativity, performing arts, extreme discipline, team management", "Arts, Entertainment", "Entry-level, Senior"),
    "sports": ("teamwork, coaching, resilience, strategic execution, grit", "Sports, Management", "Entry-level, Senior"),
}

def get_session():
    session = requests.Session()
    retry = Retry(total=5, backoff_factor=1)
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session

def categorize(summary):
    if not summary:
        return "leadership, networking, teamwork, communication, resilience", "General Professional", "All Levels"
    summary_lower = summary.lower()
    for keyword, (skills, industry, stage) in SKILLS_MAP.items():
        if keyword in summary_lower:
            return skills, industry, stage
    return "leadership, networking, teamwork, communication, resilience", "General Professional", "All Levels"

def update_2026():
    session = get_session()
    print("Starting Final Update 2026 (Fetching 2025/2026 releases)...")
    
    types = ["movie", "tv"]
    years = ["2024", "2025", "2026"]
    collected = []
    
    for t in types:
        for y in years:
            print(f"-> Fetching {t}s for year {y}...")
            # We use the Discover API to target specific years and high popularity
            date_param = "primary_release_year" if t == "movie" else "first_air_date_year"
            url = f"https://api.themoviedb.org/3/discover/{t}?api_key={TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&{date_param}={y}&page=1"
            
            try:
                response = session.get(url, timeout=10)
                if response.status_code == 200:
                    results = response.json().get('results', [])
                    for item in results:
                        collected.append({
                            'title': item.get('title') if t == "movie" else item.get('name'),
                            'summary': item.get('overview', '')
                        })
                time.sleep(0.1)
            except Exception as e:
                print(f"Error for {t} {y}: {e}")
                
    # Save to DB
    conn = sqlite3.connect("movies.db")
    cursor = conn.cursor()
    added = 0
    for item in collected:
        title = item['title']
        summary = item['summary']
        if not summary or len(summary) < 20: continue
        cursor.execute("SELECT id FROM movies WHERE title = ?", (title,))
        if cursor.fetchone() is not None: continue
        
        skills, industry, stage = categorize(summary)
        try:
            cursor.execute('''
                INSERT INTO movies (title, career_skills, industry, career_stage, summary)
                VALUES (?, ?, ?, ?, ?)
            ''', (title, skills, industry, stage, summary))
            added += 1
        except: pass
    
    conn.commit()
    conn.close()
    print(f"Final 2026 Update finished. Added {added} state-of-the-art items.")

if __name__ == "__main__":
    update_2026()
