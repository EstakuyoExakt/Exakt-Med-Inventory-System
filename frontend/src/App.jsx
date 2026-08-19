import { Route, Routes, useLocation } from "react-router-dom";

// Pages
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import MedicineMaster from "./pages/medicineMaster";
import Inventory from "./pages/inventory";
import BatchManagement from "./pages/batchManagement";
import AuditLogs from "./pages/auditLogs";
import UserManagement from "./pages/admin/userManagement";

// Components
import Sidebar from "./components/sidebar";

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/";

  return (
    <>
      {!isLoginPage && <Sidebar />}
      <div
        className={`h-screen flex justify-center items-center bg-gray-100 ${!isLoginPage ? "ml-64" : ""}`}
      >
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/medicine-master" element={<MedicineMaster />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/batch-management" element={<BatchManagement />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/user-management" element={<UserManagement />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
