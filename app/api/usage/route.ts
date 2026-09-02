import { recordUsage } from "@/db/usage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { deviceId?: unknown };
    if (typeof body.deviceId !== "string" || body.deviceId.length < 16 || body.deviceId.length > 128) {
      return Response.json({ ok: false }, { status: 400 });
    }
    const bytes = new TextEncoder().encode(body.deviceId);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const deviceHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    await recordUsage(deviceHash, Math.floor(Date.now() / 1000), day);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
