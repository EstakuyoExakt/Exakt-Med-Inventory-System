import { Route, Routes, useLocation, Navigate } from "react-router-dom";

// Auth Pages
import Login from "./features/authentication/login";
import Unauthorized from "./features/authentication/unauthorized";

// Admin Pages
import FacilityManagement from "./features/admin/facilityManagement";
import SupplierManagement from "./features/admin/supplierManagement";
import UserManagement from "./features/admin/userManagement";
import Accounting from "./features/admin/accounting";

// Pharmacist Manager Pages
import PharmacistDashboard from "./features/pharmacist-manager/pharmacistDashboard";
import SkuManagement from "./features/pharmacist-manager/skuManagement";
import BatchManagement from "./features/pharmacist-manager/batchManagement";

// Procurement Officer Pages
import ProcurementDashboard from "./features/procurement-officer/procurementDashboard";
import OrderRequest from "./features/procurement-officer/orderRequest";

// Shared Pages
import RequestedOrders from "./features/shared/requestedOrders";
import AuditLogs from "./features/shared/audtiLogs";

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
        className={`flex-1 min-w-0 ${
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
            <Route
              path="/admin/requested-orders"
              element={<RequestedOrders />}
            />
            <Route path="/admin/accounting" element={<Accounting />} />
            <Route path="/admin/audit-logs" element={<AuditLogs />} />
          </Route>

          {/* Pharmacist Manager Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.PHARMACIST]} />}>
            <Route
              path="/pharmacist/dashboard"
              element={<PharmacistDashboard />}
            />
            <Route
              path="/pharmacist/sku-management"
              element={<SkuManagement />}
            />
            <Route
              path="/pharmacist/batch-management"
              element={<BatchManagement />}
            />
            <Route path="/pharmacist/audit-logs" element={<AuditLogs />} />
          </Route>

          {/* Procurement Officer Protected Routes */}
          <Route
            element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT]} />}
          >
            <Route
              path="/procurement/dashboard"
              element={<ProcurementDashboard />}
            />
            <Route
              path="/procurement/order-request"
              element={<OrderRequest />}
            />
            <Route
              path="/procurement/requested-orders"
              element={<RequestedOrders />}
            />
            <Route path="/procurement/audit-logs" element={<AuditLogs />} />
          </Route>

          {/* Fallback Catch-All Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
