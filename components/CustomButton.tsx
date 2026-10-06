import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

import { brand } from "@/constants/theme";
import { ButtonProps } from "@/types/type";

const getBgVariantStyle = (variant: ButtonProps["bgVariant"]) => {
  switch (variant) {
    case "secondary":
      return "bg-secondary-600";
    case "danger":
      return "bg-danger-600";
    case "success":
      return "bg-success-600";
    case "outline":
      return "bg-transparent border border-neutral-300";
    default:
      return "bg-primary-500";
  }
};

const getTextVariantStyle = (variant: ButtonProps["textVariant"]) => {
  switch (variant) {
    case "primary":
      return "text-black";
    case "secondary":
      return "text-gray-100";
    case "danger":
      return "text-red-100";
    case "success":
      return "text-purple-100";
    default:
      return "text-white";
  }
};

const CustomButton = ({
  onPress,
  title,
  bgVariant = "primary",
  textVariant = "default",
  IconLeft,
  IconRight,
  className = "",
  loading = false,
  disabled,
  ...props
}: ButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`w-full h-[54px] rounded-full px-5 flex-row items-center justify-center gap-2 shadow-md ${getBgVariantStyle(
        bgVariant
      )} ${disabled || loading ? "opacity-50" : ""} ${className}`}
      style={{
        shadowColor: brand.dark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
      }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={textVariant === "primary" ? "#000" : "#fff"}
        />
      ) : (
        <>
          {IconLeft ? <IconLeft /> : null}
          <Text
            className={`text-[15px] font-JakartaBold ${getTextVariantStyle(
              textVariant
            )}`}
          >
            {title}
          </Text>
          {IconRight ? <IconRight /> : null}
        </>
      )}
    </TouchableOpacity>
  );
};

export default CustomButton;
