import { Route, Routes } from "react-router-dom";

// Pages
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";

function App() {
  return (
    <div className="h-screen flex justify-center items-center">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;
