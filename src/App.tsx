import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Service from "./pages/EmployeeService";
import History from "./pages/History";
import EmployeeScheduling from "./pages/EmployeeScheduling";
import AdminItems from "./pages/AdminItems";
import AdminEmployees from "./pages/AdminEmployees";
import AdminBudget from "./pages/AdminBudget";
import AdminReport from "./pages/AdminReport";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/service" element={<Service />} />
      <Route path="/scheduling" element={<EmployeeScheduling />} />
      <Route path="/history" element={<History />} />
      <Route path="/adminitems" element={<AdminItems />} />
      <Route path="/adminemployees" element={<AdminEmployees />} />
      <Route path="/adminbudget" element={<AdminBudget />} />
      <Route path="/adminreport" element={<AdminReport />} />
    </Routes>
  );
}

export default App;
