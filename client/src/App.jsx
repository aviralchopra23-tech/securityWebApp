import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import "./styles/login.css";

import ProtectedRoute from "./auth/ProtectedRoute";

/* ================= OWNER ================= */
import OwnerLayout from "./pages/owner/OwnerLayout";
import OwnerHome from "./pages/owner/OwnerHome";
import OwnerLocations from "./pages/owner/OwnerLocations";
import OwnerUsers from "./pages/owner/OwnerUsers";
import OwnerLocationDetails from "./pages/owner/OwnerLocationDetails";
import OwnerSupervisors from "./pages/owner/OwnerSupervisors";
import OwnerCreateSupervisor from "./pages/owner/OwnerCreateSupervisor";
import OwnerSupervisorDetails from "./pages/owner/OwnerSupervisorDetails";
import OwnerGuards from "./pages/owner/OwnerGuards";
import OwnerCreateGuard from "./pages/owner/OwnerCreateGuard";
import OwnerGuardDetails from "./pages/owner/OwnerGuardDetails";
import OwnerAnnouncements from "./pages/owner/OwnerAnnouncements";
import OwnerDocs from "./pages/owner/OwnerDocs";
import OwnerUserDocuments from "./pages/owner/OwnerUserDocuments";

/* ================= SUPERVISOR ================= */
import SupervisorLayout from "./pages/supervisor/SupervisorLayout";
import SupervisorHome from "./pages/supervisor/SupervisorHome";
import SupervisorSchedule from "./pages/supervisor/SupervisorSchedule";
import EditSupervisorSchedule from "./pages/supervisor/EditSupervisorSchedule";
import SupervisorAnnouncements from "./pages/supervisor/SupervisorAnnouncements";

/* ================= GUARD ================= */
import GuardLayout from "./pages/guard/GuardLayout";
import GuardHome from "./pages/guard/GuardHome";
import GuardSchedule from "./pages/guard/GuardSchedule";

/* ================= SHARED ================= */
import Announcements from "./pages/shared/Announcements";
import Documents from "./pages/shared/Documents";

/* ================= PAY PERIODS ================= */
import GuardPayPeriods from "./pages/guard/GuardPayPeriods";
import AddShiftEntry from "./pages/guard/AddShiftEntry";
import OwnerPayPeriodReports from "./pages/owner/OwnerPayPeriodReports";
import SupervisorPayPeriods from "./pages/supervisor/SupervisorPayPeriods";



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================= LOGIN ================= */}
        <Route path="/" element={<Login />} />

        {/* ================= OWNER ================= */}
        <Route
          path="/owner"
          element={
            <ProtectedRoute allowedRoles={["OWNER"]}>
              <OwnerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OwnerHome />} />

          <Route path="locations" element={<OwnerLocations />} />
          <Route
            path="locations/:locationId"
            element={<OwnerLocationDetails />}
          />

          <Route path="users" element={<OwnerUsers />}>
            <Route path="supervisors" element={<OwnerSupervisors />} />
            <Route path="supervisors/create" element={<OwnerCreateSupervisor />} />
            <Route path="supervisors/:supervisorId" element={<OwnerSupervisorDetails />} />
            <Route path="guards" element={<OwnerGuards />} />
            <Route path="guards/create" element={<OwnerCreateGuard />} />
            <Route path="guards/:guardId" element={<OwnerGuardDetails />} />
          </Route>

          {/* 📢 Owner Announcements */}
          <Route path="announcements" element={<OwnerAnnouncements />} />
          <Route
            path="pay-period-reports"
            element={<OwnerPayPeriodReports />}
          />
          <Route path="docs" element={<OwnerDocs />} />
          <Route path="docs/:userId" element={<OwnerUserDocuments />} />

        </Route>

        {/* ================= SUPERVISOR ================= */}
        <Route
          path="/supervisor"
          element={
            <ProtectedRoute allowedRoles={["SUPERVISOR"]}>
              <SupervisorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SupervisorHome />} />
          <Route path="schedule" element={<SupervisorSchedule />} />
          <Route path="schedule/edit" element={<EditSupervisorSchedule />} />

          {/* 📢 Supervisor Announcements */}
          <Route
            path="announcements"
            element={<SupervisorAnnouncements canCreate />}
          />
          <Route path="documents" element={<Documents />} />
          <Route path="pay-periods" element={<SupervisorPayPeriods />} />

          <Route path="pay-periods/add-shift" element={<AddShiftEntry />} />

        </Route>

        {/* ================= GUARD ================= */}
        <Route
          path="/guard"
          element={
            <ProtectedRoute allowedRoles={["GUARD"]}>
              <GuardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<GuardHome />} />
          <Route path="schedule" element={<GuardSchedule />} />

          <Route path="pay-periods" element={<GuardPayPeriods />} />
          <Route path="pay-periods/add-shift" element={<AddShiftEntry />} />

          <Route
            path="announcements"
            element={<Announcements canCreate={false} />}
          />
          <Route path="documents" element={<Documents />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}
