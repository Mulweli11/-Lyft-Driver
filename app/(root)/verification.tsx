import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomButton from "@/components/CustomButton";
import { fetchAPI } from "@/lib/fetch";
import {
    DOC_LABELS,
    DocKind,
    EXPIRING_DOCS,
    PickedImage,
    VerificationStatus,
    captureImage,
    pickFromLibrary,
    uploadDocument,
} from "@/lib/verification";

type Picked = Partial<Record<DocKind, PickedImage>>;
type Expiries = Partial<Record<DocKind, string>>;

// Ordered by what blocks a driver from working. Identity first, then the
// legal right to carry passengers, then the vehicle itself.
const SECTIONS: { title: string; note?: string; docs: DocKind[] }[] = [
  {
    title: "Your identity",
    note: "Same checks every passenger completes.",
    docs: ["id_front", "selfie"],
  },
  {
    title: "Your licence",
    note: "A Professional Driving Permit is required by law to carry passengers for reward.",
    docs: ["licence", "pdp"],
  },
  {
    title: "Your vehicle",
    note: "Documents must be current — expired papers mean you can't accept trips.",
    docs: ["vehicle_registration", "roadworthy", "insurance", "vehicle_photo"],
  },
];

const REQUIRED: DocKind[] = [
  "id_front",
  "selfie",
  "licence",
  "pdp",
  "vehicle_registration",
  "insurance",
];

const STATUS_BANNER: Record<
  VerificationStatus,
  { bg: string; icon: any; title: string; body: string; tint: string }
> = {
  not_submitted: {
    bg: "bg-[#E6F2EC]",
    tint: "#0E5C3F",
    icon: "shield-outline",
    title: "Get approved to drive",
    body: "We check your licence, permit and vehicle before you can accept passengers.",
  },
  pending: {
    bg: "bg-[#FDF4E3]",
    tint: "#8A6100",
    icon: "time-outline",
    title: "Under review",
    body: "Driver checks usually take one to two working days. We'll notify you either way.",
  },
  approved: {
    bg: "bg-[#E6F2EC]",
    tint: "#0E5C3F",
    icon: "shield-checkmark",
    title: "You're approved to drive",
    body: "You can publish trips and accept passengers.",
  },
  rejected: {
    bg: "bg-[#FEF3F3]",
    tint: "#B02A2A",
    icon: "alert-circle-outline",
    title: "We couldn't approve you yet",
    body: "See the reason below, then upload a replacement.",
  },
};

const DriverVerification = () => {
  const { user } = useUser();

  const [status, setStatus] = useState<VerificationStatus>("not_submitted");
  const [reason, setReason] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<any>({});
  const [picked, setPicked] = useState<Picked>({});
  const [expiries, setExpiries] = useState<Expiries>({});
  const [loading, setLoading] = useState(true);
  const [busyKind, setBusyKind] = useState<DocKind | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const result = await fetchAPI(
        `/(api)/profile?clerkId=${encodeURIComponent(user.id)}`,
      );
      const record = result?.data ?? {};
      setStatus(
        (record.driver_verification_status as VerificationStatus) ??
          "not_submitted",
      );
      setReason(record.driver_rejection_reason ?? null);
      setVehicle(record.profile_data?.vehicle ?? {});
    } catch (error) {
      console.warn("Could not load driver verification", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const locked = status === "pending" || status === "approved";

  const vehicleComplete = Boolean(
    vehicle?.make && vehicle?.model && vehicle?.plate && vehicle?.seats,
  );

  const done = REQUIRED.filter((kind) => picked[kind]).length;
  const progress = Math.round(
    ((done + (vehicleComplete ? 1 : 0)) / (REQUIRED.length + 1)) * 100,
  );

  const missingExpiry = useMemo(
    () =>
      EXPIRING_DOCS.some((kind) => picked[kind] && !expiries[kind]),
    [picked, expiries],
  );

  const canSubmit =
    done === REQUIRED.length && vehicleComplete && !missingExpiry && !submitting;

  const choose = (kind: DocKind) => {
    const run = async (fn: () => Promise<PickedImage | null>) => {
      setBusyKind(kind);
      try {
        const image = await fn();
        if (image) setPicked((prev) => ({ ...prev, [kind]: image }));
      } catch (error: any) {
        Alert.alert("Can't open that", error?.message ?? "Please try again.");
      } finally {
        setBusyKind(null);
      }
    };

    if (kind === "selfie") {
      run(() => captureImage(true));
      return;
    }

    Alert.alert(DOC_LABELS[kind].title, "How would you like to add this?", [
      { text: "Take a photo", onPress: () => run(() => captureImage(false)) },
      { text: "Choose from library", onPress: () => run(pickFromLibrary) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const submit = async () => {
    if (!canSubmit || !user?.id) return;
    setSubmitting(true);

    try {
      const kinds = Object.keys(picked) as DocKind[];
      const paths = await Promise.all(
        kinds.map((kind) => uploadDocument(user.id, kind, picked[kind]!)),
      );

      const documents: Record<string, any> = {};
      kinds.forEach((kind, i) => {
        documents[kind] = { path: paths[i], expires_on: expiries[kind] ?? null };
      });

      await fetchAPI("/(api)/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          driver_verification_status: "pending",
          driver_submitted_at: new Date().toISOString(),
          profile_data: { driver_documents: documents },
        }),
      });

      setStatus("pending");
      setPicked({});
      setReason(null);
    } catch (error: any) {
      Alert.alert(
        "Upload failed",
        error?.message ?? "We couldn't send your documents. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const banner = STATUS_BANNER[status];

  // ── Document row ───────────────────────────────────────────────────────────
  const DocRow = ({ kind }: { kind: DocKind }) => {
    const image = picked[kind];
    const busy = busyKind === kind;
    const label = DOC_LABELS[kind];
    const expires = EXPIRING_DOCS.includes(kind);
    const needsDate = expires && image && !expiries[kind];

    return (
      <View className="mb-3">
        <Pressable
          onPress={() => !locked && !busy && choose(kind)}
          disabled={locked || busy}
          className={`flex-row items-center rounded-2xl border-[1.5px] p-3.5 ${
            image ? "border-[#0E5C3F] bg-[#F2F8F5]" : "border-[#E2E9E5] bg-white"
          } ${locked ? "opacity-60" : "active:opacity-80"}`}
        >
          {image ? (
            <Image
              source={{ uri: image.uri }}
              className="h-14 w-14 rounded-xl bg-[#EEF1F0]"
            />
          ) : (
            <View className="h-14 w-14 items-center justify-center rounded-xl bg-[#E6F2EC]">
              <Ionicons name="document-text-outline" size={22} color="#0E5C3F" />
            </View>
          )}

          <View className="ml-3.5 flex-1">
            <Text className="text-[14.5px] font-JakartaBold text-[#101814]">
              {label.title}
            </Text>
            <Text
              className="mt-1 text-[11.5px] font-Jakarta leading-4 text-[#68756F]"
              numberOfLines={2}
            >
              {image ? "Ready to submit. Tap to replace." : label.help}
            </Text>
          </View>

          <View className="ml-2">
            {busy ? (
              <ActivityIndicator size="small" color="#0E5C3F" />
            ) : image ? (
              <View className="h-6 w-6 items-center justify-center rounded-full bg-[#1FB574]">
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            ) : (
              <Ionicons name="add-circle-outline" size={22} color="#9BA6A1" />
            )}
          </View>
        </Pressable>

        {/* Expiry matters more than the document itself — an expired licence
            is not a valid licence, and we need to know when to re-ask */}
        {expires && !!image && !locked && (
          <View
            className={`mt-2 flex-row items-center rounded-2xl border-[1.5px] px-4 ${
              needsDate
                ? "border-[#E3A008] bg-[#FDF8EB]"
                : "border-[#E2E9E5] bg-white"
            }`}
          >
            <Ionicons name="calendar-outline" size={16} color="#68756F" />
            <TextInput
              value={expiries[kind] ?? ""}
              onChangeText={(v) =>
                setExpiries((prev) => ({ ...prev, [kind]: v }))
              }
              placeholder="Expiry date — YYYY-MM-DD"
              placeholderTextColor="#B4BEB9"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              className="ml-2.5 h-[46px] flex-1 text-[13.5px] font-JakartaMedium text-[#101814]"
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F8F6]">
      <View className="flex-row items-center gap-3 px-5 pb-2 pt-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-xl border border-[#E2E9E5] bg-white active:opacity-70"
        >
          <Ionicons name="chevron-back" size={20} color="#101814" />
        </Pressable>
        <Text className="text-[19px] font-JakartaExtraBold text-[#101814]">
          Driver verification
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0E5C3F" />
        </View>
      ) : (
        <ScrollView
          className="px-5"
          contentContainerStyle={{ paddingBottom: 48, paddingTop: 12 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Banner */}
          <View className={`mb-5 rounded-3xl p-5 ${banner.bg}`}>
            <Ionicons name={banner.icon} size={26} color={banner.tint} />
            <Text
              className="mt-3 text-[17px] font-JakartaExtraBold"
              style={{ color: banner.tint }}
            >
              {banner.title}
            </Text>
            <Text className="mt-1.5 text-[13px] font-Jakarta leading-5 text-[#4A5450]">
              {banner.body}
            </Text>

            {status === "rejected" && !!reason && (
              <View className="mt-3 rounded-2xl bg-white/70 px-3.5 py-3">
                <Text className="text-[11px] font-JakartaBold uppercase tracking-wider text-[#B02A2A]">
                  Reason
                </Text>
                <Text className="mt-1 text-[13px] font-JakartaMedium text-[#101814]">
                  {reason}
                </Text>
              </View>
            )}
          </View>

          {status !== "approved" && (
            <>
              {/* Progress */}
              <View className="mb-5 rounded-3xl border border-[#E2E9E5] bg-white p-5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[15px] font-JakartaExtraBold text-[#101814]">
                    Your progress
                  </Text>
                  <Text className="text-[18px] font-JakartaExtraBold text-[#0E5C3F]">
                    {progress}%
                  </Text>
                </View>
                <View className="mt-3 h-2 overflow-hidden rounded-full bg-[#EEF1F0]">
                  <View
                    className="h-2 rounded-full bg-[#1FB574]"
                    style={{ width: `${progress}%` }}
                  />
                </View>
              </View>

              {/* Vehicle details */}
              <Text className="mb-3 text-[15px] font-JakartaExtraBold text-[#101814]">
                Vehicle details
              </Text>

              <Pressable
                onPress={() => router.push("/(root)/vehicle-details")}
                disabled={locked}
                className={`mb-6 flex-row items-center rounded-2xl border-[1.5px] p-4 ${
                  vehicleComplete
                    ? "border-[#0E5C3F] bg-[#F2F8F5]"
                    : "border-[#E2E9E5] bg-white"
                } ${locked ? "opacity-60" : "active:opacity-80"}`}
              >
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-[#E6F2EC]">
                  <Ionicons name="car-sport-outline" size={20} color="#0E5C3F" />
                </View>

                <View className="ml-3.5 flex-1">
                  <Text className="text-[14.5px] font-JakartaBold text-[#101814]">
                    {vehicleComplete
                      ? `${vehicle.make} ${vehicle.model}`
                      : "Add your vehicle"}
                  </Text>
                  <Text className="mt-0.5 text-[12px] font-Jakarta text-[#68756F]">
                    {vehicleComplete
                      ? `${vehicle.colour ?? ""} · ${vehicle.plate} · ${vehicle.seats} seats`
                      : "Make, model, colour, registration and seats"}
                  </Text>
                </View>

                {vehicleComplete ? (
                  <View className="h-6 w-6 items-center justify-center rounded-full bg-[#1FB574]">
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#9BA6A1" />
                )}
              </Pressable>

              {/* Document sections */}
              {SECTIONS.map((section) => (
                <View key={section.title}>
                  <Text className="mb-1 text-[15px] font-JakartaExtraBold text-[#101814]">
                    {section.title}
                  </Text>
                  {!!section.note && (
                    <Text className="mb-3 text-[11.5px] font-Jakarta leading-4 text-[#9BA6A1]">
                      {section.note}
                    </Text>
                  )}
                  {section.docs.map((kind) => (
                    <DocRow key={kind} kind={kind} />
                  ))}
                  <View className="h-3" />
                </View>
              ))}

              <View className="mt-1 flex-row gap-2.5 rounded-2xl border border-[#E2E9E5] bg-white p-4">
                <Ionicons name="lock-closed-outline" size={16} color="#0E5C3F" />
                <Text className="flex-1 text-[11.5px] font-Jakarta leading-4 text-[#68756F]">
                  Your documents are encrypted and stored privately. Only our
                  verification team can open them.
                </Text>
              </View>

              {!locked && (
                <View className="mt-6">
                  <CustomButton
                    title={submitting ? "Uploading…" : "Submit for review"}
                    loading={submitting}
                    disabled={!canSubmit}
                    onPress={submit}
                  />
                  {!canSubmit && !submitting && (
                    <Text className="mt-2.5 text-center text-[11.5px] font-Jakarta text-[#9BA6A1]">
                      {!vehicleComplete
                        ? "Add your vehicle details to continue"
                        : missingExpiry
                          ? "Add the expiry date for each document"
                          : `${REQUIRED.length - done} document${
                              REQUIRED.length - done === 1 ? "" : "s"
                            } still needed`}
                    </Text>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default DriverVerification;