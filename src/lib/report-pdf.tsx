import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { fmtPct } from "@/lib/rewards";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function fmtMonth(yearMonth: string) {
  const [y, m] = yearMonth.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

const ORANGE = "#f97316";
const GRAY_50 = "#f9fafb";
const GRAY_200 = "#e5e7eb";
const GRAY_500 = "#6b7280";
const GRAY_700 = "#374151";
const GRAY_900 = "#111827";
const GREEN = "#16a34a";
const RED = "#dc2626";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: GRAY_900, padding: 40, paddingBottom: 50 },

  // Header
  header: { marginBottom: 16 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  brand: { fontSize: 11, fontFamily: "Helvetica-Bold", color: ORANGE },
  titleBlock: { alignItems: "flex-end" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GRAY_900 },
  groupBadge: { marginTop: 3, fontSize: 8, color: ORANGE, fontFamily: "Helvetica-Bold" },
  meta: { flexDirection: "row", gap: 16, marginTop: 6 },
  metaItem: { fontSize: 8, color: GRAY_500 },
  metaLabel: { fontFamily: "Helvetica-Bold", color: GRAY_700 },
  statusApproved: { fontSize: 8, color: GREEN, fontFamily: "Helvetica-Bold" },
  statusPending: { fontSize: 8, color: "#d97706", fontFamily: "Helvetica-Bold" },
  divider: { borderBottomWidth: 1, borderBottomColor: GRAY_200, marginBottom: 14 },

  // Summary cards
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  card: { flex: 1, backgroundColor: GRAY_50, borderRadius: 4, padding: 8, borderWidth: 1, borderColor: GRAY_200 },
  cardLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GRAY_500, textTransform: "uppercase", marginBottom: 3 },
  cardValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: GRAY_900 },
  cardDeltaGreen: { fontSize: 9, color: GREEN },
  cardDeltaRed: { fontSize: 9, color: RED },
  cardSub: { fontSize: 7, color: GRAY_500, marginTop: 2 },

  // Movement
  movementBox: { marginBottom: 14, backgroundColor: GRAY_50, borderRadius: 4, padding: 8, borderWidth: 1, borderColor: GRAY_200 },
  movementTitle: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GRAY_500, textTransform: "uppercase", marginBottom: 5 },
  movementRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  movementItem: { fontSize: 8, color: GRAY_700, marginBottom: 2 },
  movementLabel: { fontFamily: "Helvetica-Bold" },

  // Table
  tableHeader: { flexDirection: "row", backgroundColor: ORANGE, paddingVertical: 5, paddingHorizontal: 4, borderRadius: 3, marginBottom: 2 },
  tableHeaderCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#fff" },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: GRAY_200 },
  tableRowAlt: { backgroundColor: GRAY_50 },
  tableCell: { fontSize: 8, color: GRAY_700 },
  tableCellBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY_900 },

  // Footer
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: GRAY_500 },
});

// Column widths (pts, total ~515 usable in A4 portrait with 40pt margins)
const COL = {
  tskId:    55,
  name:     150,
  sessions: 45,
  attended: 45,
  pct:      35,
  sats:     65,
  zar:      65,
};

export type ReportPdfEntry = {
  tskId: string;
  name: string;
  totalEvents: number;
  attended: number;
  percentage: number;
  rewardSats: number;
};

export type ReportPdfProps = {
  month: string;
  group: string | null;
  groupLabel: string;
  status: string;
  generatedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  zarPerSat: number | null;
  recruited: number;
  retired: number;
  totalSessions: number;
  qualifyingParticipants: number;
  avgPercentage: number;
  totalSats: number;
  entries: ReportPdfEntry[];
};

function satsToZar(sats: number, zarPerSat: number): string {
  const zar = sats * zarPerSat;
  return `R ${zar.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ReportPdfDocument({
  month, group, groupLabel, status, generatedBy, approvedBy, approvedAt,
  zarPerSat, recruited, retired,
  totalSessions, qualifyingParticipants, avgPercentage, totalSats,
  entries,
}: ReportPdfProps) {
  const showZar = zarPerSat != null;
  const hasDelta = recruited > 0 || retired > 0;
  const hasMovement = recruited > 0 || retired > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.brand}>THE SURFER KIDS</Text>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{fmtMonth(month)} — Monthly Report</Text>
              {group && <Text style={styles.groupBadge}>{groupLabel.toUpperCase()}</Text>}
            </View>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaItem}>
              <Text style={styles.metaLabel}>Status: </Text>
              {status === "APPROVED"
                ? <Text style={styles.statusApproved}>Approved</Text>
                : <Text style={styles.statusPending}>Pending</Text>
              }
            </Text>
            <Text style={styles.metaItem}><Text style={styles.metaLabel}>Generated by: </Text>{generatedBy}</Text>
            {approvedBy && <Text style={styles.metaItem}><Text style={styles.metaLabel}>Approved by: </Text>{approvedBy}{approvedAt ? ` on ${approvedAt}` : ""}</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          {/* Participants */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Participants</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
              <Text style={styles.cardValue}>{entries.length}</Text>
              {hasDelta && (
                <View style={{ flexDirection: "row", gap: 2 }}>
                  {recruited > 0 && <Text style={styles.cardDeltaGreen}>+{recruited}</Text>}
                  {retired > 0 && <Text style={styles.cardDeltaRed}> −{retired}</Text>}
                </View>
              )}
            </View>
          </View>

          {/* Sessions */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Sessions</Text>
            <Text style={styles.cardValue}>{totalSessions}</Text>
          </View>

          {/* Qualifying */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Qualifying</Text>
            <Text style={styles.cardValue}>{qualifyingParticipants}</Text>
          </View>

          {/* Avg Attendance */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Avg Attendance</Text>
            <Text style={styles.cardValue}>{fmtPct(avgPercentage)}</Text>
          </View>

          {/* Total Rewards */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Rewards</Text>
            <Text style={styles.cardValue}>{totalSats.toLocaleString()}</Text>
            <Text style={styles.cardSub}>
              sats{showZar ? ` · ${satsToZar(totalSats, zarPerSat!)}` : ""}
            </Text>
          </View>
        </View>

        {/* Movement */}
        {hasMovement && (
          <View style={styles.movementBox}>
            <Text style={styles.movementTitle}>Movement</Text>
            <View style={styles.movementRow}>
              <Text style={styles.movementItem}><Text style={styles.movementLabel}>Recruited </Text>{recruited}</Text>
              <Text style={styles.movementItem}><Text style={styles.movementLabel}>Retired </Text>{retired}</Text>
            </View>
          </View>
        )}

        {/* Participant table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: COL.tskId }]}>TSK ID</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.name }]}>Name</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.sessions, textAlign: "right" }]}>Sessions</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.attended, textAlign: "right" }]}>Attended</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.pct, textAlign: "right" }]}>%</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.sats, textAlign: "right" }]}>Reward (sats)</Text>
          {showZar && <Text style={[styles.tableHeaderCell, { width: COL.zar, textAlign: "right" }]}>ZAR</Text>}
        </View>

        {entries.map((e, i) => (
          <View key={e.tskId} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]} wrap={false}>
            <Text style={[styles.tableCell, { width: COL.tskId }]}>{e.tskId}</Text>
            <Text style={[styles.tableCellBold, { width: COL.name }]}>{e.name}</Text>
            <Text style={[styles.tableCell, { width: COL.sessions, textAlign: "right" }]}>{e.totalEvents}</Text>
            <Text style={[styles.tableCell, { width: COL.attended, textAlign: "right" }]}>{e.attended}</Text>
            <Text style={[styles.tableCell, { width: COL.pct, textAlign: "right" }]}>{fmtPct(e.percentage)}</Text>
            <Text style={[styles.tableCell, { width: COL.sats, textAlign: "right" }]}>{e.rewardSats.toLocaleString()}</Text>
            {showZar && (
              <Text style={[styles.tableCell, { width: COL.zar, textAlign: "right" }]}>
                {e.rewardSats > 0 ? satsToZar(e.rewardSats, zarPerSat!) : "—"}
              </Text>
            )}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>The Surfer Kids · tsk.bitcoinekasi.xyz</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
