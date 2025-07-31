// Environment-based API URL
const API_URL = __DEV__ 
  ? 'http://192.168.0.242:4000'  // Local development
  : 'https://amiable-upliftment-production.up.railway.app'; // Production

export async function createSession({ dj_id, venue_name, status }) {
  const res = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dj_id, status })
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function joinSession(session_code, user_id) {
  const res = await fetch(`${API_URL}/sessions/${session_code}`);
  if (!res.ok) throw new Error('Session not found');
  const sessionData = await res.json();
  // Call join endpoint to increment crowd
  if (user_id) {
    await fetch(`${API_URL}/sessions/${session_code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id })
    });
  }
  return sessionData;
}

export async function searchSpotify(query) {
  const res = await fetch(`${API_URL}/spotify/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Spotify search failed');
  return res.json();
}

export async function getAddUsage(session_id, user_id) {
  const res = await fetch(`${API_URL}/sessions/${session_id}/add-usage/${user_id}`);
  if (!res.ok) throw new Error('Failed to fetch add usage');
  return res.json();
}

export async function addSongRequest({ session_id, song_title, artist, user_id }) {
  const res = await fetch(`${API_URL}/sessions/${session_id}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ song_title, artist, user_id })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to add song request');
  return res.json();
}

export async function getSessionQueue(session_id) {
  const res = await fetch(`${API_URL}/sessions/${session_id}/requests`);
  if (!res.ok) throw new Error('Failed to fetch session queue');
  return res.json();
}

export async function upvoteRequest(request_id, user_id) {
  const res = await fetch(`${API_URL}/requests/${request_id}/upvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to upvote');
  return res.json();
}

export async function downvoteRequest(request_id, user_id) {
  const res = await fetch(`${API_URL}/requests/${request_id}/downvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to downvote');
  return res.json();
}

export async function getVoteUsage(session_id, user_id) {
  const res = await fetch(`${API_URL}/sessions/${session_id}/vote-usage/${user_id}`);
  if (!res.ok) throw new Error('Failed to fetch vote usage');
  return res.json();
}

export async function sendOTP(phone_number) {
  // OTP functionality not implemented in backend yet
  // For now, return a mock response
  return new Promise(resolve => {
    setTimeout(() => resolve({ success: true, message: 'OTP sent' }), 1000);
  });
}

export async function removeSongRequest({ session_id, request_id, user_id }) {
  const res = await fetch(`${API_URL}/sessions/${session_id}/requests/${request_id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to remove song request');
  return res.json();
} 