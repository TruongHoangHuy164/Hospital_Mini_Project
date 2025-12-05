# Clinic Flutter App

Mobile app for booking appointments, viewing lab results, and browsing visit history.

## Prerequisites

- Flutter SDK (3.24+)
- Backend API running from this repo (default `http://localhost:5000`)

## Configure API URL

You can set the backend URL via Dart define:

```
flutter run --dart-define=API_URL=http://localhost:5000
```

Or edit `ApiClient.baseUrl` in `lib/src/api/api_client.dart`.

## Run

```
cd mobile/flutter_app
flutter pub get
flutter run --dart-define=API_URL=http://localhost:5000
```

## Screens & Style

- Login: gradient header, Phosphor icons, smooth animations
- Booking: hospital-styled sections, availability-based doctor cards with chip slots
- Results: card list with subtle animations
- History: card list with status badge

### UI Libraries

- `google_fonts`: Inter typography
- `phosphor_flutter`: Polished icon set
- `flutter_animate`: Smooth micro-interactions
- `animations` (Material): Transitions
- `url_launcher`: Open MoMo `payUrl/deeplink`

Endpoints used:

- Auth: `POST /api/auth/login`
- Booking: `GET /api/booking/specialties`, `GET /api/booking/availability`, `POST /api/booking/appointments`
- Payment: `POST /api/booking/appointments/:id/momo`, `POST /api/booking/appointments/:id/pay`, `GET /api/booking/appointments/:id/ticket`
- Lists: `GET /api/booking/my-appointments`, `GET /api/booking/my-results`