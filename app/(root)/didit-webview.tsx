import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { brand, ui } from "@/constants/theme";
import { DiditDocType, syncDiditSessionDecision } from "@/lib/verification";

export default function DiditWebViewScreen() {
  const { url, sessionId, docType, clerkId } = useLocalSearchParams<{
    url: string;
    sessionId?: string;
    docType?: DiditDocType;
    clerkId?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>("Checking verification results…");
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);

  const syncTriggered = useRef(false);

  const DONE_URL = "https://lyft-driver.expo.app/verification-done";

  const handleFinishAndSync = async () => {
    if (syncTriggered.current) return;
    syncTriggered.current = true;
    setSyncing(true);

    if (!sessionId || !clerkId) {
      console.log("DIDIT WEBVIEW: missing sessionId or clerkId, closing");
      setTimeout(() => router.back(), 500);
      return;
    }

    try {
      setSyncMessage("Confirming your verification details…");
      const res = await syncDiditSessionDecision(sessionId, clerkId, docType);

      if (res?.isApproved) {
        setSyncSuccess(true);
        setSyncMessage("Verification approved successfully!");
        setTimeout(() => router.back(), 1200);
      } else if (res?.isDeclined) {
        setSyncSuccess(false);
        setSyncMessage("Verification was not approved. Please try again.");
        setTimeout(() => router.back(), 1800);
      } else {
        setSyncSuccess(true);
        setSyncMessage("Verification submitted and is being processed.");
        setTimeout(() => router.back(), 1200);
      }
    } catch (err: any) {
      console.warn("DIDIT WEBVIEW: sync error", err);
      setSyncMessage("Verification submitted.");
      setTimeout(() => router.back(), 1000);
    }
  };

  const handleNavigationChange = (navState: any) => {
    const currentUrl = navState.url ?? "";
    console.log("DIDIT WEBVIEW: nav change to", currentUrl);

    if (currentUrl.startsWith(DONE_URL) || currentUrl.includes("verification-done")) {
      handleFinishAndSync();
    }
  };

  const closeManually = () => {
    Alert.alert(
      "Exit verification?",
      "Have you completed all the steps in the verification check?",
      [
        {
          text: "I finished",
          onPress: handleFinishAndSync,
        },
        {
          text: "Exit without saving",
          style: "destructive",
          onPress: () => router.back(),
        },
        {
          text: "Stay",
          style: "cancel",
        },
      ],
    );
  };

  const docTitle =
    docType === "passport"
      ? "Foreign Passport Verification"
      : docType === "licence"
        ? "Driving Licence Verification"
        : "South African ID Verification";

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center gap-3 border-b border-[#E9E2F0] px-5 py-3">
        <Pressable
          onPress={closeManually}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-xl border border-[#E9E2F0] bg-white active:opacity-70"
        >
          <Ionicons name="close" size={20} color="#21152F" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[16px] font-JakartaExtraBold text-[#21152F]" numberOfLines={1}>
            {docTitle}
          </Text>
          <Text className="text-[11px] font-JakartaMedium text-[#746A7E]">
            Powered by Didit Identity
          </Text>
        </View>
      </View>

      <View className="flex-1 relative">
        {loading && (
          <View className="absolute inset-0 z-10 items-center justify-center bg-white">
            <ActivityIndicator size="large" color="#5A189A" />
            <Text className="mt-3 text-[13px] font-JakartaMedium text-[#746A7E]">
              Loading secure verification portal…
            </Text>
          </View>
        )}

        {syncing && (
          <View className="absolute inset-0 z-20 items-center justify-center bg-white/95 px-6">
            {syncSuccess === true ? (
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#F0E6FA] mb-4">
                <Ionicons name="checkmark-circle" size={44} color="#5A189A" />
              </View>
            ) : syncSuccess === false ? (
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FEF3F3] mb-4">
                <Ionicons name="alert-circle" size={44} color="#B02A2A" />
              </View>
            ) : (
              <ActivityIndicator size="large" color="#5A189A" className="mb-4" />
            )}

            <Text className="text-center text-[16px] font-JakartaBold text-[#21152F]">
              {syncMessage}
            </Text>
          </View>
        )}

        <WebView
          source={{ uri: url }}
          onNavigationStateChange={handleNavigationChange}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          mediaCapturePermissionGrantType="grant"
          originWhitelist={["*"]}
        />
      </View>
    </SafeAreaView>
  );
}
