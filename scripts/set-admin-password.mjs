#!/usr/bin/env node

/**
 * Server-side script using Supabase Auth Admin API updateUserById()
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY="your-key" node scripts/set-admin-password.mjs "<new_password>"
 *
 * Or pass key as second argument:
 *   node scripts/set-admin-password.mjs "<new_password>" "<service_role_key>"
 */

import { createClient } from "@supabase/supabase-js";

const TARGET_ADMIN_UID = "eec3ccb4-bdf7-4b8c-b8a1-573047115069";
const TARGET_ADMIN_EMAIL = "aarvifanedits@gmail.com";

const fs = await import("fs");

let newPassword = process.argv[2]?.trim();

// Support reading password from a temporary local file or environment variable if passed via stdin
if (!newPassword && process.env.ADMIN_NEW_PASSWORD) {
  newPassword = process.env.ADMIN_NEW_PASSWORD.trim();
} else if (newPassword && newPassword.startsWith("@")) {
  const filePath = newPassword.slice(1);
  if (fs.existsSync(filePath)) {
    newPassword = fs.readFileSync(filePath, "utf-8").trim();
  }
}
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[3] || "").trim();

function isNewSupabaseApiKey(value) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey) {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const supabaseUrl = "https://pidrruwjgbqqvgrujylk.supabase.co";

if (!newPassword || newPassword.length < 6) {
  console.error("❌ Error: Please provide a password of at least 6 characters.");
  console.error(
    'Usage: SUPABASE_SERVICE_ROLE_KEY="<key>" node scripts/set-admin-password.mjs "<new_password>"',
  );
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("❌ Error: Missing Supabase service-role/secret key.");
  console.error(
    'Usage: SUPABASE_SERVICE_ROLE_KEY="<key>" node scripts/set-admin-password.mjs "<new_password>"',
  );
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  global: {
    fetch: createSupabaseFetch(serviceRoleKey),
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function run() {
  console.log(
    `Setting password via Auth Admin updateUserById() for ${TARGET_ADMIN_EMAIL} (${TARGET_ADMIN_UID})...`,
  );

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(TARGET_ADMIN_UID, {
    password: newPassword,
    email_confirm: true,
  });

  if (error || !data.user) {
    console.error("❌ Failed to update user password:", error?.message || error);
    process.exit(1);
  }

  console.log("✅ Success! Password has been updated for:", data.user.email);
  console.log("   UID:", data.user.id);
  console.log("   Confirmed at:", data.user.email_confirmed_at);
}

run().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
