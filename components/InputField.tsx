import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { brand, ui } from "@/constants/theme";
import { InputFieldProps } from "@/types/type";

const InputField = ({
  label,
  icon,
  secureTextEntry = false,
  labelStyle,
  containerStyle,
  inputStyle,
  iconStyle,
  className,
  ...props
}: InputFieldProps) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="my-2 w-full">
          <Text
            className={`text-[12.5px] font-JakartaSemiBold mb-2 text-[#21152F] ${labelStyle}`}
          >
            {label}
          </Text>
          <View
            className={`flex flex-row justify-start items-center relative h-[52px] bg-white rounded-2xl border border-[#E9E2F0] focus:border-[#9D4EDD] px-3.5 ${containerStyle}`}
          >
            {icon && (
              <Image source={icon} className={`w-5 h-5 mr-2 ${iconStyle}`} />
            )}
            <TextInput
              className={`font-Jakarta text-[15px] flex-1 text-[#21152F] text-left ${inputStyle}`}
              placeholderTextColor={ui.faint}
              secureTextEntry={secureTextEntry}
              {...props}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default InputField;
