import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomButton from "@/components/CustomButton";
import OptionSheet from "@/components/OptionSheet";
import { ui } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";

const BANKS = [
  "ABSA",
  "Capitec",
  "FNB",
  "Nedbank",
  "Standard Bank",
  "TymeBank",
  "African Bank",
  "Discovery Bank",
  "Investec",
  "Bidvest Bank",
].map((b) => ({ value: b, label: b }));

const ACCOUNT_TYPES = [
  { value: "Cheque", label: "Cheque / current" },
  { value: "Savings", label: "Savings" },
];

const BankDetails = () => {
  const { user } = useUser();

  const [holder, setHolder] = useState("");
  const [bank, setBank] = useState("");
  const [accountType, setAccountType] = useState("Cheque");
  const [accountNumber, setAccountNumber] = useState("");
  const [sheet, setSheet] = useState<null | "bank" | "type">(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (!user?.id) {
          setLoading(false);
          return;
        }
        try {
          const result = await fetchAPI(
            `/(api)/profile?clerkId=${encodeURIComponent(user.id)}`,
          );
          const stored = result?.data?.profile_data?.bank_account;
          if (stored) {
            setHolder(stored.holder ?? "");
            setBank(stored.bank ?? "");
            setAccountType(stored.account_type ?? "Cheque");
            setAccountNumber(stored.last4 ? `•••• ${stored.last4}` : "");
          }
        } catch (error) {
          console.warn("Could not load bank details", error);
        } finally {
          setLoading(false);
        }
      })();
    }, [user?.id]),
  );

  const digits = accountNumber.replace(/\D/g, "");
  const editingExisting = accountNumber.startsWith("••••");
  const valid =
    holder.trim().length >= 3 &&
    bank &&
    (editingExisting || (digits.length >= 7 && digits.length <= 12));

  const save = async () => {
    if (!valid || !user?.id || editingExisting) return;
    setSaving(true);

    try {
      await fetchAPI("/(api)/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          profile_data: {
            bank_account: {
              holder: holder.trim(),
              bank,
              account_type: accountType,
              last4: digits.slice(-4),
            },
          },
        }),
      });

      Alert.alert(
        "Bank account saved",
        "Your payouts will go to this account.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert(
        "Couldn't save",
        "Please check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F4FB]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center gap-3.5 px-6 pb-3 pt-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-2xl border border-[#E9E2F0] bg-white active:opacity-70 shadow-sm"
          >
            <Ionicons name="chevron-back" size={20} color="#21152F" />
          </Pressable>
          <Text className="text-[20px] font-JakartaExtraBold text-[#21152F]">
            Payout account
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#5A189A" />
          </View>
        ) : (
          <ScrollView
            className="px-6"
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text className="mb-5 text-[13.5px] font-Jakarta leading-6 text-[#746A7E]">
              Your earnings are paid into this account. It must be in your own
              name — third-party accounts can't be used.
            </Text>

            <View className="rounded-3xl border border-[#E9E2F0] bg-white p-6 shadow-sm">
              <Text className="mb-2 text-[12.5px] font-JakartaSemiBold text-[#746A7E]">
                Account holder
              </Text>
              <TextInput
                value={holder}
                onChangeText={setHolder}
                placeholder="Name exactly as the bank has it"
                placeholderTextColor={ui.faint}
                autoCapitalize="words"
                className="mb-4 rounded-2xl border-[1.5px] border-[#E9E2F0] bg-[#F7F4FB] px-4 py-3.5 text-[15px] font-JakartaMedium text-[#21152F]"
              />

              <Text className="mb-2 text-[12.5px] font-JakartaSemiBold text-[#746A7E]">
                Bank
              </Text>
              <Pressable
                onPress={() => setSheet("bank")}
                className="mb-4 flex-row items-center justify-between rounded-2xl border-[1.5px] border-[#E9E2F0] bg-[#F7F4FB] px-4 py-3.5 active:opacity-80"
              >
                <Text
                  className={`text-[15px] font-JakartaMedium ${
                    bank ? "text-[#21152F]" : "text-[#A69BAF]"
                  }`}
                >
                  {bank || "Choose your bank"}
                </Text>
                <Ionicons name="chevron-down" size={17} color="#A69BAF" />
              </Pressable>

              <Text className="mb-2 text-[12.5px] font-JakartaSemiBold text-[#746A7E]">
                Account type
              </Text>
              <Pressable
                onPress={() => setSheet("type")}
                className="mb-4 flex-row items-center justify-between rounded-2xl border-[1.5px] border-[#E9E2F0] bg-[#F7F4FB] px-4 py-3.5 active:opacity-80"
              >
                <Text className="text-[15px] font-JakartaMedium text-[#21152F]">
                  {accountType}
                </Text>
                <Ionicons name="chevron-down" size={17} color="#A69BAF" />
              </Pressable>

              <Text className="mb-2 text-[12.5px] font-JakartaSemiBold text-[#746A7E]">
                Account number
              </Text>
              <TextInput
                value={accountNumber}
                onChangeText={(v) => setAccountNumber(v)}
                onFocus={() => {
                  if (editingExisting) setAccountNumber("");
                }}
                placeholder="e.g. 62345678901"
                placeholderTextColor={ui.faint}
                keyboardType="number-pad"
                maxLength={14}
                className="rounded-2xl border-[1.5px] border-[#E9E2F0] bg-[#F7F4FB] px-4 py-3.5 text-[15px] font-JakartaMedium text-[#21152F]"
              />
              {!editingExisting && digits.length > 0 && digits.length < 7 && (
                <Text className="ml-1 mt-1.5 text-[11.5px] font-JakartaMedium text-[#E0575B]">
                  Account numbers are at least 7 digits
                </Text>
              )}
            </View>

            <View className="mt-4 flex-row gap-2.5 rounded-2xl border border-[#E9E2F0] bg-white p-4">
              <Ionicons name="lock-closed-outline" size={16} color="#5A189A" />
              <Text className="flex-1 text-[11.5px] font-Jakarta leading-4 text-[#746A7E]">
                We store only the last four digits of your account number. Full
                details are captured by the payment provider when payouts go
                live.
              </Text>
            </View>

            <View className="mt-6">
              <CustomButton
                title={saving ? "Saving…" : "Save account"}
                loading={saving}
                disabled={!valid || editingExisting}
                onPress={save}
              />
              {editingExisting && (
                <Text className="mt-2.5 text-center text-[11.5px] font-Jakarta text-[#A69BAF]">
                  Tap the account number to replace it
                </Text>
              )}
            </View>
          </ScrollView>
        )}

        <OptionSheet
          visible={sheet === "bank"}
          title="Your bank"
          options={BANKS}
          selected={bank}
          onSelect={setBank}
          onClose={() => setSheet(null)}
        />
        <OptionSheet
          visible={sheet === "type"}
          title="Account type"
          options={ACCOUNT_TYPES}
          selected={accountType}
          onSelect={setAccountType}
          onClose={() => setSheet(null)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default BankDetails;