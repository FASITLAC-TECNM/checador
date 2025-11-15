import { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import AffiliationRequest from "./pages/AffiliationRequest";
import KioskScreen from "./pages/KioskScreen";
import SessionScreen from "./pages/SessionScreen";

function App() {
  // Por defecto mostrar KioskScreen
  // Puedes cambiar esto para mostrar diferentes páginas durante desarrollo
  const [currentPage, setCurrentPage] = useState("kiosk"); // 'affiliation', 'kiosk', 'session'

  return (
    <ThemeProvider>
      <div className="App">
        {currentPage === "affiliation" && <AffiliationRequest />}
        {currentPage === "kiosk" && <KioskScreen />}
        {currentPage === "session" && (
          <SessionScreen onLogout={() => setCurrentPage("kiosk")} />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
