---
description: How to add new Cinema Collection articles in the established list-style format
---

Follow these steps to ensure every new collection matches the premium "Deep Dive" aesthetic.

## 1. Prepare the Data in `frontend/src/data/articles.js`

Every article object MUST include a structured `featuredMovies` array. **This is critical** as it replaces the previous "chip" style with the structured list.

### Required Object Schema:
```javascript
{
  id: number, // Increment from latest
  title: "ALL CAPS THEME: Catchy Subtitle",
  tag: "Genre/Category",
  date: "Current Date",
  readingTime: "X min read",
  summary: "One sentence hook.",
  featuredMovies: [
    { 
      title: "Movie Name", 
      year: "YYYY", 
      description: "A one-sentence analysis of why it fits this theme." 
    },
    // Add 2-3 movies per article
  ],
  content: "Full markdown analysis..."
}
```

## 2. Verify UI Rendering in `App.jsx`

The `App.jsx` card template (Library View) is already configured to render this list. Ensure:
- The title uses `font-archivo font-bold text-[24px]` and `line-clamp-2`.
- The movie items use numbering (`mIdx + 1`) with `font-archivo font-medium text-dark-charcoal/30`.
- Movie titles use `font-archivo font-bold text-[16px]`.
- Descriptions use `text-[13px] text-dark-slate opacity-70`.

## 3. Styling Constraints
- **Do not use chips/pills** for movie names.
- Keep descriptions concise (max 15-20 words).
- If the title is very long, ensure `line-clamp-2` prevents card bloat.

## 4. Verification
- Navigate to `#articles` in the browser.
- Confirm the new card scales correctly to its content.
- Verify the "View Analysis" footer arrow transitions on hover.
