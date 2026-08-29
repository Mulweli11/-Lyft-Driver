import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SectionCard, StatCard } from "@/components/Cards";
import { fetchAPI } from "@/lib/fetch";
import {
    PickedImage,
    captureImage,
    pickFromLibrary,
    uploadAvatar,
} from "@/lib/verification";

// Replace with your real support details
const SUPPORT_EMAIL = "drivers@lyftcarpool.co.za";
const SUPPORT_WHATSAPP = "27110000000";

const Profile = () => {
  const { user } = useUser();
  const { signOut } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const result = await fetchAPI(
        `/(api)/profile?clerkId=${encodeURIComponent(user.id)}`,
      );
      setProfile(result?.data ?? null);
    } catch (error) {
      console.warn("Could not load profile", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const vehicle = profile?.profile_data?.vehicle ?? {};
  const driverStatus = profile?.driver_verification_status ?? "not_submitted";
  const approved = driverStatus === "approved";

  const changePhoto = () => {
    const run = async (fn: () => Promise<PickedImage | null>) => {
      try {
        const image = await fn();
        if (!image || !user?.id) return;
        setSaving(true);
        const url = await uploadAvatar(user.id, image);
        await fetchAPI("/(api)/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerkId: user.id, profile_image_url: url }),
        });
        await load();
      } catch (error: any) {
        Alert.alert("Photo upload", error?.message ?? "Please try again.");
      } finally {
        setSaving(false);
      }
    };

    Alert.alert("Profile photo", "Passengers see this when they book you.", [
      { text: "Take a photo", onPress: () => run(() => captureImage(true)) },
      { text: "Choose from library", onPress: () => run(pickFromLibrary) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert("Sign out?", "You'll stop receiving booking requests.", [
      { text: "Stay", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F8F6]">
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="my-5 text-2xl font-JakartaExtraBold text-[#101814]">
          Profile
        </Text>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#0E5C3F" />
          </View>
        ) : (
          <>
            {/* Identity */}
            <View className="items-center rounded-3xl border border-[#E2E9E5] bg-white px-5 py-6">
              <Pressable onPress={changePhoto} className="relative active:opacity-80">
                {profile?.profile_image_url ? (
                  <Image
                    source={{ uri: profile.profile_image_url }}
                    className="h-24 w-24 rounded-full bg-[#EEF1F0]"
                  />
                ) : (
                  <View className="h-24 w-24 items-center justify-center rounded-full bg-[#E6F2EC]">
                    <Ionicons name="person" size={38} color="#0E5C3F" />
                  </View>
                )}
                <View className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-[#0E5C3F]">
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={14} color="#fff" />
                  )}
                </View>
              </Pressable>

              <Text className="mt-4 text-[19px] font-JakartaExtraBold text-[#101814]">
                {profile?.name ?? user?.fullName ?? "Driver"}
              </Text>

              <View
                className={`mt-2 flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
                  approved ? "bg-[#E6F2EC]" : "bg-[#FDF4E3]"
                }`}
              >
                <Ionicons
                  name={approved ? "shield-checkmark" : "time-outline"}
                  size={12}
                  color={approved ? "#0E5C3F" : "#8A6100"}
                />
                <Text
                  className={`text-[11.5px] font-JakartaBold ${
                    approved ? "text-[#0E5C3F]" : "text-[#8A6100]"
                  }`}
                >
                  {approved
                    ? "Approved driver"
                    : driverStatus === "pending"
                      ? "Verification under review"
                      : "Not yet verified"}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View className="mt-4 flex-row gap-3">
              <StatCard
                icon="star-outline"
                label="Rating"
                value={(profile?.rating ?? 5).toFixed(1)}
              />
              <StatCard
                icon="car-sport-outline"
                label="Trips"
                value={String(profile?.total_trips ?? 0)}
              />
              <StatCard
                icon="people-outline"
                label="Seats"
                value={String(vehicle.seats ?? "—")}
              />
            </View>

            {/* Vehicle */}
            <Text className="mb-3 mt-6 text-[15px] font-JakartaExtraBold text-[#101814]">
              My vehicle
            </Text>
            <SectionCard
              title={
                vehicle.make ? `${vehicle.make} ${vehicle.model}` : "Add your vehicle"
              }
              value={
                vehicle.plate
                  ? `${vehicle.colour ?? ""} · ${vehicle.plate}`
                  : "Make, model and registration"
              }
              icon="car-sport-outline"
              onPress={() => router.push("/(root)/vehicle-details")}
            />

            {/* Driving */}
            <Text className="mb-3 mt-5 text-[15px] font-JakartaExtraBold text-[#101814]">
              Driving
            </Text>
            <View className="mb-1">
              <SectionCard
                title="Driver verification"
                value="Licence, permit and vehicle documents"
                icon="shield-checkmark-outline"
                status={approved ? "verified" : "required"}
                onPress={() => router.push("/(root)/verification")}
              />
              <SectionCard
                title="Payout bank account"
                value="Where your money is paid"
                icon="business-outline"
                onPress={() => router.push("/(root)/bank-details")}
              />
              <SectionCard
                title="Earnings & payouts"
                value="Balance, withdrawals and history"
                icon="wallet-outline"
                onPress={() => router.push("/(root)/(tabs)/earnings")}
              />
              <SectionCard
                title="Offer a trip"
                value="List the seats you have spare"
                icon="add-circle-outline"
                onPress={() => router.push("/(root)/create-trip")}
              />
            </View>

            {/* Account */}
            <Text className="mb-3 mt-5 text-[15px] font-JakartaExtraBold text-[#101814]">
              Account
            </Text>
            <View className="mb-1">
              <SectionCard
                title="Full name"
                value={profile?.name ?? "Not set"}
                icon="person-outline"
                onPress={() =>
                  router.push({
                    pathname: "/(root)/edit-profile",
                    params: { field: "name", label: "Full name" },
                  })
                }
              />
              <SectionCard
                title="Phone number"
                value={profile?.phone_number ?? "Not set"}
                icon="call-outline"
                onPress={() =>
                  router.push({
                    pathname: "/(root)/edit-profile",
                    params: { field: "phone_number", label: "Phone number" },
                  })
                }
              />
            </View>

            {/* Support */}
            <Text className="mb-3 mt-5 text-[15px] font-JakartaExtraBold text-[#101814]">
              Support
            </Text>
            <View className="mb-5">
              <SectionCard
                title="WhatsApp driver support"
                icon="logo-whatsapp"
                onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}`)}
              />
              <SectionCard
                title="Email us"
                value={SUPPORT_EMAIL}
                icon="mail-outline"
                onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
              />
            </View>

            <SectionCard
              title="Sign out"
              icon="log-out-outline"
              tone="danger"
              onPress={handleSignOut}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;