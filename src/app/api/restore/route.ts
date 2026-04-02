import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import AdmZip from "adm-zip";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const DB_PATH = (process.env.DATABASE_URL ?? "file:/data/tsk.db").replace(/^file:/, "");
const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());

  let zip: AdmZip;
  try {
    zip = new AdmZip(buf);
  } catch {
    return Response.json({ error: "Invalid zip file" }, { status: 400 });
  }

  const entries = zip.getEntries().map((e) => e.entryName);
  if (!entries.includes("tsk.db")) {
    return Response.json({ error: "Zip does not contain tsk.db" }, { status: 400 });
  }

  // Disconnect Prisma before replacing the DB file
  await prisma.$disconnect();

  // Replace database
  const dbEntry = zip.getEntry("tsk.db")!;
  await writeFile(DB_PATH, dbEntry.getData());

  // Replace uploads — wipe existing, write from zip
  await rm(join(UPLOADS_DIR, "participants"), { recursive: true, force: true });
  await mkdir(join(UPLOADS_DIR, "participants"), { recursive: true });

  for (const entry of zip.getEntries()) {
    if (entry.entryName.startsWith("uploads/participants/") && !entry.isDirectory) {
      const filename = entry.entryName.split("/").pop()!;
      await writeFile(join(UPLOADS_DIR, "participants", filename), entry.getData());
    }
  }

  // Force a clean restart so Prisma reconnects with the restored DB
  // Docker will restart the container automatically (restart: unless-stopped)
  setImmediate(() => process.exit(0));

  return Response.json({ ok: true });
}
