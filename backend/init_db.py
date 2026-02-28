import sqlite3
import pandas as pd

def init_db():
    conn = sqlite3.connect("movies.db")
    cursor = conn.cursor()

    # Create movies table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS movies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            career_skills TEXT NOT NULL,
            industry TEXT NOT NULL,
            career_stage TEXT,
            summary TEXT,
            educational_value_score INTEGER DEFAULT 5
        )
    ''')
    
    # Optional: Clear table to prevent duplicates during quick testing
    cursor.execute("DELETE FROM movies")

    movie_data = [
        # Analytics & Scaling
        {
            "title": "Moneyball",
            "career_skills": "analytics, data science, strategic decision making, risk management, negotiation, disruption, constraints, quantitative modeling",
            "industry": "Sports Management, Business, Technology, Data Science",
            "career_stage": "Mid-Level, Senior",
            "summary": "Oakland A's general manager Billy Beane's successful attempt to assemble a baseball team on a lean budget by employing computer-generated analysis to acquire new players."
        },
        
        # Resilience & Entry-level hustle
        {
            "title": "The Pursuit of Happyness",
            "career_skills": "resilience, sales, perseverance, networking, communication, problem solving, overcoming adversity, grit, cold calling",
            "industry": "Finance, Sales, Any",
            "career_stage": "Entry-level, Career Switcher",
            "summary": "A struggling salesman takes custody of his son as he's poised to begin a life-changing professional career."
        },
        
        # Tech Entrepreneurship & Startups
        {
            "title": "The Social Network",
            "career_skills": "programming, entrepreneurship, leadership, vision, scaling, product development, user acquisition, negotiation, legal battles",
            "industry": "Technology, Software Engineering, Business Startup",
            "career_stage": "Entry-level, Founder",
            "summary": "As Harvard student Mark Zuckerberg creates the social networking site that would become known as Facebook, he is sued by the twins who claimed he stole their idea."
        },
        
        # Diversity, Engineering & Overcoming Systemic Barriers
        {
            "title": "Hidden Figures",
            "career_skills": "mathematics, software engineering, leadership, overcoming systemic barriers, teamwork, analytics, precision, advocating for yourself",
            "industry": "Aerospace, Technology, Science, Engineering",
            "career_stage": "Entry-level, Mid-level",
            "summary": "The story of a team of female African-American mathematicians who served a vital role in NASA during the early years of the U.S. space program."
        },
        
        # Bootstrapping & Hardware
        {
            "title": "Silicon Cowboys",
            "career_skills": "entrepreneurship, aggressive growth, marketing, hardware engineering, strategic planning, product-market fit, enterprise sales",
            "industry": "Technology, Hardware, Business",
            "career_stage": "Mid-level, Founder",
            "summary": "Documentary about the rise of Compaq Computer and their battle against IBM."
        },
        
        # Mastery & Extreme Focus
        {
            "title": "Jiro Dreams of Sushi",
            "career_skills": "mastery, discipline, quality assurance, consistency, mentorship, focus, iterative improvement, deep work",
            "industry": "Culinary, Crafts, Any professional pursuit",
            "career_stage": "Junior, Mid-level",
            "summary": "A documentary on 85-year-old sushi master Jiro Ono, his renowned Tokyo restaurant, and his relationship with his son and eventual heir."
        },
        
        # Crisis Management & Engineering
        {
            "title": "Apollo 13",
            "career_skills": "crisis management, engineering, collaboration, leadership under pressure, adaptability, resourcefulness, real-time problem solving",
            "industry": "Aerospace, Engineering, Management",
            "career_stage": "Mid-Level, Senior",
            "summary": "NASA must devise a strategy to return Apollo 13 to Earth safely after the spacecraft undergoes massive internal damage putting the lives of the three astronauts on board in jeopardy."
        },
        
        # HR & Restructuring
        {
            "title": "Up in the Air",
            "career_skills": "human resources, communication, empathy, restructuring, efficiency, lay-offs, process optimization",
            "industry": "Human Resources, Consulting",
            "career_stage": "Mid-Level",
            "summary": "With a job that has him traveling around the country firing people, Ryan Bingham enjoys his life living out of a suitcase, but finds that lifestyle threatened by the presence of a new hire."
        },
        
        # Corporate Governance & Ethics
        {
            "title": "Enron: The Smartest Guys in the Room",
            "career_skills": "ethics, corporate governance, financial analysis, leadership pitfalls, accounting fraud, toxic culture, whistleblowing",
            "industry": "Finance, Corporate Management",
            "career_stage": "All",
            "summary": "A documentary about the Enron corporation, its faulty and corrupt business practices, and how they led to its fall."
        },
        
        # Career Pivots & Creativity
        {
            "title": "Chef",
            "career_skills": "marketing, branding, creativity, career switcher, entrepreneurship, social media marketing, reinvention",
            "industry": "Culinary, Marketing, Business",
            "career_stage": "Mid-level, Career Switcher",
            "summary": "A head chef quits his restaurant job and buys a food truck in an effort to reclaim his creative promise, while piecing back together his estranged family."
        },
        
        # Radical Candor & Media
        {
            "title": "Broadcast News",
            "career_skills": "journalism, integrity, ethics, fast-paced environments, radical candor, balancing career and personal life",
            "industry": "Media, Broadcasting, Journalism",
            "career_stage": "Mid-Level, Senior",
            "summary": "Take a behind-the-scenes look at the chaotic daily routine of producing a national news program combined with romantic entanglements."
        },
        
        # Product Design & Industrial Design
        {
            "title": "Objectified",
            "career_skills": "industrial design, user experience, UX/UI, product design, empathy for the user, manufacturing",
            "industry": "Design, Manufacturing, Tech",
            "career_stage": "All",
            "summary": "A feature-length documentary about our complex relationship with manufactured objects and, by extension, the people who design them."
        },
        
        # Negotiation & Corporate Strategy
        {
            "title": "Margin Call",
            "career_skills": "finance, risk management, crisis leadership, quantitative analysis, corporate strategy, ethics, high-stakes negotiation",
            "industry": "Finance, Banking",
            "career_stage": "Mid-Level, Senior, Executive",
            "summary": "Follows the key people at an investment bank, over a 24-hour period, during the early stages of the 2008 financial crisis."
        },
        
        # Venture Capital & Theranos
        {
            "title": "The Inventor: Out for Blood in Silicon Valley",
            "career_skills": "venture capital, fraud detection, startups, biotechnology, due diligence, engineering ethics, whistleblowing",
            "industry": "Technology, Healthcare, Venture Capital",
            "career_stage": "Mid-Level, Senior, Founder",
            "summary": "Documentary investigating the rise and fall of Theranos, the one-time multibillion-dollar healthcare company founded by Elizabeth Holmes."
        },
        
        # Media Disruption & Investigative Journalism
        {
            "title": "Spotlight",
            "career_skills": "investigative journalism, persistence, data collection, interviewing, challenging authority, institutional reform",
            "industry": "Journalism, Law",
            "career_stage": "Mid-Level",
            "summary": "The true story of how the Boston Globe uncovered the massive scandal of child molestation and cover-up within the local Catholic Archdiocese."
        },

        # Corporate Law & Environment
        {
            "title": "Erin Brockovich",
            "career_skills": "legal research, advocacy, empathy, grassroots organizing, litigation, data collection, unorthodox problem solving",
            "industry": "Law, Environmental Science, Activism",
            "career_stage": "Entry-level, Mid-level",
            "summary": "An unemployed single mother becomes a legal assistant and almost single-handedly brings down a California power company accused of polluting a city's water supply."
        },
        
        # Extreme Leadership & Mentorship
        {
            "title": "Whiplash",
            "career_skills": "extreme discipline, mentorship, toxic leadership, pushing boundaries, performing arts, dedication, ambition",
            "industry": "Arts, Education",
            "career_stage": "Junior",
            "summary": "A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student's potential."
        },
        
        # Strategy & Advertising
        {
            "title": "Thank You for Smoking",
            "career_skills": "public relations, lobbying, spin, debate, communication strategy, narrative control, crisis PR",
            "industry": "Public Relations, Marketing, Politics",
            "career_stage": "Mid-Level, Senior",
            "summary": "Satirical comedy following the machinations of Big Tobacco's chief spokesman, Nick Naylor, who spins on behalf of cigarettes while trying to remain a role model for his twelve-year-old son."
        },

        # Remote Collaboration & Information Security
        {
            "title": "The Imitation Game",
            "career_skills": "cryptography, algorithms, cross-functional teams, managing neurodiversity, high-stakes engineering, information security",
            "industry": "Technology, Intelligence, Military",
            "career_stage": "Senior, Team Lead",
            "summary": "During World War II, the English mathematical genius Alan Turing tries to crack the German Enigma code with help from fellow mathematicians."
        },

        # Scaling a Franchise
        {
            "title": "The Founder",
            "career_skills": "franchising, real estate, aggressive scaling, business model pivots, operational efficiency, ruthless negotiation",
            "industry": "Food & Beverage, Real Estate, Business",
            "career_stage": "Founder, Executive",
            "summary": "The story of Ray Kroc, a salesman who turned two brothers' innovative fast food eatery, McDonald's, into the biggest restaurant business in the world."
        },

        # Project Management & Impossible Deadlines
        {
            "title": "Ford v Ferrari",
            "career_skills": "project management, automotive engineering, corporate bureaucracy, impossible deadlines, quality assurance, testing",
            "industry": "Automotive, Engineering, Racing",
            "career_stage": "Mid-Level, Senior",
            "summary": "American car designer Carroll Shelby and driver Ken Miles battle corporate interference and the laws of physics to build a revolutionary race car for Ford in order to defeat Ferrari at the 24 Hours of Le Mans in 1966."
        },

        # Imposter Syndrome & Presentation Skills
        {
            "title": "The King's Speech",
            "career_skills": "public speaking, overcoming imposter syndrome, executive presence, speech therapy, coaching, vulnerability",
            "industry": "Government, Public Relations",
            "career_stage": "Executive, Senior Leadership",
            "summary": "The story of King George VI, his impromptu ascension to the throne of the British Empire in 1936, and the speech therapist who helped the unsure monarch overcome his stammer."
        },

         # Architecture & Urban Planning
        {
            "title": "Urbanized",
            "career_skills": "urban planning, architecture, sustainability, civic engagement, civil engineering, public transit",
            "industry": "Architecture, Urban Planning, Government",
            "career_stage": "All",
            "summary": "A documentary about the design of cities, which looks at the issues and strategies behind urban design and features some of the world's foremost architects, planners, policymakers, builders, and thinkers."
        },

        # Freelancing & Gig Economy Hustle
        {
            "title": "Nightcrawler",
            "career_skills": "freelance hustle, ruthless negotiation, gig economy, media ethics, entrepreneurship, self-taught skills, opportunism",
            "industry": "Media, Journalism, Freelance",
            "career_stage": "Entry-level, Freelancer",
            "summary": "When Louis Bloom, a con man desperate for work, muscles into the world of L.A. crime journalism, he blurs the line between observer and participant to become the star of his own story."
        },

        # Big Data & Politics
        {
            "title": "The Great Hack",
            "career_skills": "data privacy, political consulting, algorithms, Cambridge Analytica, ethics in tech, digital marketing, big data",
            "industry": "Technology, Politics, Digital Marketing",
            "career_stage": "Mid-level, Senior",
            "summary": "Explore how a data company named Cambridge Analytica came to symbolize the dark side of social media in the wake of the 2016 U.S. presidential election."
        },

        # Logistics & Supply Chain
        {
            "title": "Captain Phillips",
            "career_skills": "logistics, maritime shipping, crisis negotiation, protocol adherence, leadership under extreme stress, supply chain",
            "industry": "Shipping, Logistics, Military",
            "career_stage": "Senior, Captain",
            "summary": "The true story of Captain Richard Phillips and the 2009 hijacking by Somali pirates of the U.S.-flagged MV Maersk Alabama, the first American cargo ship to be hijacked in two hundred years."
        },

        # Game Design & Indie Dev
        {
            "title": "Indie Game: The Movie",
            "career_skills": "game design, software development, indie hacking, extreme burnout, creative vision, releasing a product",
            "industry": "Game Development, Software",
            "career_stage": "Founder, Solo Developer",
            "summary": "A documentary that follows the journeys of indie game developers as they create games and release those works, and themselves, to the world."
        },

        # Managing Creative Teams
        {
            "title": "The Devil Wears Prada",
            "career_skills": "managing up, surviving toxic environments, fashion industry, editorial, high-stakes assistance, career compromise",
            "industry": "Fashion, Publishing, Editorial",
            "career_stage": "Entry-level, Assistant",
            "summary": "A smart but sensible new graduate lands a job as an assistant to Miranda Priestly, the demanding editor-in-chief of a high fashion magazine."
        },

        # Financial Fraud & Boiler Rooms
        {
            "title": "The Wolf of Wall Street",
            "career_skills": "high-pressure sales, cold calling, team motivation, scaling a sales floor, regulatory evasion, financial fraud",
            "industry": "Finance, Sales",
            "career_stage": "Founder, Executive, Sales Team",
            "summary": "Based on the true story of Jordan Belfort, from his rise to a wealthy stock-broker living the high life to his fall involving crime, corruption and the federal government."
        },

        # Innovation vs Commercialization
        {
            "title": "Steve Jobs",
            "career_skills": "product marketing, theatrical presentation, managing engineers, ruthless vision, commercialization vs innovation, design-first thinking",
            "industry": "Technology, Consumer Electronics",
            "career_stage": "Founder, Executive",
            "summary": "Steve Jobs takes us behind the scenes of the digital revolution, to paint a portrait of the man at its epicenter. The story unfolds backstage at three iconic product launches, ending in 1998 with the unveiling of the iMac."
        },

        # Investment Banking & Entry-Level Grind
        {
            "title": "Industry (TV Series Concept)",  # Treating as movie for DB but conceptually valid
            "career_skills": "investment banking, financial modeling, high-stress environments, meritocracy, surviving cuts, networking",
            "industry": "Finance, Investment Banking",
            "career_stage": "Entry-level, Intern",
            "summary": "Follows a group of young graduates competing for a limited set of permanent positions at a top investment bank in London."
        },

         # Deep Operations & Government
        {
            "title": "Zero Dark Thirty",
            "career_skills": "intelligence analysis, data synthesis, conviction, navigating bureaucracy, obsessive research, cross-agency collaboration",
            "industry": "Government, Intelligence, Military",
            "career_stage": "Mid-level, Analyst",
            "summary": "A chronicle of the decade-long hunt for al-Qaeda terrorist leader Osama bin Laden after the September 2001 attacks, and his death at the hands of the Navy S.E.A.L.s Team 6 in May 2011."
        },

         # Artificial Intelligence & UI/UX
        {
            "title": "Her",
            "career_skills": "artificial intelligence, conversational UI, voice design, UX/UI, human-computer interaction, creative writing",
            "industry": "Technology, Design",
            "career_stage": "Mid-level",
            "summary": "In a near future, a lonely writer develops an unlikely relationship with an operating system designed to meet his every need."
        }
    ]

    for data in movie_data:
        cursor.execute('''
            INSERT INTO movies (title, career_skills, industry, career_stage, summary)
            VALUES (?, ?, ?, ?, ?)
        ''', (data["title"], data["career_skills"], data["industry"], data["career_stage"], data["summary"]))
    
    conn.commit()
    conn.close()
    print("Database initialized successfully with curated MVP career movies.")

if __name__ == "__main__":
    init_db()
