import { Navigate, Route, Routes } from 'react-router-dom';
import StudioLayout from './layouts/StudioLayout';
import HomePage from './pages/HomePage';
import DrawingWorkspacePage from './pages/DrawingWorkspacePage';
import ConfigurationPage from './pages/ConfigurationPage';
import ProjectsPage from './pages/ProjectsPage';
import PlaceholderPage from './pages/PlaceholderPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { useAuth } from './context/AuthContext';

// Define las rutas principales de la aplicación en esta primera etapa simulada.
export default function App() {
  const { user } = useAuth();

  return (
    <StudioLayout>
      <Routes>
        <Route path="/" element={user ? <HomePage /> : <LoginPage />} />
        <Route path="/espacio-dibujo" element={<DrawingWorkspacePage />} />
        <Route
          path="/proyectos/nuevo"
          element={<Navigate to="/espacio-dibujo" replace />}
        />
        <Route
          path="/proyectos/abrir"
          element={<ProjectsPage />}
        />
        <Route
          path="/configuracion"
          element={<ConfigurationPage />}
        />
        <Route
          path="/ayuda"
          element={<PlaceholderPage title="Ayuda" description="Aquí se centralizará la documentación de uso y soporte." />}
        />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StudioLayout>
  );
}