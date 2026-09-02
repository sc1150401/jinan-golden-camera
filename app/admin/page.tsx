import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { getUsageSummary } from "@/db/usage";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
const ADMIN_EMAILS = new Set(["monica891101@gmail.com"]);

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  if (!ADMIN_EMAILS.has(user.email.toLowerCase())) notFound();
  const { totals, recent } = await getUsageSummary();
  const latest = totals?.latest_use ? new Date(totals.latest_use * 1000).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) : "尚無紀錄";

  return <main className="admin-page">
    <section className="admin-panel">
      <header className="admin-header">
        <div><p className="eyebrow">2026 SAFETY GOLD AWARD</p><h1>匿名使用統計</h1></div>
        <a href={chatGPTSignOutPath("/")}>登出</a>
      </header>
      <p className="admin-note">僅統計完成拍貼的次數與約略不重複裝置數；沒有任何照片、姓名或相機畫面。</p>
      <div className="stat-grid">
        <article><span>完成拍貼</span><strong>{totals?.total_completions ?? 0}</strong><small>次</small></article>
        <article><span>不重複裝置</span><strong>{totals?.unique_devices ?? 0}</strong><small>台（約略人次）</small></article>
      </div>
      <p className="latest-use">最近使用：{latest}</p>
      <h2>近 7 日活動</h2>
      {recent.length === 0 ? <p className="empty-stats">目前還沒有完成紀錄。</p> : <div className="stats-table-wrap"><table className="stats-table">
        <thead><tr><th>日期</th><th>活躍裝置</th><th>累計完成數</th></tr></thead>
        <tbody>{recent.map((row) => <tr key={row.day}><td>{row.day}</td><td>{row.active_devices}</td><td>{row.recorded_completions}</td></tr>)}</tbody>
      </table></div>}
      <a className="back-link" href="/">返回拍貼相機</a>
    </section>
  </main>;
}
