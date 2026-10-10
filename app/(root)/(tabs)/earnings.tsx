import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState, StatCard } from "@/components/Cards";
import CustomButton from "@/components/CustomButton";
import { ui } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";

const CLEARING_HOURS = 24;
const MIN_WITHDRAWAL = 50;

type Method = "bank" | "paypal" | "voucher" | "cash";

type Payout = {
  id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  created_at: string;
  bank_last4?: string | null;
  method: Method;
  reference_code?: string | null;
  destination?: string | null;
};

type Summary = {
  available: number;
  clearing: number;
  lifetime: number;
  trips_this_week: number;
  earned_this_week: number;
  bank_account_last4?: string | null;
};

const STATUS = {
  pending: { bg: "bg-[#FFF6E5]", text: "text-[#D99A1B]", label: "Processing" },
  paid: { bg: "bg-[#F0E6FA]", text: "text-[#5A189A]", label: "Paid out" },
  failed: { bg: "bg-[#FEF3F3]", text: "text-[#B02A2A]", label: "Failed" },
};

const METHODS: {
  key: Method;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}[] = [
  {
    key: "bank",
    icon: "business-outline",
    title: "Bank transfer",
    subtitle: "1–2 business days",
  },
  {
    key: "paypal",
    icon: "logo-paypal",
    title: "PayPal",
    subtitle: "Sent to your PayPal email",
  },
  {
    key: "voucher",
    icon: "ticket-outline",
    title: "Instant voucher",
    subtitle: "Get a code you can redeem",
  },
  {
    key: "cash",
    icon: "cash-outline",
    title: "Cash pickup",
    subtitle: "Collect at a partner store",
  },
];

const makeCode = (method: Method) => {
  const prefix =
    method === "voucher"
      ? "VCH"
      : method === "cash"
        ? "CASH"
        : method === "paypal"
          ? "PP"
          : "BNK";
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};

const Earnings = () => {
  const { user } = useUser();

  // Real summary from the API — used for "this week" stats and bank last4.
  const [summary, setSummary] = useState<Summary | null>(null);

  // Local mirror of the available balance. Seeded from the API once, then
  // adjusted locally when the driver withdraws so the number moves instantly.
  const [available, setAvailable] = useState<number | null>(null);

  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState<"method" | "amount" | "success">("method");
  const [method, setMethod] = useState<Method | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [receipt, setReceipt] = useState<{
    amount: number;
    method: Method;
    reference?: string | null;
    destination?: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const result = await fetchAPI(
        `/(api)/driver/earnings?clerkId=${encodeURIComponent(user.id)}`,
      );
      const s: Summary | null = result?.data?.summary ?? null;
      setSummary(s);
      setAvailable(s?.available ?? 0);
    } catch (error) {
      console.warn("Could not load earnings", error);
      setSummary(null);
      setAvailable(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load once when the screen first mounts. We don't reload on every focus
  // so a simulated withdrawal doesn't get overwritten when the driver
  // tabs back in.
  useFocusEffect(
    useCallback(() => {
      if (available === null) load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  const bankLast4 = summary?.bank_account_last4 ?? null;
  const hasBank = Boolean(bankLast4);
  const paypalEmail =
    user?.primaryEmailAddress?.emailAddress ?? "your PayPal email";

  const balance = available ?? 0;

  const requested = Number(amount) || 0;
  const amountError = useMemo(() => {
    if (!amount) return null;
    if (requested < MIN_WITHDRAWAL)
      return `Minimum withdrawal is R${MIN_WITHDRAWAL}`;
    if (requested > balance) return "That's more than your available balance";
    return null;
  }, [amount, requested, balance]);

  const canWithdraw = !amountError && requested >= MIN_WITHDRAWAL;

  const openSheet = () => {
    setStep("method");
    setMethod(null);
    setAmount("");
    setReceipt(null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => {
      setStep("method");
      setMethod(null);
      setAmount("");
      setReceipt(null);
    }, 250);
  };

  const chooseMethod = (m: Method) => {
    if (m === "bank" && !hasBank) {
      Alert.alert(
        "No bank account",
        "Add your bank details first, or choose another method.",
        [
          {
            text: "Add bank",
            onPress: () => router.push("/(root)/bank-details"),
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
      return;
    }
    setMethod(m);
    setStep("amount");
  };

  const withdraw = async () => {
    if (!canWithdraw || !method) return;
    setSubmitting(true);

    await new Promise((r) => setTimeout(r, 800));

    const reference =
      method === "bank" ? null : makeCode(method);

    const destination =
      method === "paypal"
        ? paypalEmail
        : method === "bank"
          ? `•••• ${bankLast4}`
          : null;

    // Deduct locally so the number moves.
    setAvailable((prev) => Math.max(0, (prev ?? 0) - requested));

    const payout: Payout = {
      id: `p-${Date.now()}`,
      amount: requested,
      status: "pending",
      created_at: new Date().toISOString(),
      method,
      bank_last4: method === "bank" ? bankLast4 : null,
      reference_code: reference,
      destination,
    };
    setPayouts((prev) => [payout, ...prev]);

    setReceipt({
      amount: requested,
      method,
      reference,
      destination,
    });
    setStep("success");
    setSubmitting(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPayouts([]);
    setAvailable(null);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F4FB]">
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5A189A"
            colors={["#5A189A"]}
          />
        }
      >
        <Text className="my-5 text-2xl font-JakartaExtraBold text-[#21152F]">
          Earnings
        </Text>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#5A189A" />
          </View>
        ) : (
          <>
            {/* Balance Hero Card */}
            <View className="overflow-hidden rounded-3xl bg-[#1D1135] p-6 shadow-xl shadow-black/20">
              <Text className="text-[11.5px] font-JakartaBold uppercase tracking-wider text-white/50">
                Available to withdraw
              </Text>
              <Text className="mt-2 text-[40px] font-JakartaExtraBold leading-tight text-white">
                R{balance.toFixed(2)}
              </Text>

              {(summary?.clearing ?? 0) > 0 && (
                <View className="mt-2 flex-row items-center gap-1.5">
                  <Ionicons name="time-outline" size={13} color="#C77DFF" />
                  <Text className="text-[12px] font-Jakarta text-white/60">
                    R{summary?.clearing.toFixed(2)} clearing — released{" "}
                    {CLEARING_HOURS} hours after each trip
                  </Text>
                </View>
              )}

              <Pressable
                onPress={openSheet}
                disabled={balance < MIN_WITHDRAWAL}
                className={`mt-5 h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-[#5A189A] ${
                  balance < MIN_WITHDRAWAL ? "opacity-40" : "active:opacity-85"
                }`}
              >
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={19}
                  color="#fff"
                />
                <Text className="text-[15px] font-JakartaBold text-white">
                  Withdraw
                </Text>
              </Pressable>

              {balance < MIN_WITHDRAWAL && (
                <Text className="mt-2.5 text-center text-[11.5px] font-Jakarta text-white/50">
                  You can withdraw once you have R{MIN_WITHDRAWAL}
                </Text>
              )}
            </View>

            {/* This week */}
            <Text className="mb-3 mt-6 text-[15px] font-JakartaExtraBold text-[#21152F]">
              This week
            </Text>
            <View className="mb-2 flex-row gap-3">
              <StatCard
                icon="cash-outline"
                label="Earned"
                value={`R${(summary?.earned_this_week ?? 0).toFixed(0)}`}
              />
              <StatCard
                icon="car-sport-outline"
                label="Trips"
                value={String(summary?.trips_this_week ?? 0)}
              />
              <StatCard
                icon="trending-up-outline"
                label="All time"
                value={`R${(summary?.lifetime ?? 0).toFixed(0)}`}
              />
            </View>

            {/* Bank account */}
            <Text className="mb-3 mt-5 text-[15px] font-JakartaExtraBold text-[#21152F]">
              Payout account
            </Text>

            <Pressable
              onPress={() => router.push("/(root)/bank-details")}
              className="mb-2.5 flex-row items-center rounded-2xl border border-[#E9E2F0] bg-white px-4 py-4 active:opacity-80"
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#F0E6FA]">
                <Ionicons name="business-outline" size={18} color="#5A189A" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[14px] font-JakartaSemiBold text-[#21152F]">
                  {hasBank
                    ? `Account ending ${bankLast4}`
                    : "No bank account added"}
                </Text>
                <Text className="mt-0.5 text-[12px] font-Jakarta text-[#746A7E]">
                  {hasBank
                    ? "Payouts are sent here by default"
                    : "Add one to receive bank transfers"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A69BAF" />
            </Pressable>

            {/* History */}
            <Text className="mb-3 mt-5 text-[15px] font-JakartaExtraBold text-[#21152F]">
              Withdrawal history
            </Text>

            {payouts.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="No withdrawals yet"
                message="Once you've completed trips and withdrawn your earnings, every payout appears here."
              />
            ) : (
              payouts.map((payout) => {
                const s = STATUS[payout.status] ?? STATUS.pending;

                const methodLabel =
                  payout.method === "paypal"
                    ? "PayPal"
                    : payout.method === "voucher"
                      ? "Voucher"
                      : payout.method === "cash"
                        ? "Cash pickup"
                        : "Bank transfer";

                return (
                  <View
                    key={payout.id}
                    className="mb-2.5 flex-row items-center rounded-2xl border border-[#E9E2F0] bg-white px-4 py-3.5"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#F7F4FB]">
                      <Ionicons
                        name={
                          payout.method === "paypal"
                            ? "logo-paypal"
                            : payout.method === "voucher"
                              ? "ticket-outline"
                              : payout.method === "cash"
                                ? "cash-outline"
                                : "arrow-down"
                        }
                        size={17}
                        color="#5A189A"
                      />
                    </View>

                    <View className="ml-3 flex-1">
                      <Text className="text-[15px] font-JakartaBold text-[#21152F]">
                        R{Number(payout.amount).toFixed(2)}
                      </Text>
                      <Text className="mt-0.5 text-[11.5px] font-Jakarta text-[#746A7E]">
                        {new Date(payout.created_at).toLocaleDateString(
                          "en-ZA",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                        {` · ${methodLabel}`}
                        {payout.bank_last4 ? ` · ••${payout.bank_last4}` : ""}
                      </Text>
                      {payout.destination && payout.method === "paypal" && (
                        <Text className="mt-0.5 text-[11px] font-JakartaMedium text-[#A69BAF]">
                          {payout.destination}
                        </Text>
                      )}
                      {!!payout.reference_code && (
                        <Text className="mt-0.5 text-[11px] font-JakartaMedium text-[#A69BAF]">
                          Ref {payout.reference_code}
                        </Text>
                      )}
                    </View>

                    <View className={`rounded-full px-2.5 py-1 ${s.bg}`}>
                      <Text
                        className={`text-[10.5px] font-JakartaBold ${s.text}`}
                      >
                        {s.label}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Withdraw sheet */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable
            className="absolute inset-0 bg-black/40"
            onPress={closeSheet}
          />

          <View
            className="rounded-t-3xl bg-white px-6 pt-3"
            style={{ maxHeight: "90%" }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 36 }}
            >
              <View className="mb-5 items-center">
                <View className="h-1 w-11 rounded-full bg-[#E9E2F0]" />
              </View>

              {/* STEP 1 — pick method */}
              {step === "method" && (
                <>
                  <Text className="text-[20px] font-JakartaExtraBold text-[#21152F]">
                    How do you want it?
                  </Text>
                  <Text className="mt-1 text-[13px] font-Jakarta text-[#746A7E]">
                    R{balance.toFixed(2)} available · minimum R
                    {MIN_WITHDRAWAL}
                  </Text>

                  <View className="mt-5 gap-2.5">
                    {METHODS.map((m) => {
                      const disabled = m.key === "bank" && !hasBank;
                      return (
                        <Pressable
                          key={m.key}
                          onPress={() => chooseMethod(m.key)}
                          disabled={disabled}
                          className={`flex-row items-center rounded-2xl border border-[#E9E2F0] bg-white px-4 py-4 active:opacity-80 ${
                            disabled ? "opacity-50" : ""
                          }`}
                        >
                          <View className="h-11 w-11 items-center justify-center rounded-xl bg-[#F0E6FA]">
                            <Ionicons
                              name={m.icon}
                              size={19}
                              color="#5A189A"
                            />
                          </View>
                          <View className="ml-3 flex-1">
                            <Text className="text-[14.5px] font-JakartaSemiBold text-[#21152F]">
                              {m.title}
                            </Text>
                            <Text className="mt-0.5 text-[12px] font-Jakarta text-[#746A7E]">
                              {m.key === "bank" && hasBank
                                ? `Ending ${bankLast4} · ${m.subtitle}`
                                : m.key === "bank" && !hasBank
                                  ? "Add a bank account first"
                                  : m.key === "paypal"
                                    ? `To ${paypalEmail}`
                                    : m.subtitle}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#A69BAF"
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              {/* STEP 2 — amount */}
              {step === "amount" && method && (
                <>
                  <Pressable
                    onPress={() => setStep("method")}
                    className="mb-3 flex-row items-center gap-1.5 self-start active:opacity-70"
                  >
                    <Ionicons name="chevron-back" size={16} color="#5A189A" />
                    <Text className="text-[13px] font-JakartaSemiBold text-[#5A189A]">
                      Change method
                    </Text>
                  </Pressable>

                  <Text className="text-[20px] font-JakartaExtraBold text-[#21152F]">
                    How much?
                  </Text>
                  <Text className="mt-1 text-[13px] font-Jakarta text-[#746A7E]">
                    R{balance.toFixed(2)} available · minimum R
                    {MIN_WITHDRAWAL}
                    {method === "bank" && hasBank
                      ? ` · to ••${bankLast4}`
                      : method === "paypal"
                        ? ` · to ${paypalEmail}`
                        : ""}
                  </Text>

                  <View
                    className={`mt-5 flex-row items-center rounded-2xl border-[1.5px] px-4 ${
                      amountError
                        ? "border-[#E0575B] bg-[#FEF3F3]"
                        : "border-[#E9E2F0] bg-[#F7F4FB]"
                    }`}
                  >
                    <Text className="text-[24px] font-JakartaExtraBold text-[#746A7E]">
                      R
                    </Text>
                    <TextInput
                      value={amount}
                      onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ""))}
                      placeholder="0"
                      placeholderTextColor={ui.faint}
                      keyboardType="number-pad"
                      autoFocus
                      className="ml-2 h-[62px] flex-1 text-[24px] font-JakartaExtraBold text-[#21152F]"
                    />
                    <Pressable
                      onPress={() => setAmount(String(Math.floor(balance)))}
                      className="rounded-full bg-[#F0E6FA] px-3 py-1.5 active:opacity-70"
                    >
                      <Text className="text-[12px] font-JakartaBold text-[#5A189A]">
                        All
                      </Text>
                    </Pressable>
                  </View>

                  {!!amountError && (
                    <View className="mt-2 flex-row items-center gap-1.5">
                      <Ionicons
                        name="alert-circle-outline"
                        size={14}
                        color="#E0575B"
                      />
                      <Text className="text-[12px] font-JakartaMedium text-[#E0575B]">
                        {amountError}
                      </Text>
                    </View>
                  )}

                  <View className="mt-4 flex-row gap-2.5 rounded-2xl border border-[#E9E2F0] p-4">
                    <Ionicons
                      name={
                        method === "paypal"
                          ? "logo-paypal"
                          : method === "voucher"
                            ? "ticket-outline"
                            : method === "cash"
                              ? "cash-outline"
                              : "time-outline"
                      }
                      size={15}
                      color="#5A189A"
                    />
                    <Text className="flex-1 text-[11.5px] font-Jakarta leading-4 text-[#746A7E]">
                      {method === "paypal"
                        ? `Sent to ${paypalEmail} within a few hours.`
                        : method === "voucher"
                          ? "You'll get a voucher code instantly. Redeem it at any partner store."
                          : method === "cash"
                            ? "Collect your cash at a partner store. Bring your ID and the reference code."
                            : "Bank transfers are usually processed within 1–2 business days."}
                    </Text>
                  </View>

                  <View className="mt-5">
                    <CustomButton
                      title={
                        submitting
                          ? "Processing…"
                          : `Withdraw R${requested || 0}`
                      }
                      loading={submitting}
                      disabled={!canWithdraw}
                      onPress={withdraw}
                    />
                  </View>
                </>
              )}

              {/* STEP 3 — success */}
              {step === "success" && receipt && (
                <>
                  <View className="items-center pt-2">
                    <View className="h-16 w-16 items-center justify-center rounded-full bg-[#F0E6FA]">
                      <Ionicons name="checkmark" size={34} color="#5A189A" />
                    </View>
                    <Text className="mt-4 text-[20px] font-JakartaExtraBold text-[#21152F]">
                      Withdrawal requested
                    </Text>
                    <Text className="mt-1 text-center text-[13px] font-Jakarta text-[#746A7E]">
                      R{receipt.amount.toFixed(2)} is being processed
                    </Text>
                  </View>

                  <View className="mt-5 rounded-2xl border border-[#E9E2F0] bg-[#F7F4FB] p-4">
                    <Row
                      label="Amount"
                      value={`R${receipt.amount.toFixed(2)}`}
                    />
                    <Row
                      label="Method"
                      value={
                        receipt.method === "bank"
                          ? "Bank transfer"
                          : receipt.method === "paypal"
                            ? "PayPal"
                            : receipt.method === "voucher"
                              ? "Instant voucher"
                              : "Cash pickup"
                      }
                    />
                    {receipt.method === "paypal" && receipt.destination && (
                      <Row label="PayPal" value={receipt.destination} />
                    )}
                    {receipt.method === "bank" && bankLast4 && (
                      <Row label="Account" value={`•••• ${bankLast4}`} />
                    )}
                    {!!receipt.reference && (
                      <Row label="Reference" value={receipt.reference} />
                    )}
                    <Row label="Status" value="Processing" last />
                  </View>

                  {receipt.method === "paypal" && (
                    <View className="mt-3 flex-row gap-2 rounded-2xl bg-[#EEF2FF] p-3.5">
                      <Ionicons name="logo-paypal" size={15} color="#5A189A" />
                      <Text className="flex-1 text-[11.5px] font-Jakarta leading-4 text-[#5A189A]">
                        We&apos;ll email {receipt.destination} when the transfer
                        is on its way.
                      </Text>
                    </View>
                  )}

                  {receipt.method === "voucher" && receipt.reference && (
                    <View className="mt-3 flex-row gap-2 rounded-2xl bg-[#FFF6E5] p-3.5">
                      <Ionicons
                        name="ticket-outline"
                        size={15}
                        color="#D99A1B"
                      />
                      <Text className="flex-1 text-[11.5px] font-Jakarta leading-4 text-[#D99A1B]">
                        Show code {receipt.reference} at any partner store to
                        redeem.
                      </Text>
                    </View>
                  )}

                  {receipt.method === "cash" && receipt.reference && (
                    <View className="mt-3 flex-row gap-2 rounded-2xl bg-[#FFF6E5] p-3.5">
                      <Ionicons
                        name="cash-outline"
                        size={15}
                        color="#D99A1B"
                      />
                      <Text className="flex-1 text-[11.5px] font-Jakarta leading-4 text-[#D99A1B]">
                        Bring your ID and reference {receipt.reference} to
                        collect.
                      </Text>
                    </View>
                  )}

                  <View className="mt-5">
                    <CustomButton title="Done" onPress={closeSheet} />
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const Row = ({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) => (
  <View
    className={`flex-row items-center justify-between py-2 ${
      last ? "" : "border-b border-[#E9E2F0]"
    }`}
  >
    <Text className="text-[12.5px] font-Jakarta text-[#746A7E]">{label}</Text>
    <Text className="text-[13px] font-JakartaSemiBold text-[#21152F]">
      {value}
    </Text>
  </View>
);

export default Earnings;