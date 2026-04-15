import { Route, Routes } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import Home from "../pages/Home";
import Schedule from "../pages/Schedule";
import Ranking from "../pages/Ranking";
import Bracketing from "../pages/Bracketing";
import Guidelines from "../pages/Guidelines";
import Directory from "../pages/Directory";
import About from "../pages/About";
import AdminLogin from "../pages/AdminLogin";
import AdminDashboard from "../pages/AdminDashboard";
import ProtectedRoute from "./ProtectedRoute";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/bracketing" element={<Bracketing />} />
        <Route path="/more/guidelines" element={<Guidelines />} />
        <Route path="/more/directory" element={<Directory />} />
        <Route path="/more/about" element={<About />} />
      </Route>
      <Route path="/adnu-admin-portal/login" element={<AdminLogin />} />
      <Route path="/adnu-admin-portal" element={<ProtectedRoute />}>
        <Route index element={<AdminDashboard />} />
      </Route>
      <Route path="/adnu-admin-portal/*" element={<ProtectedRoute />}>
        <Route path="*" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
