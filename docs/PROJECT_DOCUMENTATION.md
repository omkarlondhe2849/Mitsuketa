# 🔍 Mitsuketa - Media Fingerprinting & Identification System

**Major Project Documentation**

---

## 1. Project Overview

**Mitsuketa** (Japanese for "Found it") is an advanced content identification system capable of recognizing audio and video files from short, noisy snippets. It functions similarly to industry giants like Shazam or YouTube's Content ID but runs entirely locally with our custom-built fingerprinting engine.

The system is designed to demonstrate **robust media retrieval** using signal processing and perceptual hashing algorithms. It can confidently identify a media file even if the query clip is:
- **Short** (only a few seconds long)
- **Low quality** (compressed or noisy)
- **Visually altered** (resized, cropped, or re-encoded)

---

## 2. Key Features

### 🎵 Audio Fingerprinting

![Audio Hashing Process - Constellation Map](./media/audio_hashing_diagram.png)

- **Algorithm:** Uses a "Constellation Map" approach (similar to Shazam).
- **Process:** Converts audio to a spectrogram ➔ Extracts high-energy peaks ➔ Pairs peaks to create unique "anchor-target" hashes.
- **Robustness:** Highly resistant to background noise, volume changes, and microphone recording artifacts.

### 🎥 Video Fingerprinting
- **Algorithm:** Perceptual Hashing (pHash) on keyframes with **BK-Tree** indexing.
- **Process:** Extracts keyframes ➔ Converts to grayscale ➔ Computes Discrete Cosine Transform (DCT) ➔ Generates a hash based on low-frequency patterns.
- **Optimization:** Utilizes a BK-Tree data structure (`pybktree`) to achieve logarithmic **O(log N)** search performance across thousands of stored video hashes instead of linear brute-forcing.
- **Robustness:** Resistant to resizing, aspect ratio changes, and minor color shifts.

### 🚀 High-Performance Matching & Architecture
- **Hybrid Search:** Prioritizes Audio matching (which is faster and more accurate) and dynamically falls back to Video matching if the audio confidence is too low.
- **Efficient Database:** Uses SQLite with optimized indexing, chunked queries, and batched inserts to gracefully handle tens of thousands of fingerprints without lagging.

### 💻 Modern "Forensic" UI
- **Glassmorphism Theme:** A professional, sleek dark-mode React interface designed for technical demonstrations.
- **Real-time Analysis:** Shows exactly what the backend system is doing live (e.g., *"Extracting features..."*, *"Matching hashes..."*).
- **Detailed Metrics:** Displays the exact number of hashes matched, raw confidence scores, and a step-by-step analysis log for total transparency.

---

## 3. Technology Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, CSS3 | A sleek, dynamic SPA with glassmorphic elements and real-time state management. |
| **Backend** | Python, FastAPI | High-performance, highly concurrent ASGI web framework. |
| **Database** | SQLite | Lightweight, serverless local database for blazing-fast local queries. |
| **Media Engine**| FFmpeg | Core engine for reading and extracting audio/video frames. |
| **Processing** | Librosa, Numpy | Used for core signal processing and Fourier Transforms. |
| **Hashing** | ImageHash, Pybktree| Video perceptual hashing and logarithmic search optimization. |

---

## 4. How the "Combined Confidence" Metric Works

Unlike simple naive file matching, Mitsuketa calculates a dynamic **Confidence Score (between 0-100%)**:

1.  **Audio Score:** Based on the number of matching hashes relative to the total hashes in the query clip. Crucially, matches must also be *temporally aligned* (the time offsets between the hashes must be identical).
2.  **Video Score:** Based on the Hamming distance between pHash values. A lower distance indicates higher visual similarity.
3.  **Final Decision:**
    - If Audio Score > 35%, it is considered an exceptionally strong match.
    - If Audio is weak, the Video Score is weighed entirely into the final equation.
    - A combined, easy-to-read score is then returned to the user frontend.

---

## 5. Installation & Setup

### Prerequisites
- **Python 3.10+** installed on your system.
- **FFmpeg** installed and added to your system's PATH.
- **Node.js & npm** installed (for the React interface).

### Step-by-Step Installation

1. **Clone the Project:**
   ```bash
   git clone https://github.com/omkarlondhe2849/Mitsuketa.git
   cd Mitsuketa
   ```

2. **Install Backend Dependencies:**
   ```bash
   pip install "fastapi[all]" uvicorn numpy scipy librosa imagehash Pillow pydub pybktree opencv-python-headless
   ```

3. **Run the Backend Server:**
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Run the React Frontend:**
   Open a **new** terminal window inside the `frontend` directory:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the Interface:**
   Open your browser and navigate to: `http://localhost:5173` (or the local port Vite provides).

---

## 6. How to Use Mitsuketa

### Step 1: Register Media (Build the Library)
1. Go to the **"Register Media"** tab in the UI.
2. Drag & Drop a full-length media file (e.g., `Interstellar_Trailer.mp4`).
3. Enter a Title for the media and click **Register**.
4. *The system will comprehensively process the file, extract thousands of audio/video fingerprints, and securely store them in the local database.*

### Step 2: Identify a Clip
1. Switch to the **"Identify Clip"** tab.
2. Upload a short, noisy recording or snippet (e.g., a 10-second smartphone recording of the movie).
3. Click **Identify**.
4. *The system will analyze the snippet's constellation map and compare it against the entire library.*

### Step 3: View Technical Details
1. On the results page, expand the **"Technical Details"** panel at the bottom.
2. Review the **Analysis Log** to see exactly how Mitsuketa arrived at its decision.
3. Inspect the final match confidence and matched hash counts.

---

## 7. Cloud Deployment (AWS EC2)

A dedicated guide for deploying the Mitsuketa backend natively to an AWS EC2 instance is available in `EC2_Deployment_Commands.md`. It outlines the required Linux system packages, virtual environment setup, and dependency installations necessary for running Mitsuketa in a production cloud environment.
