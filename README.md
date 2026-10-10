# CarpoolGo — DevSphere Inc.

**University of Johannesburg · Department of Applied Information Systems**  
**Sprint 2 Frontend Implementation**

---

# Tech Stack

| Layer | Technology |
| ------ | ---------- |
| Framework | React Native (Expo) |
| Navigation | React Navigation v6 |
| State Management | Zustand |
| Backend | Firebase (Authentication, Firestore, Storage) |
| Maps | react-native-maps + Google Maps API |
| Payments | Paystack / Flutterwave |
| Security | expo-secure-store, Firebase Security Rules |

---

# Project Structure

```text
CarpoolApp/
├── App.jsx
├── firebase.config.js
├── src/
│   ├── theme/
│   │   └── index.js
│   ├── navigation/
│   │   └── AppNavigator.jsx
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── SplashScreen.jsx
│   │   │   ├── WelcomeScreen.jsx
│   │   │   ├── GetStartedScreen.jsx
│   │   │   ├── RegisterScreen.jsx
│   │   │   └── LoginScreen.jsx
│   │   ├── passenger/
│   │   │   ├── HomeSearchScreen.jsx
│   │   │   ├── TripResultsScreen.jsx
│   │   │   ├── ConfirmBookingScreen.jsx
│   │   │   ├── MyTripsScreen.jsx
│   │   │   └── PassengerProfileScreen.jsx
│   │   ├── driver/
│   │   │   ├── DriverHomeScreen.jsx
│   │   │   ├── CreateTripScreen.jsx
│   │   │   ├── EarningsScreen.jsx
│   │   │   └── DriverProfileScreen.jsx
│   ├── components/
│   │   └── common/
│   │       ├── Button.jsx
│   │       └── Input.jsx
│   └── services/
│       ├── auth.service.js
│       └── payment.service.js
```

---

# Installation

## 1. Install Dependencies

```bash
cd CarpoolApp
npm install
```

## 2. Configure Firebase

1. Create a Firebase project.
2. Add Android and iOS apps.
3. Copy the Firebase configuration into `firebase.config.js`.
4. Enable:
   - Authentication (Email/Password and Google)
   - Firestore Database
   - Storage

---

## 3. Create a `.env` File

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000
EXPO_PUBLIC_FIREBASE_APP_ID=1:000:web:000
```

---

## 4. Run the App

```bash
npx expo start
```

Then scan the QR code using the Expo Go app.

---

## Deploy the API on Render

This repository contains Expo Router API routes in `app/(api)`. For a Render
Web Service, configure:

- **Root Directory:** leave blank (repository root)
- **Build Command:** `npm install && npm run build:render`
- **Start Command:** `npm run start:render`
- **Health Check Path:** `/health`

The Render build exports only the production API routes. The start command runs
Expo's production server on Render's `PORT`; do not use `npm start`, which runs
the Expo development server and does not bind a production HTTP port.

Add the required server-only values from `.env.example` in the Render
environment settings. Never set secret credentials as `EXPO_PUBLIC_*` or add
them to Expo `extra`. In particular, `SUPABASE_SERVICE_ROLE_KEY`,
`CLERK_SECRET_KEY`, Stripe secret keys, and webhook secrets must remain
server-side.

After deployment, confirm `https://<your-render-service>/health` returns
`{"status":"ok","service":"Lyft Driver API"}`.

---

# Application Flow

```text
Splash
   │
   ▼
Welcome (4 Onboarding Screens)
   │
   ▼
Get Started
   ├──────────────┐
   ▼              ▼
Passenger      Driver
Register       Register
   │              │
   ▼              ▼
Login          Login
   │              │
   ▼              ▼
Passenger Tabs   Driver Tabs
```

### Passenger Tabs

- Home Search
- Trip Results
- Confirm Booking
- My Trips
- Profile

### Driver Tabs

- Driver Home
- Create Trip
- Earnings
- Profile

---

# Security Features

- Firebase Authentication
- Passwords are never stored locally.
- Authentication tokens stored securely using `expo-secure-store`.
- Role-based navigation (Passenger, Driver, Admin).
- Form validation with user-friendly error messages.
- South African ID validation (13 digits).
- South African phone number validation (`+27` format).
- Minimum password length of 8 characters.
- Only the last four digits of an ID number are stored.
- Firebase Security Rules.
- OTP verification (planned).
- Biometric login (planned).

---

# Sprint 3 Roadmap

- [ ] Connect Firebase services to every screen.
- [ ] Google Maps trip search.
- [ ] Payment integration (Paystack/Flutterwave).
- [ ] Real-time trip tracking.
- [ ] Push notifications (Firebase Cloud Messaging).
- [ ] Admin dashboard.
- [ ] Safety monitoring.
- [ ] OTP verification.
- [ ] Biometric authentication.

---

# Team

| Member | Role | Responsibility |
| ------ | ---- | -------------- |
| S. Mdala | Project Manager | Project management and process flows |
| M. Sithomola | Backend Developer | Firebase services |
| N.S. Msomi | Frontend Developer | UI components and screens |
| L.P. Nama | Business Analyst | Requirements gathering |
| T. Macholo | UX/UI Designer | Figma design and navigation |
| G.P. Makwarela | Database Administrator | Firestore database design |

---

# License

University of Johannesburg – Department of Applied Information Systems

Sprint 2 Project – CarpoolGo (DevSphere Inc.)
