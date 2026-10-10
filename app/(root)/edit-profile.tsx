import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomButton from "@/components/CustomButton";
import { brand, ui } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";

type FieldConfig = {
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numbers-and-punctuation";
  autoCapitalize?: "none" | "words" | "sentences";
  multiline?: boolean;
  help?: string;
  nested?: boolean;
  validate?: (value: string) => string | null;
};

const CONFIG: Record<string, FieldConfig> = {
  name: {
    placeholder: "e.g. Sipho Dlamini",
    autoCapitalize: "words",
    validate: (v) => (v.trim().length < 2 ? "Enter your full name" : null),
  },
  email: {
    placeholder: "e.g. sipho@email.com",
    keyboardType: "email-address",
    autoCapitalize: "none",
    validate: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Enter a valid email address",
  },
  phone_number: {
    placeholder: "e.g. 082 123 4567",
    keyboardType: "phone-pad",
    help: "Drivers use this to reach you about pickup.",
    validate: (v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length >= 9 ? null : "Enter a valid phone number";
    },
  },
  gender: { placeholder: "e.g. Female", autoCapitalize: "words", nested: true },
  date_of_birth: {
    placeholder: "YYYY-MM-DD",
    keyboardType: "numbers-and-punctuation",
    nested: true,
    help: "You must be 18 or older to book a ride.",
    validate: (v) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return "Use the format YYYY-MM-DD";
      const date = new Date(v);
      if (Number.isNaN(date.getTime())) return "That date isn't valid";
      const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 18) return "You must be 18 or older";
      if (age > 120) return "Check the year you entered";
      return null;
    },
  },
  home_address: {
    placeholder: "Street, suburb, city",
    autoCapitalize: "words",
    multiline: true,
    nested: true,
  },
  preferred_vehicle: { placeholder: "e.g. Standard", autoCapitalize: "words", nested: true },
  favorite_locations: {
    placeholder: "e.g. Home, Sandton office",
    autoCapitalize: "words",
    multiline: true,
    nested: true,
  },
  language: { placeholder: "e.g. English", autoCapitalize: "words", nested: true },
};

// ---- Emergency contacts ----------------------------------------------------

const MAX_CONTACTS = 5;

const RELATIONSHIPS = [
  "Mom",
  "Dad",
  "Sister",
  "Brother",
  "Aunt",
  "Uncle",
  "Grandmother",
  "Grandfather",
  "Husband",
  "Wife",
  "Boyfriend",
  "Girlfriend",
  "Partner",
  "Friend",
  "Colleague",
  "Other",
] as const;

type Relationship = (typeof RELATIONSHIPS)[number];

type EmergencyContact = {
  name: string;
  phone: string;
  relationship: Relationship | "";
};

const emptyDraft = () => ({
  name: "",
  phone: "",
  relationship: "" as Relationship | "",
});

const EMERGENCY_CONTACT_HELP =
  "We only contact this person if something goes wrong on a trip.";

const isEmergencyContactField = (field?: string) =>
  field === "emergency_contacts" ||
  field === "emergency_contact" ||
  field === "emergency_contact_name" ||
  field === "emergency_contact_phone";

const normaliseContacts = (data: any): EmergencyContact[] => {
  if (Array.isArray(data?.emergency_contacts)) {
    return data.emergency_contacts
      .slice(0, MAX_CONTACTS)
      .map((c: any) => ({
        name: String(c?.name ?? ""),
        phone: String(c?.phone ?? ""),
        relationship: (c?.relationship ?? "") as Relationship | "",
      }));
  }
  if (data?.emergency_contact_name || data?.emergency_contact_phone) {
    return [
      {
        name: String(data.emergency_contact_name ?? ""),
        phone: String(data.emergency_contact_phone ?? ""),
        relationship: "",
      },
    ];
  }
  return [];
};

// ---------------------------------------------------------------------------

const EditProfile = () => {
  const router = useRouter();
  const { field, label } = useLocalSearchParams<{ field?: string; label?: string }>();
  const { user } = useUser();

  const isEmergencyContact = isEmergencyContactField(field);

  const config: FieldConfig = (field && CONFIG[field]) || { placeholder: "Enter a value" };

  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [savedContacts, setSavedContacts] = useState<EmergencyContact[]>([]);
  const [draft, setDraft] = useState(emptyDraft());
  const [draftErrors, setDraftErrors] = useState<{ name?: string | null; phone?: string | null }>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Stable, non-null user id
  const userId = user?.id ?? null;

  useEffect(() => {
    (async () => {
      if (!userId || !field) {
        setLoading(false);
        return;
      }
      try {
        const result = await fetchAPI(
          `/(api)/profile?clerkId=${encodeURIComponent(userId)}`,
        );
        const record = result?.data ?? {};

        if (isEmergencyContact) {
          setSavedContacts(normaliseContacts(record.profile_data ?? {}));
        } else {
          const existing = config.nested
            ? record.profile_data?.[field]
            : record[field];
          if (existing) setValue(String(existing));
        }
      } catch (err) {
        console.warn("Could not load current value", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, field]);

  const persistContacts = async (nextList: EmergencyContact[]) => {
    if (!userId) throw new Error("Not signed in");

    const current = await fetchAPI(
      `/(api)/profile?clerkId=${encodeURIComponent(userId)}`,
    );
    const existingData = current?.data?.profile_data ?? {};

    const {
      emergency_contact: _legacy,
      emergency_contact_name: _legacyName,
      emergency_contact_phone: _legacyPhone,
      ...rest
    } = existingData;

    await fetchAPI("/(api)/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clerkId: userId,
        profile_data: { ...rest, emergency_contacts: nextList },
      }),
    });
  };

  const handleSave = async () => {
    if (!field || !userId) return;

    if (isEmergencyContact) {
      const nameErr = draft.name.trim().length < 2 ? "Enter a name" : null;
      const phoneErr =
        draft.phone.replace(/\D/g, "").length >= 9
          ? null
          : "Enter a valid phone number";

      if (nameErr || phoneErr) {
        setDraftErrors({ name: nameErr, phone: phoneErr });
        return;
      }

      if (savedContacts.length >= MAX_CONTACTS) {
        Alert.alert("Limit reached", `You can only save up to ${MAX_CONTACTS} contacts.`);
        return;
      }

      const newContact: EmergencyContact = {
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        relationship: draft.relationship || "",
      };
      const nextList = [...savedContacts, newContact];

      setSaving(true);
      try {
        await persistContacts(nextList);
        setSavedContacts(nextList);
        setDraft(emptyDraft());
        setDraftErrors({});
      } catch (err) {
        Alert.alert("Save failed", "We couldn't save that contact. Please try again.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const validationError = config.validate?.(value) ?? null;
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      let payload: Record<string, unknown>;
      if (config.nested) {
        const current = await fetchAPI(
          `/(api)/profile?clerkId=${encodeURIComponent(userId)}`,
        );
        const existingData = current?.data?.profile_data ?? {};
        payload = { profile_data: { ...existingData, [field]: value.trim() } };
      } else {
        payload = { [field]: value.trim() };
      }

      await fetchAPI("/(api)/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: userId, ...payload }),
      });

      router.back();
    } catch (err) {
      Alert.alert("Update failed", "We couldn't save that change. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSaved = (index: number) => {
    const contact = savedContacts[index];
    if (!contact) return;

    Alert.alert(
      "Delete contact",
      `Are you sure you want to delete ${contact.name}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            const nextList = savedContacts.filter((_, i) => i !== index);
            setSaving(true);
            try {
              await persistContacts(nextList);
              setSavedContacts(nextList);
            } catch (err) {
              Alert.alert(
                "Remove failed",
                "We couldn't remove that contact. Please try again.",
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const canSave = isEmergencyContact
    ? savedContacts.length < MAX_CONTACTS &&
      draft.name.trim().length > 0 &&
      draft.phone.trim().length > 0
    : value.trim().length > 0;

  const headerTitle = label || "Edit profile";
  const showPlus = isEmergencyContact && savedContacts.length < MAX_CONTACTS;

  const handlePlusPress = () => {
    setDraft(emptyDraft());
    setDraftErrors({});
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F4FB]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pb-2 pt-2">
          <View className="flex-row items-center gap-3">
            <Ionicons
              name="chevron-back"
              size={22}
              color="#21152F"
              onPress={() => router.back()}
              suppressHighlighting
            />
            <Text className="text-[19px] font-JakartaExtraBold text-[#21152F]">
              {headerTitle}
            </Text>
          </View>

          {showPlus ? (
            <Pressable
              onPress={handlePlusPress}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full bg-[#5A189A]"
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#5A189A" />
          </View>
        ) : (
          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {isEmergencyContact ? (
              <View>
                {/* ---------- Draft form ---------- */}
                <View className="rounded-3xl border border-[#E9E2F0] bg-white p-5">
                  <Text className="mb-3 text-[12.5px] font-JakartaBold text-[#746A7E]">
                    {savedContacts.length === 0 ? "Add a contact" : "Add another contact"}
                  </Text>

                  <Text className="mb-2 text-[12.5px] font-JakartaSemiBold text-[#746A7E]">
                    Name
                  </Text>
                  <TextInput
                    value={draft.name}
                    onChangeText={(text) => {
                      setDraft((d) => ({ ...d, name: text }));
                      if (draftErrors.name) setDraftErrors((e) => ({ ...e, name: null }));
                    }}
                    placeholder="e.g. Thandi Dlamini"
                    placeholderTextColor={ui.faint}
                    autoCapitalize="words"
                    className={`rounded-2xl border-[1.5px] px-4 py-3.5 text-[15px] font-JakartaMedium text-[#21152F] ${
                      draftErrors.name
                        ? "border-[#E0575B] bg-[#FEF3F3]"
                        : "border-[#E9E2F0] bg-[#F7F4FB]"
                    }`}
                  />
                  {draftErrors.name ? (
                    <View className="mt-2 flex-row items-center gap-1.5">
                      <Ionicons name="alert-circle-outline" size={14} color="#E0575B" />
                      <Text className="text-[12px] font-JakartaMedium text-[#E0575B]">
                        {draftErrors.name}
                      </Text>
                    </View>
                  ) : null}

                  <Text className="mb-2 mt-4 text-[12.5px] font-JakartaSemiBold text-[#746A7E]">
                    Phone number
                  </Text>
                  <TextInput
                    value={draft.phone}
                    onChangeText={(text) => {
                      setDraft((d) => ({ ...d, phone: text }));
                      if (draftErrors.phone) setDraftErrors((e) => ({ ...e, phone: null }));
                    }}
                    placeholder="e.g. 082 123 4567"
                    placeholderTextColor={ui.faint}
                    keyboardType="phone-pad"
                    className={`rounded-2xl border-[1.5px] px-4 py-3.5 text-[15px] font-JakartaMedium text-[#21152F] ${
                      draftErrors.phone
                        ? "border-[#E0575B] bg-[#FEF3F3]"
                        : "border-[#E9E2F0] bg-[#F7F4FB]"
                    }`}
                  />
                  {draftErrors.phone ? (
                    <View className="mt-2 flex-row items-center gap-1.5">
                      <Ionicons name="alert-circle-outline" size={14} color="#E0575B" />
                      <Text className="text-[12px] font-JakartaMedium text-[#E0575B]">
                        {draftErrors.phone}
                      </Text>
                    </View>
                  ) : null}

                  <Text className="mb-2 mt-4 text-[12.5px] font-JakartaSemiBold text-[#746A7E]">
                    Relationship
                  </Text>
                  <Pressable
                    onPress={() => setPickerOpen(true)}
                    className="flex-row items-center justify-between rounded-2xl border-[1.5px] border-[#E9E2F0] bg-[#F7F4FB] px-4 py-3.5"
                  >
                    <Text
                      className={`text-[15px] font-JakartaMedium ${
                        draft.relationship ? "text-[#21152F]" : "text-[#A69BAF]"
                      }`}
                    >
                      {draft.relationship || "Select relationship"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#746A7E" />
                  </Pressable>

                  {savedContacts.length === 0 ? (
                    <Text className="ml-1 mt-3 text-[11.5px] font-Jakarta leading-4 text-[#A69BAF]">
                      {EMERGENCY_CONTACT_HELP}
                    </Text>
                  ) : null}
                </View>

                <View className="mt-6">
                  <CustomButton
                    title={saving ? "Saving…" : "Save changes"}
                    loading={saving}
                    disabled={!canSave}
                    onPress={handleSave}
                  />
                </View>

                {/* ---------- Saved contacts underneath ---------- */}
                {savedContacts.length > 0 ? (
                  <View className="mt-8">
                    <Text className="mb-3 text-[12.5px] font-JakartaBold uppercase tracking-wide text-[#746A7E]">
                      Saved contacts ({savedContacts.length}/{MAX_CONTACTS})
                    </Text>

                    {savedContacts.map((c, index) => (
                      <Pressable
                        key={`${c.name}-${c.phone}-${index}`}
                        onPress={() => handleRemoveSaved(index)}
                        className="mb-3 flex-row items-center rounded-2xl border border-[#E9E2F0] bg-white px-4 py-3.5"
                      >
                        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F1EAFB]">
                          <Ionicons name="person" size={18} color="#5A189A" />
                        </View>

                        <View className="flex-1">
                          <Text className="text-[14.5px] font-JakartaBold text-[#21152F]">
                            {c.name}
                          </Text>
                          <Text className="mt-0.5 text-[12.5px] font-JakartaMedium text-[#746A7E]">
                            {c.relationship ? `${c.relationship} · ` : ""}
                            {c.phone}
                          </Text>
                        </View>

                        <Ionicons name="trash-outline" size={16} color="#E0575B" />
                      </Pressable>
                    ))}

                    <Text className="mt-1 text-center text-[11px] font-Jakarta text-[#A69BAF]">
                      Tap a contact to delete.
                    </Text>

                    {savedContacts.length >= MAX_CONTACTS ? (
                      <Text className="mt-2 text-center text-[11.5px] font-Jakarta text-[#A69BAF]">
                        You've reached the maximum of {MAX_CONTACTS} contacts.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : (
              // ---------- Single-field layout ----------
              <View className="rounded-3xl border border-[#E9E2F0] bg-white p-5">
                <Text className="mb-2.5 text-[12.5px] font-JakartaSemiBold text-[#746A7E]">
                  {label}
                </Text>

                <TextInput
                  value={value}
                  onChangeText={(text) => {
                    setValue(text);
                    if (error) setError(null);
                  }}
                  placeholder={config.placeholder}
                  placeholderTextColor={ui.faint}
                  keyboardType={config.keyboardType ?? "default"}
                  autoCapitalize={config.autoCapitalize ?? "sentences"}
                  multiline={config.multiline}
                  autoFocus
                  className={`rounded-2xl border-[1.5px] px-4 py-3.5 text-[15px] font-JakartaMedium text-[#21152F] ${
                    error
                      ? "border-[#E0575B] bg-[#FEF3F3]"
                      : "border-[#E9E2F0] bg-[#F7F4FB]"
                  }`}
                  style={
                    config.multiline
                      ? { minHeight: 96, textAlignVertical: "top" }
                      : undefined
                  }
                />

                {error ? (
                  <View className="mt-2 flex-row items-center gap-1.5">
                    <Ionicons name="alert-circle-outline" size={14} color="#E0575B" />
                    <Text className="text-[12px] font-JakartaMedium text-[#E0575B]">
                      {error}
                    </Text>
                  </View>
                ) : config.help ? (
                  <Text className="ml-1 mt-2 text-[11.5px] font-Jakarta leading-4 text-[#A69BAF]">
                    {config.help}
                  </Text>
                ) : null}
              </View>
            )}

            {!isEmergencyContact ? (
              <View className="mt-6">
                <CustomButton
                  title={saving ? "Saving…" : "Save changes"}
                  loading={saving}
                  disabled={!canSave}
                  onPress={handleSave}
                />
              </View>
            ) : null}
          </ScrollView>
        )}

        {/* Relationship picker modal */}
        <Modal
          visible={pickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerOpen(false)}
        >
          <Pressable
            className="flex-1 justify-end bg-black/40"
            onPress={() => setPickerOpen(false)}
          >
            <Pressable
              className="max-h-[70%] rounded-t-3xl bg-white pb-6 pt-3"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="mb-2 items-center">
                <View className="h-1 w-10 rounded-full bg-[#E9E2F0]" />
              </View>
              <Text className="mb-3 px-5 text-[15px] font-JakartaBold text-[#21152F]">
                Relationship
              </Text>
              <ScrollView>
                {RELATIONSHIPS.map((rel) => {
                  const selected = draft.relationship === rel;
                  return (
                    <Pressable
                      key={rel}
                      onPress={() => {
                        setDraft((d) => ({ ...d, relationship: rel }));
                        setPickerOpen(false);
                      }}
                      className="flex-row items-center justify-between px-5 py-3.5"
                    >
                      <Text
                        className={`text-[15px] font-JakartaMedium ${
                          selected ? "text-[#5A189A]" : "text-[#21152F]"
                        }`}
                      >
                        {rel}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={18} color="#5A189A" />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditProfile;