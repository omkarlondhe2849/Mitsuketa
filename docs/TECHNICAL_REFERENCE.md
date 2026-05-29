# ⚙️ Mitsuketa Technical Architecture & Reference Guide

This document provides a highly detailed, deep-dive explanation of the Mitsuketa system mechanics, structural database design, file roles, and algorithm implementation details.

---

## 1. Advantages of the New Architecture Update

The most recent update overhauled the frontend framework and the core video matching algorithms.

1. **Frontend Migration to React (Vite)**
   - **Previous State:** Vanilla HTML/JS tightly coupled with the backend server.
   - **New Advantage:** The UI is now a completely decoupled Single-Page Application (SPA) built in React. This separation of concerns allows the frontend to manage complex multi-step forensic states seamlessly (dragging, dropping, uploading, and real-time backend updates) without page reloads. It is also infinitely easier to scale or host on a CDN.
2. **Video Search Upgrade: BK-Tree Indexing**
   - **Previous State:** $O(N)$ Linear Brute Force search. When querying a video hash, the server compared its Hamming distance against *every single frame* stored in the database.
   - **New Advantage:** Implementation of a **BK-Tree data structure (`pybktree`)** provides $O(\log N)$ logarithmic search complexity. A BK-Tree groups hashes branching by their exact Hamming distance. This cuts database sweeping time from seconds down to milliseconds, allowing the system to scale to tens of thousands of movies with near instant retrieval.

---

## 2. Codebase File Hierarchy & Roles

Here is exactly what each core `.py` script handles in the Mitsuketa backend:

- `main.py`
  - **Role:** The main API Entry Point.
  - **Function:** A high-performance asynchronous **FastAPI** web server. It manages the REST API endpoints (`/register`, `/identify`, `/library`) and orchestrates the passing of files between the UI and the fingerprinting engines.
- `audio_fingerprint.py`
  - **Role:** Audio Signal Processing Engine.
  - **Function:** Ingests media via direct FFmpeg byte streams. It converts audio into spectrograms using `librosa` and extracts high-energy "peaks". Crucially, it uses **Numba JIT compilation** to massively parallelize and accelerate the peak-finding loop.
- `video_fingerprint.py`
  - **Role:** Visual Perception Engine.
  - **Function:** Uses FFmpeg to extract video keyframes at regular intervals. Runs `ImageHash` formulas to generate visual structural hashes (pHashes), disregarding color, subtitles, or minor resolution changes.
- `matcher.py`
  - **Role:** The Core Retrieval Brain.
  - **Function:** Takes incoming "query" fingerprints and cross-references them against the database. It handles the temporal offset mathematical alignment for audio, the BK-Tree threshold searches for video, and returns the final `Confidence Metrics`.
- `database.py`
  - **Role:** Data Layer.
  - **Function:** An embedded **SQLite** wrapper with Write-Ahead Logging (WAL) enabled for safe concurrent writes. Contains queries for chunked reads and batched inserts (storing 5,000 hashes at a time gracefully).

---

## 3. Database Design & Schemas

The system uses SQLite (`mitsuketa.db`) with heavily optimized indices.

### Table: `media`
Stores metadata about registered audio tracks or movies.
| Column | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `INTEGER` | Primary Key, Auto-increment. |
| `title` | `TEXT` | Name of the track/movie. |
| `media_type` | `TEXT` | Strict constraint restricting to ('song', 'movie'). |
| `file_path` | `TEXT` | Local disk location on the server. |
| `duration` | `REAL` | Total length of media in seconds. |
| `added_at` | `TIMESTAMP`| Auto-generated insertion timestamp. |

### Table: `audio_fingerprints`
Stores the millions of constellation map hashes. Highly indexed.
| Column | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `INTEGER` | Primary Key, Auto-increment. |
| `media_id` | `INTEGER` | Foreign Key pointing to `media.id`. (Cascades on delete). |
| `fingerprint_hash` | `TEXT` | A 20-character truncated **SHA-1 hash** of the frequency pairs. |
| `time_offset` | `REAL` | The exact physical starting time (in seconds) of the anchor peak. Essential for temporal alignment. |

### Table: `video_fingerprints`
Stores visual structural fingerprints for video keyframes.
| Column | Data Type | Description |
| :--- | :--- | :--- |
| `id` | `INTEGER` | Primary Key, Auto-increment. |
| `media_id` | `INTEGER` | Foreign Key pointing to `media.id`. |
| `frame_index` | `INTEGER` | The sequential ID of the analyzed frame block. |
| `phash` | `TEXT` | A 64-bit Hex string representing the perceptual hash. |

---

## 4. In-Depth Algorithm Explanation

### A. Audio Matching: Constellation Maps (Spectrogram Hashing)
The system replicates the same highly robust audio algorithms used by large-scale commercial services.
1. **Transform:** Raw soundwaves are turned into a 2D **Spectrogram** (Time vs. Frequency) using a Short-Time Fourier Transform (STFT). 
2. **Peak Extraction:** The spectrogram is scanned to locate the absolute highest energy points in localized neighborhoods (e.g., prominent bass notes, snare hits, loud vocals). These localized peaks survive high compression and background noise.
3. **Anchor & Target Hashing:** To survive time-shifting (the user starting the recording anywhere in the song), peaks are paired together. An "Anchor" peak is selected, and paired with upcoming "Target" peaks in a fan-out zone. 
4. **Hashing String:** The hash is generated simply by combining: `Hash(Freq_Anchor | Freq_Target | Time_Delta)`.
5. **Temporal Alignment:** During matching, if an identical hash is found in the database, the backend checks the **Time Offset** formula:
   `Alignment Offset = Database_Absolute_Time - Query_Track_Time`
   *If hundreds of matching hashes all share the exact same `Alignment Offset`, the system guarantees a mathematically certain match.*

### B. Video Matching: Perceptual Hash (pHash)
Traditional cryptographic hashes (like MD5) change entirely if a single pixel shifts. A perceptual hash (pHash) grades structural similarity.
1. **Squeeze & Grayscale:** The extracted video frame is stripped of color entirely and smashed down to a tiny 32x32 pixel block.
2. **Discrete Cosine Transform (DCT):** A mathematical curve is passed over the 32x32 block. High-frequency details (grain, encoding artifacts, subtitles) are thrown out. Only low-frequency data (large shapes, silhouettes, horizon lines) is kept.
3. **Binarization:** The top 64 structural pixels are compared against the median brightness of the image. If brighter, they get a `1`. If darker, a `0`. This results in a 64-bit Hex Code.
4. **Hamming Distance on BK-Tree:** Two frames are compared by checking their Hamming Distance (how many bits are different out of 64). A distance of `< 10` means the human visual system wouldn't be able to tell the two frames apart. The BK-Tree allows us to instantly find any hash within a distance of `10` without checking every other unrelated hash in the database.
