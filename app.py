import os
import re
from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.utils import secure_filename
import pdfplumber
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'your_secret_key'
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Global storage for the PDF data (list of races)
model_data = []

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def clear_old_uploads():
    """Delete old PDF files from the uploads folder."""
    if os.path.exists(UPLOAD_FOLDER):
        for filename in os.listdir(UPLOAD_FOLDER):
            if filename.lower().endswith('.pdf'):
                os.remove(os.path.join(UPLOAD_FOLDER, filename))

def extract_pdf_data(file_path):
    """
    Extracts multiple races with their details and model data from a PDF file.
    Expected format for each race (as seen in your sample):
      Track: Healesville      Race Number: 1      Distance: 300m

      Box Dog Name Odds Runs (365D) Spell Profitable
      1 MASSETER 10.0 0 True
      2 REIKO BENNY 12.6 0 True
      ...
    """
    races = []
    with pdfplumber.open(file_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                full_text += page_text + "\n"

    # Split into race sections using a lookahead for "Track:"
    sections = re.split(r'(?=Track:\s*)', full_text)
    for sec in sections:
        if not sec.strip():
            continue
        # Extract race details using a regex.
        details_pattern = re.compile(
            r"Track:\s*(?P<track>\S+)\s+Race Number:\s*(?P<race_number>\d+)\s+Distance:\s*(?P<distance>\S+)",
            re.DOTALL
        )
        details_match = details_pattern.search(sec)
        if not details_match:
            continue
        race_details = details_match.groupdict()
        race_details["key"] = f"{race_details['track']}_{race_details['race_number']}"
        race_details["runners"] = []

        # Extract the model data section.
        model_section_match = re.search(r"Box\s+Dog Name\s+Odds(?:\s+Runs\s+\(365D\))?\s+(?:Spell\s+)?Profitable\s*\n(.*)", sec, re.DOTALL)
        if model_section_match:
            data_section = model_section_match.group(1)
            for line in data_section.strip().splitlines():
                if not line.strip():
                    continue
                # Capture: box, dog name, odds, (optional runs and spell) profitable.
                m = re.match(r'(?P<box>\d+)\s+(?P<name>[A-Z0-9\'\-\s]+?)\s+(?P<odds>\d+\.\d+)(?:\s+(?P<runs>\d+))?(?:\s+(?P<spell>\d+))?\s+(?P<profitable>True|False)', line)
                if m:
                    entry = m.groupdict()
                    runner = {
                        "box": entry["box"],
                        "name": entry["name"].strip(),
                        "model_odds": entry["odds"],
                        "profitable": entry["profitable"],
                        "runs_365_days": entry["runs"] if entry.get("runs") else "",
                        "spell": entry["spell"] if entry.get("spell") else ""
                    }
                    race_details["runners"].append(runner)
        else:
            print("Model data section not found in race", race_details["key"])
        races.append(race_details)
    return races

@app.route('/')
def index():
    return render_template('index.html',
                           model_data=model_data,
                           all_races=model_data,
                           current_year=datetime.now().year)

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    """Handles PDF upload and parsing."""
    global model_data
    if request.method == 'POST':
        if 'pdf_file' not in request.files:
            flash('No file part')
            return redirect(request.url)
        file = request.files['pdf_file']
        if file.filename == '':
            flash('No selected file')
            return redirect(request.url)
        if file and allowed_file(file.filename):
            clear_old_uploads()
            model_data = []  # Reset model data.
            filename = secure_filename(file.filename)
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            model_data = extract_pdf_data(file_path)
            flash('PDF uploaded and parsed successfully!')
            return redirect(url_for('index'))
    return render_template('upload.html', current_year=datetime.now().year)

@app.route('/race/<race_key>')
def race(race_key):
    """
    Renders a race page. It passes the specific race data, as well as all races (for the search dropdown)
    and the current year (for the footer).
    """
    race_data = next((r for r in model_data if r.get("key") == race_key), None)
    if not race_data:
        flash("Race not found")
        return redirect(url_for('index'))
    return render_template('race.html',
                           race=race_data,
                           all_races=model_data,
                           current_year=datetime.now().year)

@app.route('/search')
def search():
    query = request.args.get('q', '').lower()
    if not query:
        return redirect(url_for('index'))
    
    results = []
    for race in model_data:
        if query in race['track'].lower() or query in str(race['race_number']):
            results.append(race)
    
    return render_template('search.html',
                           query=query,
                           results=results,
                           current_year=datetime.now().year)

if __name__ == '__main__':
    app.run(debug=True)
