import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pidrruwjgbqqvgrujylk.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DATA_DIR = path.join(process.cwd(), "data");
const PHOTOS_FILE = path.join(DATA_DIR, "photos.json");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  return "image/jpeg";
}

async function runMigration() {
  console.log("=== STARTING PHOTO STORAGE MIGRATION ===");
  if (!fs.existsSync(PHOTOS_FILE)) {
    console.log("photos.json does not exist.");
    return;
  }

  const raw = fs.readFileSync(PHOTOS_FILE, "utf-8");
  const photos = JSON.parse(raw);

  console.log(`Loaded ${photos.length} photos from catalogue.`);
  let migratedCount = 0;

  for (const photo of photos) {
    if (photo.image_url && photo.image_url.startsWith("/uploads/")) {
      const filename = photo.image_url.replace(/^\/uploads\//, "");
      const localFilePath = path.join(UPLOADS_DIR, filename);

      console.log(`\nMigrating photo [${photo.id}] "${photo.title}" -> ${filename}...`);
      if (!fs.existsSync(localFilePath)) {
        console.warn(`Local file not found at ${localFilePath}, skipping.`);
        continue;
      }

      const buffer = fs.readFileSync(localFilePath);
      const mimeType = getMimeType(localFilePath);
      const storageKey = `migrated-${filename}`;

      console.log(`Uploading ${storageKey} (${buffer.length} bytes, ${mimeType}) to Supabase 'photos'...`);
      const { data, error } = await supabaseAdmin.storage
        .from("photos")
        .upload(storageKey, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        console.error(`❌ Upload failed for ${filename}:`, error);
        continue;
      }

      const { data: publicUrlData } = supabaseAdmin.storage.from("photos").getPublicUrl(storageKey);
      const publicUrl = publicUrlData.publicUrl;

      // Verify accessibility
      console.log(`Verifying public accessibility: ${publicUrl}`);
      const checkRes = await fetch(publicUrl);
      if (!checkRes.ok) {
        console.error(`❌ Public URL returned HTTP ${checkRes.status}, skipping catalogue update.`);
        continue;
      }

      console.log(`✅ Verified! HTTP ${checkRes.status}. Updating photo record.`);
      photo.image_url = publicUrl;
      migratedCount++;
    }
  }

  if (migratedCount > 0) {
    // Backup before saving
    const backupPath = path.join(DATA_DIR, `photos.pre-migration-${Date.now()}.json`);
    fs.writeFileSync(backupPath, raw, "utf-8");
    console.log(`\nCreated pre-migration backup at ${backupPath}`);

    fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), "utf-8");
    console.log(`✅ Successfully updated ${migratedCount} photo records in photos.json!`);
  } else {
    console.log("\nNo /uploads/ photos required migration.");
  }
}

runMigration().catch(console.error);
