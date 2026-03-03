import fs from 'fs';

const path = 'e:\\prince\\Projects\\random projects\\movie suggester\\frontend\\src\\data\\movies.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

console.log("Total entries in JSON:", data.length);
if (data.length > 0) {
    console.log("Keys available in JSON objects:", Object.keys(data[0]));
    console.log("Sample entry:");
    console.log(data[0]);
}

const moviesWithSkills = data.filter(m => m.career_skills).length;
const moviesWithSummary = data.filter(m => m.summary && m.summary.length > 0).length;
console.log(`Movies with career_skills: ${moviesWithSkills}`);
console.log(`Movies with summary: ${moviesWithSummary}`);
