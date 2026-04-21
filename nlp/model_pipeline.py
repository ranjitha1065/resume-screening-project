import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib
import os

try:
    from nlp.preprocessing import clean_text
except ImportError:
    from preprocessing import clean_text

MODEL_PATH = "nlp/classifier.pkl"
VECTORIZER_PATH = "nlp/vectorizer.pkl"

def train_model(csv_path="data/resume_data.csv"):
    print("Loading dataset...")
    df = pd.read_csv(csv_path)
    
    print("Cleaning text...")
    df['Cleaned_Text'] = df['Resume_Text'].apply(clean_text)
    
    vectorizer = TfidfVectorizer(max_features=1000)
    X = vectorizer.fit_transform(df['Cleaned_Text'])
    y = df['Job_Role']
    
    print("Training model...")
    model = LogisticRegression(class_weight='balanced')
    model.fit(X, y)
    
    os.makedirs("nlp", exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    print(f"Model and Vectorizer saved successfully.")

def predict_role(raw_text):
    if not os.path.exists(MODEL_PATH) or not os.path.exists(VECTORIZER_PATH):
        raise FileNotFoundError("Model or Vectorizer not found. Train the model first.")
        
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    
    cleaned = clean_text(raw_text)
    X = vectorizer.transform([cleaned])
    
    prediction = model.predict(X)[0]
    
    probs = model.predict_proba(X)[0]
    max_prob = max(probs)
    
    return prediction, round(max_prob * 100, 2)

if __name__ == "__main__":
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    train_model()
