import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import CustomButton from "@/components/CustomButton";
import GoogleTextInput from "@/components/GoogleTextInput";
import RideLayout from "@/components/RideLayout";
import { fetchAPI } from "@/lib/fetch";
import { useLocationStore } from "@/store";

// Departure times as chips rather than a date picker — drivers list commutes,
// and a commute leaves at one of about a dozen sensible times. Tapping "06:30"
// is faster than spinning a wheel, and it needs no extra dependency.
const TIMES = [
  "05:00", "05:30", "06:00", "06:30", "07:00", "07:30",
  "08:00", "12:00", "15:00", "16:00", "16:30", "17:00", "17:30", "18:00",
];

const DAYS = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
  { key: "sun", label: "S" },
];

const CreateTrip = () => {
  const { user } = useUser();
  const {
    userAddress,
    userLatitude,
    userLongitude,
    destinationAddress,
    destinationLatitude,
    destinationLongitude,
    setUserLocation,
    setDestinationLocation,
  } = useLocationStore();

  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(40);
  const [when, setWhen] = useState<"today" | "tomorrow">("tomorrow");
  const [time, setTime] = useState<string | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const ready = Boolean(userAddress && destinationAddress && time);

  const toggleDay = (key: string) =>
    setDays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key],
    );

  // What the driver actually takes home, stated plainly. Hiding the commission
  // until payout is the fastest way to lose a driver's trust.
  const earnings = useMemo(() => {
    const gross = seats * price;
    const commission = Math.round(gross * 0.1);
    return { gross, commission, net: gross - commission };
  }, [seats, price]);

  const swap = () => {
    if (
      !userAddress || !destinationAddress ||
      userLatitude == null || userLongitude == null ||
      destinationLatitude == null || destinationLongitude == null
    ) return;

    const pickup = { latitude: userLatitude, longitude: userLongitude, address: userAddress };
    setUserLocation({
      latitude: destinationLatitude,
      longitude: destinationLongitude,
      address: destinationAddress,
    });
    setDestinationLocation(pickup);
  };

  const publish = async () => {
    if (!ready || !user?.id) return;
    setSaving(true);

    try {
      const departure = new Date();
      if (when === "tomorrow") departure.setDate(departure.getDate() + 1);
      const [h, m] = (time as string).split(":").map(Number);
      departure.setHours(h, m, 0, 0);

      await fetchAPI("/(api)/trip/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          origin_address: userAddress,
          origin_latitude: userLatitude,
          origin_longitude: userLongitude,
          destination_address: destinationAddress,
          destination_latitude: destinationLatitude,
          destination_longitude: destinationLongitude,
          departure_at: departure.toISOString(),
          seats_total: seats,
          price_per_seat: price,
          repeat_days: days,
        }),
      });

      Alert.alert(
        "Trip published",
        "Passengers on your route can now book a seat. You'll be notified for each booking.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error: any) {
      Alert.alert(
        "Couldn't publish",
        error?.message ?? "Please check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <RideLayout
      title="Offer a trip"
      subtitle="List the seats you have spare"
      snapPoints={["62%", "92%"]}
    >
      <View className="flex-1">
        {/* ── Route ── */}
        {/* zIndex keeps each suggestion dropdown ABOVE the fields below it;
            without this the sections paint in document order and the list
            shows through the swap button and the next input */}
        <View className="mt-3" style={{ zIndex: 30 }}>
          <View className="mb-2 flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full bg-[#1FB574]" />
            <Text className="text-[13px] font-JakartaBold text-[#101814]">
              Leaving from
            </Text>
          </View>
          <GoogleTextInput
            initialLocation={userAddress ?? "Your starting point"}
            biasLat={userLatitude}
            biasLng={userLongitude}
            handlePress={(location) => setUserLocation(location)}
          />
        </View>

        <View className="my-2 flex-row items-center" style={{ zIndex: 1 }}>
          <View className="ml-[5px] h-8 w-[1.5px] bg-[#E2E9E5]" />
          <Pressable
            onPress={swap}
            className="ml-auto h-9 w-9 items-center justify-center rounded-full border border-[#E2E9E5] bg-white active:opacity-75"
          >
            <Ionicons name="swap-vertical" size={16} color="#0E5C3F" />
          </Pressable>
        </View>

        <View style={{ zIndex: 20 }}>
          <View className="mb-2 flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-[3px] bg-[#0E5C3F]" />
            <Text className="text-[13px] font-JakartaBold text-[#101814]">
              Going to
            </Text>
          </View>
          <GoogleTextInput
            initialLocation={destinationAddress ?? "Your destination"}
            biasLat={userLatitude}
            biasLng={userLongitude}
            handlePress={(location) => setDestinationLocation(location)}
          />
        </View>

        {/* ── When ── */}
        <Text className="mb-2.5 mt-6 text-[13px] font-JakartaBold text-[#101814]">
          When are you leaving?
        </Text>

        <View className="mb-3 flex-row rounded-2xl bg-[#EEF1F0] p-1">
          {(["today", "tomorrow"] as const).map((key) => {
            const active = when === key;
            return (
              <Pressable
                key={key}
                onPress={() => setWhen(key)}
                className={`flex-1 items-center rounded-xl py-2.5 ${active ? "bg-white" : ""}`}
              >
                <Text
                  className={`text-[13px] capitalize ${
                    active
                      ? "font-JakartaBold text-[#0E5C3F]"
                      : "font-JakartaMedium text-[#68756F]"
                  }`}
                >
                  {key}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row flex-wrap gap-2">
          {TIMES.map((t) => {
            const active = time === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTime(t)}
                className={`rounded-xl border-[1.5px] px-3.5 py-2.5 ${
                  active
                    ? "border-[#0E5C3F] bg-[#E6F2EC]"
                    : "border-[#E2E9E5] bg-white"
                } active:opacity-80`}
              >
                <Text
                  className={`text-[13px] ${
                    active
                      ? "font-JakartaBold text-[#0E5C3F]"
                      : "font-JakartaMedium text-[#4A5450]"
                  }`}
                >
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Repeat ── */}
        <Text className="mb-2 mt-6 text-[13px] font-JakartaBold text-[#101814]">
          Repeat weekly
        </Text>
        <Text className="mb-2.5 text-[11.5px] font-Jakarta text-[#9BA6A1]">
          Most drivers do the same run every weekday. Select days to publish it
          once instead of every morning.
        </Text>

        <View className="flex-row gap-2">
          {DAYS.map((day, i) => {
            const active = days.includes(day.key);
            return (
              <Pressable
                key={day.key}
                onPress={() => toggleDay(day.key)}
                accessibilityLabel={day.key}
                className={`h-11 flex-1 items-center justify-center rounded-xl border-[1.5px] ${
                  active
                    ? "border-[#0E5C3F] bg-[#0E5C3F]"
                    : "border-[#E2E9E5] bg-white"
                } active:opacity-80`}
              >
                <Text
                  className={`text-[13px] font-JakartaBold ${
                    active ? "text-white" : "text-[#68756F]"
                  }`}
                >
                  {day.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Seats ── */}
        <Text className="mb-2.5 mt-6 text-[13px] font-JakartaBold text-[#101814]">
          Seats available
        </Text>

        <View className="flex-row items-center justify-between rounded-2xl border border-[#E2E9E5] bg-white px-4 py-3">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#E6F2EC]">
              <Ionicons name="people-outline" size={18} color="#0E5C3F" />
            </View>
            <Text className="text-[15px] font-JakartaBold text-[#101814]">
              {seats} {seats === 1 ? "seat" : "seats"}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setSeats((s) => Math.max(1, s - 1))}
              className="h-9 w-9 items-center justify-center rounded-full bg-[#F5F8F6] active:opacity-70"
            >
              <Ionicons name="remove" size={18} color="#0E5C3F" />
            </Pressable>
            <Pressable
              onPress={() => setSeats((s) => Math.min(6, s + 1))}
              className="h-9 w-9 items-center justify-center rounded-full bg-[#0E5C3F] active:opacity-70"
            >
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* ── Price ── */}
        <Text className="mb-2.5 mt-6 text-[13px] font-JakartaBold text-[#101814]">
          Price per seat
        </Text>

        <View className="flex-row items-center justify-between rounded-2xl border border-[#E2E9E5] bg-white px-4 py-3">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#E6F2EC]">
              <Ionicons name="pricetag-outline" size={18} color="#0E5C3F" />
            </View>
            <Text className="text-[15px] font-JakartaBold text-[#101814]">
              R{price}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setPrice((p) => Math.max(10, p - 5))}
              className="h-9 w-9 items-center justify-center rounded-full bg-[#F5F8F6] active:opacity-70"
            >
              <Ionicons name="remove" size={18} color="#0E5C3F" />
            </Pressable>
            <Pressable
              onPress={() => setPrice((p) => Math.min(500, p + 5))}
              className="h-9 w-9 items-center justify-center rounded-full bg-[#0E5C3F] active:opacity-70"
            >
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* ── Earnings preview ── */}
        <View className="mt-5 rounded-2xl bg-[#E6F2EC] p-4">
          <Text className="text-[11px] font-JakartaBold uppercase tracking-wider text-[#0E5C3F]">
            If all seats fill
          </Text>

          <View className="mt-3 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] font-Jakarta text-[#4A5450]">
                {seats} seats × R{price}
              </Text>
              <Text className="text-[12.5px] font-JakartaMedium text-[#101814]">
                R{earnings.gross}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] font-Jakarta text-[#4A5450]">
                Service fee (10%)
              </Text>
              <Text className="text-[12.5px] font-JakartaMedium text-[#101814]">
                −R{earnings.commission}
              </Text>
            </View>
            <View className="mt-1 h-[1px] bg-[#C9E3D7]" />
            <View className="flex-row justify-between">
              <Text className="text-[14px] font-JakartaBold text-[#0E5C3F]">
                You receive
              </Text>
              <Text className="text-[18px] font-JakartaExtraBold text-[#0E5C3F]">
                R{earnings.net}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-6">
          <CustomButton
            title={
              saving
                ? "Publishing…"
                : ready
                  ? "Publish trip"
                  : "Add route and departure time"
            }
            loading={saving}
            disabled={!ready}
            onPress={publish}
          />
        </View>
      </View>
    </RideLayout>
  );
};

export default CreateTrip;