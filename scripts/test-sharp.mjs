import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pidrruwjgbqqvgrujylk.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testSharpAndUpload() {
  console.log("Testing sharp image processing...");
  // Create a 1200x800 sample test image using sharp
  const testBuffer = await sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 4,
      background: { r: 40, g: 45, b: 55, alpha: 1 },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();

  const meta = await sharp(testBuffer).metadata();
  console.log("Image metadata:", { width: meta.width, height: meta.height, format: meta.format });

  // Generate thumbnail
  const thumbBuffer = await sharp(testBuffer)
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  console.log(`Original size: ${testBuffer.length} bytes, Thumbnail size: ${thumbBuffer.length} bytes`);

  const fileKey = `test-sharp-${Date.now()}.jpg`;
  const thumbKey = `test-sharp-thumb-${Date.now()}.webp`;

  // Upload main image
  const { error: upErr } = await supabaseAdmin.storage.from("photos").upload(fileKey, testBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });
  console.log("Main image upload err:", upErr);

  // Upload thumbnail
  const { error: thumbErr } = await supabaseAdmin.storage.from("photos").upload(thumbKey, thumbBuffer, {
    contentType: "image/webp",
    upsert: true,
  });
  console.log("Thumbnail upload err:", thumbErr);

  const mainUrl = supabaseAdmin.storage.from("photos").getPublicUrl(fileKey).data.publicUrl;
  const thumbUrl = supabaseAdmin.storage.from("photos").getPublicUrl(thumbKey).data.publicUrl;

  console.log("Main URL:", mainUrl);
  console.log("Thumb URL:", thumbUrl);

  const r1 = await fetch(mainUrl);
  const r2 = await fetch(thumbUrl);
  console.log("Main fetch HTTP:", r1.status, "Thumb fetch HTTP:", r2.status);

  // Clean up
  await supabaseAdmin.storage.from("photos").remove([fileKey, thumbKey]);
  console.log("Cleaned up test objects.");
}

testSharpAndUpload().catch(console.error);
