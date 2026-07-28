// ─────────────────────────────────────────────────────────────────────────────
// Verification: picking, uploading and submitting identity documents.
//
// Documents are personal information under POPIA, so they go into a PRIVATE
// Supabase bucket. Nothing here ever produces a public URL — reads go through
// short-lived signed URLs instead.
//
// Requires:  npx expo install expo-image-picker
// ─────────────────────────────────────────────────────────────────────────────

// Base64 to bytes, written out rather than pulled from a package. Supabase
// Storage needs an ArrayBuffer, and React Native has no atob(). One small
// function beats another dependency to install.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decode(base64: string): ArrayBuffer {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const length = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(length);

  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]);
    const b = B64.indexOf(clean[i + 1]);
    const c = B64.indexOf(clean[i + 2]);
    const d = B64.indexOf(clean[i + 3]);

    const chunk = (a << 18) | (b << 12) | ((c & 63) << 6) | (d & 63);

    if (byteIndex < length) bytes[byteIndex++] = (chunk >> 16) & 255;
    if (byteIndex < length) bytes[byteIndex++] = (chunk >> 8) & 255;
    if (byteIndex < length) bytes[byteIndex++] = chunk & 255;
  }

  return bytes.buffer;
}

import * as ImagePicker from "expo-image-picker";

import { fetchAPI } from "@/lib/fetch";
import { getSupabaseClient } from "@/lib/supabase";

export const BUCKET = "verification-documents";

export type DocKind =
  // Everyone
  | "id_front"
  | "id_back"
  | "selfie"
  // Drivers only
  | "licence"
  | "pdp"
  | "vehicle_registration"
  | "roadworthy"
  | "insurance"
  | "vehicle_photo";

/** Documents that carry an expiry date a reviewer must check. */
export const EXPIRING_DOCS: DocKind[] = [
  "licence",
  "pdp",
  "roadworthy",
  "insurance",
];

export type VerificationStatus =
  | "not_submitted"
  | "pending"
  | "approved"
  | "rejected";

export type PickedImage = {
  uri: string;
  base64: string;
  mimeType: string;
};

/** Human labels, kept in one place so the screen and any emails agree. */
export const DOC_LABELS: Record<DocKind, { title: string; help: string }> = {
  id_front: {
    title: "ID document",
    help: "The front of your SA ID card, or the photo page of your passport.",
  },
  id_back: {
    title: "Back of ID",
    help: "The reverse of your ID card. Skip this if you uploaded a passport.",
  },
  selfie: {
    title: "Selfie",
    help: "A clear photo of your face in good light, no hat or sunglasses.",
  },
  licence: {
    title: "Driving licence",
    help: "Both sides of your card licence. The expiry date must be readable.",
  },
  pdp: {
    title: "Professional Driving Permit",
    help: "Required by law to carry passengers for reward in South Africa.",
  },
  vehicle_registration: {
    title: "Vehicle licence disc",
    help: "The current disc on your windscreen, showing the registration number.",
  },
  roadworthy: {
    title: "Roadworthy certificate",
    help: "Proof the vehicle passed its roadworthy test.",
  },
  insurance: {
    title: "Insurance certificate",
    help: "Your current policy schedule, showing the insured vehicle.",
  },
  vehicle_photo: {
    title: "Photo of your car",
    help: "Taken from the front at an angle, with the number plate visible.",
  },
};

// ─── Picking ─────────────────────────────────────────────────────────────────

async function toPickedImage(
  result: ImagePicker.ImagePickerResult,
): Promise<PickedImage | null> {
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  if (!asset.base64) return null;

  return {
    uri: asset.uri,
    base64: asset.base64,
    mimeType: asset.mimeType ?? "image/jpeg",
  };
}

/** Choose a document image from the photo library. */
export async function pickFromLibrary(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      "Photo access is off. Turn it on in Settings to upload your document.",
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"], // MediaTypeOptions is deprecated in SDK 52+
    allowsEditing: true,
    quality: 0.7,
    base64: true,
  });

  return toPickedImage(result);
}

/** Take a photo. Pass front: true for the selfie step. */
export async function captureImage(front = false): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      "Camera access is off. Turn it on in Settings to take your photo.",
    );
  }

  const result = await ImagePicker.launchCameraAsync({
    cameraType: front
      ? ImagePicker.CameraType.front
      : ImagePicker.CameraType.back,
    allowsEditing: true,
    quality: 0.7,
    base64: true,
  });

  return toPickedImage(result);
}

// ─── Uploading ───────────────────────────────────────────────────────────────

/**
 * Upload one document and return its storage path (not a URL).
 * Paths are namespaced per user so a storage policy can restrict access.
 */
export async function uploadDocument(
  clerkId: string,
  kind: DocKind,
  image: PickedImage,
): Promise<string> {
  const supabase = getSupabaseClient();

  const extension = image.mimeType.includes("png") ? "png" : "jpg";
  const path = `${clerkId}/${kind}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(image.base64), {
      contentType: image.mimeType,
      upsert: false,
    });

  if (error) {
    console.error("Document upload failed:", error);
    throw new Error("We couldn't upload that image. Check your connection and try again.");
  }

  return path;
}

/**
 * Short-lived read URL for a stored document. Never store the result — it
 * expires, and caching it defeats the point of a private bucket.
 */
export async function getSignedUrl(
  path: string,
  expiresInSeconds = 60,
): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    console.warn("Could not sign document URL:", error);
    return null;
  }

  return data?.signedUrl ?? null;
}

// ─── Submitting ──────────────────────────────────────────────────────────────

export type VerificationPayload = {
  government_id_url?: string;
  government_id_back_url?: string;
  selfie_image_url?: string;
  /** Derived from the ID number itself, so it can't disagree with the document. */
  id_number?: string;
  date_of_birth?: string;
  id_citizenship?: string;
  /** Anything the automatic checks flagged, for the reviewer to look at. */
  verification_warnings?: string[];
};

/**
 * Save the uploaded paths and move the account into review.
 * Uses the existing /(api)/profile endpoint — no new backend needed beyond
 * accepting these columns.
 */
export async function submitForReview(
  clerkId: string,
  paths: VerificationPayload,
) {
  return fetchAPI("/(api)/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clerkId,
      ...paths,
      verification_status: "pending",
      verification_submitted_at: new Date().toISOString(),
    }),
  });
}

// ─── Avatars ─────────────────────────────────────────────────────────────────
// Profile photos are shown to drivers and other riders, so unlike ID documents
// these live in a PUBLIC bucket called `avatars`.

export async function uploadAvatar(
  clerkId: string,
  image: PickedImage,
): Promise<string> {
  const supabase = getSupabaseClient();

  const extension = image.mimeType.includes("png") ? "png" : "jpg";
  const path = `${clerkId}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, decode(image.base64), {
      contentType: image.mimeType,
      upsert: true,
    });

  if (error) {
    console.error("Avatar upload failed:", error);
    throw new Error("We couldn't upload that photo. Please try again.");
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Progress ────────────────────────────────────────────────────────────────

/** Percentage complete, counting each requirement independently. */
export function verificationProgress(flags: {
  photo: boolean;
  phone: boolean;
  id: boolean;
  selfie: boolean;
}) {
  const done = Object.values(flags).filter(Boolean).length;
  return Math.round((done / 4) * 100);
}