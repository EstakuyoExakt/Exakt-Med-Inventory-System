import { Route, Routes, useLocation } from "react-router-dom";

// Pages
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";

// Components
import Sidebar from "./components/sidebar";

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/";

  return (
    <>
      {!isLoginPage && <Sidebar />}
      <div
        className={`h-screen flex justify-center items-center bg-gray-50 ${!isLoginPage ? "pl-64" : ""}`}
      >
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
