import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
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
  const { getToken } = useAuth();
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
  const [publishedTrips, setPublishedTrips] = useState<any[]>([]);
  const [showPublishedTrips, setShowPublishedTrips] = useState(false);
  const [editingTripId, setEditingTripId] = useState<number | string | null>(null);
  const [tripCheckComplete, setTripCheckComplete] = useState(false);
  const [tripLoadError, setTripLoadError] = useState<string | null>(null);
  const [cancellingTripId, setCancellingTripId] = useState<number | string | null>(null);

  const loadExistingTrips = async () => {
    if (!user?.id) return [];

    try {
      const token = await getToken();
      const response = await fetchAPI("/(api)/trip", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const trips = Array.isArray(response?.data) ? response.data : [];

      setTripLoadError(null);
      setPublishedTrips(trips);
      setShowPublishedTrips(trips.length > 0);
      setTripCheckComplete(true);

      return trips;
    } catch (error: any) {
      setTripLoadError(error?.message ?? "Unable to load your published trip.");
      setPublishedTrips([]);
      setShowPublishedTrips(false);
      setTripCheckComplete(true);
      throw error;
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setTripCheckComplete(false);
      return;
    }

    setTripCheckComplete(false);
    loadExistingTrips().catch(() => {});
  }, [user?.id]);

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
    const tripIdToEdit = editingTripId;

    try {
      const existingTrips = await loadExistingTrips();

      if (existingTrips.length > 0 && !tripIdToEdit) {
        setPublishedTrips(existingTrips);
        setShowPublishedTrips(true);
        return;
      }

      const departure = new Date();
      if (when === "tomorrow") departure.setDate(departure.getDate() + 1);
      const [h, m] = (time as string).split(":").map(Number);
      departure.setHours(h, m, 0, 0);

      const payload = {
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
      };

      const token = await getToken();
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const tripResponse = tripIdToEdit
        ? await fetchAPI(`/(api)/trip/${tripIdToEdit}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify(payload),
          })
        : await fetchAPI("/(api)/trip/create", {
            method: "POST",
          headers,
            body: JSON.stringify(payload),
          });

      const tripRecord = {
        id: tripIdToEdit ?? Date.now(),
        leaving_from: userAddress,
        going_to: destinationAddress,
        leaving_from_lat: userLatitude,
        leaving_from_lng: userLongitude,
        going_to_lat: destinationLatitude,
        going_to_lng: destinationLongitude,
        departure_date: departure.toISOString().slice(0, 10),
        departure_time: time,
        seats_available: seats,
        price_per_seat: price,
        repeat_days: days,
        status: "active",
        ...(tripResponse?.data ?? {}),
      };

      if (tripIdToEdit) {
        setPublishedTrips((prev) =>
          prev.map((trip) => (trip.id === tripIdToEdit ? tripRecord : trip)),
        );
      } else {
        setPublishedTrips((prev) => [tripRecord, ...prev]);
      }

      setEditingTripId(null);
      setShowPublishedTrips(true);
    } catch (error: any) {
      Alert.alert(
        "Couldn't publish",
        error?.message ?? "Please check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditTrip = (trip: any) => {
    if (!trip) return;

    if (trip.leaving_from) {
      setUserLocation({
        latitude: trip.leaving_from_lat ?? userLatitude ?? 0,
        longitude: trip.leaving_from_lng ?? userLongitude ?? 0,
        address: trip.leaving_from,
      });
    }

    if (trip.going_to) {
      setDestinationLocation({
        latitude: trip.going_to_lat ?? destinationLatitude ?? 0,
        longitude: trip.going_to_lng ?? destinationLongitude ?? 0,
        address: trip.going_to,
      });
    }

    setSeats(Number(trip.seats_available ?? 3));
    setPrice(Number(trip.price_per_seat ?? 40));
    setDays(Array.isArray(trip.repeat_days) ? trip.repeat_days : []);

    if (trip.departure_time) {
      setTime(trip.departure_time);
    }

    const tripDate = trip.departure_date ? new Date(trip.departure_date) : new Date();
    const isToday = tripDate.toDateString() === new Date().toDateString();
    setWhen(isToday ? "today" : "tomorrow");
    setEditingTripId(trip.id ?? null);
    setShowPublishedTrips(false);
  };

  const cancelTrip = (trip: any) => {
    if (!trip?.id || !user?.id) return;

    Alert.alert(
      "Cancel this trip?",
      "Passengers will no longer be able to book this trip.",
      [
        { text: "Keep trip", style: "cancel" },
        {
          text: "Cancel trip",
          style: "destructive",
          onPress: async () => {
            setCancellingTripId(trip.id);
            try {
              const token = await getToken();
              await fetchAPI(`/(api)/trip/${trip.id}`, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });

              setPublishedTrips((prev) => prev.filter((item) => item.id !== trip.id));
              setEditingTripId(null);
              setShowPublishedTrips(false);
            } catch (error: any) {
              Alert.alert(
                "Couldn't cancel trip",
                error?.message ?? "Please try again.",
              );
            } finally {
              setCancellingTripId(null);
            }
          },
        },
      ],
    );
  };

  if (tripCheckComplete && showPublishedTrips && publishedTrips.length > 0) {
    return (
      <RideLayout
        title="Your trips"
        subtitle="Your published rides"
        snapPoints={["62%", "92%"]}
      >
        <View className="flex-1">
          <Pressable
            onPress={() => {
              setEditingTripId(null);
              setShowPublishedTrips(false);
            }}
            className="mb-4 rounded-2xl bg-[#0E5C3F] px-4 py-3"
          >
            <Text className="text-center text-[14px] font-JakartaBold text-white">
              + Offer another trip
            </Text>
          </Pressable>

          <Text className="mb-3 text-[13px] font-Jakarta text-[#68756F]">
            Your published rides appear here, and you can edit them before departure.
          </Text>

          {publishedTrips.map((trip) => (
            <View
              key={trip.id}
              className="mb-3 rounded-2xl border border-[#E2E9E5] bg-white p-4"
            >
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-[15px] font-JakartaExtraBold text-[#101814]">
                  {trip.leaving_from}
                </Text>
                <Text className="text-[12px] font-JakartaBold text-[#0E5C3F]">
                  {trip.status ?? "active"}
                </Text>
              </View>

              <Text className="mb-2 text-[13px] font-JakartaMedium text-[#4A5450]">
                to {trip.going_to}
              </Text>

              <View className="mb-2 flex-row flex-wrap gap-2">
                <Text className="rounded-full bg-[#E6F2EC] px-2 py-1 text-[11px] font-JakartaBold text-[#0E5C3F]">
                  {trip.departure_date}
                </Text>
                <Text className="rounded-full bg-[#EEF1F0] px-2 py-1 text-[11px] font-JakartaBold text-[#68756F]">
                  {trip.departure_time}
                </Text>
                <Text className="rounded-full bg-[#EEF1F0] px-2 py-1 text-[11px] font-JakartaBold text-[#68756F]">
                  {trip.seats_available} seats
                </Text>
              </View>

              <Text className="mb-3 text-[13px] font-Jakarta text-[#68756F]">
                R{trip.price_per_seat} per seat
              </Text>

              <Pressable
                onPress={() => handleEditTrip(trip)}
                className="rounded-xl border border-[#D8E8E2] bg-[#F5FAF8] px-3 py-2"
              >
                <Text className="text-center text-[13px] font-JakartaBold text-[#0E5C3F]">
                  Edit trip
                </Text>
              </Pressable>

              <Pressable
                onPress={() => cancelTrip(trip)}
                disabled={cancellingTripId === trip.id}
                className="mt-2 rounded-xl border border-[#F0CACA] bg-[#FEF3F3] px-3 py-2"
              >
                <Text className="text-center text-[13px] font-JakartaBold text-[#B02A2A]">
                  {cancellingTripId === trip.id ? "Cancelling..." : "Cancel trip"}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </RideLayout>
    );
  }

  if (!tripCheckComplete) {
    return (
      <RideLayout
        title="Offer a trip"
        subtitle="Checking your current trip"
        snapPoints={["62%", "92%"]}
      >
        <View className="flex-1 items-center justify-center py-10">
          <Text className="text-[13px] font-Jakarta text-[#68756F]">
            Loading your trip…
          </Text>
        </View>
      </RideLayout>
    );
  }

  if (tripLoadError) {
    return (
      <RideLayout
        title="Offer a trip"
        subtitle="Could not load your current trip"
        snapPoints={["62%", "92%"]}
      >
        <View className="flex-1 items-center justify-center py-10">
          <Text className="mb-4 text-center text-[13px] font-Jakarta text-[#68756F]">
            Your trip could not be loaded. Try again before publishing.
          </Text>
          <Pressable
            onPress={() => {
              setTripCheckComplete(false);
              loadExistingTrips().catch(() => {});
            }}
            className="rounded-xl bg-[#0E5C3F] px-5 py-3"
          >
            <Text className="text-[13px] font-JakartaBold text-white">Try again</Text>
          </Pressable>
        </View>
      </RideLayout>
    );
  }

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