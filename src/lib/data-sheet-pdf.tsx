import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const ORANGE = "#f97316";
const GRAY_50 = "#f9fafb";
const GRAY_200 = "#e5e7eb";
const GRAY_500 = "#6b7280";
const GRAY_700 = "#374151";
const GRAY_900 = "#111827";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: GRAY_900, padding: 30, paddingBottom: 40 },

  header: { marginBottom: 14 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  brand: { fontSize: 11, fontFamily: "Helvetica-Bold", color: ORANGE },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GRAY_900 },
  meta: { flexDirection: "row", gap: 16, marginTop: 6 },
  metaItem: { fontSize: 8, color: GRAY_500 },
  metaLabel: { fontFamily: "Helvetica-Bold", color: GRAY_700 },
  divider: { borderBottomWidth: 1, borderBottomColor: GRAY_200, marginBottom: 14 },

  tableHeader: { flexDirection: "row", backgroundColor: ORANGE, paddingVertical: 5, paddingHorizontal: 4, borderRadius: 3, marginBottom: 2, gap: 8 },
  tableHeaderCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#fff" },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: GRAY_200, gap: 8 },
  tableRowAlt: { backgroundColor: GRAY_50 },
  tableCell: { fontSize: 8, color: GRAY_700 },
  tableCellBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY_900 },

  footer: { position: "absolute", bottom: 20, left: 30, right: 30, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: GRAY_500 },
});

const COL = {
  tskId: 46,
  name: 128,
  age: 26,
  gender: 36,
  group: 54,
  weight: 56,
  height: 58,
  tshirt: 56,
  shoe: 70,
  wetsuit: 54,
  updated: 56,
};

export type BodyMeasurementsPdfEntry = {
  tskId: string;
  name: string;
  age: number;
  gender: string;
  group: string | null;
  weightKg: number | null;
  heightCm: number | null;
  tshirtSize: string | null;
  shoeSize: string | null;
  wetsuiteSize: string | null;
  updatedAt: string | null;
};

function cell(v: string | number | null): string {
  return v === null || v === "" ? "—" : String(v);
}

export function BodyMeasurementsPdfDocument({ generatedAt, entries }: { generatedAt: string; entries: BodyMeasurementsPdfEntry[] }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.brand}>THE SURFER KIDS</Text>
            <Text style={styles.title}>Body Measurements</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaItem}><Text style={styles.metaLabel}>Generated: </Text>{generatedAt}</Text>
            <Text style={styles.metaItem}><Text style={styles.metaLabel}>Participants: </Text>{entries.length}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: COL.tskId }]}>TSK ID</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.name }]}>Name</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.age, textAlign: "right" }]}>Age</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.gender }]}>Gender</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.group }]}>Group</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.weight, textAlign: "right" }]}>Weight (kg)</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.height, textAlign: "right" }]}>Height (cm)</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.tshirt }]}>T-Shirt</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.shoe }]}>Shoe (UK)</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.wetsuit }]}>Wetsuit</Text>
          <Text style={[styles.tableHeaderCell, { width: COL.updated }]}>Last Updated</Text>
        </View>

        {entries.map((e, i) => (
          <View key={e.tskId} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]} wrap={false}>
            <Text style={[styles.tableCell, { width: COL.tskId }]}>{e.tskId}</Text>
            <Text style={[styles.tableCellBold, { width: COL.name }]}>{e.name}</Text>
            <Text style={[styles.tableCell, { width: COL.age, textAlign: "right" }]}>{e.age}</Text>
            <Text style={[styles.tableCell, { width: COL.gender }]}>{e.gender}</Text>
            <Text style={[styles.tableCell, { width: COL.group }]}>{cell(e.group)}</Text>
            <Text style={[styles.tableCell, { width: COL.weight, textAlign: "right" }]}>{cell(e.weightKg)}</Text>
            <Text style={[styles.tableCell, { width: COL.height, textAlign: "right" }]}>{cell(e.heightCm)}</Text>
            <Text style={[styles.tableCell, { width: COL.tshirt }]}>{cell(e.tshirtSize)}</Text>
            <Text style={[styles.tableCell, { width: COL.shoe }]}>{cell(e.shoeSize)}</Text>
            <Text style={[styles.tableCell, { width: COL.wetsuit }]}>{cell(e.wetsuiteSize)}</Text>
            <Text style={[styles.tableCell, { width: COL.updated }]}>{cell(e.updatedAt)}</Text>
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

export type ShoeRollupPdfRow = {
  label: string;
  counts: Record<string, number>;
  total: number;
};

export type ShoeRollupPdfData = {
  columns: string[];
  rows: ShoeRollupPdfRow[];
  columnTotals: Record<string, number>;
  grandTotal: number;
};

const rollupStyles = StyleSheet.create({
  groupCol: { width: 70 },
  countCol: { width: 37 },
  totalRow: { backgroundColor: GRAY_50, borderTopWidth: 2, borderTopColor: GRAY_200 },
});

function countCell(n: number): string {
  return n > 0 ? String(n) : "—";
}

export function ShoeRollupPdfDocument({ generatedAt, data }: { generatedAt: string; data: ShoeRollupPdfData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.brand}>THE SURFER KIDS</Text>
            <Text style={styles.title}>Shoe Size Roll-up</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaItem}><Text style={styles.metaLabel}>Generated: </Text>{generatedAt}</Text>
            <Text style={styles.metaItem}><Text style={styles.metaLabel}>Participants: </Text>{data.grandTotal}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, rollupStyles.groupCol]}>Group</Text>
          {data.columns.map((c) => (
            <Text key={c} style={[styles.tableHeaderCell, rollupStyles.countCol, { textAlign: "right" }]}>{c}</Text>
          ))}
          <Text style={[styles.tableHeaderCell, rollupStyles.countCol, { textAlign: "right" }]}>Total</Text>
        </View>

        {data.rows.map((row, i) => (
          <View key={row.label} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]} wrap={false}>
            <Text style={[styles.tableCellBold, rollupStyles.groupCol]}>{row.label}</Text>
            {data.columns.map((c) => (
              <Text key={c} style={[styles.tableCell, rollupStyles.countCol, { textAlign: "right" }]}>{countCell(row.counts[c] ?? 0)}</Text>
            ))}
            <Text style={[styles.tableCellBold, rollupStyles.countCol, { textAlign: "right" }]}>{row.total}</Text>
          </View>
        ))}

        <View style={[styles.tableRow, rollupStyles.totalRow]} wrap={false}>
          <Text style={[styles.tableCellBold, rollupStyles.groupCol]}>Total</Text>
          {data.columns.map((c) => (
            <Text key={c} style={[styles.tableCellBold, rollupStyles.countCol, { textAlign: "right" }]}>{countCell(data.columnTotals[c] ?? 0)}</Text>
          ))}
          <Text style={[styles.tableCellBold, rollupStyles.countCol, { textAlign: "right" }]}>{data.grandTotal}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>The Surfer Kids · tsk.bitcoinekasi.xyz</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
