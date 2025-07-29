# KLINGO - Eco-Friendly Cleanup Service App

![KLINGO Logo](./assets/images/logo.png)

**Specialized Event Cleanup. On-Demand.**

KLINGO is a mobile application that connects users with professional, trained cleaning crews for eco-friendly cleanup services. Whether it's scheduled cleanups or event-specific services, KLINGO makes it easy to book, track, and manage cleaning services.

## 🌟 Features

### Customer App Features
- **Eco-Friendly Cleanup Services** - Professional, trained crew with sustainable practices
- **App-Powered Scheduling** - Easy booking system with flexible time slots
- **Real-Time Tracking** - Live progress updates during cleanup sessions
- **Event Cleanup Specialization** - Tailored services for events and gatherings
- **User-Friendly Interface** - Intuitive design with step-by-step booking process
- **Sustainable Practices** - Promotes use of reusable cups and eco-friendly materials

### Admin Dashboard Features
- **Comprehensive Dashboard** - Overview of total jobs, completed jobs, and pending jobs
- **Client Management** - Track and manage customer relationships
- **Job Analytics** - Monthly overview with visual charts and reports
- **Crew Management** - Assign and track cleaning crew performance
- **Real-Time Monitoring** - Live tracking of ongoing cleanup sessions

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- Expo CLI
- iOS Simulator / Android Emulator or physical device

### Installation

1. **Clone the repository**
   ```bash
   [git clone https://github.com/yourusername/klingo-app.git](https://github.com/Nelson877/KlingoApp.git)
   cd KlingoApp.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Expo CLI globally**
   ```bash
   npm install -g @expo/cli
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - Scan QR code with Expo Go app (iOS/Android)
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

## 📱 App Screens

### Customer Flow
1. **Splash Screen** - App branding and loading
2. **Onboarding** - Feature highlights and app introduction
3. **Home Screen** - Service booking and scheduled cleanups
4. **Request Cleanup** - Step-by-step booking process
5. **Live Tracking** - Real-time cleanup progress monitoring

### Key User Journeys
- **Quick Booking**: Home → Request Cleanup → Confirmation
- **Track Service**: Home → Live Tracking → Completion
- **Manage Bookings**: Home → Scheduled Cleanups → Details

## 🛠 Tech Stack

### Frontend (Mobile App)
- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for navigation
- **Redux Toolkit** for state management
- **React Hook Form** for form handling
- **Expo Vector Icons** for iconography

### Backend Options
- **Firebase** (Recommended)
  - Firestore for database
  - Authentication
  - Cloud Functions
  - Push Notifications
  - Real-time updates
- **Alternative**: Node.js + Express + MongoDB

### Admin Dashboard
- **React.js** with TypeScript
- **Chart.js/Recharts** for analytics
- **Tailwind CSS** for styling

## 📁 Project Structure

```
klingo-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Common components (buttons, inputs)
│   │   ├── forms/          # Form-specific components
│   │   └── ui/             # UI-specific components
│   ├── screens/            # App screens
│   │   ├── auth/           # Authentication screens
│   │   ├── home/           # Home and dashboard screens
│   │   ├── booking/        # Booking flow screens
│   │   ├── tracking/       # Real-time tracking screens
│   │   └── profile/        # User profile screens
│   ├── navigation/         # Navigation configuration
│   ├── services/           # API and external services
│   │   ├── api/            # API calls and endpoints
│   │   ├── auth/           # Authentication services
│   │   └── storage/        # Local storage management
│   ├── store/              # Redux store configuration
│   │   ├── slices/         # Redux slices
│   │   └── index.ts        # Store configuration
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── constants/          # App constants
│   └── hooks/              # Custom React hooks
├── assets/                 # Static assets
│   ├── images/            # Images and graphics
│   ├── icons/             # Custom icons
│   └── fonts/             # Custom fonts
├── admin-dashboard/        # Admin web dashboard
└── docs/                  # Documentation
```

## 🔧 Environment Setup

Create `.env` file in root directory:

```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# API Configuration
EXPO_PUBLIC_API_BASE_URL=your_api_base_url

# Maps Configuration (if using maps)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests (if configured)
npm run test:e2e
```

## 📦 Building for Production

### Android
```bash
# Build APK
npx expo build:android

# Build AAB (recommended for Play Store)
npx expo build:android -t app-bundle
```

### iOS
```bash
# Build for iOS
npx expo build:ios
```

## 🚀 Deployment

### Mobile App
- **Android**: Google Play Store
- **iOS**: Apple App Store
- **Expo**: Expo Go platform for testing

### Admin Dashboard
- **Vercel/Netlify**: For React dashboard
- **Firebase Hosting**: Alternative hosting option

## 📊 Key Metrics & Analytics

The app tracks important business metrics:
- Total jobs completed: 95
- Pending jobs: 25
- Active clients: 36
- Monthly job trends and analytics

## 🌱 Sustainability Focus

KLINGO promotes eco-friendly practices:
- Encourages use of reusable cups instead of disposable ones
- Professional crews trained in sustainable cleanup methods
- Focus on environmentally responsible waste management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@klingo.com or join our Slack channel.

## 🗺 Roadmap

- [ ] iOS App Store release
- [ ] Android Play Store release
- [ ] Advanced scheduling features
- [ ] Integration with payment gateways
- [ ] Multi-language support
- [ ] Crew mobile app for workers
- [ ] Advanced analytics dashboard
- [ ] API for third-party integrations

## 📈 Performance

- **App Size**: < 50MB
- **Cold Start**: < 3 seconds
- **Real-time Updates**: < 1 second latency
- **Offline Support**: Basic functionality available offline

---

**Made with ❤️ by the KLINGO Team**

*Holding Down, Nothing Right* - Our commitment to sustainable, professional cleaning services.
