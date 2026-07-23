import { getSupabaseClient } from "@/lib/supabase";
import { useSignIn, useSignUp, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DriverLandingScreen() {
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const {
    signUp,
    setActive: setActiveSignUp,
    isLoaded: signUpLoaded,
  } = useSignUp();
  const { user } = useUser();

  // Login modal state
  const [loginVisible, setLoginVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup modal state
  const [signupVisible, setSignupVisible] = useState(false);
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  // Email verification modal state
  const [verifyVisible, setVerifyVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const splitName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] ?? "";
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
    return { firstName, lastName };
  };

  const persistDriverProfile = async ({
    name,
    email,
    clerkId,
  }: {
    name?: string;
    email: string;
    clerkId?: string | null;
  }) => {
    if (!email) return;

    const supabase = getSupabaseClient();
    const { firstName, lastName } = splitName(name ?? "");
    const payload = {
      first_name: firstName || null,
      last_name: lastName || null,
      full_name: name?.trim() || null,
      email,
      status: "pending",
      verified: true,
      clerk_id: clerkId ?? null,
    };

    const { data: existingDriver, error: existingError } = await supabase
      .from("drivers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingDriver?.id) {
      const { error } = await supabase
        .from("drivers")
        .update(payload)
        .eq("id", existingDriver.id);

      if (error) {
        throw error;
      }

      return;
    }

    const { error } = await supabase.from("drivers").insert(payload);

    if (error) {
      throw error;
    }
  };

  // --- LOGIN ---
  const handleLogin = async () => {
    if (!signInLoaded) return;
    if (!email || !password) {
      Alert.alert("Missing info", "Please enter your email and password.");
      return;
    }

    try {
      setLoginLoading(true);
      const attempt = await signIn.create({
        identifier: email,
        password,
      });

      if (attempt.status === "complete") {
        await setActiveSignIn({ session: attempt.createdSessionId });

        const clerkName =
          user?.fullName ||
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          "";

        await persistDriverProfile({
          name: clerkName || email,
          email,
          clerkId: user?.id ?? null,
        });

        setLoginVisible(false);
        setEmail("");
        setPassword("");
        router.replace("/(driver)/home");
      } else {
        console.log(JSON.stringify(attempt, null, 2));
        Alert.alert("Login incomplete", "Please try again.");
      }
    } catch (err: any) {
      Alert.alert(
        "Login failed",
        err?.errors?.[0]?.message ?? "Something went wrong. Please try again."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // --- SIGN UP: create account + send email verification code ---
  const handleSignup = async () => {
    if (!signUpLoaded) return;
    if (!fullName || !signupEmail || !signupPassword) {
      Alert.alert("Missing info", "Please fill out all fields.");
      return;
    }

    try {
      setSignupLoading(true);
      const { firstName, lastName } = splitName(fullName);

      await signUp.create({
        emailAddress: signupEmail,
        password: signupPassword,
        firstName,
        lastName,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Close signup, open the verification popup
      setSignupVisible(false);
      setVerifyVisible(true);
    } catch (err: any) {
      Alert.alert(
        "Sign up failed",
        err?.errors?.[0]?.message ?? "Something went wrong. Please try again."
      );
    } finally {
      setSignupLoading(false);
    }
  };

  // --- VERIFY EMAIL CODE ---
  const handleVerifyEmail = async () => {
    if (!signUpLoaded) return;
    if (!verifyCode) {
      Alert.alert("Missing code", "Please enter the code we emailed you.");
      return;
    }

    try {
      setVerifyLoading(true);
      const attempt = await signUp.attemptEmailAddressVerification({
        code: verifyCode,
      });

      if (attempt.status !== "complete") {
        console.log(JSON.stringify(attempt, null, 2));
        Alert.alert("Verification incomplete", "Please check the code and try again.");
        return;
      }

      await setActiveSignUp({ session: attempt.createdSessionId });

      try {
        await persistDriverProfile({
          name: fullName,
          email: signupEmail,
          clerkId: attempt.createdUserId,
        });
      } catch (error) {
        console.log("Supabase driver profile save error:", error);
        Alert.alert(
          "Account created",
          "Your account was verified, but we couldn't save your driver profile. Please contact support."
        );
      }

      // Reset everything
      setVerifyVisible(false);
      setVerifyCode("");
      setFullName("");
      setSignupEmail("");
      setSignupPassword("");
      router.replace("/(driver)/home");
    } catch (err: any) {
      Alert.alert(
        "Verification failed",
        err?.errors?.[0]?.message ?? "Invalid code. Please try again."
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!signUpLoaded) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      Alert.alert("Code sent", "We sent a new code to your email.");
    } catch (err: any) {
      Alert.alert("Couldn't resend code", err?.errors?.[0]?.message ?? "Try again.");
    }
  };

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 bg-black">
          {/* Header */}
          <View className="bg-black px-6 pt-2 pb-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-white text-4xl font-Jakarta-Bold">
                Lyft
              </Text>

              <View className="flex-row items-center">
                <TouchableOpacity onPress={() => setLoginVisible(true)}>
                  <Text className="text-white text-lg mr-5 font-Jakarta-Medium">
                    Log in
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-white px-5 py-3 rounded-full mr-5"
                  onPress={() => setSignupVisible(true)}
                >
                  <Text className="text-black font-Jakarta-Bold text-base">
                    Sign up
                  </Text>
                </TouchableOpacity>

                <Ionicons name="menu" size={32} color="white" />
              </View>
            </View>
          </View>

          {/* Hero */}
          <View className="bg-black px-6 pt-8 pb-12">
            <Text className="text-white text-[52px] leading-[60px] font-Jakarta-ExtraBold">
              Opportunity is{"\n"}everywhere
            </Text>

            <Text className="text-gray-300 text-xl mt-8 leading-9 font-Jakarta">
              Make the most of your time on the road on the platform with the
              largest network of active riders.
            </Text>

            <View className="flex-row items-center mt-12">
              <TouchableOpacity
                className="bg-white rounded-2xl px-8 py-5"
                onPress={() => setSignupVisible(true)}
              >
                <Text className="text-black text-xl font-Jakarta-Bold">
                  Sign up to drive
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="ml-8"
                onPress={() => setLoginVisible(true)}
              >
                <Text className="text-white text-xl underline font-Jakarta-Medium">
                  Log in
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* White Section */}
          <View className="flex-1 bg-white rounded-t-3xl px-6 pt-12">
            <Text className="text-[42px] leading-[50px] text-black font-Jakarta-ExtraBold">
              Make money when you want
            </Text>
          </View>
        </View>

        {/* LOGIN MODAL */}
        <Modal
          visible={loginVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setLoginVisible(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.6)",
            }}
          >
            <View
              style={{
                width: "90%",
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 24,
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 20 }}>
                Driver Login
              </Text>

              <Text style={{ fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6 }}>
                Email
              </Text>
              <TextInput
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 15,
                }}
              />

              <Text style={{ fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6 }}>
                Password
              </Text>
              <TextInput
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 20,
                }}
              />

              <TouchableOpacity
                style={{
                  backgroundColor: "#000",
                  padding: 16,
                  borderRadius: 10,
                  opacity: loginLoading ? 0.6 : 1,
                }}
                disabled={loginLoading}
                onPress={handleLogin}
              >
                {loginLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", textAlign: "center", fontSize: 18, fontWeight: "bold" }}>
                    Sign In
                  </Text>
                )}
              </TouchableOpacity>

              <Pressable onPress={() => setLoginVisible(false)} style={{ marginTop: 15 }}>
                <Text style={{ textAlign: "center", color: "#666", fontSize: 16 }}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* DRIVER SIGN UP MODAL */}
        <Modal
          visible={signupVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setSignupVisible(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.6)",
            }}
          >
            <View
              style={{
                width: "90%",
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 24,
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 20 }}>
                Become a Driver
              </Text>

              <Text style={{ fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6 }}>
                Full Name
              </Text>
              <TextInput
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 15,
                }}
              />

              <Text style={{ fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6 }}>
                Email
              </Text>
              <TextInput
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={signupEmail}
                onChangeText={setSignupEmail}
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 15,
                }}
              />

              <Text style={{ fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6 }}>
                Password
              </Text>
              <TextInput
                placeholder="Password"
                secureTextEntry
                value={signupPassword}
                onChangeText={setSignupPassword}
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 20,
                }}
              />

              <TouchableOpacity
                style={{
                  backgroundColor: "#000",
                  padding: 16,
                  borderRadius: 10,
                  opacity: signupLoading ? 0.6 : 1,
                }}
                disabled={signupLoading}
                onPress={handleSignup}
              >
                {signupLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", textAlign: "center", fontSize: 18, fontWeight: "bold" }}>
                    Create Driver Account
                  </Text>
                )}
              </TouchableOpacity>

              <Pressable onPress={() => setSignupVisible(false)} style={{ marginTop: 15 }}>
                <Text style={{ textAlign: "center", color: "#666", fontSize: 16 }}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* EMAIL VERIFICATION MODAL */}
        <Modal
          visible={verifyVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setVerifyVisible(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.6)",
            }}
          >
            <View
              style={{
                width: "90%",
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 24,
              }}
            >
              <Text style={{ fontSize: 26, fontWeight: "bold", marginBottom: 10 }}>
                Verify your email
              </Text>
              <Text style={{ fontSize: 15, color: "#555", marginBottom: 20 }}>
                We sent a 6-digit code to {signupEmail || "your email"}. Enter it
                below to finish creating your driver account.
              </Text>

              <TextInput
                placeholder="123456"
                keyboardType="number-pad"
                value={verifyCode}
                onChangeText={setVerifyCode}
                maxLength={6}
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 20,
                  fontSize: 20,
                  letterSpacing: 4,
                  textAlign: "center",
                }}
              />

              <TouchableOpacity
                style={{
                  backgroundColor: "#000",
                  padding: 16,
                  borderRadius: 10,
                  opacity: verifyLoading ? 0.6 : 1,
                }}
                disabled={verifyLoading}
                onPress={handleVerifyEmail}
              >
                {verifyLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", textAlign: "center", fontSize: 18, fontWeight: "bold" }}>
                    Verify & Create Account
                  </Text>
                )}
              </TouchableOpacity>

              <Pressable onPress={handleResendCode} style={{ marginTop: 15 }}>
                <Text style={{ textAlign: "center", color: "#000", fontSize: 15, fontWeight: "600" }}>
                  Resend code
                </Text>
              </Pressable>

              <Pressable onPress={() => setVerifyVisible(false)} style={{ marginTop: 10 }}>
                <Text style={{ textAlign: "center", color: "#666", fontSize: 16 }}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}