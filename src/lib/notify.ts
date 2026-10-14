/**
 * Fire-and-forget notifications for the shop owner.
 * Sends to NOTIFY_WEBHOOK_URL (Discord/Slack-compatible JSON) when set,
 * otherwise logs to the server console. Failures never break a booking.
 */
export async function notifyShop(message: string): Promise<void> {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) {
    console.info(`[notify] ${message}`);
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // `content` for Discord, `text` for Slack
      body: JSON.stringify({ content: message, text: message }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.warn(`[notify] webhook responded ${res.status}`);
  } catch (err) {
    console.warn("[notify] webhook failed", err);
  }
}
