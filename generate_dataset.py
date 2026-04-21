import pandas as pd
import random

# Synthetic data generator for 5 roles
roles = [
    "Data Scientist",
    "Web Developer",
    "HR Manager",
    "Software Engineer",
    "Machine Learning Engineer"
]

ds_keywords = ["python", "machine learning", "data analysis", "pandas", "numpy", "statistics", "sql", "visualization", "tensorFlow", "deep learning"]
web_keywords = ["html", "css", "javascript", "react", "node.js", "frontend", "backend", "web layout", "typescript", "ui/ux", "api"]
hr_keywords = ["recruitment", "onboarding", "employee relations", "talent acquisition", "human resources", "payroll", "interviewing", "compliance"]
se_keywords = ["java", "c++", "system design", "algorithms", "data structures", "git", "oop", "docker", "agile", "software development"]
ml_keywords = ["pytorch", "neural networks", "nlp", "computer vision", "model deployment", "xgboost", "gpu", "scikit-learn", "deep learning", "transformers"]

def generate_resume(role):
    base_text = "Experienced professional with a strong background in "
    
    if role == "Data Scientist":
        words = random.sample(ds_keywords, 5) + random.sample(ml_keywords, 2) + random.sample(se_keywords, 2)
    elif role == "Web Developer":
        words = random.sample(web_keywords, 6) + random.sample(se_keywords, 3)
    elif role == "HR Manager":
        words = random.sample(hr_keywords, 7) + random.sample(web_keywords, 1) + ["communication", "leadership"]
    elif role == "Software Engineer":
        words = random.sample(se_keywords, 6) + random.sample(web_keywords, 2) + random.sample(ds_keywords, 1)
    else: # ML Engineer
        words = random.sample(ml_keywords, 6) + random.sample(ds_keywords, 2) + random.sample(se_keywords, 2)
        
    random.shuffle(words)
    return base_text + ", ".join(words) + ". Proven track record of delivering high quality results."

data = []
for _ in range(50): # 50 resumes per role
    for role in roles:
        resume_text = generate_resume(role)
        data.append({"Resume_Text": resume_text, "Job_Role": role})

df = pd.DataFrame(data)
df = df.sample(frac=1).reset_index(drop=True) # Shuffle
df.to_csv("data/resume_data.csv", index=False)
print("✅ synthetic dataset generated at data/resume_data.csv (250 samples).")
