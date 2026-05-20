# GEMINI.md - Tio da Perua Frontend

## Project Overview
**Tio da Perua** is a school transportation management mobile application. It facilitates the interaction between drivers, guardians, and schools.

- **Main Technologies:** Expo (~55), React Native (0.83), React Navigation (7), TypeScript.
- **Architecture:** The application follows a typical React Native structure with screens, components, services, and navigation. It uses functional components and hooks.
- **Roles:**
    - **Driver (Motorista):** Manages routes, students, and vehicle information.
    - **Guardian (Responsável):** Manages dependents, searches for drivers, and monitors trips.
    - **School (Escola):** Placeholder for future implementation.

## Building and Running
To run the project locally, ensure you have Node.js >= 20 and the Expo Go app installed on your device.

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platforms
npm run android
npm run ios
npm run web
```

**Note:** When running on a physical device, update the `BASE_URL` in `src/services/api.ts` with your local machine's IP address.

## Project Structure
- `App.tsx`: Entry point, navigation setup, and global providers.
- `src/`:
    - `components/`: Reusable UI components (e.g., `Logo`, `DriverLayout`, `GuardianLayout`).
    - `screens/`: UI screens for different roles and features.
    - `navigation/`: Navigation configuration and `RootStackParamList` definition.
    - `services/`: API client (`api.ts`) and authentication logic (`authService.ts`).
    - `types.ts`: Global TypeScript interfaces and types.
    - `types/`: Type definition files (`.d.ts`).
- `assets/`: Static assets like images and fonts.

## Development Conventions
- **TypeScript:** Strictly use TypeScript for all files. Define interfaces for API responses and component props.
- **Navigation:** Use `RootStackParamList` in `src/navigation/index.ts` to maintain type safety across screens.
- **API Interaction:** Centralize all API endpoints in `src/services/api.ts`. Use the `API` object for consistency.
- **Styling:** The project uses standard React Native `StyleSheet` and some Tailwind-like utility patterns (seen in `package.json` with `autoprefixer` and `postcss`, though primarily standard RN styles are used in screens).
- **Authentication:** Currently using a mock implementation in `src/services/authService.ts`. Transition to real API calls as the backend matures.
- **Architectural Guidance:** Refer to `IMPLEMENTACAO_PARADAS_VIAGEM.md` for specific logic regarding trip stops and dynamic data generation.

## Key Files to Watch
- `App.tsx`: Central hub for navigation and initialization.
- `src/navigation/index.ts`: Source of truth for navigation routes.
- `src/services/api.ts`: Centralized API configuration.
- `src/types.ts`: Core data models used throughout the app.

# Visual and Code Architecture

## 1. Navigation Architecture
- **Library:** React Navigation 7 (`@react-navigation/native` and `native-stack`).
- **Root Navigator:** Defined in `App.tsx` using `createNativeStackNavigator`.
- **Typing:** `RootStackParamList` in `src/navigation/index.ts` centralizes all route names and their parameters, ensuring type safety when using `useNavigation` and `useRoute`.
- **Flows:** 
    - **Public:** `Login` and `Register`.
    - **Driver:** `DriverMain`, `DriverRoute`, `DriverAttendanceDetail`, `DriverStudents`, `DriverInvites`, `DriverSearchStudents`, `DriverProfile`, `DriverVehicle`, `DriverHistory`.
    - **Guardian:** `GuardianMain`, `GuardianTracking`, `GuardianInvites`, `GuardianSearchDriver`, `GuardianMonitoring`, `NoticeBoard`, `GuardianDependents`, `GuardianDependentForm`, `GuardianPlans`, `GuardianProfile`, `GuardianHistory`.
    - **School:** `SchoolMain` (Placeholder).

## 2. Screen Architecture
- **Location:** `src/screens/`.
- **Pattern:** Functional components with React Hooks.
- **Organization:** Screens are generally named after their purpose and role (e.g., `DriverVehicleScreen`).
- **Logic/UI Separation:** While logic and UI are mostly in the same file, they are separated into distinct sections (State/Hooks at the top, View in the return, Styles at the bottom).
- **Layout Integration:** Screens for specific roles are often wrapped in `DriverLayout` or `GuardianLayout` components to provide consistent headers and side drawers.

## 3. Component Architecture
- **Reusable UI:** Located in `src/components/` (e.g., `Logo.tsx`).
- **Role Layouts:** `DriverLayout.tsx` and `GuardianLayout.tsx` act as higher-order components or wrappers, providing a unified navigation drawer and header for their respective roles.
- **Pattern:** Components are focused on visual consistency and some navigation logic (like the drawer menu).

## 4. Service Architecture
- **API Centralization:** `src/services/api.ts` contains a single `API` object with all endpoint URLs, facilitating global updates (e.g., changing the `BASE_URL`).
- **Logic Centralization:** `src/services/authService.ts` handles the mapping of DTOs and provides a mock layer for authentication and registration.
- **Convention:** New API calls should be added to the `API` object and implemented in a relevant service file.

## 5. Typing Architecture
- **Global Types:** `src/types.ts` defines core interfaces like `Parada`, `Driver`, and `UserRole`.
- **State Models:** `src/context/AppContext.tsx` defines comprehensive interfaces for `User`, `School`, `Dependent`, `Vehicle`, `Trip`, `Solicitation`, `PresenceLog`, and `Notification`.
- **Props/Params:** Standard use of `NativeStackScreenProps` for screen components.

## 6. State Architecture
- **Local State:** Extensive use of `useState` for UI-specific flags (loading, visibility) and form inputs.
- **Global State:** Managed via `AppContext.tsx`. It acts as a "pseudo-database" in memory, holding lists of users, trips, dependents, etc.
- **Persistence:** `RegisterScreen.tsx` uses `AsyncStorage` (`@users`) for local persistence of user accounts.

## 7. Visual Architecture (UX/UI)
- **Aesthetic:** Modern, "Clean" design inspired by iOS/macOS (Inter font, rounded corners, subtle shadows).
- **Color Palette:**
    - Primary: `#1976D2` (Blue)
    - Background: `#FAFAFA` (Off-white)
    - Card/Surface: `#FFFFFF`
    - Text Primary: `#1D1D1F` (Dark gray)
    - Text Secondary: `#86868B` (Light gray)
    - Success: `#34C759` / Error: `#FF3B30`
- **Typography:** Uses Inter font (400, 500, 600, 700 weights).
- **Components:**
    - **Cards:** White background, 12-24px border radius, elevation/shadow.
    - **Buttons:** Filled (`#1976D2`) for primary actions, outlined for secondary.
    - **Inputs:** Light gray background (`#F5F5F7`), 12px border radius.
    - **Feedback:** Activity indicators for loading, standard Alerts for confirmation/errors.

## 8. Mandatory Conventions for New Features
- **Strict TypeScript:** Define interfaces for all new data models.
- **Navigation Registry:** Every new screen must be added to `RootStackParamList`.
- **UI Consistency:** Use existing layout wrappers (`DriverLayout`, `GuardianLayout`) and follow the established color/spacing system.
- **Service Integration:** Add endpoints to `api.ts` before implementing service logic.
- **Mocking:** Maintain the current mock pattern in `AppContext` for development until real backend integration is ready.

# Functional Gaps and UX Issues
- **School Role:** Almost entirely unimplemented (Placeholder).
- **Real API:** All screens are currently using `AppContext` mocks; `api.ts` endpoints are not fully connected to the screens.
- **Navigation Gaps:** `DriverAttendance` route in `App.tsx` leads to a placeholder instead of the route view.
- **Broken Buttons:** Some side-menu items like "Ajuda", "Planos", and "Histórico" (in some cases) lead to placeholders.
- **Input Validation:** Many forms (Vehicle, Dependent) have minimal validation before saving.
- **Backend URL:** The IP in `api.ts` is hardcoded to a specific local IP (`192.168.1.9`), which will fail on other environments.
- **UX Inconsistency:** The "Back" navigation in `RegisterScreen` has a fallback to `Login` that feels redundant.

# Recommendations for Future Development
- **Service Layer Refactoring:** Move state updates from `AppContext` actions to dedicated service functions that call the API once the backend is ready.
- **Custom Hooks:** Extract complex logic from screens like `DriverRouteViewScreen` into custom hooks (e.g., `useRouteLogic`) for better testability.
- **Centralized Error Handling:** Implement a global error handling/notification system instead of individual `Alert.alert`.
- **Loading States:** Standardize loading overlays across all screens during API interactions.
- **Form Validation:** Use a library like `react-hook-form` with `zod` for robust form management and validation.
- **Environment Variables:** Use `expo-constants` or `.env` files to manage the `BASE_URL`.
- **Shared Components:** Further modularize UI elements like the "Status Badge" and "Custom Input" to reduce style duplication.
