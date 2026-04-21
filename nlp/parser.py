import PyPDF2
import docx

def extract_text(file_stream, filename):
    text = ""
    file_stream.seek(0)
    
    if filename.lower().endswith('.pdf'):
        try:
            reader = PyPDF2.PdfReader(file_stream)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + " "
        except Exception as e:
            print(f"Error reading PDF: {e}")
            
    elif filename.lower().endswith('.docx'):
        try:
            doc = docx.Document(file_stream)
            for para in doc.paragraphs:
                text += para.text + " "
        except Exception as e:
            print(f"Error reading DOCX: {e}")
    else:
        text = file_stream.read().decode('utf-8', errors='ignore')
        
    return text.strip()
