import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import AdmZip from "adm-zip";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const DB_PATH = (process.env.DATABASE_URL ?? "file:/data/tsk.db").replace(/^file:/, "");
const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

async function addDirToZip(zip: AdmZip, dir: string, zipPath: string) {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return; // dir doesn't exist yet
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    try {
      const buf = await readFile(full);
      zip.addFile(`${zipPath}/${entry}`, buf);
    } catch {
      // skip subdirectories or unreadable files
    }
  }
}

export async function GET() {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Flush WAL so the DB file is consistent
  await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");

  const zip = new AdmZip();

  // Add database
  try {
    const dbBuf = await readFile(DB_PATH);
    zip.addFile("tsk.db", dbBuf);
  } catch {
    return Response.json({ error: "Could not read database" }, { status: 500 });
  }

  // Add uploads (flat — participants/ subdir)
  await addDirToZip(zip, join(UPLOADS_DIR, "participants"), "uploads/participants");

  const buf = zip.toBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new Response(buf, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="tsk-backup-${date}.zip"`,
      "Content-Length": String(buf.length),
    },
  });
}
