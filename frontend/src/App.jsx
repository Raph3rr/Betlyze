import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import { AuthProvider } from "./AuthContext";
import Sidebar from "./components/Sidebar";

import Home from "./pages/Home";
import Converter from "./pages/Converter";
import Predictions from "./pages/Predictions";
import Book from "./pages/Book";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Maintenance from "./pages/Maintenance";

function AppContent() {
  const location = useLocation();

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("betlyze-theme") === "light"
        ? "light"
        : "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    const themeColor = document.querySelector('meta[name="theme-color"]');

    if (themeColor) {
      themeColor.content = theme === "dark" ? "#020713" : "#eaf0f6";
    }

    try {
      localStorage.setItem("betlyze-theme", theme);
    } catch {}
  }, [theme]);

  const maintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === "true";

  const knownPaths = [
    "/",
    "/converter",
    "/predictions",
    "/book",
    "/login",
    "/signup",
    "/settings",
  ];

  const currentPath = location.pathname.replace(/\/+$/, "") || "/";

  const isNotFound = !knownPaths.includes(currentPath);

  if (maintenanceMode) {
    return <Maintenance />;
  }

  if (isNotFound) {
    return <NotFound />;
  }

  return (
    <>
      <Sidebar
        theme={theme}
        onToggleTheme={() =>
          setTheme((value) => (value === "dark" ? "light" : "dark"))
        }
      />

      <main className="min-h-screen px-5 pb-16 pt-24 lg:pl-72 lg:pr-12 lg:pt-12">
        <Routes>
          {/* <Route path="/" element={<Home />} />
          <Route path="/converter" element={<Converter />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/book" element={<Book />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/signup" element={<Auth mode="signup" />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} /> */}
          <Route path="*" element={<Maintenance />}></Route>
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
