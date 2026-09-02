import { env } from "cloudflare:workers";

export async function recordUsage(deviceHash: string, timestamp: number, day: string) {
  const deviceStatement = env.DB.prepare(`
    INSERT INTO usage_devices (device_hash, first_used_at, last_used_at, completions)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(device_hash) DO UPDATE SET
      last_used_at = excluded.last_used_at,
      completions = usage_devices.completions + 1
  `).bind(deviceHash, timestamp, timestamp);
  const dailyStatement = env.DB.prepare(`
    INSERT INTO usage_daily (day, device_hash, completions)
    VALUES (?, ?, 1)
    ON CONFLICT(day, device_hash) DO UPDATE SET
      completions = usage_daily.completions + 1
  `).bind(day, deviceHash);
  await env.DB.batch([deviceStatement, dailyStatement]);
}

export async function getUsageSummary() {
  const totals = await env.DB.prepare(`
    SELECT COUNT(*) AS unique_devices,
           COALESCE(SUM(completions), 0) AS total_completions,
           MAX(last_used_at) AS latest_use
    FROM usage_devices
  `).first<{ unique_devices: number; total_completions: number; latest_use: number | null }>();

  const recent = await env.DB.prepare(`
    SELECT day,
           COUNT(*) AS active_devices,
           SUM(completions) AS recorded_completions
    FROM usage_daily
    WHERE day >= date('now', '+8 hours', '-6 days')
    GROUP BY day
    ORDER BY day DESC
  `).all<{ day: string; active_devices: number; recorded_completions: number }>();

  return { totals, recent: recent.results };
}
