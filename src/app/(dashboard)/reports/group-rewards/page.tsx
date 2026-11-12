import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  buildGroupReport, resolvePeriod, periodLabel, monthsBetween, monthLabel, fmtRate, fmtSurfers,
  REPORT_START_MONTH, REPORT_FOOTNOTES, type ReportRow, type GroupReport,
} from "@/lib/group-report";
import { loadGroupReportInput, latestCompletedMonth } from "@/lib/group-report-data";

function Sats({ n }: { n: number }) {
  return (
    <span className="whitespace-nowrap tabular-nums">
      {n < 0 && "−"}
      <span className="text-orange-500">⚡</span>
      {Math.abs(n).toLocaleString("en-US")}
    </span>
  );
}

function ReportTable({ rows, monthly }: { rows: ReportRow[]; monthly?: boolean }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-800 text-white">
        <tr>
          <th className="px-4 py-2 text-left font-medium">Group</th>
          <th className="px-4 py-2 text-right font-medium">Surfers</th>
          <th className="px-4 py-2 text-right font-medium">{monthly ? "Rewards" : "Total rewards"}</th>
          <th className="px-4 py-2 text-right font-medium">{monthly ? "Spent" : "Total spent"}</th>
          <th className="px-4 py-2 text-right font-medium">{monthly ? "Saved" : "Total saved"}</th>
          <th className="px-4 py-2 text-right font-medium">Save rate</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const all = r.key === "ALL";
          return (
            <tr
              key={r.key}
              className={all ? "border-t-2 border-gray-800 bg-orange-50 font-bold" : i % 2 ? "bg-gray-50" : "bg-white"}
            >
              <td className="px-4 py-2">{r.label}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmtSurfers(r)}</td>
              <td className="px-4 py-2 text-right"><Sats n={r.rewards} /></td>
              <td className="px-4 py-2 text-right"><Sats n={r.spent} /></td>
              <td className="px-4 py-2 text-right"><Sats n={r.saved} /></td>
              <td className={`px-4 py-2 text-right tabular-nums ${r.saveRate !== null && r.saveRate < 0 ? "text-red-600" : ""}`}>{fmtRate(r.saveRate)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default async function GroupRewardsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") redirect("/dashboard");

  const latest = latestCompletedMonth();
  const params = await searchParams;
  const { from, to } = resolvePeriod(params.from, params.to, latest);
  const options = monthsBetween(REPORT_START_MONTH, latest < REPORT_START_MONTH ? REPORT_START_MONTH : latest).reverse();

  let report: GroupReport | null = null;
  let error = "";
  try {
    report = buildGroupReport(await loadGroupReportInput(from, to));
  } catch (err) {
    console.error("[group-rewards] failed:", err);
    error = err instanceof Error ? err.message : "Failed to build the report";
  }

  const qs = `from=${from}&to=${to}`;
  const select = "rounded-md border border-gray-300 px-2 py-1.5 text-sm";

  return (
    <div className="max-w-5xl">
      <Link href="/reports" className="text-sm text-orange-600 hover:underline">← Monthly Rewards</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Group rewards, spending &amp; savings</h2>
          <p className="mt-1 text-sm text-gray-500">How much each group was rewarded, spent and saved, by month. For sponsor and donor reporting.</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/reports/group-rewards/pdf?${qs}`} className="rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700">⬇ PDF</a>
          <a href={`/api/reports/group-rewards/csv?${qs}`} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">⬇ CSV</a>
        </div>
      </div>

      <form className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-700">
        From
        <select name="from" defaultValue={from} className={select}>
          {options.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        to
        <select name="to" defaultValue={to} className={select}>
          {options.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <button type="submit" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium hover:bg-gray-50">Show</button>
        <span className="text-xs text-gray-400">Reporting starts {monthLabel(REPORT_START_MONTH)}.</span>
      </form>

      {error && <div className="mt-6 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Couldn&apos;t build the report: {error}</div>}

      {report && (
        <>
          <h3 className="mt-6 text-lg font-semibold text-gray-900">
            Rewards, spending and savings by group, {periodLabel(from, to)} (totals)
          </h3>
          <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
            <ReportTable rows={report.totals} />
          </div>
          <ul className="mt-3 space-y-0.5 text-xs text-gray-500">
            {REPORT_FOOTNOTES.map((f) => <li key={f}>{f}</li>)}
          </ul>

          <h3 className="mt-8 text-lg font-semibold text-gray-900">Monthly breakdown</h3>
          {report.monthly.map((m) => (
            <div key={m.month} className="mt-4">
              <h4 className="mb-1 text-sm font-semibold text-gray-700">{monthLabel(m.month)}</h4>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <ReportTable rows={m.rows} monthly />
              </div>
            </div>
          ))}

          <details className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-900">
              Data quality ({report.dataQuality.length === 0 ? "nothing to note" : `${report.dataQuality.length} note${report.dataQuality.length === 1 ? "" : "s"}`})
            </summary>
            <div className="mt-3 space-y-4 text-sm">
              {report.dataQuality.length === 0 && <p className="text-gray-500">Nothing affected these figures.</p>}
              {report.dataQuality.map((d) => (
                <div key={d.kind}>
                  <p className="font-medium text-gray-800">{d.title}</p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-gray-600">
                    {d.items.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </>
      )}
    </div>
  );
}
