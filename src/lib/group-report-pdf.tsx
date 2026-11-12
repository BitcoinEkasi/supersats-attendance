import React from "react";
import { Document, Page, View, Text, StyleSheet, Svg, Path } from "@react-pdf/renderer";
import { fmtRate, fmtSurfers, monthLabel, periodLabel, REPORT_FOOTNOTES, type GroupReport, type ReportRow } from "@/lib/group-report";

const ORANGE = "#ea580c";
const DARK = "#1f2937";
const GRAY_50 = "#f9fafb";
const GRAY_200 = "#e5e7eb";
const GRAY_500 = "#6b7280";
const GRAY_700 = "#374151";
const RED = "#dc2626";
const TOTAL_BG = "#fff7ed";

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9, fontFamily: "Helvetica", color: GRAY_700 },
  brand: { fontSize: 8, color: ORANGE, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  h1: { fontSize: 14, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 4 },
  meta: { fontSize: 8, color: GRAY_500, marginBottom: 14 },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 10 },
  h3: { fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 4 },
  table: { marginBottom: 16 },
  headRow: { flexDirection: "row", backgroundColor: DARK, paddingVertical: 5, paddingHorizontal: 6 },
  headCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  row: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: GRAY_200, alignItems: "center" },
  zebra: { backgroundColor: GRAY_50 },
  totalRow: { backgroundColor: TOTAL_BG, borderTopWidth: 1.5, borderTopColor: DARK },
  cell: { fontSize: 9 },
  bold: { fontFamily: "Helvetica-Bold", color: DARK },
  num: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  foot: { fontSize: 7.5, color: GRAY_500, marginBottom: 2 },
  pageNo: { position: "absolute", bottom: 24, right: 40, fontSize: 7, color: GRAY_500 },
});

/** The built-in PDF fonts (WinAnsi) have no "−" or "÷": use plain ASCII so nothing is silently dropped. */
const pdfSafe = (t: string) => t.replace(/−/g, "-").replace(/÷/g, "/");

const W = { group: "26%", surfers: "12%", sats: "17%", rate: "11%" };

function Bolt() {
  return (
    <Svg width={6} height={8} viewBox="0 0 12 16" style={{ marginRight: 1 }}>
      <Path d="M7 0 L0 9 H5 L4 16 L12 6 H7 Z" fill={ORANGE} />
    </Svg>
  );
}

function SatsCell({ n, bold, width }: { n: number; bold?: boolean; width: string }) {
  return (
    <View style={[s.num, { width }]}>
      {n < 0 && <Text style={[s.cell, bold ? s.bold : {}]}>-</Text>}
      <Bolt />
      <Text style={[s.cell, bold ? s.bold : {}]}>{Math.abs(n).toLocaleString("en-US")}</Text>
    </View>
  );
}

function Table({ rows, monthly }: { rows: ReportRow[]; monthly?: boolean }) {
  return (
    <View style={s.table} wrap={false}>
      <View style={s.headRow}>
        <Text style={[s.headCell, { width: W.group }]}>Group</Text>
        <Text style={[s.headCell, { width: W.surfers, textAlign: "right" }]}>Surfers</Text>
        <Text style={[s.headCell, { width: W.sats, textAlign: "right" }]}>{monthly ? "Rewards" : "Total rewards"}</Text>
        <Text style={[s.headCell, { width: W.sats, textAlign: "right" }]}>{monthly ? "Spent" : "Total spent"}</Text>
        <Text style={[s.headCell, { width: W.sats, textAlign: "right" }]}>{monthly ? "Saved" : "Total saved"}</Text>
        <Text style={[s.headCell, { width: W.rate, textAlign: "right" }]}>Save rate</Text>
      </View>
      {rows.map((r, i) => {
        const all = r.key === "ALL";
        return (
          <View key={r.key} style={[s.row, all ? s.totalRow : i % 2 ? s.zebra : {}]}>
            <Text style={[s.cell, { width: W.group }, all ? s.bold : {}]}>{r.label}</Text>
            <Text style={[s.cell, { width: W.surfers, textAlign: "right" }, all ? s.bold : {}]}>{fmtSurfers(r)}</Text>
            <SatsCell n={r.rewards} bold={all} width={W.sats} />
            <SatsCell n={r.spent} bold={all} width={W.sats} />
            <SatsCell n={r.saved} bold={all} width={W.sats} />
            <Text style={[s.cell, { width: W.rate, textAlign: "right", color: r.saveRate !== null && r.saveRate < 0 ? RED : undefined }, all ? s.bold : {}]}>
              {pdfSafe(fmtRate(r.saveRate))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const PageNo = () => <Text style={s.pageNo} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />;

export function GroupReportPdf({ report, from, to, generatedAt }: { report: GroupReport; from: string; to: string; generatedAt: string }) {
  // The ⚡ glyph isn't in the built-in PDF fonts, so footnotes spell it out; amounts use the vector bolt.
  const footnotes = REPORT_FOOTNOTES.map((f) => pdfSafe(f.replace("⚡ = sats", "The bolt symbol = sats")));
  return (
    <Document title={`SuperSats rewards by group, ${periodLabel(from, to)}`} author="The Surfer Kids">
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>SuperSats · The Surfer Kids</Text>
        <Text style={s.h1}>{pdfSafe(`Rewards, spending and savings by group, ${periodLabel(from, to)} (totals)`)}</Text>
        <Text style={s.meta}>Generated {generatedAt} SAST</Text>
        <Table rows={report.totals} />
        {footnotes.map((f) => <Text key={f} style={s.foot}>{f}</Text>)}
        <PageNo />
      </Page>
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Monthly breakdown</Text>
        {report.monthly.map((m) => (
          <View key={m.month} wrap={false}>
            <Text style={s.h3}>{monthLabel(m.month)}</Text>
            <Table rows={m.rows} monthly />
          </View>
        ))}
        <PageNo />
      </Page>
    </Document>
  );
}
