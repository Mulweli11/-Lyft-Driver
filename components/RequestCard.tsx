import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Linking, Pressable, Text, View } from "react-native";

import { brand, ui } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import { formatDate, formatTime } from "@/lib/utils";
import { Ride } from "@/types/type";

type Props = {
  ride: Ride;
  onChanged?: () => void;
};

const STATUS = {
  booked: { bg: "bg-[#FFF6E5]", text: "text-[#D99A1B]", label: "Awaiting your response" },
  accepted: { bg: "bg-[#F0E6FA]", text: "text-[#5A189A]", label: "Accepted" },
  in_progress: { bg: "bg-[#F0E6FA]", text: "text-[#5A189A]", label: "In progress" },
  completed: { bg: "bg-[#F7F4FB]", text: "text-[#746A7E]", label: "Completed" },
  cancelled: { bg: "bg-[#FEF3F3]", text: "text-[#B02A2A]", label: "Cancelled" },
} as const;

type Action = "accept" | "decline" | "start" | "complete";

const Action = ({
  icon,
  label,
  onPress,
  tone = "default",
  busy,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  tone?: "default" | "primary" | "danger";
  busy?: boolean;
}) => {
  const s =
    tone === "primary"
      ? { box: "bg-[#5A189A]", text: "text-white", icon: "#FFFFFF" }
      : tone === "danger"
        ? { box: "bg-[#FEF3F3]", text: "text-[#B02A2A]", icon: "#B02A2A" }
        : { box: "bg-[#F7F4FB]", text: "text-[#21152F]", icon: "#21152F" };

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || busy}
      accessibilityRole="button"
      className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-3 ${s.box} ${
        onPress && !busy ? "active:opacity-75" : "opacity-50"
      }`}
    >
      <Ionicons name={icon} size={15} color={s.icon} />
      <Text className={`text-[12.5px] font-JakartaBold ${s.text}`}>{label}</Text>
    </Pressable>
  );
};

const RequestCard = ({ ride, onChanged }: Props) => {
  const [status, setStatus] = useState<string>((ride as any).status ?? "booked");
  const [busy, setBusy] = useState(false);

  const passenger = (ride as any).passenger;
  const passengerName = passenger
    ? `${passenger.first_name ?? ""} ${passenger.last_name ?? ""}`.trim() || "Passenger"
    : "Passenger";

  const seats = (ride as any).seats_booked ?? 1;
  const fare = ((ride as any).fare_price ?? 0) / 100;
  const duration = (ride as any).duration_minutes;
  const when = (ride as any).scheduled_for ?? ride.created_at;

  const s = (STATUS as any)[status] ?? STATUS.booked;

  const run = async (action: Action, nextStatus: string) => {
    const rideId = (ride as any).ride_id;
    if (!rideId) return;

    const previous = status;
    setStatus(nextStatus);
    setBusy(true);

    try {
      await fetchAPI(`/(api)/ride/${rideId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      onChanged?.();
    } catch (error: any) {
      setStatus(previous);
      Alert.alert(
        "Couldn't update",
        error?.message ?? "Please check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDecline = () =>
    Alert.alert(
      "Decline this booking?",
      "The seat is released and the passenger is refunded. Declining often affects your rating.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => run("decline", "cancelled"),
        },
      ],
    );

  const call = () => {
    const phone = passenger?.phone_number;
    if (!phone) {
      Alert.alert(
        "No number available",
        "This passenger hasn't shared a phone number. Send a message instead.",
      );
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View className="mb-4 overflow-hidden rounded-3xl border border-[#E9E2F0] bg-white">
      {/* Map */}
      <View className="relative">
        <Image
          source={{
            uri: `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=400&center=lonlat:${ride.destination_longitude},${ride.destination_latitude}&zoom=14&apiKey=${process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY}`,
          }}
          className="h-32 w-full bg-[#F0E6FA]"
        />
        <View className={`absolute right-3 top-3 rounded-full px-3 py-1.5 ${s.bg}`}>
          <Text className={`text-[11px] font-JakartaBold ${s.text}`}>{s.label}</Text>
        </View>
      </View>

      <View className="p-4">
        {/* Route */}
        <View className="flex-row">
          <View className="mr-3 items-center pt-1.5">
            <View className="h-2.5 w-2.5 rounded-full bg-[#9D4EDD]" />
            <View className="my-1 w-[1.5px] flex-1 bg-[#E9E2F0]" />
            <View className="h-2.5 w-2.5 rounded-[3px] bg-[#5A189A]" />
          </View>

          <View className="flex-1">
            <Text
              className="text-[13.5px] font-JakartaSemiBold text-[#21152F]"
              numberOfLines={1}
            >
              {ride.origin_address}
            </Text>
            <Text className="mb-3 mt-0.5 text-[11px] font-Jakarta text-[#746A7E]">
              Collect from
            </Text>

            <Text
              className="text-[13.5px] font-JakartaSemiBold text-[#21152F]"
              numberOfLines={1}
            >
              {ride.destination_address}
            </Text>
            <Text className="mt-0.5 text-[11px] font-Jakarta text-[#746A7E]">
              Drop at
            </Text>
          </View>
        </View>

        {/* Facts */}
        <View className="mt-4 flex-row items-center justify-around rounded-2xl bg-[#F7F4FB] py-3">
          <View className="items-center">
            <Ionicons name="calendar-outline" size={15} color="#5A189A" />
            <Text className="mt-1 text-[12.5px] font-JakartaBold text-[#21152F]">
              {formatDate(when)}
            </Text>
            <Text className="text-[10px] font-Jakarta text-[#746A7E]">Departs</Text>
          </View>

          <View className="h-8 w-[1px] bg-[#E9E2F0]" />

          <View className="items-center">
            <Ionicons name="people-outline" size={15} color="#5A189A" />
            <Text className="mt-1 text-[12.5px] font-JakartaBold text-[#21152F]">
              {seats}
            </Text>
            <Text className="text-[10px] font-Jakarta text-[#746A7E]">
              {seats === 1 ? "Seat" : "Seats"}
            </Text>
          </View>

          <View className="h-8 w-[1px] bg-[#E9E2F0]" />

          <View className="items-center">
            <Ionicons name="wallet-outline" size={15} color="#5A189A" />
            <Text className="mt-1 text-[12.5px] font-JakartaBold text-[#5A189A]">
              R{fare.toFixed(2)}
            </Text>
            <Text className="text-[10px] font-Jakarta text-[#746A7E]">You earn</Text>
          </View>
        </View>

        {/* Passenger */}
        <View className="mt-4 flex-row items-center gap-2.5">
          {passenger?.profile_image_url ? (
            <Image
              source={{ uri: passenger.profile_image_url }}
              className="h-10 w-10 rounded-full bg-[#F0E6FA]"
            />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#F0E6FA]">
              <Ionicons name="person" size={17} color="#5A189A" />
            </View>
          )}

          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[13.5px] font-JakartaBold text-[#21152F]">
                {passengerName}
              </Text>
              {passenger?.verification_status === "approved" && (
                <View className="flex-row items-center gap-0.5 rounded-full bg-[#F0E6FA] px-1.5 py-0.5">
                  <Ionicons name="shield-checkmark" size={9} color="#5A189A" />
                  <Text className="text-[9.5px] font-JakartaBold text-[#5A189A]">
                    ID verified
                  </Text>
                </View>
              )}
            </View>
            <Text className="mt-0.5 text-[11px] font-Jakarta text-[#746A7E]">
              {ride.payment_status === "paid" ? "Paid in app" : "Payment pending"}
              {duration ? ` · ${formatTime(duration)} trip` : ""}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="mt-4 flex-row gap-2">
          {status === "booked" && (
            <>
              <Action
                icon="checkmark-circle-outline"
                label="Accept"
                tone="primary"
                busy={busy}
                onPress={() => run("accept", "accepted")}
              />
              <Action
                icon="close-circle-outline"
                label="Decline"
                tone="danger"
                busy={busy}
                onPress={confirmDecline}
              />
            </>
          )}

          {status === "accepted" && (
            <>
              <Action
                icon="play-circle-outline"
                label="Start"
                tone="primary"
                busy={busy}
                onPress={() => run("start", "in_progress")}
              />
              <Action
                icon="chatbubble-ellipses-outline"
                label="Message"
                busy={busy}
                onPress={() =>
                  router.push({
                    pathname: "/(root)/chat/[rideId]",
                    params: { rideId: String((ride as any).ride_id) },
                  })
                }
              />
              <Action icon="call-outline" label="Call" busy={busy} onPress={call} />
            </>
          )}

          {status === "in_progress" && (
            <Action
              icon="chatbubble-ellipses-outline"
              label="Message"
              busy={busy}
              onPress={() =>
                router.push({
                  pathname: "/(root)/chat/[rideId]",
                  params: { rideId: String((ride as any).ride_id) },
                })
              }
            />
          )}

          {status === "in_progress" && (
            <Action
              icon="flag-outline"
              label="End trip"
              tone="primary"
              busy={busy}
              onPress={() => run("complete", "completed")}
            />
          )}

          {(status === "completed" || status === "cancelled") && (
            <View className="flex-1 items-center rounded-xl bg-[#F7F4FB] py-3">
              <Text className="text-[12.5px] font-JakartaMedium text-[#746A7E]">
                {status === "completed"
                  ? "Trip completed — earnings added to your balance"
                  : "This booking was cancelled"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default RequestCard;
