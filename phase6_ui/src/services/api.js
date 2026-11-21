const API_BASE = '';

export async function sendChatQuery(query, fund = null, history = null, sourceUi = 'chat_input') {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      ...(fund ? { fund } : {}),
      ...(history && history.length ? { history } : {}),
      source_ui: sourceUi,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchFunds() {
  try {
    const res = await fetch(`${API_BASE}/api/funds`);
    if (res.ok) return await res.json();
  } catch {
    // Fallback to static asset if backend is unavailable
  }
  const fallback = await fetch('/fund_data.json');
  if (!fallback.ok) return [];
  return fallback.json();
}

export async function healthCheck() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error('Health check failed');
  return response.json();
}

export async function fetchStatus() {
  const res = await fetch(`${API_BASE}/api/status`);
  if (!res.ok) throw new Error('Status failed');
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/api/analytics`);
  if (!res.ok) throw new Error('Analytics failed');
  return res.json();
}

export async function fetchEvalSummary() {
  const res = await fetch(`${API_BASE}/api/eval`);
  if (!res.ok) throw new Error('Eval fetch failed');
  return res.json();
}

export async function sendFeedback(queryId, value) {
  const res = await fetch(`${API_BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_id: queryId, value }),
  });
  if (!res.ok) throw new Error('Feedback failed');
  return res.json();
}

export function trackEvent(eventName, detail = null) {
  fetch(`${API_BASE}/api/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_name: eventName, detail }),
  }).catch(() => {});
}
