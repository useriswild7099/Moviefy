/**
 * promptBuilder.js
 * Builds a profile object (identical shape to parseResume output) from
 * user-provided questionnaire answers — for users who don't have a resume.
 */
import { CAREER_SKILLS_TAXONOMY, TECH_TOOLS, INDUSTRY_KEYWORDS } from '../data/taxonomy';

/**
 * Map industries to relevant taxonomy categories for
 * computing skill gaps from the selected skills.
 */
const INDUSTRY_CATEGORY_MAP = {
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

/**
 * Get the list of all available industries (for the dropdown).
 */
export const INDUSTRIES = Object.keys(INDUSTRY_KEYWORDS);

/**
 * Get top skills for a given industry, drawn from the relevant taxonomy categories.
 * Returns at most `limit` skills.
 */
export function getSkillsForIndustry(industry, limit = 30) {
  const categories = INDUSTRY_CATEGORY_MAP[industry] || [];
  const skills = [];

  // First: relevant categories
  for (const cat of categories) {
    if (CAREER_SKILLS_TAXONOMY[cat]) {
      skills.push(...CAREER_SKILLS_TAXONOMY[cat]);
    }
  }

  // Second: Add specific industry keywords if any (they function exactly as strong skill identifiers)
  if (INDUSTRY_KEYWORDS[industry]) {
    skills.push(...INDUSTRY_KEYWORDS[industry]);
  }

  // Deduplicate and cap (limit higher now because lists are richer)
  return [...new Set(skills)].slice(0, limit + 20);
}

/**
 * VIBE descriptions for the card picker.
 */
export const VIBE_OPTIONS = [
  {
    id: "Strategic Visionary",
    emoji: "🔭",
    title: "Strategic Visionary",
    desc: "You see the big picture and think 3 steps ahead.",
  },
  {
    id: "Analytical Stoic",
    emoji: "🔬",
    title: "Analytical Stoic",
    desc: "Data-driven and methodical — you trust the numbers.",
  },
  {
    id: "Creative Free-Spirit",
    emoji: "🎨",
    title: "Creative Free-Spirit",
    desc: "You break conventions and create original work.",
  },
  {
    id: "The Relentless Hustler",
    emoji: "🚀",
    title: "The Relentless Hustler",
    desc: "You outwork everyone and chase aggressive goals.",
  },
  {
    id: "Empathic Leader",
    emoji: "🤝",
    title: "Empathic Leader",
    desc: "People-first — you build teams and lift others up.",
  },
  {
    id: "Pragmatic Builder",
    emoji: "🛠️",
    title: "Pragmatic Builder",
    desc: "You ship reliable work and focus on execution.",
  },
];

/**
 * Career stage options.
 */
export const CAREER_STAGES = [
  { id: "Entry-level", emoji: "🌱", label: "Entry-level", desc: "0-3 years experience" },
  { id: "Mid-Level", emoji: "📈", label: "Mid-Level", desc: "3-8 years experience" },
  { id: "Senior", emoji: "👑", label: "Senior", desc: "8+ years experience" },
];

/**
 * Build a complete profile object from user's questionnaire answers.
 *
 * @param {Object} answers
 * @param {string} answers.jobTitle - Free-text job title
 * @param {string} answers.industry - One of INDUSTRIES
 * @param {string} answers.careerStage - "Entry-level" | "Mid-Level" | "Senior"
 * @param {string[]} answers.selectedSkills - Skills the user selected
 * @param {string} answers.vibe - One of the VIBE_OPTIONS ids
 * @returns {Object} Profile compatible with generateRecommendations()
 */
export function buildProfileFromPrompt({ jobTitle, industry, careerStage, selectedSkills, vibe }) {
  // Build skill_categories from selected skills
  const skill_categories = {};
  const skillSet = new Set(selectedSkills.map(s => s.toLowerCase()));

  Object.entries(CAREER_SKILLS_TAXONOMY).forEach(([category, skills]) => {
    const matched = skills.filter(s => skillSet.has(s.toLowerCase()));
    if (matched.length > 0) {
      skill_categories[category] = matched;
    }
  });

  // Detect technologies from job title
  const titleLower = jobTitle.toLowerCase();
  const technologies = TECH_TOOLS.filter(tool => {
    const toolLower = tool.toLowerCase();
    return titleLower.includes(toolLower);
  });

  // Compute skill gaps (industry-relevant skills the user didn't select)
  const relevantCategories = INDUSTRY_CATEGORY_MAP[industry] || [];
  const allRelevantSkills = [];
  for (const cat of relevantCategories) {
    if (CAREER_SKILLS_TAXONOMY[cat]) {
      allRelevantSkills.push(...CAREER_SKILLS_TAXONOMY[cat]);
    }
  }

  // Also tap into industry keywords to pad potential missing gaps perfectly matched against movie vectors
  if (INDUSTRY_KEYWORDS[industry]) {
    allRelevantSkills.push(...INDUSTRY_KEYWORDS[industry]);
  }

  const skill_gaps = [...new Set(allRelevantSkills)]
    .filter(s => !skillSet.has(s.toLowerCase()))
    .slice(0, 15);

  return {
    found_skills: selectedSkills,
    technologies,
    industry,
    secondary_industry: null,
    vibe,
    secondary_vibe: null,
    career_stage: careerStage,
    years_of_experience: careerStage === "Senior" ? 10 : careerStage === "Mid-Level" ? 5 : 1,
    skill_categories,
    skill_gaps,
    action_profile: {},
    education_level: null,
    job_title: jobTitle,
    input_method: "prompt",
  };
}
