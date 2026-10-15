// Optional: also post each update to a Telegram channel/chat (free, fully automatic).
// Needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID on the server; does nothing when they are not set.

export function toPlain(text) {
  return String(text).replace(/\*\*/g, '').replace(/\*/g, '');
}

export async function sendTelegram(text, { env = process.env, fetchImpl = fetch } = {}) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chat = env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { skipped: true };
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: toPlain(text), disable_web_page_preview: true }),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}
