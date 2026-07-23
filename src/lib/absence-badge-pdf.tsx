import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { AbsenceBadgeEntry } from "@/lib/absence-badges";

const ORANGE = "#f97316";
const GRAY_50 = "#f9fafb";
const GRAY_200 = "#e5e7eb";
const GRAY_500 = "#6b7280";
const GRAY_700 = "#374151";
const GRAY_900 = "#111827";
const RED = "#dc2626";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: GRAY_900, padding: 32, paddingBottom: 44 },

  header: { marginBottom: 12 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { fontSize: 11, fontFamily: "Helvetica-Bold", color: ORANGE },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GRAY_900 },
  meta: { fontSize: 8, color: GRAY_500, marginTop: 4 },
  divider: { borderBottomWidth: 1, borderBottomColor: GRAY_200, marginTop: 10, marginBottom: 12 },

  groupHeader: { backgroundColor: "#fff7ed", borderRadius: 3, paddingVertical: 4, paddingHorizontal: 6, marginTop: 10, marginBottom: 6 },
  groupHeaderText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#c2410c", textTransform: "uppercase" },

  badge: { flexDirection: "row", gap: 10, borderWidth: 1, borderColor: GRAY_200, borderRadius: 4, padding: 8, marginBottom: 6, backgroundColor: "#fff" },
  photo: { width: 52, height: 52, borderRadius: 26, objectFit: "cover" },
  photoFallback: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#ffedd5", alignItems: "center", justifyContent: "center" },
  photoFallbackText: { fontSize: 18, fontFamily: "Helvetica-Bold", color: ORANGE },

  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GRAY_900 },
  missedChip: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#fff", backgroundColor: RED, borderRadius: 8, paddingVertical: 1, paddingHorizontal: 6 },
  line: { fontSize: 8, color: GRAY_700 },
  lineRetired: { fontSize: 8, color: RED },
  lineMuted: { fontSize: 8, color: GRAY_500 },

  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: GRAY_500 },
});

export type AbsenceBadgeGroup = { group: string | null; label: string; entries: AbsenceBadgeEntry[] };

export function AbsenceBadgeDocument({ generatedAt, groups }: { generatedAt: string; groups: AbsenceBadgeGroup[] }) {
  const total = groups.reduce((sum, g) => sum + g.entries.length, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.brand}>THE SURFER KIDS</Text>
            <Text style={styles.title}>Absence Alert Badges</Text>
          </View>
          <Text style={styles.meta}>{total} flagged · generated {generatedAt}</Text>
        </View>
        <View style={styles.divider} />

        {groups.map((g) => (
          <View key={g.group ?? "unassigned"}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupHeaderText}>{g.label} — {g.entries.length} flagged</Text>
            </View>
            {g.entries.map((e) => (
              <View key={e.participantId} style={styles.badge} wrap={false}>
                {e.photoDataUri ? (
                  <Image src={e.photoDataUri} style={styles.photo} />
                ) : (
                  <View style={styles.photoFallback}>
                    <Text style={styles.photoFallbackText}>{e.initial}</Text>
                  </View>
                )}
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{e.name}</Text>
                    <Text style={styles.missedChip}>{e.consecutiveMissed} missed</Text>
                  </View>
                  <Text style={styles.line}>{e.levelLine}</Text>
                  <Text style={styles.line}>{e.bornLine}</Text>
                  <Text style={e.tenureIsRetired ? styles.lineRetired : styles.line}>{e.tenureLine}</Text>
                  {e.contactLine && <Text style={styles.line}>{e.contactLine}</Text>}
                  {e.trendLine && <Text style={styles.lineMuted}>{e.trendLine}</Text>}
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>The Surfer Kids · tsk.bitcoinekasi.xyz</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
