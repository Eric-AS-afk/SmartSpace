import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getUserSettings, saveUserSettings } from '../services/api';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

const defaultSettings = {
  darkMode: true,
  language: 'es',
  boardSensitivity: 65,
  gridSize: 24,
  defaultScale: '1:50',
  unit: 'mm'
};

const normalizeSettings = (source = {}) => ({
  darkMode: source.darkMode === 1 || source.darkMode === true,
  language: source.language || defaultSettings.language,
  boardSensitivity: Number(source.boardSensitivity ?? defaultSettings.boardSensitivity),
  gridSize: Number(source.gridSize ?? defaultSettings.gridSize),
  defaultScale: source.defaultScale || defaultSettings.defaultScale,
  unit: source.unit || defaultSettings.unit
});

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [activeProject, setActiveProject] = useState(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.correo) {
        setHasLoadedSettings(true);
        return;
      }

      try {
        const { data } = await getUserSettings(user.correo);
        setSettings((currentSettings) => ({ ...currentSettings, ...normalizeSettings(data) }));
      } catch (error) {
        console.warn('No se pudieron cargar las preferencias desde el backend.', error);
      } finally {
        setHasLoadedSettings(true);
      }
    };

    loadSettings();
  }, [user?.correo]);

  useEffect(() => {
    if (!hasLoadedSettings || !user?.correo) {
      return;
    }

    saveUserSettings(user.correo, settings).catch(() => {
      // El fallback local sigue funcionando si el backend no responde.
    });
  }, [hasLoadedSettings, settings, user?.correo]);

  const value = useMemo(
    () => ({
      activeProject,
      setActiveProject,
      settings,
      setSettings,
      appName: 'Sistema híbrido de dibujo arquitectónico'
    }),
    [activeProject, settings]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }

  return context;
}