import pandas as pd
import sqlite3
import requests
import io

# Using a verified public raw GitHub URL for the TMDB 5000 dataset
URL = "https://raw.githubusercontent.com/vamshi121/TMDB-5000-Movie-Dataset/main/tmdb_5000_movies.csv"

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
    "politics": ("diplomacy, public speaking, strategic planning, negotiation, ethics", "Government, Policy", "Mid-level, Executive"),
    "crime": ("forensics, investigative techniques, risk assessment, psychology", "Law Enforcement, Legal", "Entry-level, Mid-level"),
    "war": ("strategic leadership, resilience, tactical execution, logistics", "Military, Defense", "All Levels"),
    "science": ("research, analytics, hypothesis testing, data visualization", "Science, Research", "Entry-level, Mid-level")
}

def categorize_movie(summary):
    if not isinstance(summary, str):
        return "leadership, networking, teamwork, communication, resilience", "General Professional", "All Levels"
        
    summary_lower = summary.lower()
    for keyword, (skills, industry, stage) in SKILLS_MAP.items():
        if keyword in summary_lower:
            return skills, industry, stage
            
    return "leadership, networking, teamwork, communication, resilience", "General Professional", "All Levels"

try:
    print("Downloading dataset from GitHub Raw...")
    response = requests.get(URL)
    if response.status_code == 200:
        df = pd.read_csv(io.StringIO(response.text))
        print(f"Successfully downloaded {len(df)} movies.")
        
        conn = sqlite3.connect("movies.db")
        cursor = conn.cursor()
        
        added = 0
        skipped = 0
        for index, row in df.iterrows():
            # CSV columns: budget, genres, homepage, id, keywords, original_language, original_title, overview, popularity, ...
            title = row.get('original_title', '')
            summary = row.get('overview', '')
            
            if not isinstance(title, str) or not isinstance(summary, str) or len(summary) < 20:
                skipped += 1
                continue
                
            cursor.execute("SELECT id FROM movies WHERE title = ?", (title,))
            if cursor.fetchone() is not None:
                skipped += 1
                continue
                
            skills, industry, stage = categorize_movie(summary)
            
            cursor.execute('''
                INSERT INTO movies (title, career_skills, industry, career_stage, summary)
                VALUES (?, ?, ?, ?, ?)
            ''', (title, skills, industry, stage, summary))
            added += 1
            
            if added % 500 == 0:
                print(f"Inserted {added} movies...")
                
        conn.commit()
        conn.close()
        print(f"Successfully added {added} NEW movies to the database. (Skipped {skipped} duplicates/invalid)")
    else:
        print(f"Failed to download: Status code {response.status_code}")
    
except Exception as e:
    print(f"Failed: {e}")
