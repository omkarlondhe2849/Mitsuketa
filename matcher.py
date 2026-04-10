"""
Matching & Identification Module for Mitsuketa
Audio: Time-Offset Histogram (real Shazam algorithm)
Video: BK-Tree O(log N) Hamming distance search
"""

from collections import defaultdict
from database import (
    get_audio_fingerprints_by_hash,
    get_all_video_fingerprints,
    get_media_by_id,
)
from audio_fingerprint import fingerprint_file as audio_fingerprint_file
from video_fingerprint import fingerprint_video, hamming_distance

# Try to import pybktree for fast O(log N) video matching
try:
    import pybktree
    BKTREE_AVAILABLE = True
except ImportError:
    BKTREE_AVAILABLE = False
    print("⚠️  pybktree not installed. Video uses brute-force fallback. Run: pip install pybktree")


# ─── Configuration ────────────────────────────────────────────────────────────

AUDIO_CONFIDENCE_THRESHOLD = 0.15   # Real aligned score — no more *5 magic
VIDEO_CONFIDENCE_THRESHOLD = 0.20
COMBINED_AUDIO_WEIGHT = 0.6
COMBINED_VIDEO_WEIGHT = 0.4
PHASH_SIMILARITY_THRESHOLD = 10     # Max Hamming distance for video frame match

# Audio: time offset bin size in spectrogram frame units.
# HOP_LENGTH=512, SR=22050 → 1 frame ≈ 0.023s → BIN_SIZE=10 ≈ 0.23s window
OFFSET_BIN_SIZE = 10


# ─── BK-Tree Cache (Video) ───────────────────────────────────────────────────

_bktree_cache = None
_bktree_dirty = True


def invalidate_bktree_cache():
    """Call after new media is registered to force BK-Tree rebuild."""
    global _bktree_dirty
    _bktree_dirty = True


def _hamming_tuple(a, b):
    """Hamming distance between two (hash_int, media_id, title) tuples."""
    return bin(a[0] ^ b[0]).count('1')


def _build_video_bktree(db_fingerprints: list):
    """Build a BK-Tree from all DB video fingerprints for O(log N) search."""
    tree = pybktree.BKTree(_hamming_tuple)
    for fp in db_fingerprints:
        try:
            hash_int = int(fp['phash'], 16)
            tree.add((hash_int, fp['media_id'], fp['title']))
        except (ValueError, KeyError):
            pass
    return tree


def _get_video_bktree():
    """Get (or lazily rebuild) the cached BK-Tree."""
    global _bktree_cache, _bktree_dirty
    if _bktree_dirty or _bktree_cache is None:
        db_fps = get_all_video_fingerprints()
        _bktree_cache = _build_video_bktree(db_fps) if db_fps else None
        _bktree_dirty = False
    return _bktree_cache


# ─── Audio Matching — Time-Offset Histogram ──────────────────────────────────

def match_audio(query_fingerprints: list) -> list:
    """
    Match audio fingerprints using TIME-OFFSET HISTOGRAM alignment.

    The core insight: for a genuine match, all matching hashes will have
    IDENTICAL time offsets (db_time - query_time). This creates a sharp spike
    in a histogram of offsets, which is the match signal.

    Random hash collisions from noise spread across all offsets → no spike.
    This eliminates false positives and makes the score physically meaningful.
    """
    if not query_fingerprints:
        return []

    # Build lookup: hash → list of query_times
    # (same hash can appear multiple times at different timestamps)
    query_hash_times = defaultdict(list)
    for fp_hash, query_time in query_fingerprints:
        query_hash_times[fp_hash].append(query_time)

    matches = get_audio_fingerprints_by_hash(list(query_hash_times.keys()))
    if not matches:
        return []

    # Build time-offset histogram
    # Key: (media_id, binned_offset) → count of aligned hash pairs
    offset_histogram = defaultdict(int)
    media_titles = {}

    for match in matches:
        mid = match['media_id']
        media_titles[mid] = match['title']
        db_time = match['time_offset']
        fp_hash = match['fingerprint_hash']

        for query_time in query_hash_times.get(fp_hash, []):
            raw_offset = db_time - query_time
            # Bin the offset to handle minor timing jitter
            binned_offset = round(raw_offset / OFFSET_BIN_SIZE) * OFFSET_BIN_SIZE
            offset_histogram[(mid, binned_offset)] += 1

    # For each media, find the peak bin (highest spike = strongest alignment)
    media_best_count = defaultdict(int)
    for (mid, _), count in offset_histogram.items():
        if count > media_best_count[mid]:
            media_best_count[mid] = count

    total_query = len(query_fingerprints)
    results = []
    for mid, best_count in media_best_count.items():
        score = min(best_count / total_query, 1.0) if total_query > 0 else 0.0
        results.append({
            'media_id': mid,
            'title': media_titles[mid],
            'score': round(score, 4),
            'match_count': best_count,
            'total_query_fps': total_query,
            'method': 'audio',
            'debug_score_calc': f"Aligned Matches: {best_count} / Total Query FPs: {total_query}",
        })

    results.sort(key=lambda x: x['score'], reverse=True)
    return results


# ─── Video Matching — BK-Tree ────────────────────────────────────────────────

def match_video(query_fingerprints: list) -> list:
    """
    Match video fingerprints.
    Uses BK-Tree for O(Q × log V) if pybktree is available.
    Falls back to O(Q × V) brute-force otherwise.
    """
    if not query_fingerprints:
        return []
    return _match_video_bktree(query_fingerprints) if BKTREE_AVAILABLE \
        else _match_video_bruteforce(query_fingerprints)


def _match_video_bktree(query_fingerprints: list) -> list:
    """BK-Tree video matching — O(Q × log V). ~100× faster than brute force."""
    tree = _get_video_bktree()
    if tree is None:
        return []

    media_match_count = defaultdict(int)
    media_titles = {}

    for _, q_phash in query_fingerprints:
        try:
            q_int = int(q_phash, 16)
        except ValueError:
            continue

        # BK-Tree: find all items within Hamming distance <= threshold
        # Results: list of (distance, (hash_int, media_id, title))
        candidates = tree.find((q_int, 0, ''), PHASH_SIMILARITY_THRESHOLD)

        seen_media = set()
        for _dist, (_, mid, title) in candidates:
            if mid not in seen_media:
                media_match_count[mid] += 1
                media_titles[mid] = title
                seen_media.add(mid)

    total_query = len(query_fingerprints)
    results = []
    for mid, count in media_match_count.items():
        score = count / total_query if total_query > 0 else 0.0
        results.append({
            'media_id': mid,
            'title': media_titles[mid],
            'score': round(score, 4),
            'matched_frames': count,
            'total_query_frames': total_query,
            'method': 'video',
            'debug_score_calc': f"Matched Frames (BK-Tree): {count} / Total Query: {total_query}",
        })

    results.sort(key=lambda x: x['score'], reverse=True)
    return results


def _match_video_bruteforce(query_fingerprints: list) -> list:
    """Fallback brute-force O(Q × V) — used only if pybktree is not installed."""
    db_fingerprints = get_all_video_fingerprints()
    if not db_fingerprints:
        return []

    db_by_media = defaultdict(list)
    media_titles = {}
    for db_fp in db_fingerprints:
        mid = db_fp['media_id']
        db_by_media[mid].append(db_fp['phash'])
        media_titles[mid] = db_fp['title']

    results = []
    for mid, db_phashes in db_by_media.items():
        matched = 0
        for _, q_phash in query_fingerprints:
            for db_phash in db_phashes:
                if hamming_distance(q_phash, db_phash) <= PHASH_SIMILARITY_THRESHOLD:
                    matched += 1
                    break
        total_query = len(query_fingerprints)
        score = matched / total_query if total_query > 0 else 0.0
        results.append({
            'media_id': mid,
            'title': media_titles[mid],
            'score': round(score, 4),
            'matched_frames': matched,
            'total_query_frames': total_query,
            'method': 'video',
            'debug_score_calc': f"Matched Frames (Brute Force): {matched} / Total Query: {total_query}",
        })

    results.sort(key=lambda x: x['score'], reverse=True)
    return results


# ─── Combined Identification ──────────────────────────────────────────────────

def identify_clip(file_path: str) -> dict:
    """
    Identify a media clip using hybrid audio + video fingerprinting.

    Flow:
      1. Extract audio fingerprints → match with Time-Offset Histogram
      2. If audio score >= threshold → accept match, skip video
      3. If audio is weak → extract video fingerprints → match with BK-Tree
      4. Combine audio + video scores weighted average
    """
    result = {
        'match_found': False,
        'title': None,
        'media_id': None,
        'confidence': 0.0,
        'method_used': 'none',
        'audio_results': [],
        'video_results': [],
        'media_details': None,
        'analysis_steps': [],
    }

    # ── STEP 1: Audio fingerprinting ──
    audio_fps = []
    try:
        result['analysis_steps'].append('Extracting audio fingerprints...')
        audio_fps = audio_fingerprint_file(file_path)
        result['analysis_steps'].append(f'Extracted {len(audio_fps)} audio fingerprints.')
    except Exception as e:
        result['analysis_steps'].append(f'Audio extraction failed: {str(e)}')

    # ── STEP 2: Audio matching (Time-Offset Histogram) ──
    audio_results = []
    if audio_fps:
        result['analysis_steps'].append('Matching audio (time-offset histogram alignment)...')
        audio_results = match_audio(audio_fps)
        result['audio_results'] = audio_results[:5]

        if audio_results:
            best = audio_results[0]
            result['analysis_steps'].append(
                f'Best audio match: "{best["title"]}" — '
                f'{round(best["score"] * 100, 1)}% aligned confidence'
            )
        else:
            result['analysis_steps'].append('No audio matches found in database.')

    # ── STEP 3: Accept if audio is strong enough ──
    if audio_results and audio_results[0]['score'] >= AUDIO_CONFIDENCE_THRESHOLD:
        best = audio_results[0]
        result['match_found'] = True
        result['title'] = best['title']
        result['media_id'] = best['media_id']
        result['confidence'] = best['score']
        result['method_used'] = 'audio'
        result['analysis_steps'].append(
            f'Audio confidence ({round(best["score"] * 100, 1)}%) ≥ '
            f'threshold ({round(AUDIO_CONFIDENCE_THRESHOLD * 100)}%). '
            f'Match accepted. Video check skipped.'
        )
        result['media_details'] = get_media_by_id(best['media_id'])
        result['total_audio_fps'] = len(audio_fps)
        result['total_video_fps'] = 0
        return result

    # ── STEP 4: Audio inconclusive → try video ──
    if audio_results:
        result['analysis_steps'].append(
            f'Audio confidence ({round(audio_results[0]["score"] * 100, 1)}%) < '
            f'threshold ({round(AUDIO_CONFIDENCE_THRESHOLD * 100)}%). '
            f'Falling back to video analysis...'
        )
    else:
        result['analysis_steps'].append('No audio match. Attempting video fingerprinting...')

    video_fps = []
    try:
        result['analysis_steps'].append('Extracting video keyframes (pHash DCT)...')
        video_fps = fingerprint_video(file_path)
        result['analysis_steps'].append(f'Extracted {len(video_fps)} video fingerprints.')
    except Exception as e:
        result['analysis_steps'].append(f'Video extraction failed: {str(e)}')

    video_results = []
    if video_fps:
        method_label = 'BK-Tree O(log N)' if BKTREE_AVAILABLE else 'brute-force fallback'
        result['analysis_steps'].append(f'Matching video fingerprints ({method_label})...')
        video_results = match_video(video_fps)
        result['video_results'] = video_results[:5]

        if video_results:
            best_v = video_results[0]
            result['analysis_steps'].append(
                f'Best video match: "{best_v["title"]}" — '
                f'{round(best_v["score"] * 100, 1)}% frame similarity'
            )
        else:
            result['analysis_steps'].append('No video matches found in database.')

    # ── STEP 5: Combine audio + video scores ──
    if audio_results or video_results:
        combined_scores = defaultdict(lambda: {'audio': 0.0, 'video': 0.0, 'title': ''})

        for ar in audio_results:
            combined_scores[ar['media_id']]['audio'] = ar['score']
            combined_scores[ar['media_id']]['title'] = ar['title']

        for vr in video_results:
            combined_scores[vr['media_id']]['video'] = vr['score']
            if not combined_scores[vr['media_id']]['title']:
                combined_scores[vr['media_id']]['title'] = vr['title']

        best_mid, best_score, best_title, best_method = None, 0.0, None, 'none'

        for mid, scores in combined_scores.items():
            if scores['audio'] > 0 and scores['video'] > 0:
                combined = (scores['audio'] * COMBINED_AUDIO_WEIGHT +
                            scores['video'] * COMBINED_VIDEO_WEIGHT)
                method = 'audio+video'
            elif scores['video'] > 0:
                combined = scores['video']
                method = 'video'
            else:
                combined = scores['audio']
                method = 'audio'

            if combined > best_score:
                best_score = combined
                best_mid = mid
                best_title = scores['title']
                best_method = method

        min_threshold = 0.10
        if best_score >= min_threshold:
            result['match_found'] = True
            result['title'] = best_title
            result['media_id'] = best_mid
            result['confidence'] = round(best_score, 4)
            result['method_used'] = best_method
            result['media_details'] = get_media_by_id(best_mid)
            result['analysis_steps'].append(
                f'Match found: "{best_title}" — {round(best_score * 100, 1)}% confidence '
                f'via {best_method} analysis.'
            )
        else:
            result['analysis_steps'].append(
                f'Best score ({round(best_score * 100, 1)}%) below minimum threshold '
                f'({round(min_threshold * 100)}%). No match.'
            )
    else:
        result['analysis_steps'].append('No fingerprints could be extracted. No match.')

    result['total_audio_fps'] = len(audio_fps)
    result['total_video_fps'] = len(video_fps)
    return result
