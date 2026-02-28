from duckduckgo_search import DDGS
import json

def test_chat():
    try:
        results = DDGS().chat("Provide JSON for 2 recent tech startup tv shows. Output valid JSON array with keys: title, career_skills, industry, career_stage, summary", model="claude-3-haiku")
        print("Success:", results)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_chat()
