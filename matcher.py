"""
Matching & Identification Module for Mitsuketa
Strategy: Audio-first → if audio confidence is low → fall back to video → combine for final result.
"""

from collections import defaultdict
from database import (
    get_audio_fingerprints_by_hash,
    get_all_video_fingerprints,
    get_media_by_id,
)
from audio_fingerprint import fingerprint_file as audio_fingerprint_file
from video_fingerprint import fingerprint_video, hamming_distance


# ─── Configuration ───────────────────────────────────────────────────────────

AUDIO_CONFIDENCE_THRESHOLD = 0.35    # If audio score >= this, accept audio match (skip video)
VIDEO_CONFIDENCE_THRESHOLD = 0.3    # Minimum video score to consider a match
COMBINED_AUDIO_WEIGHT = 0.6         # Weight of audio in combined score
COMBINED_VIDEO_WEIGHT = 0.4         # Weight of video in combined score
PHASH_SIMILARITY_THRESHOLD = 10     # Max Hamming distance for frame match


# ─── Audio Matching ─────────────────────────────────────────────────────────

def match_audio(query_fingerprints: list) -> list:
    """
    Match audio fingerprints against the database.
    Returns list of dicts sorted by score descending.
    """
    if not query_fingerprints:
        return []

    query_hashes = [fp[0] for fp in query_fingerprints]
    matches = get_audio_fingerprints_by_hash(query_hashes)

    if not matches:
        return []

    media_hit_count = defaultdict(int)
    media_titles = {}

    for match in matches:
        mid = match['media_id']
        media_hit_count[mid] += 1
        media_titles[mid] = match['title']

    total_query = len(query_fingerprints)
    results = []

    for mid, hit_count in media_hit_count.items():
        score = hit_count / total_query if total_query > 0 else 0
        results.append({
            'media_id': mid,
            'title': media_titles[mid],
            'score': round(min(score * 5, 1.0), 4),
            'match_count': hit_count,
            'total_query_fps': total_query,
            'method': 'audio'
        })

    results.sort(key=lambda x: x['score'], reverse=True)
    
    # Add debug info to top results
    for r in results:
        r['debug_score_calc'] = f"Matches: {r['match_count']} / Total Query: {r['total_query_fps']}"
        
    return results


# ─── Video Matching ─────────────────────────────────────────────────────────

def match_video(query_fingerprints: list) -> list:
    """
    Match video fingerprints against the database using Hamming distance.
    Returns list of dicts sorted by score descending.
    """
    if not query_fingerprints:
        return []

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
        matched_frames = 0

        for _, q_phash in query_fingerprints:
            for db_phash in db_phashes:
                dist = hamming_distance(q_phash, db_phash)
                if dist <= PHASH_SIMILARITY_THRESHOLD:
                    matched_frames += 1
                    break

        total_query = len(query_fingerprints)
        score = matched_frames / total_query if total_query > 0 else 0

        results.append({
            'media_id': mid,
            'title': media_titles[mid],
            'score': round(score, 4),
            'matched_frames': matched_frames,
            'total_query_frames': total_query,
            'method': 'video'
        })

    results.sort(key=lambda x: x['score'], reverse=True)
    
    # Add debug info
    for r in results:
        r['debug_score_calc'] = f"Matched Frames: {r['matched_frames']} / Total Query: {r['total_query_frames']}"
        
    return results


# ─── Combined Identification (Audio-First Strategy) ─────────────────────────

def identify_clip(file_path: str) -> dict:
    """
    Identify a media clip.

    Flow:
      1. Extract AUDIO fingerprints and match against the database.
      2. If audio confidence >= threshold → accept match, skip video.
      3. If audio confidence is LOW → extract VIDEO fingerprints and match.
      4. Combine audio + video scores for the final result.
      5. Return full details of the matched media.
    """
    result = {
        'match_found': False,
        'title': None,
        'media_id': None,
        'confidence': 0.0,
        'method_used': 'none',
        'audio_results': [],
        'video_results': [],
        'media_details': None,         # Full info of matched media
        'analysis_steps': [],          # Log of what the system did
    }

    # ── STEP 1: Audio fingerprinting ──
    audio_fps = []
    try:
        result['analysis_steps'].append('Extracting audio fingerprints...')
        audio_fps = audio_fingerprint_file(file_path)
        result['analysis_steps'].append(f'Extracted {len(audio_fps)} audio fingerprints.')
    except Exception as e:
        result['analysis_steps'].append(f'Audio extraction failed: {str(e)}')

    # ── STEP 2: Audio matching ──
    audio_results = []
    if audio_fps:
        result['analysis_steps'].append('Matching audio fingerprints against database...')
        audio_results = match_audio(audio_fps)
        result['audio_results'] = audio_results[:5]

        if audio_results:
            best = audio_results[0]
            result['analysis_steps'].append(
                f'Best audio match: "{best["title"]}" with confidence {round(best["score"] * 100, 1)}%'
            )
        else:
            result['analysis_steps'].append('No audio matches found in database.')

    # ── STEP 3: Check if audio confidence is high enough ──
    if audio_results and audio_results[0]['score'] >= AUDIO_CONFIDENCE_THRESHOLD:
        # Audio match is strong — accept it, skip video
        best = audio_results[0]
        result['match_found'] = True
        result['title'] = best['title']
        result['media_id'] = best['media_id']
        result['confidence'] = best['score']
        result['method_used'] = 'audio'
        result['analysis_steps'].append(
            f'Audio confidence ({round(best["score"] * 100, 1)}%) is above threshold '
            f'({round(AUDIO_CONFIDENCE_THRESHOLD * 100)}%). Accepting audio match. Video check skipped.'
        )

        # Fetch full media details
        result['media_details'] = get_media_by_id(best['media_id'])
        return result

    # ── STEP 4: Audio was inconclusive → try video fingerprinting ──
    if audio_results:
        result['analysis_steps'].append(
            f'Audio confidence ({round(audio_results[0]["score"] * 100, 1)}%) is below threshold '
            f'({round(AUDIO_CONFIDENCE_THRESHOLD * 100)}%). Falling back to video analysis...'
        )
    else:
        result['analysis_steps'].append('No audio match. Attempting video fingerprinting...')

    video_fps = []
    try:
        result['analysis_steps'].append('Extracting video key frames and computing visual hashes...')
        video_fps = fingerprint_video(file_path)
        result['analysis_steps'].append(f'Extracted {len(video_fps)} video fingerprints.')
    except Exception as e:
        result['analysis_steps'].append(f'Video extraction failed: {str(e)}')

    video_results = []
    if video_fps:
        result['analysis_steps'].append('Matching video fingerprints against database...')
        video_results = match_video(video_fps)
        result['video_results'] = video_results[:5]

        if video_results:
            best_v = video_results[0]
            result['analysis_steps'].append(
                f'Best video match: "{best_v["title"]}" with confidence {round(best_v["score"] * 100, 1)}%'
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

        best_mid = None
        best_score = 0.0
        best_title = None

        for mid, scores in combined_scores.items():
            if scores['audio'] > 0 and scores['video'] > 0:
                # Both modalities matched → weighted combination
                combined = (
                    scores['audio'] * COMBINED_AUDIO_WEIGHT +
                    scores['video'] * COMBINED_VIDEO_WEIGHT
                )
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

        min_threshold = 0.15
        if best_score >= min_threshold:
            result['match_found'] = True
            result['title'] = best_title
            result['media_id'] = best_mid
            result['confidence'] = round(best_score, 4)
            result['method_used'] = best_method
            result['media_details'] = get_media_by_id(best_mid)
            result['analysis_steps'].append(
                f'Combined match found: "{best_title}" with {round(best_score * 100, 1)}% confidence '
                f'using {best_method} analysis.'
            )
        else:
            result['analysis_steps'].append(
                f'Best combined score ({round(best_score * 100, 1)}%) is below minimum threshold. No match.'
            )
    else:
        result['analysis_steps'].append('No fingerprints could be extracted or matched. No match.')

    # Add final stats for UI
    result['total_audio_fps'] = len(audio_fps)
    result['total_video_fps'] = len(video_fps)

    return result
