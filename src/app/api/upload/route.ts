import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are allowed" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 2MB" },
        { status: 400 },
      );
    }

    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads", "participants");

    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    await writeFile(join(uploadDir, filename), Buffer.from(bytes));

    return NextResponse.json({ path: `/uploads/participants/${filename}` });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
