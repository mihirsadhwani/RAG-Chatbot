const API_BASE = '';

export async function sendChatQuery(query) {
    const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
}

export async function healthCheck() {
    const response = await fetch(`${API_BASE}/health`);
    return response.json();
}
