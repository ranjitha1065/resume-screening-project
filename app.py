from flask import Flask, request, jsonify, render_template
import os
import io
from nlp.parser import extract_text
from nlp.skill_extractor import extract_skills
from nlp.model_pipeline import predict_role

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 # 16 MB

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'resume' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
        
    file = request.files['resume']
    if file.filename == '':
        return jsonify({"error": "No file selected for uploading"}), 400
        
    if not (file.filename.lower().endswith('.pdf') or file.filename.lower().endswith('.docx')):
        return jsonify({"error": "Allowed file types are PDF, DOCX"}), 400

    try:
        file_stream = io.BytesIO(file.read())
        raw_text = extract_text(file_stream, file.filename)
        
        if not raw_text or len(raw_text.strip()) < 20: 
            return jsonify({"error": "Failed to extract meaningful text from document"}), 400

        # Run ML inference
        skills = extract_skills(raw_text)
        predicted_role, confidence = predict_role(raw_text)
        
        # We now return the raw intelligence directly back to the authenticated client, 
        # which will authorize the database write query against Supabase securely!
        return jsonify({
            "success": True,
            "filename": file.filename,
            "predicted_role": predicted_role,
            "confidence": confidence,
            "skills": list(set(skills))
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
