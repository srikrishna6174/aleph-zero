import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthProvider";
import { TrackerProvider } from "./context/TrackerProvider";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import ChannelsPage from "./pages/ChannelsPage";
import LibraryPage from "./pages/LibraryPage";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TrackerProvider>
          <BrowserRouter>
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#ffffff",
                  color: "#18181b",
                  border: "1px solid #e6e3dc",
                  fontSize: "13.5px",
                  fontWeight: "500",
                  borderRadius: "12px",
                  boxShadow:
                    "0 10px 28px -6px rgba(24, 24, 20, 0.12), 0 2px 6px rgba(24, 24, 20, 0.05)",
                },
                success: {
                  iconTheme: {
                    primary: "#059669",
                    secondary: "#ffffff",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "#dc2626",
                    secondary: "#ffffff",
                  },
                },
              }}
            />

            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </TrackerProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
