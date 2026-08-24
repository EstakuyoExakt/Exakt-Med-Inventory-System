import { Route, Routes, useLocation } from "react-router-dom";

// Pages
import Login from "./features/authentication/login";

// Components
import Sidebar from "./components/common/sidebar";

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
        </Routes>
      </div>
    </>
  );
}

export default App;
