import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ==========================================
// DESIGN SYSTEM & CONSTANTS
// ==========================================
const { width } = Dimensions.get("window");

const COLORS = {
  deep: "#06231A",
  dark: "#00873d",
  mid: "#12724F",
  accent: "#1FB574",
  mint: "#E1F5E8",
  soft: "#F2F4F2",
  textDark: "#121417",
  textMuted: "#67707e",
  white: "#FFFFFF",
};

// ==========================================
// SUB-COMPONENTS
// ==========================================

// Line-art style illustration matching UI
const IllustrationSVG = () => (
  <View style={styles.heroIllustration}>
    <View style={styles.lineOne} />
    <View style={styles.lineTwo} />
    <View style={styles.plantGroup}>
      <View style={styles.plantStem} />
      <View style={styles.plantLeaf} />
    </View>
    <View style={styles.vehicleWrap}>
      <View style={styles.vehicleRoof} />
      <View style={styles.vehicleBody} />
      <View style={styles.wheelLeft} />
      <View style={styles.wheelRight} />
    </View>
    <View style={styles.sunBurst} />
  </View>
);

// Hero Header Card
const HeroCard = ({ anim }: { anim: Animated.Value }) => {
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  const opacity = anim;

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <View style={styles.heroCard}>
        <TouchableOpacity style={styles.expandButton} activeOpacity={0.7}>
          <Ionicons name="expand-outline" size={12} color={COLORS.textDark} />
        </TouchableOpacity>
        <IllustrationSVG />
      </View>
    </Animated.View>
  );
};

// Reusable Small Dashboard Card
interface StatCardProps {
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  anim: Animated.Value;
  direction?: "left" | "up" | "right";
}

const StatCard = ({ title, subtitle, iconName, anim, direction = "up" }: StatCardProps) => {
  const getTransform = () => {
    if (direction === "left") {
      return [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }];
    }
    if (direction === "right") {
      return [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }];
    }
    return [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [35, 0] }) }];
  };

  return (
    <Animated.View
      style={[
        styles.gridItem,
        {
          opacity: anim,
          transform: [...getTransform(), { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
        },
      ]}
    >
      <View style={styles.card}>
        <View>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name={iconName} size={22} color={COLORS.dark} />
      </View>
    </Animated.View>
  );
};

// Animated Consumer Trend Banner Card
const TrendCard = ({ anim }: { anim: Animated.Value }) => {
  const [value, setValue] = useState(15);
  const counterScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Percentage flip from 15% -> 17% with bounce
    const timer = setTimeout(() => {
      setValue(16);
      Animated.sequence([
        Animated.timing(counterScale, { toValue: 1.1, duration: 150, useNativeDriver: true }),
        Animated.timing(counterScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        setValue(17);
        Animated.sequence([
          Animated.timing(counterScale, { toValue: 1.12, duration: 150, useNativeDriver: true }),
          Animated.timing(counterScale, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
      }, 200);
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
      }}
    >
      <View style={styles.trendCard}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Consumer Trend</Text>
        </View>
        <Animated.Text style={[styles.statNumber, { transform: [{ scale: counterScale }] }]}>
          {value}%
        </Animated.Text>
        <Text style={styles.statLabel}>Compound annual growth rate</Text>
      </View>
    </Animated.View>
  );
};

// ==========================================
// MAIN SCREEN COMPONENT
// ==========================================
const Welcome = () => {
  // Entrance Animation Sequence Values
  const heroAnim = useRef(new Animated.Value(0)).current;
  const leftAnim = useRef(new Animated.Value(0)).current;
  const rightAnim = useRef(new Animated.Value(0)).current;
  const trendAnim = useRef(new Animated.Value(0)).current;
  const bottomAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered Entrance Animations
    Animated.stagger(100, [
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(leftAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rightAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(trendAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bottomAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.soft} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.appFrame}>
          
          {/* Header Branding */}
          <View style={styles.brandRow}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandText}>Lyft</Text>
          </View>

          {/* 1. Hero Card - Slides in from Right */}
          <HeroCard anim={heroAnim} />

          {/* 2. Top Row Grid */}
          <View style={styles.gridTwo}>
            <StatCard
              title="Savings"
              subtitle="Earn 3.75% APY"
              iconName="wallet-outline"
              anim={leftAnim}
              direction="left"
            />
            <StatCard
              title="Subscriptions"
              subtitle="View all"
              iconName="receipt-outline"
              anim={rightAnim}
              direction="right"
            />
          </View>

          {/* 3. Consumer Trend Banner */}
          <TrendCard anim={trendAnim} />

          {/* 4. Bottom Row Grid */}
          <View style={styles.gridTwo}>
            <StatCard
              title="Billing"
              subtitle="Auto payments"
              iconName="card-outline"
              anim={bottomAnim}
              direction="left"
            />
            <StatCard
              title="Tools"
              subtitle="Check all available"
              iconName="construct-outline"
              anim={bottomAnim}
              direction="right"
            />
          </View>

          {/* CTA Action Button */}
          <TouchableOpacity
            style={styles.cta}
            onPress={() => router.replace("/(auth)/sign-up")}
            activeOpacity={0.88}
          >
            <Text style={styles.ctaText}>Continue</Text>
            <Ionicons name="arrow-forward" size={19} color={COLORS.white} />
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </View>
  );
};

export default Welcome;

// ==========================================
// STYLESHEET
// ==========================================
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.soft,
  },
  safeArea: {
    flex: 1,
  },
  appFrame: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },

  /* Branding Header */
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  brandLogo: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  brandText: {
    marginLeft: 8,
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: "800",
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    height: 180,
    padding: 12,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  expandButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F0F2F0",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  /* Hero Line Illustration Elements */
  heroIllustration: {
    width: "100%",
    maxWidth: 240,
    height: 130,
    position: "relative",
  },
  lineOne: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 64,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: COLORS.dark,
    opacity: 0.5,
  },
  lineTwo: {
    position: "absolute",
    left: 15,
    right: 15,
    top: 75,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: COLORS.dark,
    opacity: 0.5,
  },
  plantGroup: {
    position: "absolute",
    left: 20,
    top: 28,
    width: 22,
    height: 26,
  },
  plantStem: {
    position: "absolute",
    left: 10,
    top: 10,
    width: 2,
    height: 20,
    backgroundColor: COLORS.dark,
  },
  plantLeaf: {
    position: "absolute",
    left: 2,
    top: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.mint,
    borderWidth: 1.5,
    borderColor: COLORS.dark,
  },
  vehicleWrap: {
    position: "absolute",
    left: 70,
    top: 38,
    width: 88,
    height: 54,
  },
  vehicleBody: {
    position: "absolute",
    left: 0,
    right: 10,
    bottom: 12,
    height: 22,
    borderRadius: 6,
    backgroundColor: COLORS.mint,
    borderWidth: 1.5,
    borderColor: COLORS.dark,
  },
  vehicleRoof: {
    position: "absolute",
    left: 16,
    right: 28,
    top: 6,
    height: 16,
    borderRadius: 5,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.dark,
  },
  wheelLeft: {
    position: "absolute",
    left: 14,
    bottom: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.dark,
  },
  wheelRight: {
    position: "absolute",
    right: 22,
    bottom: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.dark,
  },
  sunBurst: {
    position: "absolute",
    right: 20,
    top: 14,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.mint,
    borderWidth: 1.5,
    borderColor: COLORS.dark,
  },

  /* Grid Layout */
  gridTwo: {
    flexDirection: "row",
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },

  /* Reusable Small Cards */
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    height: 90,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textDark,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  /* Consumer Trend Card */
  trendCard: {
    backgroundColor: COLORS.dark,
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  statNumber: {
    marginTop: 4,
    color: COLORS.white,
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 44,
    letterSpacing: -1.5,
  },
  statLabel: {
    marginTop: 2,
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
  },

  /* Main Action Button */
  cta: {
    marginTop: "auto",
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.dark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});