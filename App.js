import React, { useState, useRef, useEffect } from "react";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const VOICES = [
  { id: "standard-male", name: "Standard (Male)" },
  { id: "standard-female", name: "Standard (Female)" },
  { id: "wavenet-male", name: "WaveNet (Male) ★" },
  { id: "wavenet-female", name: "WaveNet (Female) ★" },
];

export default function App() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en");
  const [voice, setVoice] = useState("wavenet-male");
  const [speed, setSpeed] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [textId, setTextId] = useState(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [charCount, setCharCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/languages`)
      .then((r) => r.json())
      .then(setLanguages)
      .catch(() => {});
  }, []);

  const handleTextChange = (e) => {
    setText(e.target.value);
    setCharCount(e.target.value.length);
    setError("");
  };

  const handleSubmit = async () => {
    if (!text.trim()) { setError("Please enter some text to convert."); return; }
    if (text.length > 10000) { setError("Text must be under 10,000 characters."); return; }

    setLoading(true);
    setError("");
    setAudioUrl(null);
    setFeedbackSent(false);
    setRating(0);

    try {
      const res = await fetch(`${API_BASE}/api/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, voice, speed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Synthesis failed");
      setAudioUrl(`${API_BASE}/api/audio/${data.text_id}`);
      setTextId(data.text_id);
    } catch (err) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (r) => {
    setRating(r);
    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text_id: textId, rating: r }),
      });
      setFeedbackSent(true);
    } catch {}
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = "tts-output.mp3";
    a.click();
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🔊</span>
            <span className="logo-text">TTS Dyslexia Support</span>
          </div>
          <p className="header-sub">Federal University of Technology Akure — IFT/18/5971</p>
        </div>
      </header>

      <main className="main">
        <div className="card">
          <h2 className="card-title">Text to Speech Converter</h2>
          <p className="card-desc">
            Enter or paste your text below. The system will convert it to natural,
            clear speech using advanced AI models (WaveNet &amp; Tacotron).
          </p>

          {/* Text Input */}
          <div className="field">
            <label className="label">
              Enter Text
              <span className={`char-count ${charCount > 9000 ? "warn" : ""}`}>
                {charCount}/10,000
              </span>
            </label>
            <textarea
              className="textarea"
              rows={7}
              placeholder="Paste or type your text here..."
              value={text}
              onChange={handleTextChange}
              aria-label="Text to convert to speech"
            />
          </div>

          {/* Settings Row */}
          <div className="settings-row">
            <div className="field-group">
              <label className="label">Language</label>
              <select
                className="select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                aria-label="Language selection"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="label">Voice</label>
              <select
                className="select"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                aria-label="Voice selection"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="label">Speed: {speed.toFixed(1)}x</label>
              <input
                type="range" min="0.5" max="2.0" step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="slider"
                aria-label="Speech speed"
              />
              <div className="slider-labels">
                <span>Slow</span><span>Fast</span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && <div className="error-box" role="alert">⚠ {error}</div>}

          {/* Convert Button */}
          <button
            className={`btn-convert ${loading ? "loading" : ""}`}
            onClick={handleSubmit}
            disabled={loading}
            aria-live="polite"
          >
            {loading ? (
              <><span className="spinner" aria-hidden="true" /> Synthesizing Speech...</>
            ) : (
              <><span aria-hidden="true">🔊</span> Convert to Speech</>
            )}
          </button>
        </div>

        {/* Audio Player */}
        {audioUrl && (
          <div className="card player-card" aria-live="polite">
            <h3 className="player-title">🎧 Your Audio is Ready</h3>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              aria-label="Synthesized speech audio player"
            />
            <div className="player-controls">
              <button className="btn-play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
                {playing ? "⏸ Pause" : "▶ Play"}
              </button>
              <button className="btn-download" onClick={handleDownload} aria-label="Download audio file">
                ⬇ Download MP3
              </button>
              <button className="btn-restart"
                onClick={() => { if(audioRef.current){audioRef.current.currentTime=0; audioRef.current.play(); setPlaying(true);}}}
                aria-label="Restart audio">
                ↺ Restart
              </button>
            </div>
            <div className="audio-info">
              Voice: {VOICES.find(v=>v.id===voice)?.name} &nbsp;|&nbsp;
              Language: {languages.find(l=>l.code===language)?.name || language} &nbsp;|&nbsp;
              Speed: {speed.toFixed(1)}x
            </div>

            {/* Feedback */}
            <div className="feedback">
              <p className="feedback-label">Rate the speech quality:</p>
              <div className="stars">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    className={`star ${n <= rating ? "active" : ""}`}
                    onClick={() => handleFeedback(n)}
                    aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                    disabled={feedbackSent}
                  >★</button>
                ))}
              </div>
              {feedbackSent && <p className="feedback-thanks">Thank you for your feedback!</p>}
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="info-grid">
          <div className="info-card">
            <div className="info-icon">🧠</div>
            <h4>Designed for Dyslexia</h4>
            <p>Optimized for individuals with dyslexia, supporting independent access to written content through clear, natural speech.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">⚡</div>
            <h4>WaveNet & Tacotron</h4>
            <p>Powered by Google's advanced neural speech synthesis models for human-like prosody and intonation.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">🌍</div>
            <h4>Multiple Languages</h4>
            <p>Supports English, French, Spanish, Yoruba, Hausa, Igbo, and more for broad accessibility.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">♿</div>
            <h4>Fully Accessible</h4>
            <p>Screen reader compatible, keyboard navigable, and WCAG 2.1 compliant for inclusive design.</p>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>TTS Dyslexia Support System — ADANU PATRICK (IFT/18/5971)</p>
        <p>Federal University of Technology Akure | Supervised by Prof. (Mrs) O.K Boyinbode</p>
      </footer>
    </div>
  );
}
