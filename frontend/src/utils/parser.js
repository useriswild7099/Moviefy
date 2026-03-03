import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import { 
  CAREER_SKILLS_TAXONOMY, 
  TECH_TOOLS, 
  VIBE_PATTERNS, 
  INDUSTRY_KEYWORDS, 
  ACTION_VERBS, 
  SENIORITY 
} from '../data/taxonomy';

// Properly initialize the PDFjs worker using Vite's ?url syntax
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extracts text from generic file using pdfjs-dist or mammoth.
 */
export const extractText = async (file) => {
  const fileType = file.name.split('.').pop().toLowerCase();
  
  if (fileType === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(" ") + "\n";
      }
      return text;
    } catch (error) {
       console.error("PDF Parsing failed. Falling back to basic text extraction:", error);
       return await file.text(); // Fallback for corrupted/unparseable PDFs
    }
  } else if (fileType === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } else {
    // Plain text fallback
    return await file.text();
  }
};

/**
 * Browser-native version of resume_parser.py logic
 */
export const parseResume = (text) => {
  const lowerText = text.toLowerCase();
  
  /**
   * Word-boundary matcher to prevent false positives.
   * e.g. "r" won't match inside "your", "art" won't match inside "start".
   * For multi-word phrases like "machine learning", uses includes() which is safe.
   */
  const matchWholeWord = (text, keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    // Multi-word phrases are safe with includes — no ambiguity
    if (lowerKeyword.includes(' ') || lowerKeyword.includes('/') || lowerKeyword.includes('-')) {
      return text.includes(lowerKeyword);
    }
    // Single words: use word boundary regex to avoid substring false positives
    try {
      const regex = new RegExp(`\\b${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(text);
    } catch {
      return text.includes(lowerKeyword);
    }
  };

  // 1. Skill Matching (with word boundaries)
  const found_skills = new Set();
  const skill_categories = {};
  
  Object.entries(CAREER_SKILLS_TAXONOMY).forEach(([category, skills]) => {
    const matched = skills.filter(skill => matchWholeWord(lowerText, skill));
    if (matched.length > 0) {
      matched.forEach(s => found_skills.add(s));
      skill_categories[category] = matched;
    }
  });

  // 2. Tech Tools (with word boundaries)
  const technologies = TECH_TOOLS.filter(tool => matchWholeWord(lowerText, tool));

  // 3. Industry Detection (with word boundaries)
  const industryScores = {};
  Object.entries(INDUSTRY_KEYWORDS).forEach(([industry, keywords]) => {
    const score = keywords.filter(kw => matchWholeWord(lowerText, kw)).length;
    if (score > 0) industryScores[industry] = score;
  });
  
  const sortedIndustries = Object.keys(industryScores).sort((a,b) => industryScores[b] - industryScores[a]);
  const industry = sortedIndustries[0] || "General";
  const secondaryIndustry = sortedIndustries[1] || null;

  // 4. Vibe Detection
  const vibeScores = {};
  Object.entries(VIBE_PATTERNS).forEach(([vibe, keywords]) => {
    const score = keywords.filter(kw => matchWholeWord(lowerText, kw)).length;
    if (score > 0) vibeScores[vibe] = score;
  });
  
  const sortedVibes = Object.keys(vibeScores).sort((a,b) => vibeScores[b] - vibeScores[a]);
  const vibe = sortedVibes[0] || "Pragmatic Builder";
  const secondaryVibe = sortedVibes[1] || null;

  // 5. Seniority
  let careerStage = "Entry-level";
  if (SENIORITY.SENIOR.some(kw => matchWholeWord(lowerText, kw))) careerStage = "Senior";
  else if (SENIORITY.MID.some(kw => matchWholeWord(lowerText, kw))) careerStage = "Mid-Level";

  // 6. Action Profile (with word boundaries)
  const actionProfile = {};
  Object.entries(ACTION_VERBS).forEach(([cat, verbs]) => {
    const hits = verbs.filter(v => matchWholeWord(lowerText, v)).length;
    if (hits > 0) actionProfile[cat] = hits;
  });

  // 7. Years of Experience (Basic Regex)
  const experienceMatch = text.match(/(\d{1,2})\+?\s*years?\s+(?:of\s+)?experience/i);
  const years_of_experience = experienceMatch ? parseInt(experienceMatch[1]) : 0;

  // 8. Skill Gaps (Industry-aware: prioritize gaps relevant to the user's field)
  // Map industries to relevant taxonomy categories
  const industryToCategoryMap = {
    "Technology": ["Technology & Engineering", "Data & Analytics"],
    "Healthcare": ["Healthcare & Science", "Education & Research"],
    "Finance": ["Finance & Accounting", "Business & Management"],
    "Law": ["Legal & Compliance", "Government & Public Sector"],
    "Education": ["Education & Research", "Soft Skills & Universal"],
    "Media & Entertainment": ["Creative & Media", "Sales & Marketing"],
    "Engineering": ["Technology & Engineering", "Business & Management"],
    "Retail & E-Commerce": ["Sales & Marketing", "Business & Management"],
    "Sports & Fitness": ["Soft Skills & Universal", "Healthcare & Science"],
    "Arts & Design": ["Creative & Media", "Sales & Marketing"],
    "Real Estate": ["Finance & Accounting", "Business & Management"],
    "Agriculture & Food": ["Healthcare & Science", "Sustainability & ESG"],
    "Energy & Utilities": ["Technology & Engineering", "Sustainability & ESG"],
    "Transportation & Logistics": ["Business & Management", "Technology & Engineering"],
    "Non-Profit & Social Impact": ["Soft Skills & Universal", "Government & Public Sector"],
    "Consulting": ["Business & Management", "Finance & Accounting"],
    "Hospitality & Tourism": ["Sales & Marketing", "Soft Skills & Universal"],
  };

  // Build prioritized gap list: industry-relevant categories first, then others
  const relevantCategories = industryToCategoryMap[industry] || [];
  const secondaryCategories = secondaryIndustry ? (industryToCategoryMap[secondaryIndustry] || []) : [];
  
  const priorityCategories = [...new Set([...relevantCategories, ...secondaryCategories])];
  const otherCategories = Object.keys(CAREER_SKILLS_TAXONOMY).filter(c => !priorityCategories.includes(c));
  
  const gaps = [];
  // First: pull gaps from the user's own industry categories (most relevant)
  for (const cat of priorityCategories) {
    const catSkills = CAREER_SKILLS_TAXONOMY[cat] || [];
    const catGaps = catSkills.filter(s => !found_skills.has(s));
    gaps.push(...catGaps);
    if (gaps.length >= 7) break;
  }
  // Then: fill remaining from other categories
  if (gaps.length < 7) {
    for (const cat of otherCategories) {
      const catSkills = CAREER_SKILLS_TAXONOMY[cat] || [];
      const catGaps = catSkills.filter(s => !found_skills.has(s));
      gaps.push(...catGaps);
      if (gaps.length >= 7) break;
    }
  }
  // Take only the top 7
  const finalGaps = gaps.slice(0, 7);

  return {
    found_skills: Array.from(found_skills),
    skill_categories,
    skill_gaps: finalGaps,
    technologies,
    action_profile: actionProfile,
    industry,
    secondary_industry: secondaryIndustry,
    vibe,
    secondary_vibe: secondaryVibe,
    career_stage: careerStage,
    years_of_experience,
    raw_text_length: text.length
  };
};
