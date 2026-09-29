import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

export default function DiditWebViewScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const DONE_URL = "https://lyft-driver.expo.app/verification-done";

  const handleNavigationChange = (navState: any) => {
    if (navState.url?.startsWith(DONE_URL) && !closing) {
      setClosing(true);
      console.log("DIDIT WEBVIEW: flow finished");
      setTimeout(() => router.back(), 500);
    }
  };

  const closeManually = () => {
    Alert.alert(
      "Close verification?",
      "Your progress may not be saved if you leave now.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Close", style: "destructive", onPress: () => router.back() },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center gap-3 border-b border-[#E2E9E5] px-5 py-3">
        <Pressable
          onPress={closeManually}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-xl border border-[#E2E9E5] bg-white active:opacity-70"
        >
          <Ionicons name="close" size={20} color="#101814" />
        </Pressable>
        <Text className="text-[17px] font-JakartaExtraBold text-[#101814]">
          Identity verification
        </Text>
      </View>

      <View className="flex-1">
        {loading && (
          <View className="absolute inset-0 z-10 items-center justify-center bg-white">
            <ActivityIndicator size="large" color="#0E5C3F" />
            <Text className="mt-3 text-[13px] font-Jakarta text-[#68756F]">
              Loading verification…
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