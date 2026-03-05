import fs from 'fs';
import path from 'path';

// Define your static routes
const staticRoutes = [
    '/',
    '/#about',
    '/#lessons',
    '/#articles' // The link to the deep dives library
];

// Define your deep dive articles (These would normally be fetched from a DB or CMS, but are hardcoded in articles.js here)
const ARTICLES = [
    {
      id: "the-stranger",
      title: "The Anxiety of Influence: Decoding 'The Stranger'",
      tag: "Leadership",
      date: "Oct 24, 2024",
      readingTime: "5 min read"
    },
    {
      id: "the-score",
      title: "Mastering the Details: Why 'The Score' Should Be Mandatory Viewing for Product Managers",
      tag: "Execution",
      date: "Nov 02, 2024",
      readingTime: "7 min read"
    },
    {
       id: "margin-call",
       title: "Surviving the Drop: Lessons in Crisis Management from 'Margin Call'",
       tag: "Crisis",
       date: "Nov 15, 2024",
       readingTime: "6 min read"
    }
    // Note: If you add more to articles.js, add the routes here to have them indexed.
];

const hostname = 'https://moviefy-sigma.vercel.app';

function generateSitemap() {
    console.log("Generating sitemap.xml...");
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add static routes
    staticRoutes.forEach(route => {
        xml += `  <url>\n`;
        xml += `    <loc>${hostname}${route}</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>1.0</priority>\n`;
        xml += `  </url>\n`;
    });

    // Add dynamic article routes
    ARTICLES.forEach(article => {
         xml += `  <url>\n`;
         xml += `    <loc>${hostname}/#articles/${article.id}</loc>\n`; // Deep Dive URL Format.
         xml += `    <changefreq>monthly</changefreq>\n`;
         xml += `    <priority>0.8</priority>\n`;
         xml += `  </url>\n`;
    });

    xml += `</urlset>\n`;

    // Save to public directory
    const publicPath = path.resolve('public');
    if (!fs.existsSync(publicPath)) {
        fs.mkdirSync(publicPath);
    }
    
    fs.writeFileSync(path.join(publicPath, 'sitemap.xml'), xml);
    console.log("sitemap.xml successfully generated in the public directory.");
}

generateSitemap();
