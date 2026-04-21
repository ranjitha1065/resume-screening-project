import sqlite3
import json

DB_NAME = 'resumes.db'

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            raw_text TEXT,
            predicted_role TEXT,
            skills TEXT,
            confidence REAL
        )
    ''')
    conn.commit()
    conn.close()

def save_resume(filename, raw_text, predicted_role, skills, confidence):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO resumes (filename, raw_text, predicted_role, skills, confidence)
        VALUES (?, ?, ?, ?, ?)
    ''', (filename, raw_text, predicted_role, json.dumps(skills), confidence))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
