# Mitsuketa - Media Fingerprinting & Identification System
### major Project Documentation

## 1. Project Overview
**Mitsuketa** (Japanese for "Found it") is an advanced content identification system capable of recognizing audio and video files from short, noisy snippet. It functions similarly to industry giants like Shazam or YouTube's Content ID but runs entirely locally with a custom-built fingerprinting engine.

The system is designed to demonstrate **robust media retrieval** using signal processing and perceptual hashing algorithms. It can identify a media file even if the query clip is:
- Short (only a few seconds long).
- Low quality (compressed or noisy).
- Visually altered (resized or re-encoded).

---

## 2. Key Features

### 🎵 Audio Fingerprinting
- **Algorithm:** Uses a "Constellation Map" approach similar to Shazam.
- **Process:** Converts audio to a spectrogram -> Extracts high-energy peaks -> Pairs peaks to create unique "anchor-target" hashes.
- **Robustness:** Resistant to noise, volume changes, and microphone recording artifacts.

### 🎥 Video Fingerprinting
- **Algorithm:** Perceptual Hashing (pHash) on keyframes.
- **Process:** Extracts keyframes -> Converts to grayscale -> Computes Discrete Cosine Transform (DCT) -> Generates a hash based on low-frequency patterns.
- **Robustness:** Resistant to resizing, aspect ratio changes, and minor color shifts.

### 🚀 High-Performance Matching
- **Hybrid Search:** Prioritizes Audio matching (faster/more accurate) and falls back to Video matching if audio confidence is low.
- **Efficient Database:** Uses SQLite with optimized indexing, chunked queries, and batched inserts to handle tens of thousands of fingerprints without lagging.

### 💻 Modern "Forensic" UI
- **Glassmorphism Theme:** A professional, dark-mode interface designed for technical demonstrations.
- **Real-time Analysis:** Shows exactly what the system is doing ("Extracting features...", "Matching hashes...").
- **Detailed Metrics:** Displays the exact number of hashes matched, raw confidence scores, and a step-by-step analysis log.

---

## 3. Advanced Technical Details

### The "Combined Confidence" Metric
Unlike simple file matching, Mitsuketa calculates a **Confidence Score (0-100%)**:
1.  **Audio Score:** Based on the number of matching hashes relative to the total hashes in the query clip. Matches must also be *temporally aligned* (time offsets must match).
2.  **Video Score:** Based on the Hamming distance between pHash values. Lower distance = Higher similarity.
3.  **Final Decision:**
    - If Audio Score > 35%, it is considered a strong match.
    - If Audio is weak, Video Score is weighed in.
    - A combined score is returned to the user.

### Optimizations for Scale
- **Chunked Database Queries:** To prevent SQLite errors when querying thousands of hashes, the system breaks queries into safe chunks (500 items).
- **Batched Inserts:** When registering a movie, thousands of fingerprints are generated. These are inserted in batches of 5000 to maintain system stability.

---

## 4. Technology Stack

- **Language:** Python 3.9+
- **Backend Framework:** FastAPI (High performance, async support)
- **Server:** Uvicorn (ASGI Server)
- **Database:** SQLite (Lightweight, serverless)
- **Media Processing:**
    - `FFmpeg`: Core engine for reading audio/video frames.
    - `Librosa` / `Numpy`: Signal processing and Fourier Transforms.
    - `ImageHash`: Video perceptual hashing.
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (No heavy frameworks needed).

---

## 5. Installation & Setup

### Prerequisites
1.  Install **Python 3.10+**.
2.  Install **FFmpeg** and ensure it is added to your system PATH.

### Installation Steps
1.  **Clone the Project:**
    ```bash
    git clone <repository-url>
    cd "Major Project"
    ```

2.  **Install Dependencies:**
    ```bash
    pip install "fastapi[all]" uvicorn numpy scipy librosa imagehash Pillow pydub
    ```

3.  **Run the Server:**
    ```bash
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ```

4.  **Access the Interface:**
    Open your browser and navigate to: `http://localhost:8000`

---

## 6. How to Use

### Step 1: Register Media (Build the Library)
1.  Go to the **"Register Media"** tab.
2.  Drag & Drop a full song or video file (e.g., "Interstellar_Trailer.mp4").
3.  Enter a Title and click **Register**.
4.  *The system will process the file, extract thousands of fingerprints, and store them in the database.*

### Step 2: Identify a Clip
1.  Go to the **"Identify Clip"** tab.
2.  Upload a short recording or snippet (e.g., a 10-second recording of that movie).
3.  Click **Identify**.
4.  *The system will analyze the snippet and compare it against the library.*

### Step 3: View Technical Details
1.  On the results page, look for the **"Technical Details"** panel at the bottom.
2.  Review the **Analysis Log** to see the decision-making process.
3.  Check the match confidence and hash counts.
