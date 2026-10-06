import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import CustomButton from "@/components/CustomButton";
import { brand, ui } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import {
  DOC_LABELS,
  DiditDocType,
  DocKind,
  EXPIRING_DOCS,
  PickedImage,
  VerificationStatus,
  captureImage,
  pickFromLibrary,
  startDiditVerification,
  uploadDocument,
  verifyDrivingLicenceNATIS,
  verifySouthAfricanIdDatabase,
} from "@/lib/verification";

type Picked = Partial<Record<DocKind, PickedImage>>;
type Expiries = Partial<Record<DocKind, string>>;

const SECTIONS: { title: string; note?: string; docs: DocKind[] }[] = [
  {
    title: "Permit & Authorization",
    note: "A Professional Driving Permit is required by law to carry passengers for reward in South Africa.",
    docs: ["pdp"],
  },
  {
    title: "Vehicle documentation",
    note: "Documents must be current — expired papers mean you cannot accept trips.",
    docs: ["vehicle_registration", "roadworthy", "insurance", "vehicle_photo"],
  },
];

const REQUIRED: DocKind[] = ["pdp", "vehicle_registration", "insurance"];

const STATUS_BANNER: Record<
  VerificationStatus,
  { bg: string; icon: any; title: string; body: string; tint: string }
> = {
  not_submitted: {
    bg: "bg-[#F0E6FA]",
    tint: "#5A189A",
    icon: "shield-outline",
    title: "Get approved to drive",
    body: "We verify your ID, licence, permit, and vehicle before you can accept passengers.",
  },
  pending: {
    bg: "bg-[#FFF6E5]",
    tint: "#D99A1B",
    icon: "time-outline",
    title: "Under review",
    body: "Driver checks usually take one to two working days. We'll notify you as soon as you're approved.",
  },
  approved: {
    bg: "bg-[#F0E6FA]",
    tint: "#5A189A",
    icon: "shield-checkmark",
    title: "You're approved to drive",
    body: "Your identity and documents are verified. You can publish trips and accept passengers.",
  },
  rejected: {
    bg: "bg-[#FEF3F3]",
    tint: "#B02A2A",
    icon: "alert-circle-outline",
    title: "We couldn't approve you yet",
    body: "See the reason below, then update or upload replacement documents.",
  },
};

const DriverVerification = () => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<VerificationStatus>("not_submitted");
  const [reason, setReason] = useState<string | null>(null);
  const [picked, setPicked] = useState<Picked>({});
  const [expiries, setExpiries] = useState<Expiries>({});
  const [loading, setLoading] = useState(true);
  const [busyKind, setBusyKind] = useState<DocKind | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [driverProfile, setDriverProfile] = useState<any>(null);

  const [diditBusy, setDiditBusy] = useState<DiditDocType | null>(null);
  const [diditDone, setDiditDone] = useState<Record<DiditDocType, boolean>>({
    id: false,
    passport: false,
    licence: false,
  });

  const [verifiedNumbers, setVerifiedNumbers] = useState<{
    id?: string | null;
    passport?: string | null;
    licence?: string | null;
  }>({});

  const [licenceModalVisible, setLicenceModalVisible] = useState(false);
  const [licenceNumber, setLicenceNumber] = useState("");
  const [licenceNationalId, setLicenceNationalId] = useState("");
  const [licenceLastName, setLicenceLastName] = useState("");
  const [licenceInitials, setLicenceInitials] = useState("");
  const [licenceSubmitting, setLicenceSubmitting] = useState(false);
  const [licenceError, setLicenceError] = useState<string | null>(null);

  const [saIdModalVisible, setSaIdModalVisible] = useState(false);
  const [saIdNumber, setSaIdNumber] = useState("");
  const [saIdFirstName, setSaIdFirstName] = useState("");
  const [saIdLastName, setSaIdLastName] = useState("");
  const [saIdDob, setSaIdDob] = useState("");
  const [saIdSubmitting, setSaIdSubmitting] = useState(false);
  const [saIdError, setSaIdError] = useState<string | null>(null);

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
      setDriverProfile(record);

      setStatus(
        (record.driver_verification_status as VerificationStatus) ??
          "not_submitted",
      );
      setReason(record.driver_rejection_reason ?? null);

      const isIdDone = record.id_verified === true;
      const isPassportDone = record.passport_verified === true;
      const isLicenceDone = record.licence_verified === true;

      setDiditDone({
        id: isIdDone,
        passport: isPassportDone,
        licence: isLicenceDone,
      });

      const licenceNum =
        record.profile_data?.licence?.licence_number ??
        record.driver_license_number ??
        null;

      setVerifiedNumbers({
        id: record.id_number ?? null,
        passport: record.passport_number ?? null,
        licence: licenceNum,
      });

      if (record.id_number) {
        setLicenceNationalId(record.id_number);
        setSaIdNumber(record.id_number);
      }
      if (record.first_name) {
        setSaIdFirstName(record.first_name);
        setLicenceInitials(record.first_name.charAt(0).toUpperCase());
      }
      if (record.last_name) {
        setSaIdLastName(record.last_name);
        setLicenceLastName(record.last_name);
      }
      if (record.date_of_birth) {
        setSaIdDob(record.date_of_birth);
      }
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

  const identityDone = diditDone.id || diditDone.passport ? 1 : 0;
  const licenceDone = diditDone.licence ? 1 : 0;
  const docsDone = REQUIRED.filter((kind) => picked[kind]).length;
  const totalItems = 2 + REQUIRED.length;
  const totalDone = identityDone + licenceDone + docsDone;
  const progress = Math.round((totalDone / totalItems) * 100);

  const missingExpiry = useMemo(
    () => EXPIRING_DOCS.some((kind) => picked[kind] && !expiries[kind]),
    [picked, expiries],
  );

  const canSubmit =
    docsDone === REQUIRED.length &&
    !missingExpiry &&
    !submitting &&
    (identityDone > 0 || licenceDone > 0);

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

    Alert.alert(DOC_LABELS[kind].title, "How would you like to add this?", [
      { text: "Take a photo", onPress: () => run(() => captureImage(false)) },
      { text: "Choose from library", onPress: () => run(pickFromLibrary) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const launchDiditSession = async (docType: DiditDocType) => {
    if (!user?.id) {
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }

    setDiditBusy(docType);
    try {
      const session = await startDiditVerification(user.id, docType);

      router.push({
        pathname: "/(root)/didit-webview",
        params: {
          url: session.url,
          sessionId: session.session_id,
          docType,
          clerkId: user.id,
        },
      });
    } catch (err: any) {
      console.log("DIDIT SESSION ERROR:", err?.message ?? err);
      Alert.alert("Verification", err?.message ?? "Please try again.");
    } finally {
      setDiditBusy(null);
    }
  };

  const handleIdVerifyPress = () => {
    Alert.alert(
      "Verify South African ID",
      "Choose your preferred verification method:",
      [
        {
          text: "Verify with Home Affairs",
          onPress: () => {
            setSaIdError(null);
            setSaIdModalVisible(true);
          },
        },
        {
          text: "Scan ID Card / Book (Camera)",
          onPress: () => launchDiditSession("id"),
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const handleSaIdSubmit = async () => {
    if (!saIdNumber.trim() || !saIdFirstName.trim() || !saIdLastName.trim() || !saIdDob.trim()) {
      setSaIdError("Please fill in all the required fields.");
      return;
    }

    if (saIdNumber.trim().length !== 13) {
      setSaIdError("South African ID must be exactly 13 digits.");
      return;
    }

    setSaIdSubmitting(true);
    setSaIdError(null);

    try {
      const res = await verifySouthAfricanIdDatabase({
        nationalId: saIdNumber.trim(),
        firstName: saIdFirstName.trim(),
        lastName: saIdLastName.trim(),
        dateOfBirth: saIdDob.trim(),
        clerkId: user!.id,
      });

      if (res?.verified) {
        setSaIdModalVisible(false);
        setDiditDone((prev) => ({ ...prev, id: true }));
        setVerifiedNumbers((prev) => ({ ...prev, id: saIdNumber.trim() }));
        Alert.alert(
          "ID Verified!",
          "Your South African ID has been verified with Home Affairs.",
        );
        load();
      } else {
        setSaIdError(res?.message ?? "Could not verify ID details with Home Affairs.");
      }
    } catch (err: any) {
      setSaIdError(err?.message ?? "Verification request failed. Please check your connection.");
    } finally {
      setSaIdSubmitting(false);
    }
  };

  const handleLicenceSubmit = async () => {
    if (
      !licenceNumber.trim() ||
      !licenceNationalId.trim() ||
      !licenceLastName.trim() ||
      !licenceInitials.trim()
    ) {
      setLicenceError("Please fill in all driving licence fields.");
      return;
    }

    setLicenceSubmitting(true);
    setLicenceError(null);

    try {
      const res = await verifyDrivingLicenceNATIS({
        licenceNumber: licenceNumber.trim(),
        nationalId: licenceNationalId.trim(),
        lastName: licenceLastName.trim(),
        initials: licenceInitials.trim().toUpperCase(),
        clerkId: user!.id,
      });

      if (res?.verified) {
        setLicenceModalVisible(false);
        setDiditDone((prev) => ({ ...prev, licence: true }));
        setVerifiedNumbers((prev) => ({ ...prev, licence: licenceNumber.trim() }));
        Alert.alert(
          "Licence Verified!",
          "Your driving licence was successfully confirmed on the official NATIS register.",
        );
        load();
      } else {
        setLicenceError(
          res?.message ??
            "The licence number, initials, or ID did not match NATIS records.",
        );
      }
    } catch (err: any) {
      setLicenceError(err?.message ?? "Failed to connect to NATIS. Please try again.");
    } finally {
      setLicenceSubmitting(false);
    }
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
      Alert.alert(
        "Submitted for Review",
        "Your documents have been submitted. Our team will review them within 1-2 business days.",
      );
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

  const maskNumber = (num?: string | null) => {
    if (!num) return "";
    if (num.length <= 4) return num;
    return `•••• ${num.slice(-4)}`;
  };

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
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className={`flex-row items-center rounded-2xl border-[1.5px] p-3.5 ${
            image ? "border-[#5A189A] bg-[#F0E6FA]" : "border-[#E9E2F0] bg-white"
          }`}
        >
          {image ? (
            <Image
              source={{ uri: image.uri }}
              className="h-14 w-14 rounded-xl bg-[#F0E6FA]"
            />
          ) : (
            <View className="h-14 w-14 items-center justify-center rounded-xl bg-[#F0E6FA]">
              <Ionicons name="document-text-outline" size={22} color="#5A189A" />
            </View>
          )}

          <View className="ml-3.5 flex-1">
            <Text className="text-[14.5px] font-JakartaBold text-[#21152F]">
              {label.title}
            </Text>
            <Text
              className="mt-1 text-[11.5px] font-Jakarta leading-4 text-[#746A7E]"
              numberOfLines={2}
            >
              {image ? "Ready to submit. Tap to replace." : label.help}
            </Text>
          </View>

          <View className="ml-2">
            {busy ? (
              <ActivityIndicator size="small" color="#5A189A" />
            ) : image ? (
              <View className="h-6 w-6 items-center justify-center rounded-full bg-[#9D4EDD]">
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            ) : (
              <Ionicons name="add-circle-outline" size={22} color="#A69BAF" />
            )}
          </View>
        </Pressable>

        {expires && !!image && !locked && (
          <View
            className={`mt-2 flex-row items-center rounded-2xl border-[1.5px] px-4 ${
              needsDate
                ? "border-[#D99A1B] bg-[#FFF6E5]"
                : "border-[#E9E2F0] bg-white"
            }`}
          >
            <Ionicons name="calendar-outline" size={16} color="#746A7E" />
            <TextInput
              value={expiries[kind] ?? ""}
              onChangeText={(v) =>
                setExpiries((prev) => ({ ...prev, [kind]: v }))
              }
              placeholder="Expiry date — YYYY-MM-DD"
              placeholderTextColor={ui.faint}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              className="ml-2.5 h-[46px] flex-1 text-[13.5px] font-JakartaMedium text-[#21152F]"
            />
          </View>
        )}
      </View>
    );
  };

  const DiditCard = ({
    docType,
    title,
    help,
    icon,
    verifiedLabel,
    maskedValue,
    onPress,
  }: {
    docType: DiditDocType;
    title: string;
    help: string;
    icon: any;
    verifiedLabel: string;
    maskedValue?: string | null;
    onPress: () => void;
  }) => {
    const verified = diditDone[docType];
    const busy = diditBusy === docType;

    return (
      <View
        className={`mb-3.5 rounded-3xl border-[1.5px] p-5 ${
          verified
            ? "border-[#9D4EDD] bg-[#F0E6FA]"
            : "border-[#5A189A] bg-[#F7F4FB]"
        }`}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name={icon} size={20} color="#5A189A" />
          <Text className="text-[15px] font-JakartaExtraBold text-[#21152F]">
            {title}
          </Text>
          {verified && (
            <View className="ml-auto flex-row items-center gap-1.5 rounded-full bg-[#9D4EDD] px-2.5 py-1">
              <Ionicons name="checkmark" size={13} color="#fff" />
              <Text className="text-[11px] font-JakartaBold text-white">Verified</Text>
            </View>
          )}
        </View>

        <Text className="mt-2 text-[12.5px] font-Jakarta leading-4 text-[#746A7E]">
          {verified ? `${verifiedLabel} ${maskedValue ? `(${maskedValue})` : ""}` : help}
        </Text>

        <View className="mt-4">
          <CustomButton
            title={
              busy
                ? "Opening…"
                : verified
                  ? "Re-verify details"
                  : `Verify ${title.toLowerCase()}`
            }
            loading={busy}
            onPress={onPress}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F4FB]">
      <View className="flex-row items-center gap-3 px-5 pb-2 pt-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-xl border border-[#E9E2F0] bg-white active:opacity-70"
        >
          <Ionicons name="chevron-back" size={20} color="#21152F" />
        </Pressable>
        <Text className="text-[19px] font-JakartaExtraBold text-[#21152F]">
          Driver verification
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5A189A" />
        </View>
      ) : (
        <ScrollView
          className="px-5"
          contentContainerStyle={{ paddingBottom: 48, paddingTop: 12 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className={`mb-5 rounded-3xl p-5 ${banner.bg}`}>
            <Ionicons name={banner.icon} size={26} color={banner.tint} />
            <Text
              className="mt-3 text-[17px] font-JakartaExtraBold"
              style={{ color: banner.tint }}
            >
              {banner.title}
            </Text>
            <Text className="mt-1.5 text-[13px] font-Jakarta leading-5 text-[#746A7E]">
              {banner.body}
            </Text>

            {status === "rejected" && !!reason && (
              <View className="mt-3 rounded-2xl bg-white/70 px-3.5 py-3">
                <Text className="text-[11px] font-JakartaBold uppercase tracking-wider text-[#B02A2A]">
                  Reason
                </Text>
                <Text className="mt-1 text-[13px] font-JakartaMedium text-[#21152F]">
                  {reason}
                </Text>
              </View>
            )}
          </View>

          <View className="mb-5 rounded-3xl border border-[#E9E2F0] bg-white p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-[15px] font-JakartaExtraBold text-[#21152F]">
                Verification progress
              </Text>
              <Text className="text-[18px] font-JakartaExtraBold text-[#5A189A]">
                {progress}%
              </Text>
            </View>
            <View className="mt-3 h-2 overflow-hidden rounded-full bg-[#F0E6FA]">
              <View
                className="h-2 rounded-full bg-[#9D4EDD]"
                style={{ width: `${progress}%` }}
              />
            </View>
            <Text className="mt-2 text-[11.5px] font-Jakarta text-[#746A7E]">
              {totalDone} of {totalItems} requirements fulfilled
            </Text>
          </View>

          <Text className="mb-3 text-[15px] font-JakartaExtraBold text-[#21152F]">
            1. Identity & Licence Verification
          </Text>

          <DiditCard
            docType="id"
            title="South African ID"
            help="Verify your SA ID directly with Home Affairs or scan your Smart Card."
            verifiedLabel="Home Affairs verified"
            maskedValue={maskNumber(verifiedNumbers.id)}
            icon="card-outline"
            onPress={handleIdVerifyPress}
          />

          <DiditCard
            docType="passport"
            title="Foreign passport"
            help="Not a South African citizen? Scan your foreign passport with biometric check."
            verifiedLabel="Passport confirmed"
            maskedValue={maskNumber(verifiedNumbers.passport)}
            icon="book-outline"
            onPress={() => launchDiditSession("passport")}
          />

          <DiditCard
            docType="licence"
            title="Driving licence"
            help="Validated in real-time against the national NATIS driver register."
            verifiedLabel="NATIS register confirmed"
            maskedValue={maskNumber(verifiedNumbers.licence)}
            icon="car-outline"
            onPress={() => {
              setLicenceError(null);
              setLicenceModalVisible(true);
            }}
          />

          <Text className="mb-1 mt-4 text-[15px] font-JakartaExtraBold text-[#21152F]">
            2. Permit & Vehicle Documents
          </Text>
          <Text className="mb-3 text-[11.5px] font-Jakarta text-[#A69BAF]">
            Upload clear photos or scans of your permits and vehicle certificates.
          </Text>

          {SECTIONS.map((section) => (
            <View key={section.title}>
              <Text className="mb-1 text-[14px] font-JakartaBold text-[#21152F]">
                {section.title}
              </Text>
              {!!section.note && (
                <Text className="mb-2.5 text-[11.5px] font-Jakarta leading-4 text-[#A69BAF]">
                  {section.note}
                </Text>
              )}
              {section.docs.map((kind) => (
                <DocRow key={kind} kind={kind} />
              ))}
              <View className="h-2" />
            </View>
          ))}

          <View className="mt-2 flex-row gap-2.5 rounded-2xl border border-[#E9E2F0] bg-white p-4">
            <Ionicons name="lock-closed-outline" size={16} color="#5A189A" />
            <Text className="flex-1 text-[11.5px] font-Jakarta leading-4 text-[#746A7E]">
              Your documents are encrypted and safely stored. Verified credentials are
              validated securely against official registries.
            </Text>
          </View>

          {!locked && (
            <View className="mt-6">
              <CustomButton
                title={submitting ? "Uploading documents…" : "Submit all for review"}
                loading={submitting}
                disabled={!canSubmit}
                onPress={submit}
              />
              {!canSubmit && !submitting && (
                <Text className="mt-2.5 text-center text-[11.5px] font-Jakarta text-[#A69BAF]">
                  {missingExpiry
                    ? "Add the expiry date for each expiring document"
                    : `${REQUIRED.length - docsDone} document${
                        REQUIRED.length - docsDone === 1 ? "" : "s"
                      } still needed`}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Driving Licence NATIS Modal */}
      <Modal
        visible={licenceModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLicenceModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <Pressable
            className="flex-1 bg-black/50"
            onPress={() => setLicenceModalVisible(false)}
          />
          <View
            className="rounded-t-3xl bg-white px-5 pt-3"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="items-center pb-2">
              <View className="h-1.5 w-12 rounded-full bg-[#E9E2F0]" />
            </View>

            <View className="flex-row items-center justify-between pb-3">
              <View className="flex-1">
                <Text className="text-[18px] font-JakartaExtraBold text-[#21152F]">
                  Verify Driving Licence
                </Text>
                <Text className="mt-0.5 text-[12px] font-Jakarta text-[#746A7E]">
                  Validated directly against the South African NATIS register.
                </Text>
              </View>
              <Pressable
                onPress={() => setLicenceModalVisible(false)}
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#F0E6FA]"
              >
                <Ionicons name="close" size={18} color="#746A7E" />
              </Pressable>
            </View>

            {licenceError && (
              <View className="mb-3 flex-row items-center gap-2 rounded-2xl bg-[#FEF3F3] p-3 border border-[#F8D7DA]">
                <Ionicons name="alert-circle" size={18} color="#B02A2A" />
                <Text className="flex-1 text-[12px] font-JakartaMedium text-[#B02A2A]">
                  {licenceError}
                </Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[380px]">
              <Text className="mb-1 text-[12.5px] font-JakartaBold text-[#21152F]">
                Driving Licence Card Number *
              </Text>
              <TextInput
                value={licenceNumber}
                onChangeText={setLicenceNumber}
                placeholder="e.g. 12345678"
                placeholderTextColor={ui.faint}
                autoCapitalize="characters"
                className="mb-3 h-12 rounded-xl border border-[#E9E2F0] bg-[#F7F4FB] px-3.5 text-[14px] font-JakartaMedium text-[#21152F]"
              />

              <Text className="mb-1 text-[12.5px] font-JakartaBold text-[#21152F]">
                National ID Number *
              </Text>
              <TextInput
                value={licenceNationalId}
                onChangeText={setLicenceNationalId}
                placeholder="13-digit SA ID number"
                placeholderTextColor={ui.faint}
                keyboardType="numeric"
                maxLength={13}
                className="mb-3 h-12 rounded-xl border border-[#E9E2F0] bg-[#F7F4FB] px-3.5 text-[14px] font-JakartaMedium text-[#21152F]"
              />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1 text-[12.5px] font-JakartaBold text-[#21152F]">
                    Last Name *
                  </Text>
                  <TextInput
                    value={licenceLastName}
                    onChangeText={setLicenceLastName}
                    placeholder="e.g. Dlamini"
                    placeholderTextColor={ui.faint}
                    autoCapitalize="words"
                    className="mb-3 h-12 rounded-xl border border-[#E9E2F0] bg-[#F7F4FB] px-3.5 text-[14px] font-JakartaMedium text-[#21152F]"
                  />
                </View>

                <View className="w-24">
                  <Text className="mb-1 text-[12.5px] font-JakartaBold text-[#21152F]">
                    Initials *
                  </Text>
                  <TextInput
                    value={licenceInitials}
                    onChangeText={setLicenceInitials}
                    placeholder="e.g. S"
                    placeholderTextColor={ui.faint}
                    autoCapitalize="characters"
                    maxLength={4}
                    className="mb-3 h-12 rounded-xl border border-[#E9E2F0] bg-[#F7F4FB] px-3.5 text-[14px] font-JakartaMedium text-[#21152F]"
                  />
                </View>
              </View>
            </ScrollView>

            <View className="mt-4">
              <CustomButton
                title={licenceSubmitting ? "Verifying with NATIS…" : "Check NATIS Register"}
                loading={licenceSubmitting}
                onPress={handleLicenceSubmit}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* South African ID Home Affairs Modal */}
      <Modal
        visible={saIdModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSaIdModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <Pressable
            className="flex-1 bg-black/50"
            onPress={() => setSaIdModalVisible(false)}
          />
          <View
            className="rounded-t-3xl bg-white px-5 pt-3"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="items-center pb-2">
              <View className="h-1.5 w-12 rounded-full bg-[#E9E2F0]" />
            </View>

            <View className="flex-row items-center justify-between pb-3">
              <View className="flex-1">
                <Text className="text-[18px] font-JakartaExtraBold text-[#21152F]">
                  Verify South African ID
                </Text>
                <Text className="mt-0.5 text-[12px] font-Jakarta text-[#746A7E]">
                  Instant verification directly against Department of Home Affairs.
                </Text>
              </View>
              <Pressable
                onPress={() => setSaIdModalVisible(false)}
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#F0E6FA]"
              >
                <Ionicons name="close" size={18} color="#746A7E" />
              </Pressable>
            </View>

            {saIdError && (
              <View className="mb-3 flex-row items-center gap-2 rounded-2xl bg-[#FEF3F3] p-3 border border-[#F8D7DA]">
                <Ionicons name="alert-circle" size={18} color="#B02A2A" />
                <Text className="flex-1 text-[12px] font-JakartaMedium text-[#B02A2A]">
                  {saIdError}
                </Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[380px]">
              <Text className="mb-1 text-[12.5px] font-JakartaBold text-[#21152F]">
                13-Digit SA ID Number *
              </Text>
              <TextInput
                value={saIdNumber}
                onChangeText={setSaIdNumber}
                placeholder="e.g. 9001015009087"
                placeholderTextColor={ui.faint}
                keyboardType="numeric"
                maxLength={13}
                className="mb-3 h-12 rounded-xl border border-[#E9E2F0] bg-[#F7F4FB] px-3.5 text-[14px] font-JakartaMedium text-[#21152F]"
              />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1 text-[12.5px] font-JakartaBold text-[#21152F]">
                    First Name *
                  </Text>
                  <TextInput
                    value={saIdFirstName}
                    onChangeText={setSaIdFirstName}
                    placeholder="e.g. Sipho"
                    placeholderTextColor={ui.faint}
                    autoCapitalize="words"
                    className="mb-3 h-12 rounded-xl border border-[#E9E2F0] bg-[#F7F4FB] px-3.5 text-[14px] font-JakartaMedium text-[#21152F]"
                  />
                </View>

                <View className="flex-1">
                  <Text className="mb-1 text-[12.5px] font-JakartaBold text-[#21152F]">
                    Last Name *
                  </Text>
                  <TextInput
                    value={saIdLastName}
                    onChangeText={setSaIdLastName}
                    placeholder="e.g. Dlamini"
                    placeholderTextColor={ui.faint}
                    autoCapitalize="words"
                    className="mb-3 h-12 rounded-xl border border-[#E9E2F0] bg-[#F7F4FB] px-3.5 text-[14px] font-JakartaMedium text-[#21152F]"
                  />
                </View>
              </View>

              <Text className="mb-1 text-[12.5px] font-JakartaBold text-[#21152F]">
                Date of Birth (YYYY-MM-DD) *
              </Text>
              <TextInput
                value={saIdDob}
                onChangeText={setSaIdDob}
                placeholder="e.g. 1990-01-01"
                placeholderTextColor={ui.faint}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                className="mb-3 h-12 rounded-xl border border-[#E9E2F0] bg-[#F7F4FB] px-3.5 text-[14px] font-JakartaMedium text-[#21152F]"
              />
            </ScrollView>

            <View className="mt-4">
              <CustomButton
                title={saIdSubmitting ? "Verifying with Home Affairs…" : "Verify ID"}
                loading={saIdSubmitting}
                onPress={handleSaIdSubmit}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default DriverVerification;
