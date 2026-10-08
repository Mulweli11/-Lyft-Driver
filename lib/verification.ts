// ─────────────────────────────────────────────────────────────────────────────
// Verification: picking, uploading and submitting identity documents.
// ─────────────────────────────────────────────────────────────────────────────

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
  | "id_front"
  | "id_back"
  | "selfie"
  | "licence"
  | "pdp"
  | "vehicle_registration"
  | "roadworthy"
  | "insurance"
  | "vehicle_photo";

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

export type AutomatedDocStatus =
  | "verified"
  | "pending_review"
  | "failed"
  | "expired"
  | "mismatch";

export type PickedImage = {
  uri: string;
  base64?: string;
  mimeType: string;
  fileSize?: number;
};

// Security constants for zero-trust document uploads
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 Megabytes max
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export function validateDocumentSecurity(image: PickedImage): void {
  if (image.mimeType && !ALLOWED_MIME_TYPES.includes(image.mimeType.toLowerCase())) {
    throw new Error(
      `File format '${image.mimeType}' is not supported. Please upload a clear JPG, PNG, WEBP, or PDF.`,
    );
  }

  if (image.fileSize && image.fileSize > MAX_UPLOAD_BYTES) {
    throw new Error(
      "File size exceeds the 10MB limit. Please compress or take a photo with lower resolution.",
    );
  }
}

async function getImageBuffer(image: PickedImage): Promise<ArrayBuffer> {
  if (image.base64) {
    return decode(image.base64);
  }

  const response = await fetch(image.uri);
  if (!response.ok) {
    throw new Error("Unable to fetch image data for upload.");
  }

  return await response.arrayBuffer();
}

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
  if (!asset.uri) return null;

  return {
    uri: asset.uri,
    base64: asset.base64 ?? undefined,
    mimeType: asset.mimeType ?? "image/jpeg",
  };
}

export async function pickFromLibrary(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      "Photo access is off. Turn it on in Settings to upload your document.",
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.7,
    base64: true,
  });

  return toPickedImage(result);
}

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

export async function uploadDocument(
  clerkId: string,
  kind: DocKind,
  image: PickedImage,
): Promise<string> {
  // POPIA & Zero-trust: Enforce file format and size limits before upload
  validateDocumentSecurity(image);

  const supabase = await getSupabaseClient();

  const extension = image.mimeType.includes("png") ? "png" : "jpg";
  const path = `${clerkId}/${kind}-${Date.now()}.${extension}`;
  const buffer = await getImageBuffer(image);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: image.mimeType,
      upsert: false,
    });

  if (error) {
    console.error("Document upload failed:", error);
    throw new Error(
      "We couldn't upload that image. Check your connection and try again.",
    );
  }

  return path;
}

export async function verifyDocumentAutomated(payload: {
  clerkId: string;
  docKind: DocKind;
  filePath: string;
  expiryDate?: string | null;
  extractedData?: {
    plate?: string;
    licenceNumber?: string;
    idNumber?: string;
    fullName?: string;
    vin?: string;
    pdpCategory?: string;
  };
}) {
  return fetchAPI("/(api)/verify-document", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function uploadAvatar(
  clerkId: string,
  image: PickedImage,
): Promise<string> {
  const supabase = await getSupabaseClient();

  const extension = image.mimeType.includes("png") ? "png" : "jpg";
  const path = `${clerkId}/avatar-${Date.now()}.${extension}`;
  const buffer = await getImageBuffer(image);

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, {
      contentType: image.mimeType,
      upsert: true,
    });

  if (error) {
    console.error("Avatar upload failed:", error);
    throw new Error("We couldn't upload that photo. Please try again.");
  }

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("We couldn't generate a public URL for the avatar.");
  }

  return data.publicUrl;
}

export async function getSignedUrl(
  path: string,
  expiresInSeconds = 60,
): Promise<string | null> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    console.warn("Could not sign document URL:", error);
    return null;
  }

  return data?.signedUrl ?? null;
}

// ─── Didit: Verification flow ───────────────────────────────────────────────

export type DiditDocType = "id" | "passport" | "licence";

export type DiditStartResult = {
  session_id: string;
  session_token: string;
  url: string;
};

export async function startDiditVerification(
  clerkId: string,
  docType: DiditDocType = "id",
): Promise<DiditStartResult> {
  console.log(`DIDIT: creating session for ${clerkId} (${docType})`);

  const res = await fetchAPI("/(api)/didit-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clerkId, docType }),
  });

  const session: DiditStartResult | undefined = res?.data ?? res;

  if (!session?.url) {
    throw new Error(
      "We couldn't start the identity check. Please check your connection and try again.",
    );
  }

  return session;
}

export async function syncDiditSessionDecision(
  sessionId: string,
  clerkId: string,
  docType?: DiditDocType,
) {
  return fetchAPI("/(api)/didit-session-decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, clerkId, docType }),
  });
}

export async function verifyDrivingLicenceNATIS(payload: {
  nationalId: string;
  lastName: string;
  initials: string;
  licenceNumber: string;
  clerkId: string;
}) {
  return fetchAPI("/(api)/didit-licence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function verifySouthAfricanIdDatabase(payload: {
  nationalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  clerkId: string;
}) {
  return fetchAPI("/(api)/didit-id-validation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ─── Submitting ──────────────────────────────────────────────────────────────

export type VerificationPayload = {
  government_id_url?: string;
  government_id_back_url?: string;
  selfie_image_url?: string;
  id_number?: string;
  date_of_birth?: string;
  id_citizenship?: string;
  verification_warnings?: string[];
  didit_session_id?: string;
  didit_decision?: Record<string, unknown>;
  didit_verified_at?: string;
};

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