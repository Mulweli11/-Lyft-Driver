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
import { brand, ui } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";

type Vehicle = {
  make: string;
  model: string;
  year: string;
  colour: string;
  plate: string;
  seats: number;
};

const EMPTY: Vehicle = {
  make: "",
  model: "",
  year: "",
  colour: "",
  plate: "",
  seats: 3,
};

const FIELDS: {
  key: keyof Omit<Vehicle, "seats">;
  label: string;
  placeholder: string;
  autoCapitalize?: "characters" | "words";
  keyboardType?: "number-pad" | "default";
  maxLength?: number;
}[] = [
  { key: "make", label: "Make", placeholder: "e.g. Toyota", autoCapitalize: "words" },
  { key: "model", label: "Model", placeholder: "e.g. Corolla", autoCapitalize: "words" },
  { key: "year", label: "Year", placeholder: "e.g. 2019", keyboardType: "number-pad", maxLength: 4 },
  { key: "colour", label: "Colour", placeholder: "e.g. White", autoCapitalize: "words" },
  {
    key: "plate",
    label: "Registration",
    placeholder: "e.g. ND 123-456",
    autoCapitalize: "characters",
    maxLength: 12,
  },
];

const VehicleDetails = () => {
  const { user } = useUser();
  const [vehicle, setVehicle] = useState<Vehicle>(EMPTY);
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
          const stored = result?.data?.vehicle;
          if (stored) setVehicle({ ...EMPTY, ...stored });
        } catch (error) {
          console.warn("Could not load vehicle", error);
        } finally {
          setLoading(false);
        }
      })();
    }, [user?.id]),
  );

  const set = (key: keyof Vehicle, value: string | number) =>
    setVehicle((v) => ({ ...v, [key]: value }));

  const yearNumber = Number(vehicle.year);
  const yearValid =
    vehicle.year.length === 4 &&
    yearNumber >= 1990 &&
    yearNumber <= new Date().getFullYear() + 1;

  const complete =
    vehicle.make.trim() &&
    vehicle.model.trim() &&
    yearValid &&
    vehicle.colour.trim() &&
    vehicle.plate.trim().length >= 5;

  const save = async () => {
    if (!complete || !user?.id) return;
    setSaving(true);

    try {
      await fetchAPI("/(api)/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          vehicle: {
            ...vehicle,
            make: vehicle.make.trim(),
            model: vehicle.model.trim(),
            year: vehicle.year.trim(),
            colour: vehicle.colour.trim(),
            plate: vehicle.plate.trim().toUpperCase(),
          },
        }),
      });
      router.back();
    } catch (error) {
      Alert.alert(
        "Couldn't save",
        error instanceof Error
          ? error.message
          : "Please check your connection and try again.",
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
            Your vehicle
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
              Passengers see the make, colour and registration so they can find
              you at pickup. It must match your licence disc.
            </Text>

            <View className="rounded-3xl border border-[#E9E2F0] bg-white p-6 shadow-sm">
              {FIELDS.map((field) => (
                <View key={field.key} className="mb-4">
                  <Text className="mb-2 text-[12.5px] font-JakartaSemiBold text-[#746A7E]">
                    {field.label}
                  </Text>
                  <TextInput
                    value={String(vehicle[field.key] ?? "")}
                    onChangeText={(v) => set(field.key, v)}
                    placeholder={field.placeholder}
                    placeholderTextColor={ui.faint}
                    autoCapitalize={field.autoCapitalize ?? "sentences"}
                    keyboardType={field.keyboardType ?? "default"}
                    maxLength={field.maxLength}
                    className="rounded-2xl border-[1.5px] border-[#E9E2F0] bg-[#F7F4FB] px-4 py-3.5 text-[15px] font-JakartaMedium text-[#21152F]"
                  />
                  {field.key === "year" && vehicle.year.length === 4 && !yearValid && (
                    <Text className="ml-1 mt-1.5 text-[11.5px] font-JakartaMedium text-[#E0575B]">
                      Enter a year between 1990 and {new Date().getFullYear() + 1}
                    </Text>
                  )}
                </View>
              ))}

              <Text className="mb-2 text-[12.5px] font-JakartaSemiBold text-[#746A7E]">
                Seats for passengers
              </Text>
              <View className="flex-row items-center justify-between rounded-2xl border-[1.5px] border-[#E9E2F0] bg-[#F7F4FB] px-4 py-3">
                <Text className="text-[15px] font-JakartaBold text-[#21152F]">
                  {vehicle.seats} {vehicle.seats === 1 ? "seat" : "seats"}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => set("seats", Math.max(1, vehicle.seats - 1))}
                    className="h-9 w-9 items-center justify-center rounded-full bg-white active:opacity-70"
                  >
                    <Ionicons name="remove" size={18} color="#5A189A" />
                  </Pressable>
                  <Pressable
                    onPress={() => set("seats", Math.min(6, vehicle.seats + 1))}
                    className="h-9 w-9 items-center justify-center rounded-full bg-[#5A189A] active:opacity-70"
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                  </Pressable>
                </View>
              </View>
              <Text className="ml-1 mt-1.5 text-[11px] font-Jakarta text-[#A69BAF]">
                Not counting the driver's seat
              </Text>
            </View>

            <View className="mt-6">
              <CustomButton
                title={saving ? "Saving…" : "Save vehicle"}
                loading={saving}
                disabled={!complete}
                onPress={save}
              />
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default VehicleDetails;
