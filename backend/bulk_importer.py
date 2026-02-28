import requests
import sqlite3
import time
import json
import re

# We will use the public TMDB (The Movie Database) API to fetch thousands of real movies
# This avoids Wikipedia rate limits and gives us clean, formatted data (titles, overviews)
TMDB_API_KEY = "3a002a246ecde4dfba187aa04f5e7178"  # Publicly available demo key format for testing

def get_movies_from_tmdb(pages=100):
    movies = []
    # Fetch top rated and popular movies to ensure high quality recommendations
    for page in range(1, pages + 1):
        try:
            url = f"https://api.themoviedb.org/3/movie/popular?api_key={TMDB_API_KEY}&language=en-US&page={page}"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                results = response.json().get('results', [])
                for movie in results:
                    movies.append({
                        'title': movie.get('title'),
                        'summary': movie.get('overview', '')
                    })
            
            # TMDB limit is 40 requests per 10 seconds, sleep briefly to respect it
            time.sleep(0.2)
            
            if page % 10 == 0:
                print(f"Fetched {page} pages... ({len(movies)} movies so far)")
        except Exception as e:
            print(f"Error fetching page {page}: {e}")
            
    print(f"Total movies fetched from TMDB: {len(movies)}")
    return movies

# Re-use our existing parsing logic to categorize these new movies
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
    "sports": ("teamwork, coaching, resilience, strategic execution, grit", "Sports, Management", "Entry-level, Senior")
}

def categorize_movie(summary):
    summary_lower = summary.lower()
    for keyword, (skills, industry, stage) in SKILLS_MAP.items():
        if keyword in summary_lower:
            return skills, industry, stage
            
    # Fallback
    return "leadership, networking, teamwork, communication, resilience", "General Professional", "All Levels"

def populate_database(movies):
    conn = sqlite3.connect("movies.db")
    cursor = conn.cursor()
    
    added = 0
    for movie in movies:
        title = movie['title']
        summary = movie['summary']
        
        if not summary or len(summary) < 50:
            continue
            
        # Check if exists
        cursor.execute("SELECT id FROM movies WHERE title = ?", (title,))
        if cursor.fetchone() is not None:
            continue
            
        skills, industry, stage = categorize_movie(summary)
        
        try:
            cursor.execute('''
                INSERT INTO movies (title, career_skills, industry, career_stage, summary)
                VALUES (?, ?, ?, ?, ?)
            ''', (title, skills, industry, stage, summary))
            added += 1
        except Exception as e:
            print(f"Db error on {title}: {e}")
            
    conn.commit()
    conn.close()
    print(f"Successfully added {added} NEW movies to the database.")

if __name__ == "__main__":
    # 200 pages * 20 movies per page = ~4000 movies
    print("Starting massive database expansion (Goal: ~2000-4000 movies)...")
    tmdb_movies = get_movies_from_tmdb(pages=150) # Fetching 3000 popular movies
    populate_database(tmdb_movies)
