import pandas as pd
import sqlite3
import requests
import io

# Using the reliable Netflix dataset for bulk TV/Web series (includes descriptions and types)
URL = "https://raw.githubusercontent.com/prasertcbs/basic-dataset/master/netflix_titles.csv"

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
}

def categorize_show(summary):
    if not isinstance(summary, str):
        return "leadership, networking, teamwork, communication, resilience", "General Professional", "All Levels"
    summary_lower = summary.lower()
    for keyword, (skills, industry, stage) in SKILLS_MAP.items():
        if keyword in summary_lower:
            return skills, industry, stage
    return "leadership, networking, teamwork, communication, resilience", "General Professional", "All Levels"

try:
    print("Downloading Netflix Titles dataset for Web Series bulk import...")
    response = requests.get(URL)
    if response.status_code == 200:
        df = pd.read_csv(io.StringIO(response.text))
        # Filter for TV Shows only
        tv_df = df[df['type'] == 'TV Show']
        print(f"Processing {len(tv_df)} TV Shows from dataset...")
        
        conn = sqlite3.connect("movies.db")
        cursor = conn.cursor()
        
        added = 0
        skipped = 0
        for index, row in tv_df.iterrows():
            title = row.get('title', '')
            summary = row.get('description', '')
            
            if not isinstance(title, str) or not isinstance(summary, str) or len(summary) < 20:
                skipped += 1
                continue
                
            cursor.execute("SELECT id FROM movies WHERE title = ?", (title,))
            if cursor.fetchone() is not None:
                skipped += 1
                continue
                
            skills, industry, stage = categorize_show(summary)
            
            cursor.execute('''
                INSERT INTO movies (title, career_skills, industry, career_stage, summary)
                VALUES (?, ?, ?, ?, ?)
            ''', (title, skills, industry, stage, summary))
            added += 1
            
            if added % 500 == 0:
                print(f"Inserted {added} Web Series...")
                
        conn.commit()
        conn.close()
        print(f"Successfully added {added} NEW Web Series to the database. (Skipped {skipped} duplicates/invalid)")
    else:
        print(f"Failed to download: Status code {response.status_code}")
except Exception as e:
    print(f"Failed: {e}")
