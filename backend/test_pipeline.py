"""Verify phrase uniqueness across all recommendations for a single profile."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from resume_parser import parse_resume
from recommender import generate_recommendations

# Test with finance profile
text = "James Chen CFA Vice President Investment Banking with 10 years in corporate finance. Managed 500M portfolio across private equity venture capital and cryptocurrency. Led financial modeling for 15 mergers and acquisitions totaling 2.3B. Fintech disruption blockchain algorithmic trading. Budgeting forecasting risk management negotiation."
p = parse_resume('t.txt', text.encode('utf-8'))
recs = generate_recommendations(p)

print("=== PHRASE UNIQUENESS CHECK ===")
print(f"Profile: {p['industry']} | {p['vibe']}")
print(f"Total recs: {len(recs)}")
print()

first_sentences = []
for i, r in enumerate(recs):
    first_sent = r['explanation'].split('. ')[0]
    first_sentences.append(first_sent)
    print(f"#{i+1} {r['title']}")
    print(f"   FIRST SENTENCE: {first_sent[:120]}...")
    print()

# Check for duplicates
unique_count = len(set(first_sentences))
print(f"\n=== RESULT: {unique_count}/{len(first_sentences)} unique opening phrases ===")
if unique_count == len(first_sentences):
    print("PASS: Every recommendation has a unique opening phrase!")
else:
    print("FAIL: Some phrases are duplicated!")
    from collections import Counter
    dupes = [s for s, c in Counter(first_sentences).items() if c > 1]
    for d in dupes:
        print(f"  DUPE: {d[:100]}...")
