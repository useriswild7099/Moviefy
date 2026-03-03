import fs from 'fs';
import { extractText, parseResume } from './frontend/src/utils/parser.js';

async function runTest() {
    try {
        console.log("Loading mock resume...");
        // Mock a browser File object structure for extractText
        const mockFile = {
            name: "test_resume.txt",
            type: "text/plain",
            text: async () => "Senior Software Engineer with 5 years of experience in Python, AWS, and Next.js. Strong leadership skills and a track record of scaling startups."
        };

        console.log("Extracting text...");
        const text = await extractText(mockFile);
        console.log("Text length:", text.length);

        console.log("Parsing resume...");
        const profile = parseResume(text);
        
        console.log("SUCCESS. Profile:", profile);
    } catch (err) {
        console.error("FATAL ERROR in pipeline:", err);
    }
}

runTest();
