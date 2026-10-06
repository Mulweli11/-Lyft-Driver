import { useSignUp } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ReactNativeModal } from "react-native-modal";

import OAuth from "@/components/OAuth";
import { brand, ui } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";

const { width } = Dimensions.get("window");

// ─── Field ───────────────────────────────────────────────────────────────────

type FieldProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string | null;
  secure?: boolean;
  hint?: string;
  [key: string]: any;
};

function Field({ label, icon, error, secure, hint, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <View
        style={[
          styles.fieldBox,
          focused && styles.fieldBoxFocused,
          !!error && styles.fieldBoxError,
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={error ? ui.danger : focused ? brand.dark : ui.faint}
        />

        <TextInput
          style={styles.fieldInput}
          placeholderTextColor={ui.faint}
          autoCapitalize="none"
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />

        {secure && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={19}
              color={ui.muted}
            />
          </TouchableOpacity>
        )}
      </View>

      {!!error && <Text style={styles.fieldError}>{error}</Text>}
      {!error && !!hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

const SignUp = () => {
  const { isLoaded, signUp, setActive } = useSignUp();

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [verification, setVerification] = useState({
    state: "default",
    error: "",
    code: "",
  });

  // ── Animations ─────────────────────────────────────────────────────────────
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-18)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(34)).current;
  const footerFade = useRef(new Animated.Value(0)).current;
  const ringSpin = useRef(new Animated.Value(0)).current;

  // Badge float & glow
  const badgeBob = useRef(new Animated.Value(0)).current;
  const badgeGlow = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(ringSpin, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(badgeBob, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(badgeBob, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(badgeGlow, {
          toValue: 1.15,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(badgeGlow, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 460,
          useNativeDriver: true,
        }),
        Animated.spring(headerSlide, {
          toValue: 0,
          tension: 68,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.spring(cardSlide, {
          toValue: 0,
          tension: 66,
          friction: 11,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(footerFade, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const spin = ringSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const badgeY = badgeBob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  // ── Clerk sign-up — logic preserved ──────────────────────────────────────
  const onSignUpPress = async () => {
    if (!isLoaded) return;
    setLoading(true);

    try {
      await signUp.create({
        emailAddress: form.email,
        password: form.password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setVerification({
        ...verification,
        state: "pending",
      });
    } catch (err: any) {
      console.log("SIGN UP ERROR");
      console.log(err);

      Alert.alert(
        "Error",
        err?.errors?.[0]?.longMessage || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;
    setVerifying(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verification.code,
      });

      if (completeSignUp.status === "complete") {
        console.log("Clerk User Created");
        console.log(completeSignUp);

        const [firstName, ...lastNameParts] = form.name.trim().split(/\s+/);
        const lastName = lastNameParts.join(" ");

        // Save user in Neon
        const response = await fetchAPI("/(api)/user", {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            first_name: firstName || null,
            last_name: lastName || null,
            email: form.email,
            clerkId: completeSignUp.createdUserId,
          }),
        });

        console.log("========== USER API RESPONSE ==========");
        console.log(response);

        await setActive({
          session: completeSignUp.createdSessionId,
        });

        setVerification({
          ...verification,
          state: "success",
        });
      } else {
        console.log("Verification not complete");
        console.log(completeSignUp);

        setVerification({
          ...verification,
          state: "failed",
          error: "Verification failed.",
        });
      }
    } catch (err: any) {
      console.log("VERIFY ERROR");
      console.log(err);

      setVerification({
        ...verification,
        state: "failed",
        error: err?.errors?.[0]?.longMessage || "Something went wrong.",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={brand.deep} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.blobA} />
          <View style={styles.blobB} />
          <Animated.View
            style={[styles.orbitRing, { transform: [{ rotate: spin }] }]}
          />

          <Animated.View
            style={[
              styles.headerInner,
              { opacity: headerFade, transform: [{ translateY: headerSlide }] },
            ]}
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.75}
            >
              <Ionicons name="chevron-back" size={21} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>

            <Animated.View
              style={[
                styles.logoBadgeWrap,
                { transform: [{ translateY: badgeY }] },
              ]}
            >
              <Animated.View
                style={[
                  styles.logoBadgeGlow,
                  { transform: [{ scale: badgeGlow }] },
                ]}
              />
              <View style={styles.logoBadge}>
                <Ionicons name="person-add" size={28} color={brand.dark} />
              </View>
            </Animated.View>

            <Text style={styles.headerTitle}>Create your account</Text>
            <Text style={styles.headerSub}>
              Start sharing rides in under a minute
            </Text>
          </Animated.View>
        </View>

        {/* ── Form card ── */}
        <Animated.View
          style={[
            styles.card,
            { opacity: cardFade, transform: [{ translateY: cardSlide }] },
          ]}
        >
          <Field
            label="Full name"
            icon="person-outline"
            placeholder="e.g. Sipho Dlamini"
            autoCapitalize="words"
            value={form.name}
            onChangeText={(value: string) => setForm({ ...form, name: value })}
          />

          <Field
            label="Email address"
            icon="mail-outline"
            placeholder="e.g. sipho@email.com"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={form.email}
            onChangeText={(value: string) => setForm({ ...form, email: value })}
            hint="We'll send a 6-digit code here to confirm it's you"
          />

          <Field
            label="Password"
            icon="lock-closed-outline"
            placeholder="Create a password"
            secure
            textContentType="password"
            value={form.password}
            onChangeText={(value: string) =>
              setForm({ ...form, password: value })
            }
          />

          <TouchableOpacity
            style={[styles.cta, loading && { opacity: 0.72 }]}
            onPress={onSignUpPress}
            activeOpacity={0.88}
            disabled={loading}
          >
            <Text style={styles.ctaText}>
              {loading ? "Creating account…" : "Create account"}
            </Text>
            {!loading && (
              <View style={styles.ctaIconBadge}>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <OAuth />
        </Animated.View>

        {/* ── Footer ── */}
        <Animated.View style={[styles.footer, { opacity: footerFade }]}>
          <View style={styles.trustRow}>
            <Ionicons
              name="lock-closed-outline"
              size={15}
              color={brand.dark}
            />
            <Text style={styles.trustText}>
              Your details stay private and encrypted
            </Text>
          </View>

          <Link href="/sign-in" style={styles.signinLink}>
            <Text style={styles.signinLabel}>Already have an account? </Text>
            <Text style={styles.signinAction}>Log in</Text>
          </Link>
        </Animated.View>
      </ScrollView>

      {/* ── Verification modal ── */}
      <ReactNativeModal
        isVisible={verification.state === "pending"}
        onModalHide={() => {
          if (verification.state === "success") {
            setShowSuccessModal(true);
          }
        }}
      >
        <View style={styles.modal}>
          <View style={styles.modalIconWrap}>
            <View style={styles.modalIconRing} />
            <View style={styles.modalIcon}>
              <Ionicons name="mail-open-outline" size={30} color={brand.dark} />
            </View>
          </View>

          <Text style={styles.modalTitle}>Check your email</Text>
          <Text style={styles.modalBody}>
            We sent a 6-digit code to{"\n"}
            <Text style={styles.modalEmail}>{form.email}</Text>
          </Text>

          <TextInput
            style={styles.codeInput}
            placeholder="000000"
            placeholderTextColor={ui.faint}
            keyboardType="number-pad"
            maxLength={6}
            value={verification.code}
            onChangeText={(value) =>
              setVerification({
                ...verification,
                code: value,
                error: "",
              })
            }
          />

          {verification.error !== "" && (
            <View style={styles.modalErrorRow}>
              <Ionicons name="alert-circle-outline" size={15} color={ui.danger} />
              <Text style={styles.modalErrorText}>{verification.error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.cta,
              styles.modalCta,
              verifying && { opacity: 0.72 },
            ]}
            onPress={onPressVerify}
            activeOpacity={0.88}
            disabled={verifying}
          >
            <Text style={styles.ctaText}>
              {verifying ? "Verifying…" : "Verify email"}
            </Text>
            {!verifying && <Ionicons name="checkmark" size={19} color="#FFFFFF" />}
          </TouchableOpacity>

          <Text style={styles.modalNote}>
            The code expires shortly. Check your spam folder if it hasn&apos;t
            arrived.
          </Text>
        </View>
      </ReactNativeModal>

      {/* ── Success modal ── */}
      <ReactNativeModal isVisible={showSuccessModal}>
        <View style={styles.modal}>
          <View style={styles.successIconWrap}>
            <View style={styles.successRingOuter} />
            <View style={styles.successRingInner} />
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={38} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.modalTitle}>You&apos;re verified</Text>
          <Text style={styles.modalBody}>
            Your account is ready. Find a ride heading your way and book a seat.
          </Text>

          <TouchableOpacity
            style={[styles.cta, styles.modalCta]}
            onPress={() => router.replace("/(root)/(tabs)/home")}
            activeOpacity={0.88}
          >
            <Text style={styles.ctaText}>Browse rides</Text>
            <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ReactNativeModal>
    </KeyboardAvoidingView>
  );
};

export default SignUp;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ui.bg,
  },
  scroll: {
    paddingBottom: 40,
  },

  // Header
  header: {
    height: 292,
    backgroundColor: brand.deep,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    overflow: "hidden",
  },
  blobA: {
    position: "absolute",
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: brand.dark,
    opacity: 0.5,
    top: -width * 0.72,
    left: -width * 0.3,
  },
  blobB: {
    position: "absolute",
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: brand.mid,
    opacity: 0.2,
    bottom: -width * 0.5,
    right: -width * 0.3,
  },
  orbitRing: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1.5,
    borderColor: "transparent",
    borderTopColor: "rgba(199,125,255,0.4)",
    borderRightColor: "rgba(157,78,221,0.15)",
    alignSelf: "center",
    top: 58,
  },
  headerInner: {
    flex: 1,
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 62 : 46,
    paddingHorizontal: 22,
  },
  backBtn: {
    position: "absolute",
    left: 22,
    top: Platform.OS === "ios" ? 58 : 42,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadgeWrap: {
    marginTop: 6,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadgeGlow: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: brand.tint,
    opacity: 0.85,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: brand.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 14,
  },
  headerTitle: {
    fontSize: 25,
    fontFamily: "Jakarta-ExtraBold",
    color: "#FFFFFF",
    letterSpacing: -0.6,
    marginBottom: 6,
    textAlign: "center",
  },
  headerSub: {
    fontSize: 13.5,
    fontFamily: "Jakarta",
    color: "rgba(255,255,255,0.62)",
    textAlign: "center",
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: -34,
    borderRadius: 26,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },

  // Field
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontFamily: "Jakarta-SemiBold",
    color: ui.ink,
    marginBottom: 8,
  },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    height: 54,
    paddingHorizontal: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: ui.border,
    backgroundColor: "#F8FAF9",
  },
  fieldBoxFocused: {
    borderColor: brand.accent,
    backgroundColor: "#FFFFFF",
  },
  fieldBoxError: {
    borderColor: ui.danger,
    backgroundColor: ui.dangerBg,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Jakarta",
    color: ui.ink,
  },
  fieldError: {
    fontSize: 12,
    fontFamily: "Jakarta-Medium",
    color: ui.danger,
    marginTop: 6,
    marginLeft: 4,
  },
  fieldHint: {
    fontSize: 11.5,
    fontFamily: "Jakarta",
    color: ui.faint,
    marginTop: 6,
    marginLeft: 4,
  },

  // CTA
  cta: {
    height: 56,
    borderRadius: 17,
    backgroundColor: brand.dark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 6,
    shadowColor: brand.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 7,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Jakarta-Bold",
    letterSpacing: 0.2,
  },
  ctaIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 22,
    marginBottom: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: ui.border,
  },
  dividerText: {
    fontSize: 11.5,
    fontFamily: "Jakarta-Medium",
    color: ui.faint,
  },

  // Footer
  footer: {
    alignItems: "center",
    marginTop: 26,
    gap: 16,
    paddingHorizontal: 24,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.tint,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  trustText: {
    fontSize: 12,
    fontFamily: "Jakarta-Medium",
    color: brand.dark,
  },
  signinLink: {
    textAlign: "center",
  },
  signinLabel: {
    fontSize: 14,
    fontFamily: "Jakarta",
    color: ui.muted,
  },
  signinAction: {
    fontSize: 14,
    fontFamily: "Jakarta-Bold",
    color: brand.dark,
  },

  // Modals
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 26,
    alignItems: "center",
  },
  modalIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  modalIconRing: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: brand.tint,
  },
  modalIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: brand.tint,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Jakarta-ExtraBold",
    color: ui.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Jakarta",
    color: ui.muted,
    textAlign: "center",
    marginBottom: 22,
  },
  modalEmail: {
    fontFamily: "Jakarta-Bold",
    color: ui.ink,
  },
  codeInput: {
    width: "100%",
    height: 62,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: ui.border,
    backgroundColor: "#F8FAF9",
    textAlign: "center",
    fontSize: 26,
    fontFamily: "Jakarta-ExtraBold",
    color: ui.ink,
    letterSpacing: 10,
  },
  modalErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  modalErrorText: {
    fontSize: 12.5,
    fontFamily: "Jakarta-Medium",
    color: ui.danger,
    flexShrink: 1,
  },
  modalCta: {
    width: "100%",
    marginTop: 20,
  },
  modalNote: {
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: "Jakarta",
    color: ui.faint,
    textAlign: "center",
    marginTop: 16,
  },

  // Success Modal
  successIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    height: 118,
  },
  successRingOuter: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: brand.accent,
    opacity: 0.15,
  },
  successRingInner: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: brand.accent,
    opacity: 0.25,
  },
  successIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: brand.dark,
    alignItems: "center",
    justifyContent: "center",
  },
});
