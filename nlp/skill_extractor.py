import re

# Predefined dictionary
TECH_SKILLS = [
    "python", "java", "c++", "c#", "javascript", "react", "node.js", "angular", "vue", "html", "css", 
    "sql", "mysql", "postgresql", "mongodb", "aws", "docker", "kubernetes", "agile", "git",
    "machine learning", "deep learning", "nlp", "tensorflow", "pytorch", "scikit-learn",
    "pandas", "numpy", "matplotlib", "sysadmin", "linux", "cloud computing", "azure"
]

def extract_skills(text):
    found_skills = []
    text_lower = text.lower()
    
    for skill in TECH_SKILLS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text_lower):
            found_skills.append("Node.js" if skill == "node.js" else (skill.upper() if len(skill) <= 3 else skill.title()))
            
    return found_skills
