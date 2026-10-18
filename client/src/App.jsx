import { Navigate, Route, Routes } from "react-router-dom";
import GuestRoute from "./components/GuestRoute.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DashboardLayout from "./components/DashboardLayout.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import Artists from "./pages/Artists.jsx";
import ArtistDashboard from "./pages/ArtistDashboard.jsx";
import ArtistProfile from "./pages/ArtistProfile.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Messages from "./pages/Messages.jsx";
import NotFound from "./pages/NotFound.jsx";
import OpenProjects from "./pages/OpenProjects.jsx";
import ProjectDetails from "./pages/ProjectDetails.jsx";
import ProjectEditor from "./pages/ProjectEditor.jsx";
import Register from "./pages/Register.jsx";
import SavedArtists from "./pages/SavedArtists.jsx";
import Studios from "./pages/Studios.jsx";
import StudioDashboard from "./pages/StudioDashboard.jsx";
import StudioProjects from "./pages/StudioProjects.jsx";

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/artists/:id" element={<ArtistProfile />} />
        <Route path="/projects" element={<OpenProjects />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
        <Route path="/studios" element={<Studios />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/messages" element={<Messages />} />
        </Route>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<ProtectedRoute allowedRole="artist" />}>
          <Route path="/artist/dashboard" element={<DashboardLayout role="artist" />}>
            <Route index element={<ArtistDashboard />} />
          </Route>
          <Route path="/dashboard/artist" element={<Navigate to="/artist/dashboard" replace />} />
        </Route>
        <Route element={<ProtectedRoute allowedRole="studio" />}>
          <Route path="/studio" element={<DashboardLayout role="studio" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudioDashboard />} />
            <Route path="projects" element={<StudioProjects />} />
            <Route path="projects/new" element={<ProjectEditor />} />
            <Route path="projects/:id" element={<ProjectDetails />} />
            <Route path="projects/:id/edit" element={<ProjectEditor edit />} />
            <Route path="saved-artists" element={<SavedArtists />} />
          </Route>
          <Route path="/dashboard/studio" element={<Navigate to="/studio/dashboard" replace />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
