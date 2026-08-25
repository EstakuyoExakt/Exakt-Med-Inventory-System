import { Route, Routes, useLocation, Navigate } from "react-router-dom";

// Auth Pages
import Login from "./features/authentication/login";
import Unauthorized from "./features/authentication/unauthorized";

// Admin Pages
import FacilityManagement from "./features/admin/facilityManagement";
import SupplierManagement from "./features/admin/supplierManagement";
import UserManagement from "./features/admin/userManagement";
import BillingConfirmation from "./features/admin/billingConfirmation";

// Pharmacist Manager Pages
import PharmacistDashboard from "./features/pharmacist-manager/pharmacistDashboard";
import Medicine from "./features/pharmacist-manager/medicine";

// Procurement Officer Pages
import ProcurementDashboard from "./features/procurement-officer/procurementDashboard";
import Batches from "./features/procurement-officer/batches";

// Accountant Pages
import AccountantDashboard from "./features/accountant/accountantDashboard";
import Invoice from "./features/accountant/invoice";

// Components, Guard & Config
import Sidebar from "./components/common/sidebar";
import ProtectedRoute from "./components/guard/protectedRoutes";
import { ROLES } from "./config/roles";

function App() {
  const location = useLocation();
  const isAuthPage =
    location.pathname === "/" || location.pathname === "/unauthorized";

  return (
    <div className="flex min-h-screen bg-gray-100">
      {!isAuthPage && <Sidebar />}

      <main
        className={`flex-1 ${
          !isAuthPage
            ? "ml-64 p-8 min-h-screen"
            : "flex justify-center items-center min-h-screen"
        }`}
      >
        <Routes>
          {/* Public / Auth Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/suppliers" element={<SupplierManagement />} />
            <Route path="/admin/facilities" element={<FacilityManagement />} />
            <Route path="/admin/billing" element={<BillingConfirmation />} />
          </Route>

          {/* Pharmacist Manager Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST]} />}>
            <Route
              path="/pharmacist/dashboard"
              element={<PharmacistDashboard />}
            />
            <Route path="/pharmacist/medicines" element={<Medicine />} />
          </Route>

          {/* Procurement Officer Protected Routes */}
          <Route
            element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT]} />}
          >
            <Route
              path="/procurement/dashboard"
              element={<ProcurementDashboard />}
            />
            <Route path="/procurement/batches" element={<Batches />} />
          </Route>

          {/* Accountant Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT]} />}>
            <Route
              path="/accountant/dashboard"
              element={<AccountantDashboard />}
            />
            <Route path="/accountant/invoices" element={<Invoice />} />
          </Route>

          {/* Fallback Catch-All Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
