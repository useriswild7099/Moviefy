import requests
import json
import os

API_URL = "http://localhost:8000"

RESUMES = {
    "software_engineer.txt": """
        John Doe
        Senior Software Engineer
        Experience: 8 years building scalable backend systems and responsive frontends.
        Skills: Python, JavaScript, React, Node.js, AWS, Docker, Kubernetes, System Architecture, Microservices, Agile.
        Projects: Led migration from monolith to microservices reducing latency by 40%.
    """,
    "marketing_director.txt": """
        Jane Smith
        Marketing Director
        Experience: 12 years in digital marketing and brand strategy.
        Skills: SEO, SEM, Content Strategy, Brand Management, Social Media Campaigns, Market Research, Analytics, Leadership.
        Projects: Spearheaded global rebrand that increased market share by 15% and grew social following by 2M.
    """,
    "medical_doctor.txt": """
        Dr. Ahmed Khan
        Attending Surgeon
        Experience: 10 years in general surgery and emergency medicine.
        Skills: Patient Care, Scalpel Techniques, Triage, Diagnostics, Anatomy, Medical Ethics, Crisis Management, Communication, Empathy.
        Projects: Implemented new triage protocol in ER that reduced wait times and improved patient outcomes during critical trauma events.
    """
}

def test_resume(filename, content, log_file):
    log_file.write(f"\n{'='*50}\n")
    log_file.write(f"Testing Resume: {filename}\n")
    log_file.write(f"{'='*50}\n")
    
    with open(filename, "w") as f:
        f.write(content)
        
    with open(filename, "rb") as f:
        upload_resp = requests.post(f"{API_URL}/api/upload", files={"file": f})
        
    if not upload_resp.ok:
        log_file.write(f"Upload failed: {upload_resp.status_code}\n")
        return
        
    data = upload_resp.json()
    profile = data.get("profile")
    log_file.write(f"Extracted Profile: Industry: {profile['industry']} | Stage: {profile['career_stage']}\n")
    log_file.write(f"Top Skills: {', '.join(profile['found_skills'][:5])}\n")
    
    rec_resp = requests.post(f"{API_URL}/api/recommendations", json=profile)
    
    if not rec_resp.ok:
        log_file.write(f"Recommendations failed: {rec_resp.status_code}\n")
        return
        
    recs = rec_resp.json().get("recommendations", [])
    log_file.write(f"Found {len(recs)} movie recommendations:\n\n")
    
    for i, r in enumerate(recs[:3], 1):
        log_file.write(f"  {i}. {r['title']} ({r['match_score']*100:.0f}% Match)\n")
        log_file.write(f"     Why: {r['explanation']}\n\n")
        
    os.remove(filename)

if __name__ == "__main__":
    with open("test_results_clean.txt", "w", encoding="utf-8") as lf:
        for filename, content in RESUMES.items():
            test_resume(filename, content, lf)
