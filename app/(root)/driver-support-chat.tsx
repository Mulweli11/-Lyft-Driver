import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { brand, ui } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import {
  INITIAL_SUPPORT_MESSAGE,
  SUPPORT_TOPICS,
  SupportCategory,
  SupportMessage,
  supportErrorMessage,
} from "@/lib/support-driver";

const makeMessage = (
  role: SupportMessage["role"],
  text: string,
  safety = false,
): SupportMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  text,
  createdAt: new Date().toISOString(),
  ...(safety ? { safety: true } : {}),
});

const DriverSupportChat = () => {
  const params = useLocalSearchParams<{ category?: string; prompt?: string }>();
  const { user } = useUser();
  const scrollRef = useRef<ScrollView>(null);
  const initializedPromptRef = useRef(false);
  const [messages, setMessages] = useState<SupportMessage[]>([
    makeMessage("assistant", INITIAL_SUPPORT_MESSAGE),
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [ticketing, setTicketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [categoryOverride, setCategoryOverride] =
    useState<SupportCategory | null>(null);

  const paramCategory = String(params.category ?? "");
  const category =
    categoryOverride ??
    SUPPORT_TOPICS.find((topic) => topic.category === paramCategory)?.category ??
    "app-account";

  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.text;

  useEffect(() => {
    const timer = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      80,
    );
    return () => clearTimeout(timer);
  }, [messages, sending, error]);

  const sendMessage = useCallback(
    async (rawText: string, retry = false) => {
      const text = rawText.trim();
      if (!text || sending || text.length > 1000) return;
      if (!user?.id) return;

      const previousMessages = retry ? messages.slice(0, -1) : messages;
      if (!retry) {
        setMessages((current) => [...current, makeMessage("user", text)]);
      }
      setDraft("");
      setSending(true);
      setError(null);
      setFailedMessage(null);

      try {
        const result = await fetchAPI("/(api)/support/driver/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId: user.id,
            message: text,
            category,
            history: previousMessages
              .slice(-12)
              .map(({ role, text: body }) => ({ role, text: body })),
          }),
        });

        // fetchAPI typically returns the parsed body.
        const reply: string =
          result?.reply ??
          result?.data?.reply ??
          "Sorry, I didn't catch that. Could you rephrase?";
        const safety: boolean = Boolean(
          result?.safety ?? result?.data?.safety,
        );

        setMessages((current) => [
          ...current,
          makeMessage("assistant", reply, safety),
        ]);
      } catch (requestError) {
        setError(supportErrorMessage(requestError));
        setFailedMessage(text);
      } finally {
        setSending(false);
      }
    },
    [messages, sending, category, user?.id],
  );

  useEffect(() => {
    const prompt = Array.isArray(params.prompt)
      ? params.prompt[0]
      : params.prompt;
    if (prompt && !initializedPromptRef.current) {
      initializedPromptRef.current = true;
      void sendMessage(prompt);
    }
  }, [params.prompt, sendMessage]);

  const sendQuickAction = (prompt: string, topic: SupportCategory) => {
    setCategoryOverride(topic);
    void sendMessage(prompt);
  };

  const createTicket = async () => {
    if (!latestUserMessage || ticketing || !user?.id) return;
    setTicketing(true);
    try {
      await fetchAPI("/(api)/support/driver/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          category,
          message: latestUserMessage,
        }),
      });
      Alert.alert(
        "Request sent",
        "Your message has been sent to Hop On Driver Support. A team member can follow up.",
      );
    } catch (ticketError) {
      Alert.alert(
        "Unable to send request",
        supportErrorMessage(ticketError),
      );
    } finally {
      setTicketing(false);
    }
  };

  // Driver SOS goes to the driver's home tab (adjust if you have a rides tab)
  const openSOS = () => router.push("/(root)/(tabs)/home");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ui.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: ui.border,
            backgroundColor: ui.surface,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{
              height: 42,
              width: 42,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: ui.bg,
            }}
          >
            <Ionicons name="chevron-back" size={20} color={brand.dark} />
          </Pressable>
          <View
            style={{
              height: 40,
              width: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: brand.tint,
            }}
          >
            <Ionicons name="car-sport" size={20} color={brand.dark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Jakarta-Bold",
                color: ui.ink,
              }}
            >
              Hop On Driver Support
            </Text>
            <Text
              style={{
                marginTop: 2,
                fontSize: 11,
                fontFamily: "Jakarta",
                color: ui.muted,
              }}
            >
              AI assistant · Human help available
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <View
                key={message.id}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  marginBottom: 10,
                }}
              >
                {!isUser && (
                  <Text
                    style={{
                      marginBottom: 4,
                      marginLeft: 4,
                      fontSize: 10,
                      fontFamily: "Jakarta-SemiBold",
                      color: ui.muted,
                    }}
                  >
                    Hop On Driver Support
                  </Text>
                )}
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderRadius: 18,
                    borderBottomLeftRadius: isUser ? 18 : 5,
                    borderBottomRightRadius: isUser ? 5 : 18,
                    backgroundColor: isUser ? brand.dark : ui.surface,
                    borderWidth: isUser ? 0 : 1,
                    borderColor: ui.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Jakarta",
                      lineHeight: 21,
                      color: isUser ? "#FFFFFF" : ui.ink,
                    }}
                  >
                    {message.text}
                  </Text>
                </View>
                {message.safety && (
                  <View
                    style={{
                      marginTop: 8,
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: ui.dangerBg,
                      borderWidth: 1,
                      borderColor: "#F1C8C5",
                    }}
                  >
                    <Pressable
                      onPress={openSOS}
                      accessibilityRole="button"
                      style={{
                        minHeight: 42,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        borderRadius: 12,
                        backgroundColor: ui.danger,
                      }}
                    >
                      <Ionicons
                        name="alert-circle-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Jakarta-Bold",
                          color: "#FFFFFF",
                        }}
                      >
                        Open My Trips for SOS
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        void Linking.openURL("tel:112").catch(() =>
                          Alert.alert(
                            "Call emergency services",
                            "Please dial 112 from your phone.",
                          ),
                        )
                      }
                      accessibilityRole="button"
                      style={{
                        alignItems: "center",
                        paddingTop: 10,
                        minHeight: 40,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Jakarta-Bold",
                          color: ui.danger,
                        }}
                      >
                        Call emergency services (112)
                      </Text>
                    </Pressable>
                  </View>
                )}
                {!isUser && index === 0 && messages.length === 1 && (
                  <View style={{ marginTop: 9, gap: 7 }}>
                    {SUPPORT_TOPICS.map((topic) => (
                      <Pressable
                        key={topic.category}
                        onPress={() =>
                          sendQuickAction(topic.prompt, topic.category)
                        }
                        accessibilityRole="button"
                        style={{
                          alignSelf: "flex-start",
                          minHeight: 38,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 7,
                          paddingHorizontal: 11,
                          borderWidth: 1,
                          borderColor: ui.border,
                          borderRadius: 20,
                          backgroundColor: ui.surface,
                        }}
                      >
                        <Ionicons name={topic.icon} size={15} color={brand.dark} />
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Jakarta-SemiBold",
                            color: ui.ink,
                          }}
                        >
                          {topic.title}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
          {sending && (
            <View
              style={{
                alignSelf: "flex-start",
                marginBottom: 10,
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderRadius: 16,
                backgroundColor: ui.surface,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Jakarta",
                  color: ui.muted,
                }}
              >
                Hop On Support is typing...
              </Text>
            </View>
          )}
          {!!error && (
            <View
              style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 14,
                backgroundColor: ui.dangerBg,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Jakarta",
                  color: ui.danger,
                }}
              >
                {error}
              </Text>
              {!!failedMessage && (
                <Pressable
                  onPress={() => void sendMessage(failedMessage, true)}
                  disabled={sending}
                  accessibilityRole="button"
                  style={{ alignSelf: "flex-start", marginTop: 8, padding: 6 }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Jakarta-Bold",
                      color: brand.dark,
                    }}
                  >
                    Retry
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        {latestUserMessage && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 8,
              backgroundColor: ui.surface,
              borderTopWidth: 1,
              borderTopColor: ui.border,
            }}
          >
            <Text
              style={{
                marginBottom: 5,
                fontSize: 11,
                fontFamily: "Jakarta",
                color: ui.muted,
              }}
            >
              Need more help?
            </Text>
            <Pressable
              onPress={() => void createTicket()}
              disabled={ticketing || sending}
              accessibilityRole="button"
              style={{
                minHeight: 38,
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                opacity: ticketing || sending ? 0.6 : 1,
              }}
            >
              <Ionicons name="mail-outline" size={16} color={brand.dark} />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Jakarta-Bold",
                  color: brand.dark,
                }}
              >
                {ticketing
                  ? "Sending request..."
                  : "Contact Human Driver Support"}
              </Text>
            </Pressable>
          </View>
        )}

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: ui.surface,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Describe your problem..."
            placeholderTextColor={ui.faint}
            accessibilityLabel="Message Hop On Driver Support"
            multiline
            maxLength={1000}
            editable={!sending}
            style={{
              flex: 1,
              maxHeight: 112,
              minHeight: 46,
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 10,
              borderWidth: 1,
              borderColor: ui.border,
              borderRadius: 18,
              backgroundColor: ui.bg,
              fontSize: 14,
              fontFamily: "Jakarta",
              color: ui.ink,
            }}
          />
          <Pressable
            onPress={() => void sendMessage(draft)}
            disabled={sending || !draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{
              disabled: sending || !draft.trim(),
              busy: sending,
            }}
            style={{
              height: 46,
              width: 46,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              backgroundColor: brand.dark,
              opacity: sending || !draft.trim() ? 0.5 : 1,
            }}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default DriverSupportChat;
