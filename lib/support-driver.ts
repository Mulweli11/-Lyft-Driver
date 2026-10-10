import { Ionicons } from "@expo/vector-icons";

export type SupportCategory =
  | "app-account"
  | "trips-earnings"
  | "documents-verification"
  | "vehicle"
  | "payments-payouts"
  | "rider-issues"
  | "safety";

export type SupportTopic = {
  category: SupportCategory;
  title: string;
  description: string;
  prompt: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export type SupportMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  safety?: boolean;
};

export const SUPPORT_TOPICS: SupportTopic[] = [
  {
    category: "trips-earnings",
    title: "Trip & earnings",
    description: "Missing fares, trip not counted, or earnings query.",
    prompt: "I have a problem with a trip or my earnings.",
    icon: "cash-outline",
  },
  {
    category: "documents-verification",
    title: "Documents & verification",
    description: "PrDP, licence disc, insurance, or verification stuck.",
    prompt: "I need help with my documents or verification status.",
    icon: "document-text-outline",
  },
  {
    category: "vehicle",
    title: "Vehicle issue",
    description: "Add a vehicle, change plate, or update vehicle details.",
    prompt: "I need help updating my vehicle details.",
    icon: "car-outline",
  },
  {
    category: "payments-payouts",
    title: "Payments & payouts",
    description: "Bank account, payout schedule, or missing payment.",
    prompt: "I have a question about my payouts or bank details.",
    icon: "card-outline",
  },
  {
    category: "rider-issues",
    title: "Rider issue",
    description: "No-show, rude rider, cancelled after arrival, etc.",
    prompt: "I want to report a problem with a rider.",
    icon: "people-outline",
  },
  {
    category: "app-account",
    title: "App & account",
    description: "Login, profile, notifications, or app bugs.",
    prompt: "I'm having an issue with the app or my account.",
    icon: "phone-portrait-outline",
  },
  {
    category: "safety",
    title: "Safety & emergency",
    description: "Accident, threat, or unsafe situation on a trip.",
    prompt: "I need help with a safety issue.",
    icon: "shield-outline",
  },
];

export const INITIAL_SUPPORT_MESSAGE =
  "Hi driver 👋 I'm Hop On Driver Support. Tell me what's going on and I'll help you sort it out — trips, earnings, documents, vehicle, payouts, or safety.";

export const supportErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (/network/i.test(error.message)) {
      return "We couldn't reach support. Check your connection and try again.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
};