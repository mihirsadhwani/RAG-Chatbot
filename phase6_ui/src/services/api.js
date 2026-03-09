const API_BASE = 'http://localhost:10000';

export async function sendChatQuery(query, fund = null) {
    const body = { query };
    if (fund) body.fund = fund;

    const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
}

export async function healthCheck() {
    const response = await fetch(`${API_BASE}/health`);
    return response.json();
}
