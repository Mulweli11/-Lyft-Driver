import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

import ws from "ws";

dotenv.config();

const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log("=== Verification Smoke Test ===");
console.log("Didit API Key present:", !!DIDIT_API_KEY);
console.log("Supabase URL present:", !!SUPABASE_URL);

if (!DIDIT_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

async function testSupabase() {
  console.log("\n1. Testing Supabase connection & driver schema...");
  const { data, error } = await supabase
    .from("drivers")
    .select("id, clerk_id, first_name, last_name, id_verified, licence_verified, passport_verified, didit_session_id")
    .limit(3);

  if (error) {
    console.error("❌ Supabase query failed:", error.message);
    return null;
  }
  console.log("✅ Supabase query succeeded. Drivers found:", data?.length ?? 0);
  if (data && data.length > 0) {
    console.log("   Sample driver:", {
      id: data[0].id,
      clerk_id: data[0].clerk_id,
      id_verified: data[0].id_verified,
      licence_verified: data[0].licence_verified,
      passport_verified: data[0].passport_verified,
    });
    return data[0];
  }
  return null;
}

async function testDiditSessionCreation() {
  console.log("\n2. Testing Didit Session creation (POST https://verification.didit.me/v3/session/)...");
  const res = await fetch("https://verification.didit.me/v3/session/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": DIDIT_API_KEY,
    },
    body: JSON.stringify({
      workflow_id: "57368fe7-f4dc-487f-bebe-981305685d81",
      callback: "myapp://didit-callback",
      metadata: {
        clerkId: "test_clerk_123",
        docType: "national_id",
      },
    }),
  });

  const json = await res.json();
  if (res.ok && json.session_id) {
    console.log("✅ Didit session created:", {
      session_id: json.session_id,
      url: json.url,
      status: json.status,
    });
    return json.session_id;
  } else {
    console.error("❌ Didit session creation failed:", res.status, json);
    return null;
  }
}

async function testNATISLicenceVerification() {
  console.log("\n3. Testing Didit NATIS Driving Licence verification...");
  const res = await fetch("https://verification.didit.me/v3/database-validation/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": DIDIT_API_KEY,
    },
    body: JSON.stringify({
      service_type: "zaf_drivers_license",
      issuing_state: "ZAF",
      parameters: {
        national_id: "9001015009087",
        last_name: "Smith",
        initials: "J",
        licence_number: "DL12345678",
      },
    }),
  });

  const json = await res.json();
  console.log("NATIS Response status:", res.status);
  console.log("NATIS Response payload:", JSON.stringify(json, null, 2));

  if (res.ok) {
    console.log("✅ NATIS Driving Licence verification API call succeeded!");
  } else {
    console.log("ℹ️ NATIS API response:", json);
  }
}

async function testHomeAffairsIDVerification() {
  console.log("\n4. Testing Didit Home Affairs SA ID verification...");
  const res = await fetch("https://verification.didit.me/v3/database-validation/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": DIDIT_API_KEY,
    },
    body: JSON.stringify({
      service_type: "zaf_africa_national_id",
      issuing_state: "ZAF",
      parameters: {
        national_id: "9001015009087",
        first_name: "John",
        last_name: "Smith",
        date_of_birth: "1990-01-01",
      },
    }),
  });

  const json = await res.json();
  console.log("Home Affairs Response status:", res.status);
  console.log("Home Affairs Response payload:", JSON.stringify(json, null, 2));

  if (res.ok) {
    console.log("✅ Home Affairs SA ID verification API call succeeded!");
  } else {
    console.log("ℹ️ Home Affairs API response:", json);
  }
}

async function run() {
  try {
    await testSupabase();
    await testDiditSessionCreation();
    await testNATISLicenceVerification();
    await testHomeAffairsIDVerification();
    console.log("\n🎉 All smoke tests executed successfully!");
  } catch (err) {
    console.error("Test execution failed with error:", err);
  }
}

run();
