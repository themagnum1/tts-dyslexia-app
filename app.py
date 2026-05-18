from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import io
import sqlite3
import datetime
from gtts import gTTS  # free fallback; swap for google-cloud-texttospeech for WaveNet

app = Flask(__name__)
CORS(app)

DB_PATH = "tts_app.db"
AUDIO_DIR = "audio_files"
os.makedirs(AUDIO_DIR, exist_ok=True)

# ── Database setup ─────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS texts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            language TEXT DEFAULT 'en',
            voice TEXT DEFAULT 'standard',
            speed REAL DEFAULT 1.0,
            created_at TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text_id INTEGER,
            rating INTEGER,
            comment TEXT,
            created_at TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ── Routes ─────────────────────────────────────────────────
@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "TTS Dyslexia Support API is running"})

@app.route("/api/synthesize", methods=["POST"])
def synthesize():
    data = request.get_json()
    text = data.get("text", "").strip()
    language = data.get("language", "en")
    speed = float(data.get("speed", 1.0))

    if not text:
        return jsonify({"error": "Text is required"}), 400
    if len(text) > 10000:
        return jsonify({"error": "Text exceeds 10,000 character limit"}), 400

    try:
        # Log to DB
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("INSERT INTO texts (content, language, speed, created_at) VALUES (?,?,?,?)",
                  (text, language, speed, datetime.datetime.now().isoformat()))
        text_id = c.lastrowid
        conn.commit()
        conn.close()

        # Synthesize using gTTS (free) — replace with Google Cloud TTS for WaveNet
        tts = gTTS(text=text, lang=language, slow=(speed < 0.9))
        audio_path = os.path.join(AUDIO_DIR, f"audio_{text_id}.mp3")
        tts.save(audio_path)

        return jsonify({
            "success": True,
            "text_id": text_id,
            "audio_url": f"/api/audio/{text_id}"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/audio/<int:text_id>", methods=["GET"])
def get_audio(text_id):
    path = os.path.join(AUDIO_DIR, f"audio_{text_id}.mp3")
    if not os.path.exists(path):
        return jsonify({"error": "Audio not found"}), 404
    return send_file(path, mimetype="audio/mpeg")

@app.route("/api/feedback", methods=["POST"])
def submit_feedback():
    data = request.get_json()
    text_id = data.get("text_id")
    rating = data.get("rating")
    comment = data.get("comment", "")

    if not text_id or not rating:
        return jsonify({"error": "text_id and rating are required"}), 400

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO feedback (text_id, rating, comment, created_at) VALUES (?,?,?,?)",
              (text_id, rating, comment, datetime.datetime.now().isoformat()))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Feedback submitted"})

@app.route("/api/languages", methods=["GET"])
def get_languages():
    languages = [
        {"code": "en", "name": "English"},
        {"code": "fr", "name": "French"},
        {"code": "es", "name": "Spanish"},
        {"code": "de", "name": "German"},
        {"code": "yo", "name": "Yoruba"},
        {"code": "ha", "name": "Hausa"},
        {"code": "ig", "name": "Igbo"},
    ]
    return jsonify(languages)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
