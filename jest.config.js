module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/.*|native-base|react-native-svg))',
  ],
  collectCoverageFrom: [
    '{app,lib}/**/*.{ts,tsx,js}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
