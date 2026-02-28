import sqlite3
import requests
import time
import re

# Career skills mapping to match Wikipedia plot summaries
SKILLS_MAP = {
    "startup": ("entrepreneurship, aggressive growth, scaling, product development, risk management", "Technology, Business Startup", "Founder, Mid-level"),
    "tech": ("software engineering, programming, analytics, scaling, problem solving", "Technology, Software", "Entry-level, Mid-level"),
    "legal": ("advocacy, litigation, legal research, communication, ethics", "Law, Activism", "Mid-level, Senior"),
    "finance": ("financial analysis, risk management, corporate strategy, ethics, high-stakes negotiation", "Finance, Corporate Management", "Executive, Senior"),
    "scandal": ("crisis management, corporate governance, investigative journalism, whistleblowing, ethics", "Media, Journalism, Politics", "Mid-level, Senior"),
    "journalism": ("investigative journalism, persistence, data collection, interviewing", "Journalism, Media", "Entry-level, Mid-level"),
    "art": ("creativity, performing arts, extreme discipline, managing neurodiversity", "Arts, Media", "Junior, Mid-level"),
    "engineering": ("engineering, collaboration, project management, real-time problem solving, resourcefulness", "Engineering, Aerospace, Automotive", "Mid-level, Senior"),
    "business": ("marketing, branding, leadership, restructuring, efficiency", "Business, Management", "Mid-level, Executive")
}

WIKI_CATEGORIES = [
    "Category:Films_about_business",
    "Category:Films_about_technology",
    "Category:Films_about_journalism",
    "Category:Films_about_lawyers",
    "Category:Films_about_finance"
]

def clean_wiki_title(title):
    # Remove ' (film)' or ' (2014 film)' from titles
    return re.sub(r'\s*\(.*?film.*?\)', '', title)

def fetch_category_members(category, limit=20):
    url = f"https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle={category}&format=json&cmlimit={limit}&cmnamespace=0"
    try:
        response = requests.get(url, headers={"User-Agent": "CareerMentorScraper/1.0"}, timeout=10)
        data = response.json()
        return [item['title'] for item in data.get('query', {}).get('categorymembers', [])]
    except Exception as e:
        print(f"Error fetching category {category}: {e}")
        return []

def fetch_wiki_summary(title):
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(title)}"
    try:
        response = requests.get(url, headers={"User-Agent": "CareerMentorScraper/1.0"}, timeout=10)
        if response.status_code == 200:
            return response.json().get('extract', '')
    except Exception as e:
        print(f"Error fetching summary for {title}: {e}")
    return ""

def categorize_movie(summary):
    summary_lower = summary.lower()
    best_match = None
    
    # Priority matching
    for keyword, (skills, industry, stage) in SKILLS_MAP.items():
        if keyword in summary_lower:
            return skills, industry, stage
            
    # Fallback default if it found no specific keywords but was in a career category
    return "leadership, networking, teamwork, communication, career advancement", "General Professional", "All Levels"

def update_movies_from_internet():
    """
    Connects to Wikipedia's public API to dynamically fetch 
    newly categorized films based on career-related categories.
    ZERO API KEYS REQUIRED.
    """
    print("Starting Zero-Auth Internet Scraping Auto-Updater...")
    conn = sqlite3.connect("movies.db")
    cursor = conn.cursor()
    
    added_count = 0
    total_scanned = 0

    for category in WIKI_CATEGORIES:
        titles = fetch_category_members(category, limit=10) # Grab top 10 from each category to keep scraping fast
        
        for raw_title in titles:
            display_title = clean_wiki_title(raw_title)
            
            # Skip if already in database
            cursor.execute("SELECT id FROM movies WHERE title = ?", (display_title,))
            if cursor.fetchone() is not None:
                continue
                
            total_scanned += 1
            summary = fetch_wiki_summary(raw_title)
            
            if not summary or len(summary) < 50:
                continue # Skip stubs or empty pages
                
            skills, industry, stage = categorize_movie(summary)
            
            try:
                cursor.execute('''
                    INSERT INTO movies (title, career_skills, industry, career_stage, summary)
                    VALUES (?, ?, ?, ?, ?)
                ''', (display_title, skills, industry, stage, summary))
                added_count += 1
                time.sleep(0.5) # Gentle polite scraping delay
            except Exception as e:
                print(f"Failed to insert {display_title}: {e}")
                
    conn.commit()
    conn.close()
    
    print(f"Internet Scraping complete! Scanned {total_scanned} titles, added {added_count} new cinematic titles to the database.")
    return True

if __name__ == "__main__":
    update_movies_from_internet()
