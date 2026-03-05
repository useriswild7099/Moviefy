/**
 * AUDIT SCRIPT: Test 700 diverse career profiles through the recommendation engine.
 * 
 * Validates:
 * 1. Profile analysis (found_skills, skill_gaps, industry, career_stage, vibe)
 * 2. Movie recommendation relevance (do recommendations match the profile?)
 * 3. Quality ranking (are famous/high-scoring titles promoted?)
 * 4. Diversity (are results varied, not repetitive?)
 * 
 * Usage: node audit_700_profiles.mjs
 */

import { readFileSync, writeFileSync } from 'fs';

// ── Load data directly (no bundler needed) ──
const moviesRaw = readFileSync('E:/prince/Projects/random projects/movie suggester/frontend/src/data/movies.json', 'utf-8');
const movieData = JSON.parse(moviesRaw);

// ── Import taxonomy inline (ESM can't import CJS .js files easily) ──
// We'll reconstruct what we need from the taxonomy file
const taxonomyRaw = readFileSync('E:/prince/Projects/random projects/movie suggester/frontend/src/data/taxonomy.js', 'utf-8');

// Extract CAREER_SKILLS_TAXONOMY keys
const INDUSTRIES = [
  "Technology", "Healthcare", "Finance", "Law", "Education",
  "Media & Entertainment", "Engineering", "Retail & E-Commerce",
  "Sports & Fitness", "Arts & Design", "Real Estate",
  "Agriculture & Food", "Energy & Utilities", "Transportation & Logistics",
  "Non-Profit & Social Impact", "Consulting", "Hospitality & Tourism"
];

const CAREER_STAGES = ["Entry-level", "Mid-Level", "Senior"];

const VIBES = [
  "Strategic Visionary", "Analytical Stoic", "Creative Free-Spirit",
  "The Relentless Hustler", "Empathic Leader", "Pragmatic Builder"
];

// Skills pool per industry (representative subset for testing)
const INDUSTRY_SKILLS = {
  "Technology": ["software engineering", "machine learning", "data science", "cloud computing", "cybersecurity", "devops", "python", "react", "docker", "kubernetes", "api design", "system design", "agile", "microservices", "database management"],
  "Healthcare": ["patient care", "diagnostics", "clinical research", "pharmacology", "epidemiology", "public health", "medical imaging", "surgery", "nursing", "biotechnology", "genomics", "telemedicine", "mental health", "rehabilitation", "medical devices"],
  "Finance": ["financial analysis", "investment banking", "portfolio management", "risk management", "accounting", "auditing", "trading", "fintech", "compliance", "tax planning", "corporate finance", "financial modeling", "blockchain", "credit analysis", "valuation"],
  "Law": ["litigation", "contract law", "intellectual property", "regulatory compliance", "corporate governance", "criminal law", "legal research", "mediation", "arbitration", "patent law", "employment law", "real estate law", "immigration law", "tax law", "data privacy"],
  "Education": ["teaching", "curriculum development", "academic research", "mentorship", "e-learning", "educational technology", "assessment design", "student counseling", "special education", "STEM education", "pedagogy", "online learning", "adult education", "literacy", "instructional design"],
  "Media & Entertainment": ["content creation", "video production", "journalism", "social media marketing", "storytelling", "film production", "streaming", "podcast production", "advertising", "brand management", "public relations", "influencer marketing", "scriptwriting", "animation", "audience analytics"],
  "Engineering": ["mechanical design", "civil engineering", "electrical engineering", "manufacturing", "CAD", "robotics", "structural analysis", "quality control", "project management", "materials science", "3D printing", "automation", "safety engineering", "process optimization", "systems integration"],
  "Retail & E-Commerce": ["merchandising", "supply chain", "inventory management", "e-commerce", "customer experience", "visual merchandising", "omnichannel strategy", "pricing strategy", "product sourcing", "store management", "logistics", "demand forecasting", "buyer behavior", "POS systems", "retail analytics"],
  "Sports & Fitness": ["coaching", "sports science", "nutrition", "fitness training", "injury prevention", "athletic development", "team management", "sports analytics", "recreational programming", "physical therapy", "kinesiology", "exercise physiology", "personal training", "sports marketing", "event management"],
  "Arts & Design": ["graphic design", "UX design", "illustration", "animation", "photography", "sculpture", "painting", "typography", "color theory", "brand identity", "interior design", "fashion design", "industrial design", "web design", "art direction"],
  "Real Estate": ["property management", "real estate investment", "commercial leasing", "residential sales", "appraisal", "zoning", "development planning", "construction management", "tenant relations", "facilities management", "market analysis", "negotiation", "property valuation", "urban development", "asset management"],
  "Agriculture & Food": ["crop management", "food safety", "sustainable farming", "precision agriculture", "food science", "culinary arts", "menu development", "livestock management", "agricultural technology", "organic farming", "supply chain", "food processing", "quality assurance", "plant genetics", "irrigation systems"],
  "Energy & Utilities": ["renewable energy", "power grid management", "energy storage", "solar energy", "wind energy", "nuclear energy", "energy efficiency", "carbon capture", "oil and gas", "utility management", "sustainability", "environmental compliance", "grid modernization", "energy policy", "smart grid"],
  "Transportation & Logistics": ["fleet management", "route optimization", "warehousing", "freight management", "aviation", "maritime operations", "supply chain logistics", "customs clearance", "last mile delivery", "autonomous vehicles", "traffic management", "transportation planning", "port operations", "rail operations", "driver management"],
  "Non-Profit & Social Impact": ["fundraising", "grant writing", "community development", "advocacy", "program management", "donor relations", "volunteer management", "social enterprise", "impact measurement", "nonprofit governance", "stakeholder engagement", "coalition building", "campaign management", "policy advocacy", "strategic planning"],
  "Consulting": ["strategy consulting", "management consulting", "due diligence", "business transformation", "organizational design", "change management", "process improvement", "market analysis", "client engagement", "benchmarking", "stakeholder management", "project delivery", "digital transformation", "risk assessment", "operational efficiency"],
  "Hospitality & Tourism": ["hotel management", "guest services", "event planning", "tourism development", "restaurant management", "revenue management", "customer experience", "catering", "destination marketing", "reservation management", "food and beverage", "concierge services", "travel planning", "cultural tourism", "hospitality operations"],
};

// ── Job titles per industry for realistic profiles ──
const JOB_TITLES = {
  "Technology": ["Software Engineer", "Data Scientist", "ML Engineer", "DevOps Engineer", "Product Manager", "Cloud Architect", "Full Stack Developer", "Backend Developer", "Frontend Developer", "CTO", "QA Engineer", "Security Analyst", "Systems Architect", "AI Research Scientist", "Platform Engineer"],
  "Healthcare": ["Registered Nurse", "Physician", "Pharmacist", "Biomedical Engineer", "Clinical Researcher", "Public Health Analyst", "Radiologist", "Physical Therapist", "Lab Technician", "Chief Medical Officer", "Healthcare Administrator", "Medical Director", "Epidemiologist", "Surgeon", "Mental Health Counselor"],
  "Finance": ["Financial Analyst", "Investment Banker", "Portfolio Manager", "Risk Analyst", "Tax Consultant", "Auditor", "Hedge Fund Manager", "CFO", "Compliance Officer", "Trading Analyst", "Wealth Advisor", "Credit Analyst", "Quantitative Analyst", "Actuary", "Financial Controller"],
  "Law": ["Corporate Lawyer", "Litigation Attorney", "IP Attorney", "Paralegal", "Legal Counsel", "Judge", "Compliance Officer", "Criminal Defense Attorney", "Immigration Lawyer", "Contract Specialist", "Data Privacy Lawyer", "Employment Attorney", "Tax Attorney", "Real Estate Lawyer", "Legal Researcher"],
  "Education": ["High School Teacher", "Professor", "Academic Dean", "Curriculum Designer", "Instructional Designer", "School Counselor", "Education Researcher", "Tutor", "University Lecturer", "STEM Educator", "Special Education Teacher", "Head of Department", "EdTech Specialist", "Training Manager", "Education Consultant"],
  "Media & Entertainment": ["Journalist", "Video Producer", "Social Media Manager", "Content Creator", "Film Director", "Podcast Host", "Copywriter", "PR Manager", "Brand Strategist", "Creative Director", "Animator", "Scriptwriter", "Documentary Filmmaker", "Digital Marketing Manager", "Editor-in-Chief"],
  "Engineering": ["Mechanical Engineer", "Civil Engineer", "Electrical Engineer", "Process Engineer", "Manufacturing Engineer", "Structural Engineer", "Automation Engineer", "Quality Engineer", "Project Engineer", "Design Engineer", "Safety Engineer", "Materials Scientist", "Robotics Engineer", "Environmental Engineer", "Engineering Manager"],
  "Retail & E-Commerce": ["Store Manager", "E-Commerce Manager", "Merchandiser", "Supply Chain Manager", "Buyer", "Retail Analyst", "Category Manager", "Visual Merchandiser", "Inventory Planner", "Customer Service Director", "Omnichannel Strategist", "Retail Operations Manager", "Product Manager", "Logistics Coordinator", "Pricing Analyst"],
  "Sports & Fitness": ["Head Coach", "Sports Analyst", "Athletic Trainer", "Fitness Director", "Sports Nutritionist", "Personal Trainer", "Sports Marketing Manager", "Recreation Coordinator", "Strength & Conditioning Coach", "Physical Education Teacher", "Sports Psychologist", "Team Manager", "Youth Coach", "Gym Owner", "Sports Medicine Doctor"],
  "Arts & Design": ["Graphic Designer", "UX Designer", "Art Director", "Illustrator", "Interior Designer", "Fashion Designer", "Web Designer", "Industrial Designer", "Creative Director", "Photographer", "Animator", "Brand Designer", "UI Designer", "Motion Graphics Designer", "Design Lead"],
  "Real Estate": ["Real Estate Agent", "Property Manager", "Real Estate Developer", "Appraiser", "Leasing Manager", "Construction Project Manager", "Facilities Manager", "Real Estate Analyst", "Broker", "Urban Planner", "Real Estate Attorney", "Investment Analyst", "Asset Manager", "Zoning Specialist", "Mortgage Broker"],
  "Agriculture & Food": ["Farm Manager", "Food Scientist", "Executive Chef", "Agronomist", "Food Safety Inspector", "Agricultural Engineer", "Sustainability Coordinator", "Vineyard Manager", "Pastry Chef", "Livestock Manager", "Supply Chain Director", "Quality Assurance Manager", "Restaurant Owner", "Nutritional Scientist", "Agricultural Consultant"],
  "Energy & Utilities": ["Energy Engineer", "Solar Project Manager", "Grid Operator", "Nuclear Engineer", "Renewable Energy Analyst", "Utility Manager", "Environmental Compliance Officer", "Power Plant Manager", "Energy Policy Analyst", "Wind Turbine Technician", "Oil & Gas Engineer", "Sustainability Manager", "Energy Trader", "ESG Analyst", "Smart Grid Engineer"],
  "Transportation & Logistics": ["Logistics Manager", "Fleet Manager", "Airline Pilot", "Supply Chain Director", "Warehouse Manager", "Customs Broker", "Transportation Planner", "Port Operations Manager", "Freight Coordinator", "Route Optimizer", "Aviation Safety Officer", "Maritime Captain", "Driver Trainer", "Traffic Engineer", "Delivery Operations Manager"],
  "Non-Profit & Social Impact": ["Executive Director", "Grant Writer", "Community Organizer", "Program Manager", "Fundraiser", "Policy Analyst", "Social Worker", "Advocacy Director", "Development Officer", "Volunteer Coordinator", "Impact Analyst", "Campaign Director", "Case Manager", "Nonprofit Consultant", "Board Secretary"],
  "Consulting": ["Management Consultant", "Strategy Consultant", "IT Consultant", "HR Consultant", "Financial Advisor", "Change Management Consultant", "Operations Consultant", "Digital Transformation Lead", "Risk Consultant", "Technology Advisor", "Business Analyst", "Process Improvement Specialist", "M&A Advisor", "Organizational Development Specialist", "Partner"],
  "Hospitality & Tourism": ["Hotel Manager", "Event Planner", "Restaurant Manager", "Concierge", "Tourism Director", "Revenue Manager", "Catering Director", "Travel Agent", "Guest Relations Manager", "F&B Manager", "Spa Director", "Tour Operator", "Banquet Manager", "Housekeeping Director", "Front Office Manager"],
};


// ═══════════════════════════════════════════════════════════════════
// RECOMMENDER (copied + adapted for Node.js)
// ═══════════════════════════════════════════════════════════════════

class Recommender {
  constructor() {
    this.movies = movieData;
    this.vocabulary = new Set();
    this.idf = {};
    this.movieVectors = [];
    this.isWarmed = false;
  }

  tokenize(text) {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  warm() {
    if (this.isWarmed) return;
    const docCount = this.movies.length;
    const wordDocCounts = {};

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

    Object.entries(wordDocCounts).forEach(([word, count]) => {
      this.idf[word] = Math.log(docCount / (1 + count));
    });

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
  }

  calculateTfIdfVector(text) {
    const tokens = this.tokenize(text);
    const tf = {};
    tokens.forEach(token => { tf[token] = (tf[token] || 0) + 1; });
    const vector = {};
    Object.entries(tf).forEach(([word, count]) => {
      if (this.idf[word]) { vector[word] = count * this.idf[word]; }
    });
    return vector;
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0, normA = 0, normB = 0;
    Object.keys(vecA).forEach(key => {
      if (vecB[key]) dotProduct += vecA[key] * vecB[key];
      normA += vecA[key] * vecA[key];
    });
    Object.keys(vecB).forEach(key => { normB += vecB[key] * vecB[key]; });
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  getRecommendations(profile, topN = 10) {
    this.warm();
    const skill_gaps = profile.skill_gaps || [];
    const found_skills = profile.found_skills || [];
    const industry = profile.industry || "";
    const tech = profile.technologies || [];
    const careerStage = profile.career_stage || "";

    const queryParts = [
      ...skill_gaps, ...skill_gaps, ...skill_gaps,
      ...found_skills, ...tech,
      industry, industry,
      careerStage
    ];

    const userVector = this.calculateTfIdfVector(queryParts.join(" "));

    const vibeMapping = {
      "Strategic Visionary": ["sci-fi", "biography", "epic", "future", "visionary", "pioneer"],
      "Analytical Stoic": ["mystery", "thriller", "documentary", "technical", "logic"],
      "Creative Free-Spirit": ["animation", "fantasy", "art", "music", "indie"],
      "The Relentless Hustler": ["crime", "drama", "action", "competition", "business"],
      "Empathic Leader": ["romance", "family", "social", "community", "leadership"],
      "Pragmatic Builder": ["war", "adventure", "construction", "survival", "endurance"]
    };

    const scoredMovies = this.movies.map((movie, idx) => {
      const contentSimilarity = this.cosineSimilarity(userVector, this.movieVectors[idx]);
      let industrySignal = 0;
      if (industry && movie.industry?.toLowerCase().includes(industry.toLowerCase())) industrySignal = 1.0;
      let careerStageSignal = 0;
      if (careerStage && movie.career_stage?.toLowerCase().includes(careerStage.toLowerCase())) careerStageSignal = 1.0;
      let vibeSignal = 0;
      const movieText = (movie.summary + " " + movie.career_skills).toLowerCase();
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

      return { ...movie, match_score: compositeScore, };
    });

    return scoredMovies
      .sort((a, b) => {
        if (Math.abs(b.match_score - a.match_score) > 0.001) return b.match_score - a.match_score;
        if (b.educational_value_score !== a.educational_value_score) return b.educational_value_score - a.educational_value_score;
        return Math.random() - 0.5;
      })
      .slice(0, topN);
  }
}

// ═══════════════════════════════════════════════════════════════════
// PROFILE BUILDER (adapted from promptBuilder.js)
// ═══════════════════════════════════════════════════════════════════

function buildProfile(jobTitle, industry, careerStage, selectedSkills, vibe) {
  const skillSet = new Set(selectedSkills.map(s => s.toLowerCase()));

  // Compute skill gaps: industry skills the user DIDN'T select
  const industrySkillPool = INDUSTRY_SKILLS[industry] || [];
  const skill_gaps = industrySkillPool
    .filter(s => !skillSet.has(s.toLowerCase()))
    .slice(0, 15);

  return {
    found_skills: selectedSkills,
    technologies: [],
    industry,
    secondary_industry: null,
    vibe,
    secondary_vibe: null,
    career_stage: careerStage,
    years_of_experience: careerStage === "Senior" ? 10 : careerStage === "Mid-Level" ? 5 : 1,
    skill_categories: {},
    skill_gaps,
    action_profile: {},
    education_level: null,
    job_title: jobTitle,
    input_method: "prompt",
  };
}


// ═══════════════════════════════════════════════════════════════════
// GENERATE 700 PROFILES
// ═══════════════════════════════════════════════════════════════════

function generateProfiles(count) {
  const profiles = [];
  let idx = 0;

  // Systematic coverage: every industry × every career stage × every vibe = 17 × 3 × 6 = 306
  // Then fill remaining ~394 with randomized combos
  for (const industry of INDUSTRIES) {
    for (const stage of CAREER_STAGES) {
      for (const vibe of VIBES) {
        if (idx >= count) break;
        const titles = JOB_TITLES[industry] || ["Professional"];
        const skills = INDUSTRY_SKILLS[industry] || [];
        const jobTitle = titles[idx % titles.length];
        // Pick 4-8 skills randomly
        const numSkills = 4 + Math.floor(Math.random() * 5);
        const shuffled = [...skills].sort(() => Math.random() - 0.5);
        const selectedSkills = shuffled.slice(0, numSkills);

        profiles.push({
          id: idx + 1,
          jobTitle,
          industry,
          careerStage: stage,
          selectedSkills,
          vibe,
        });
        idx++;
      }
    }
  }

  // Fill remaining with random combos
  while (idx < count) {
    const industry = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];
    const stage = CAREER_STAGES[Math.floor(Math.random() * CAREER_STAGES.length)];
    const vibe = VIBES[Math.floor(Math.random() * VIBES.length)];
    const titles = JOB_TITLES[industry] || ["Professional"];
    const skills = INDUSTRY_SKILLS[industry] || [];
    const jobTitle = titles[Math.floor(Math.random() * titles.length)];
    const numSkills = 4 + Math.floor(Math.random() * 5);
    const shuffled = [...skills].sort(() => Math.random() - 0.5);
    const selectedSkills = shuffled.slice(0, numSkills);

    profiles.push({
      id: idx + 1,
      jobTitle,
      industry,
      careerStage: stage,
      selectedSkills,
      vibe,
    });
    idx++;
  }

  return profiles;
}


// ═══════════════════════════════════════════════════════════════════
// AUDIT LOGIC
// ═══════════════════════════════════════════════════════════════════

function auditRecommendations(profile, recommendations) {
  const issues = [];
  const warnings = [];

  // 1. Check if ANY recommendations match the industry
  const industryLower = profile.industry.toLowerCase();
  const industryMatches = recommendations.filter(r =>
    r.industry?.toLowerCase().includes(industryLower) ||
    r.career_skills?.toLowerCase().includes(industryLower)
  );
  if (industryMatches.length === 0) {
    issues.push(`NO industry match: None of ${recommendations.length} recommendations relate to "${profile.industry}"`);
  } else if (industryMatches.length < 2) {
    warnings.push(`LOW industry match: Only ${industryMatches.length}/${recommendations.length} relate to "${profile.industry}"`);
  }

  // 2. Check skill relevance (do any recommended movies mention the user's skills?)
  const userSkillsLower = profile.selectedSkills.map(s => s.toLowerCase());
  let skillHits = 0;
  for (const rec of recommendations) {
    const recText = ((rec.career_skills || "") + " " + (rec.summary || "")).toLowerCase();
    if (userSkillsLower.some(s => recText.includes(s))) skillHits++;
  }
  if (skillHits === 0) {
    issues.push(`NO skill relevance: None of the recommendations mention any of the user's ${userSkillsLower.length} skills`);
  } else if (skillHits < 3) {
    warnings.push(`LOW skill relevance: Only ${skillHits}/${recommendations.length} mention user skills`);
  }

  // 3. Check for diversity (not all same movie type)
  const titles = recommendations.map(r => r.title);
  const uniqueTitles = new Set(titles);
  if (uniqueTitles.size < recommendations.length) {
    issues.push(`DUPLICATES: ${recommendations.length - uniqueTitles.size} duplicate recommendations`);
  }

  // 4. Check educational value scores (quality proxy)
  const avgScore = recommendations.reduce((sum, r) => sum + (r.educational_value_score || 0), 0) / recommendations.length;
  if (avgScore < 5) {
    warnings.push(`LOW QUALITY: Average educational value score is ${avgScore.toFixed(1)}/10`);
  }

  // 5. Check for obviously irrelevant results
  const IRRELEVANT_PATTERNS = [
    { pattern: /sunny leone/i, label: "adult content" },
    { pattern: /xxx|porn|erotic/i, label: "adult content" },
  ];
  for (const rec of recommendations) {
    for (const { pattern, label } of IRRELEVANT_PATTERNS) {
      if (pattern.test(rec.title) || pattern.test(rec.summary || "")) {
        issues.push(`IRRELEVANT (${label}): "${rec.title}" recommended for ${profile.jobTitle}`);
      }
    }
  }

  // 6. Profile analysis audit
  if (!profile.selectedSkills || profile.selectedSkills.length === 0) {
    issues.push(`PROFILE: No found_skills in profile`);
  }

  return { issues, warnings };
}


// ═══════════════════════════════════════════════════════════════════
// RUN AUDIT
// ═══════════════════════════════════════════════════════════════════

console.log("═══════════════════════════════════════════════════════════");
console.log("  MOVIEFY RECOMMENDATION ENGINE AUDIT — 700 PROFILES");
console.log("═══════════════════════════════════════════════════════════\n");

const recommender = new Recommender();
console.log(`Database: ${movieData.length} movies/series loaded`);
console.log("Warming TF-IDF engine...");
recommender.warm();
console.log(`Engine warmed with ${recommender.vocabulary.size} vocabulary features.\n`);

const profiles = generateProfiles(700);
console.log(`Generated ${profiles.length} test profiles.\n`);

let totalIssues = 0;
let totalWarnings = 0;
const issueLog = [];
const warningLog = [];
const industryCoverage = {};
const sampleResults = [];

// Track per-industry stats
INDUSTRIES.forEach(i => { industryCoverage[i] = { tested: 0, issues: 0, warnings: 0, avgScore: 0 }; });

for (const p of profiles) {
  const profile = buildProfile(p.jobTitle, p.industry, p.careerStage, p.selectedSkills, p.vibe);
  const recs = recommender.getRecommendations(profile, 10);
  const { issues, warnings } = auditRecommendations(p, recs);

  industryCoverage[p.industry].tested++;
  const avgMatch = recs.reduce((s, r) => s + r.match_score, 0) / recs.length;
  industryCoverage[p.industry].avgScore += avgMatch;

  if (issues.length > 0) {
    totalIssues += issues.length;
    industryCoverage[p.industry].issues += issues.length;
    issueLog.push({
      profileId: p.id,
      jobTitle: p.jobTitle,
      industry: p.industry,
      careerStage: p.careerStage,
      vibe: p.vibe,
      issues,
      topRecs: recs.slice(0, 3).map(r => `${r.title} (${r.industry || 'N/A'}, score: ${r.match_score.toFixed(3)})`)
    });
  }

  if (warnings.length > 0) {
    totalWarnings += warnings.length;
    industryCoverage[p.industry].warnings += warnings.length;
    warningLog.push({
      profileId: p.id,
      jobTitle: p.jobTitle,
      industry: p.industry,
      careerStage: p.careerStage,
      vibe: p.vibe,
      warnings,
    });
  }

  // Capture sample results for first profile of each industry
  if (industryCoverage[p.industry].tested === 1) {
    sampleResults.push({
      profile: { jobTitle: p.jobTitle, industry: p.industry, careerStage: p.careerStage, vibe: p.vibe, skills: p.selectedSkills },
      recommendations: recs.slice(0, 5).map(r => ({
        title: r.title,
        type: r.type || "Movie",
        industry: r.industry,
        score: r.match_score.toFixed(3),
        eduScore: r.educational_value_score,
      })),
    });
  }
}

// Finalize avgScore
INDUSTRIES.forEach(i => {
  if (industryCoverage[i].tested > 0) {
    industryCoverage[i].avgScore = (industryCoverage[i].avgScore / industryCoverage[i].tested).toFixed(3);
  }
});


// ═══════════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════════

console.log("═══ SUMMARY ═══");
console.log(`Profiles tested: ${profiles.length}`);
console.log(`Total ISSUES:    ${totalIssues} (${issueLog.length} profiles affected)`);
console.log(`Total WARNINGS:  ${totalWarnings} (${warningLog.length} profiles affected)`);
console.log(`Pass rate:       ${((1 - issueLog.length / profiles.length) * 100).toFixed(1)}%\n`);

console.log("═══ PER-INDUSTRY BREAKDOWN ═══");
console.log("Industry                       | Tested | Issues | Warnings | Avg Score");
console.log("─────────────────────────────────────────────────────────────────────────");
INDUSTRIES.forEach(i => {
  const c = industryCoverage[i];
  console.log(`${i.padEnd(30)} | ${String(c.tested).padEnd(6)} | ${String(c.issues).padEnd(6)} | ${String(c.warnings).padEnd(8)} | ${c.avgScore}`);
});

if (issueLog.length > 0) {
  console.log("\n═══ TOP ISSUES (first 20) ═══");
  issueLog.slice(0, 20).forEach(entry => {
    console.log(`\n  Profile #${entry.profileId}: ${entry.jobTitle} (${entry.industry}, ${entry.careerStage}, ${entry.vibe})`);
    entry.issues.forEach(issue => console.log(`    ❌ ${issue}`));
    console.log(`    Top recs: ${entry.topRecs.join(' | ')}`);
  });
}

if (warningLog.length > 0) {
  console.log("\n═══ TOP WARNINGS (first 15) ═══");
  warningLog.slice(0, 15).forEach(entry => {
    console.log(`\n  Profile #${entry.profileId}: ${entry.jobTitle} (${entry.industry}, ${entry.careerStage}, ${entry.vibe})`);
    entry.warnings.forEach(w => console.log(`    ⚠️  ${w}`));
  });
}

console.log("\n═══ SAMPLE RESULTS (1 per industry) ═══");
sampleResults.forEach(s => {
  console.log(`\n  👤 ${s.profile.jobTitle} | ${s.profile.industry} | ${s.profile.careerStage} | ${s.profile.vibe}`);
  console.log(`     Skills: ${s.profile.skills.join(', ')}`);
  s.recommendations.forEach((r, i) => {
    console.log(`     ${i + 1}. ${r.title} (${r.type}) — ${r.industry} — score: ${r.score}, edu: ${r.eduScore}`);
  });
});


// ── Write full report to file ──
const report = {
  summary: {
    profiles_tested: profiles.length,
    total_issues: totalIssues,
    profiles_with_issues: issueLog.length,
    total_warnings: totalWarnings,
    profiles_with_warnings: warningLog.length,
    pass_rate: `${((1 - issueLog.length / profiles.length) * 100).toFixed(1)}%`,
    database_size: movieData.length,
  },
  per_industry: industryCoverage,
  issues: issueLog,
  warnings: warningLog.slice(0, 50),
  sample_results: sampleResults,
};

writeFileSync('E:/prince/Projects/random projects/movie suggester/audit_report.json', JSON.stringify(report, null, 2));
console.log("\n✅ Full report saved to audit_report.json");
