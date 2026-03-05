import movieData from '../data/movies.json';

/**
 * Maps the 17 detailed user profile industries to the broader categories
 * found in the movies.json database. This ensures the industry matching signal works.
 */
export const INDUSTRY_ALIASES = {
  "Technology": ["Technology, Software", "General Professional", "Business, Management"],
  "Healthcare": ["Healthcare, Medicine", "General Professional", "Science, Activism"],
  "Finance": ["Business, Management", "General Professional"],
  "Law": ["Law Enforcement, Legal", "General Professional", "Military, Defense"],
  "Education": ["Arts, Education", "General Professional"],
  "Media & Entertainment": ["Arts, Media", "Arts, Entertainment", "General Professional"],
  "Engineering": ["Aerospace, Engineering, Management", "Technology, Software", "General Professional"],
  "Retail & E-Commerce": ["Business, Management", "General Professional"],
  "Sports & Fitness": ["General Professional"],
  "Arts & Design": ["Arts, Media", "Arts, Entertainment", "Arts, Education", "General Professional"],
  "Real Estate": ["Business, Management", "General Professional"],
  "Agriculture & Food": ["General Professional"],
  "Energy & Utilities": ["General Professional", "Science, Activism"],
  "Transportation & Logistics": ["Business, Management", "General Professional"],
  "Non-Profit & Social Impact": ["Science, Activism", "General Professional"],
  "Consulting": ["Business, Management", "General Professional"],
  "Hospitality & Tourism": ["General Professional"]
};


/**
 * A lightweight TF-IDF and Cosine Similarity engine for the browser.
 */

class Recommender {
  constructor() {
    this.movies = movieData;
    this.vocabulary = new Set();
    this.idf = {};
    this.movieVectors = [];
    this.isWarmed = false;
  }

  /**
   * Reset cached data (useful for HMR or data changes).
   */
  reset() {
    this.vocabulary = new Set();
    this.idf = {};
    this.movieVectors = [];
    this.isWarmed = false;
  }

  /**
   * Tokenize text into a bag of words.
   */
  tokenize(text) {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2); // Filter short words/stop words
  }

  /**
   * Build the IDF dictionary and pre-calculate movie vectors.
   */
  warm() {
    if (this.isWarmed) return;

    const docCount = this.movies.length;
    const wordDocCounts = {};

    // 1. Calculate document frequency for each word
    this.movies.forEach(movie => {
      const combined = [
        movie.career_skills || "",
        movie.industry || "",
        movie.career_stage || "",
        movie.summary || ""
      ].join(" ");
      
      const tokens = new Set(this.tokenize(combined));
      tokens.forEach(token => {
        wordDocCounts[token] = (wordDocCounts[token] || 0) + 1;
        this.vocabulary.add(token);
      });
    });

    // 2. Calculate IDF for each word
    Object.entries(wordDocCounts).forEach(([word, count]) => {
      this.idf[word] = Math.log(docCount / (1 + count));
    });

    // 3. Pre-calculate TF-IDF vectors for all movies
    this.movieVectors = this.movies.map(movie => {
      const combined = [
        movie.career_skills || "",
        movie.industry || "",
        movie.career_stage || "",
        movie.summary || ""
      ].join(" ");
      
      return this.calculateTfIdfVector(combined);
    });

    this.isWarmed = true;
    console.log(`[Recommender] Warmed with ${this.movies.length} movies and ${this.vocabulary.size} features.`);
  }

  /**
   * Calculate TF-IDF vector for a given string.
   */
  calculateTfIdfVector(text) {
    const tokens = this.tokenize(text);
    const tf = {};
    tokens.forEach(token => {
      tf[token] = (tf[token] || 0) + 1;
    });

    const vector = {};
    Object.entries(tf).forEach(([word, count]) => {
      if (this.idf[word]) {
        vector[word] = count * this.idf[word];
      }
    });

    return vector;
  }

  /**
   * Calculate Cosine Similarity between two sparse vectors.
   */
  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    // Use keys from the smaller vector for efficiency if one is significantly smaller
    const keysA = Object.keys(vecA);
    const keysB = Object.keys(vecB);
    
    keysA.forEach(key => {
      const valA = vecA[key];
      if (vecB[key]) {
        dotProduct += valA * vecB[key];
      }
      normA += valA * valA;
    });

    keysB.forEach(key => {
      normB += vecB[key] * vecB[key];
    });

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Main Recommendation Logic (Matches recommender.py)
   */
  getRecommendations(profile, topN = 10) {
    this.warm();

    // Build query string (weighted like the original)
    const skill_gaps = profile.skill_gaps || [];
    const found_skills = profile.found_skills || [];
    const industry = profile.industry || "";
    const tech = profile.technologies || [];
    const careerStage = profile.career_stage || "";
    
    const queryParts = [
      ...skill_gaps, ...skill_gaps, ...skill_gaps, // 3x weight
      ...found_skills,
      ...tech,
      industry, industry, // 2x weight
      careerStage
    ];
    
    const userVector = this.calculateTfIdfVector(queryParts.join(" "));
    
    // Score all movies
    const scoredMovies = this.movies.map((movie, idx) => {
      const contentSimilarity = this.cosineSimilarity(userVector, this.movieVectors[idx]);
      
      // Additional Signals (Heuristics)
      let industrySignal = 0;
      if (industry && movie.industry) {
        const aliases = INDUSTRY_ALIASES[industry] || [];
        const movieInd = movie.industry.toLowerCase();
        if (movieInd.includes(industry.toLowerCase()) || 
            aliases.some(alias => movieInd.includes(alias.toLowerCase()))) {
          industrySignal = 1.0;
        }
      }

      let careerStageSignal = 0;
      if (careerStage && movie.career_stage?.toLowerCase().includes(careerStage.toLowerCase())) {
        careerStageSignal = 1.0;
      }

      // Vibe Signal (Simplified Genre Alignment)
      let vibeSignal = 0;
      const movieText = (movie.summary + " " + movie.career_skills).toLowerCase();
      const vibeMapping = {
        "Strategic Visionary": ["sci-fi", "biography", "epic", "future", "visionary", "pioneer"],
        "Analytical Stoic": ["mystery", "thriller", "documentary", "technical", "logic"],
        "Creative Free-Spirit": ["animation", "fantasy", "art", "music", "indie"],
        "The Relentless Hustler": ["crime", "drama", "action", "competition", "business"],
        "Empathic Leader": ["romance", "family", "social", "community", "leadership"],
        "Pragmatic Builder": ["war", "adventure", "construction", "survival", "endurance"]
      };
      
      const relevantKeywords = vibeMapping[profile.vibe] || [];
      const matchCount = relevantKeywords.filter(kw => movieText.includes(kw)).length;
      vibeSignal = Math.min(matchCount / 2, 1.0);

      const compositeScore = (
        (0.35 * contentSimilarity) +
        (0.20 * industrySignal) +
        (0.15 * vibeSignal) +
        (0.10 * careerStageSignal) +
        (0.20 * (movie.educational_value_score / 10 || 0.5))
      );

      return {
        ...movie,
        match_score: compositeScore,
        type: movie.type || (movie.title.toLowerCase().includes("series") && !movie.title.toLowerCase().includes("a series") ? "Web Series" : "Movie"),
        explanation: this.generateExplanation(movie, profile)
      };
    });

    return scoredMovies
      .sort((a, b) => {
        // Primary sort: Match Score
        if (Math.abs(b.match_score - a.match_score) > 0.001) {
            return b.match_score - a.match_score;
        }
        // Secondary sort (Tie-breaker): Favor higher educational value (fame/quality proxy)
        if (b.educational_value_score !== a.educational_value_score) {
            return b.educational_value_score - a.educational_value_score;
        }
        // Tertiary: slight randomness for variety
        return Math.random() - 0.5;
      })
      .slice(0, topN);
  }

  /**
   * Unique Explanation Generator with 10 varied templates.
   * No markdown ** markers since this renders as plain text.
   */
  generateExplanation(movie, profile) {
    const movieText = (movie.summary + " " + movie.career_skills).toLowerCase();
    const matchedGaps = profile.skill_gaps.filter(g => movieText.includes(g.toLowerCase())).slice(0, 2);
    const gapText = matchedGaps.length > 0 ? matchedGaps.join(" and ") : null;
    
    // Use a simple hash of the movie title to pick a template consistently
    const hash = movie.title.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const idx = hash % 10;
    
    const t = [
      () => gapText
        ? `This film mirrors challenges you're navigating right now. It dives into ${gapText}, which aligns with the growth areas in your ${profile.industry} trajectory.`
        : `The themes in this film directly parallel the strategic thinking required in ${profile.industry}. Watch how the protagonist navigates constraints similar to yours.`,
      () => gapText
        ? `Your ${profile.vibe} mindset will connect with this one. It unpacks ${gapText} through storytelling — exactly the areas where your career is leveling up.`
        : `As someone in ${profile.industry}, you'll recognize the professional dynamics at play here. The protagonist's journey offers a fresh lens on challenges you face daily.`,
      () => gapText
        ? `This is a masterclass in ${gapText} disguised as entertainment. Given your ${profile.career_stage} stage, the lessons here are immediately actionable.`
        : `At your ${profile.career_stage} level in ${profile.industry}, the leadership dynamics in this film will feel especially relevant. Pay attention to how decisions cascade.`,
      () => gapText
        ? `The narrative here is fueled by ${gapText} — concepts that sit right at the edge of your current skillset. Perfect for stretching your perspective.`
        : `Your ${profile.vibe} approach to work will resonate with the protagonist's strategy here. It's the kind of story that reframes how you think about obstacles.`,
      () => gapText
        ? `We matched this because it explores ${gapText} in a way that's deeply relevant to your growth path. The parallels to real-world ${profile.industry} challenges are striking.`
        : `This recommendation is driven by your unique blend of ${profile.industry} expertise and ${profile.vibe} energy. The story mirrors the trajectory you're building.`,
      () => gapText
        ? `Watch this with your career hat on. The way it handles ${gapText} will give you frameworks you can apply to your next project in ${profile.industry}.`
        : `For someone with your ${profile.industry} background, this film offers a rare outside-in perspective. It challenges assumptions that professionals in your field rarely question.`,
      () => gapText
        ? `This story is a blueprint for developing ${gapText}. As a ${profile.career_stage} professional, you're at the perfect stage to absorb these lessons.`
        : `The pacing and decision-making in this film will speak to your ${profile.vibe} sensibility. Every scene has something to teach about navigating high-stakes situations.`,
      () => gapText
        ? `Your career data points to ${gapText} as your next frontier. This film explores those exact territories through compelling characters and real-world scenarios.`
        : `Selected specifically for your ${profile.vibe} profile. The protagonist faces inflection points that mirror where ${profile.industry} professionals often find themselves.`,
      () => gapText
        ? `Think of this as targeted development for ${gapText}, wrapped in a story you'll actually enjoy. The connection to your ${profile.industry} career is unmistakable.`
        : `This pick isn't random — it's calibrated to your ${profile.career_stage} experience level and ${profile.industry} context. The themes here compound over time.`,
      () => gapText
        ? `The central conflict revolves around ${gapText}, making it remarkably relevant to the growth opportunities we identified in your profile.`
        : `Every ${profile.vibe} needs stories that challenge their default thinking. This film does exactly that, with scenarios that translate directly to ${profile.industry} decision-making.`,
    ];
    
    return t[idx]();
  }
}

export const recommender = new Recommender();
export const generateRecommendations = (profile, n) => recommender.getRecommendations(profile, n);

// Support HMR: re-warm when module is hot-reloaded
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    recommender.reset();
  });
}
