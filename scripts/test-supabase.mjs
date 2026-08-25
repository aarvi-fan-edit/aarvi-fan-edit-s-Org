import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pidrruwjgbqqvgrujylk.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const testFileName = `test-migration-${Date.now()}.jpg`;
  // 1x1 pixel JPEG
  const testJpeg = Buffer.from(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
    "base64"
  );

  console.log("Uploading test JPEG to 'photos' bucket...");
  const { data: uploadData, error: upErr } = await supabaseAdmin.storage
    .from("photos")
    .upload(testFileName, testJpeg, {
      contentType: "image/jpeg",
      upsert: true,
    });
  console.log("Upload result:", uploadData, "Upload error:", upErr);

  const { data: publicUrlData } = supabaseAdmin.storage.from("photos").getPublicUrl(testFileName);
  console.log("Public URL:", publicUrlData.publicUrl);

  const publicFetchRes = await fetch(publicUrlData.publicUrl);
  console.log("Public fetch status:", publicFetchRes.status, "Content-Length:", publicFetchRes.headers.get("content-length"));

  console.log("Cleaning up test file...");
  const { data: removeData, error: rmErr } = await supabaseAdmin.storage
    .from("photos")
    .remove([testFileName]);
  console.log("Remove result:", removeData, "Remove error:", rmErr);
}

main();
