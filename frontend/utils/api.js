const API_URL = 'https://amiable-upliftment-production.up.railway.app'; // Production backend URL using HTTPS

export async function createSession({ dj_id, venue_name, status }) {
  const res = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dj_id, venue_name, status })
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

export async function getAddUsage(session_code, user_id) {
  const res = await fetch(`${API_URL}/sessions/${session_code}/add-usage/${user_id}`);
  if (!res.ok) throw new Error('Failed to get add usage');
  return res.json();
}

export async function addSongRequest({ session_code, song_title, artist, user_id }) {
  const res = await fetch(`${API_URL}/sessions/${session_code}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ song_title, artist, user_id })
  });
  if (!res.ok) throw new Error('Failed to add song request');
  return res.json();
}

export async function getSessionQueue(session_code) {
  const res = await fetch(`${API_URL}/sessions/${session_code}/requests`);
  if (!res.ok) throw new Error('Failed to get session queue');
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

export async function getVoteUsage(session_code, user_id) {
  const res = await fetch(`${API_URL}/sessions/${session_code}/vote-usage/${user_id}`);
  if (!res.ok) throw new Error('Failed to get vote usage');
  return res.json();
}

export async function sendOTP(phone_number) {
  const res = await fetch(`${API_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number })
  });
  if (!res.ok) throw new Error('Failed to send OTP');
  return res.json();
}

export async function removeSongRequest({ session_code, request_id, user_id }) {
  const res = await fetch(`${API_URL}/sessions/${session_code}/requests/${request_id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id })
  });
  if (!res.ok) throw new Error('Failed to remove song request');
  return res.json();
} 