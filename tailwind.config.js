/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./constants/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./store/**/*.{js,jsx,ts,tsx}",
    "./types/**/*.{js,jsx,ts,tsx}",
  ],

  presets: [require("nativewind/preset")],

  theme: {
    extend: {
      fontFamily: {
        Jakarta: ["Jakarta", "sans-serif"],
        JakartaRegular: ["Jakarta", "sans-serif"],
        JakartaBold: ["Jakarta-Bold", "sans-serif"],
        JakartaExtraBold: ["Jakarta-ExtraBold", "sans-serif"],
        JakartaExtraLight: ["Jakarta-ExtraLight", "sans-serif"],
        JakartaLight: ["Jakarta-Light", "sans-serif"],
        JakartaMedium: ["Jakarta-Medium", "sans-serif"],
        JakartaSemiBold: ["Jakarta-SemiBold", "sans-serif"],
      },

      colors: {
        primary: {
          100: "#F0E6FA",
          200: "#E8DCF5",
          300: "#C77DFF",
          400: "#9D4EDD",
          500: "#5A189A",
          600: "#7B2CBF",
          700: "#5A189A",
          800: "#1D1135",
          900: "#1D1135",
        },

        accent: {
          100: "#F0E6FA",
          200: "#E8DCF5",
          300: "#C77DFF",
          400: "#9D4EDD",
          500: "#9D4EDD",
          600: "#7B2CBF",
          700: "#5A189A",
          800: "#1D1135",
          900: "#1D1135",
        },

        secondary: {
          100: "#F7F4FB",
          200: "#F0E6FA",
          300: "#E9E2F0",
          400: "#A69BAF",
          500: "#746A7E",
          600: "#746A7E",
          700: "#21152F",
          800: "#21152F",
          900: "#21152F",
        },

        success: {
          100: "#F0E6FA",
          200: "#E8DCF5",
          300: "#C77DFF",
          400: "#9D4EDD",
          500: "#9D4EDD",
          600: "#7B2CBF",
          700: "#5A189A",
          800: "#1D1135",
          900: "#1D1135",
        },

        danger: {
          100: "#FEF3F3",
          200: "#FBDCDC",
          300: "#F7B9B9",
          400: "#EF8484",
          500: "#E0575B",
          600: "#C22F2F",
          700: "#9C2525",
          800: "#761C1C",
          900: "#4F1212",
        },

        warning: {
          100: "#FFF6E5",
          200: "#FCEBC4",
          300: "#F5D48B",
          400: "#E8B65A",
          500: "#D99A1B",
          600: "#B47D14",
          700: "#8F6210",
          800: "#6A480B",
          900: "#452E07",
        },

        general: {
          100: "#E9E2F0",
          200: "#746A7E",
          300: "#F0E6FA",
          400: "#9D4EDD",
          500: "#F7F4FB",
          600: "#F0E6FA",
          700: "#E9E2F0",
          800: "#A69BAF",
        },
      },
    },
  },

  plugins: [],
};
