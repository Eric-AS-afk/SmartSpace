import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createProjectRecord,
  loadProjectDraft,
  loadStoredActiveProjectId,
  loadStoredProjects,
  removeProjectDraft,
  saveProjectDraft,
  saveStoredActiveProjectId,
  saveStoredProjects
} from '../utils/projectStorage';
import {
  createProject as createRemoteProject,
  deleteProject as deleteRemoteProject,
  saveDrawing as saveRemoteDrawing,
  getProjects,
  updateProject as updateRemoteProject
} from '../services/api';
import { useAuth } from './AuthContext';

const ProjectContext = createContext(null);

// Semilla local para que la gestión de proyectos tenga datos simulados desde el arranque.
const initialSeedProjects = [
  createProjectRecord({
    name: 'Proyecto de tesis',
    description: 'Lienzo inicial para pruebas visuales y simulación de trazos.'
  })
];

const normalizeProject = (project) => ({
  id: String(project.PR_proyecto ?? project.id ?? `project-${Date.now()}`),
  name: project.nombre ?? project.name ?? 'Proyecto sin nombre',
  description: project.descripcion ?? project.description ?? '',
  createdAt: project.createdAt ?? project.created_at ?? new Date().toISOString(),
  updatedAt: project.updatedAt ?? project.updated_at ?? new Date().toISOString(),
  sourceProjectId: project.sourceProjectId ?? null,
  snapshot: project.snapshot && typeof project.snapshot === 'string' ? JSON.parse(project.snapshot) : (project.snapshot || {})
});

// Controla la biblioteca de proyectos y su persistencia local, sincronizando con el backend cuando sea posible.
export function ProjectProvider({ children }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(() => {
    const storedProjects = loadStoredProjects();

    return storedProjects.length > 0 ? storedProjects : initialSeedProjects;
  });
  const [activeProjectId, setActiveProjectId] = useState(() => {
    const storedActiveProjectId = loadStoredActiveProjectId();

    return storedActiveProjectId || initialSeedProjects[0].id;
  });
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState({});
  const [draftInfo, setDraftInfo] = useState(null);
  const skipDraftBackupRef = useRef(false);

  useEffect(() => {
    saveStoredProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveStoredActiveProjectId(activeProjectId);
  }, [activeProjectId]);

  const { user } = useAuth();

  useEffect(() => {
    const loadRemoteProjects = async () => {
      const identifier = user?.correo || 'demo-user';
      try {
        const { data } = await getProjects(identifier);
        const remoteProjects = Array.isArray(data) ? data.map(normalizeProject) : [];

        setProjects(remoteProjects);
        setActiveProjectId(remoteProjects[0]?.id || null);
        skipDraftBackupRef.current = true;
        setWorkspaceSnapshot(remoteProjects[0]?.snapshot || {});
      } catch (error) {
        console.warn('No se pudieron cargar los proyectos desde el backend.', error);
      }
    };

    loadRemoteProjects();
  }, [user?.correo]);

  useEffect(() => {
    const project = projects.find((entry) => entry.id === activeProjectId);
    const draft = user?.correo && project ? loadProjectDraft(user.correo, project.id) : null;
    const draftIsNewer = draft?.updatedAt && (!project?.updatedAt || draft.updatedAt > project.updatedAt);
    setDraftInfo(draftIsNewer ? { projectId: project.id, updatedAt: draft.updatedAt } : null);
  }, [activeProjectId, projects, user?.correo]);

  useEffect(() => {
    if (!user?.correo || !activeProjectId || !Object.keys(workspaceSnapshot || {}).length) return undefined;
    if (skipDraftBackupRef.current) {
      skipDraftBackupRef.current = false;
      return undefined;
    }
    const timer = window.setTimeout(() => {
      saveProjectDraft(user.correo, activeProjectId, workspaceSnapshot);
      setDraftInfo((current) => current || { projectId: activeProjectId, updatedAt: new Date().toISOString() });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [activeProjectId, user?.correo, workspaceSnapshot]);

  const recoverDraft = () => {
    const draft = loadProjectDraft(user?.correo, activeProjectId);
    if (!draft?.snapshot) return false;
    setProjects((current) => current.map((project) => project.id === activeProjectId ? { ...project, snapshot: draft.snapshot } : project));
    setWorkspaceSnapshot(draft.snapshot);
    setDraftInfo(null);
    return true;
  };

  const discardDraft = () => {
    removeProjectDraft(user?.correo, activeProjectId);
    setDraftInfo(null);
  };

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) || null,
    [activeProjectId, projects]
  );

  useEffect(() => {
    if (!activeProject && projects.length > 0) {
      setActiveProjectId(projects[0].id);
    }
  }, [activeProject, projects]);

  const syncProjectSnapshot = (projectId, updates) => {
    let updatedProject = null;

    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectId) {
          return project;
        }

        updatedProject = {
          ...project,
          ...updates,
          updatedAt: new Date().toISOString()
        };

        return updatedProject;
      })
    );

    return updatedProject;
  };

  const createProject = async ({ name, description } = {}) => {
    if (!user?.correo) {
      return null;
    }
    const projectName = name?.trim() || `Proyecto ${projects.length + 1}`;
    const projectDescription = description?.trim() || 'Proyecto simulado para la primera etapa.';
    const snapshotCopy = JSON.parse(JSON.stringify(workspaceSnapshot || {}));
    const payload = {
      name: projectName,
      description: projectDescription,
      snapshot: snapshotCopy
    };

    try {
      const { data } = await createRemoteProject(user.correo, payload);
      const newProject = normalizeProject(data);

      setProjects((currentProjects) => [newProject, ...currentProjects]);
      setActiveProjectId(newProject.id);
      setWorkspaceSnapshot(newProject.snapshot || {});
      try {
        await saveRemoteDrawing(newProject.id, { name: 'Dibujo principal', data: snapshotCopy }, user.correo);
      } catch (drawingError) {
        console.warn('No se pudo guardar el dibujo asociado.', drawingError);
      }

      return newProject;
    } catch (error) {
      const newProject = createProjectRecord({
        name: projectName,
        description: projectDescription,
        snapshot: snapshotCopy
      });

      setProjects((currentProjects) => [newProject, ...currentProjects]);
      setActiveProjectId(newProject.id);

      return newProject;
    }
  };

  const saveProject = async (projectId = activeProjectId) => {
    if (!projectId) {
      return createProject({ name: 'Proyecto sin nombre' });
    }

    const projectExists = projects.some((project) => project.id === projectId);

    if (!projectExists) {
      return createProject({ name: workspaceSnapshot.projectName || 'Proyecto simulado' });
    }

    const snapshotCopy = JSON.parse(JSON.stringify(workspaceSnapshot || {}));
    const payload = {
      name: activeProject?.name || 'Proyecto sin nombre',
      description: activeProject?.description || '',
      snapshot: snapshotCopy
    };

    try {
      const { data } = await updateRemoteProject(projectId, payload, user?.correo);
      const updatedProject = normalizeProject(data);

      setProjects((currentProjects) =>
        currentProjects.map((project) => (project.id === projectId ? updatedProject : project))
      );
      setWorkspaceSnapshot(updatedProject.snapshot || {});
      removeProjectDraft(user?.correo, projectId);
      setDraftInfo(null);
      try {
        await saveRemoteDrawing(projectId, { name: 'Dibujo principal', data: snapshotCopy }, user?.correo);
      } catch (drawingError) {
        console.warn('No se pudo guardar el dibujo asociado.', drawingError);
      }

      return updatedProject;
    } catch (error) {
      const updatedProject = syncProjectSnapshot(projectId, { snapshot: snapshotCopy });
      return updatedProject;
    }
  };

  const saveProjectAs = async ({ name, description } = {}) => {
    const sourceProject = activeProject || projects[0];

    if (!sourceProject) {
      return createProject({ name, description });
    }

    const snapshotCopy = JSON.parse(JSON.stringify(workspaceSnapshot || {}));
    const payload = {
      name: name?.trim() || `${sourceProject.name} - copia`,
      description: description?.trim() || sourceProject.description,
      snapshot: snapshotCopy
    };

    try {
      const { data } = await createRemoteProject(user.correo, payload);
      const duplicateProject = normalizeProject(data);

      setProjects((currentProjects) => [duplicateProject, ...currentProjects]);
      setActiveProjectId(duplicateProject.id);
      setWorkspaceSnapshot(duplicateProject.snapshot || {});
      try {
        await saveRemoteDrawing(duplicateProject.id, { name: 'Dibujo principal', data: snapshotCopy }, user.correo);
      } catch (drawingError) {
        console.warn('No se pudo guardar el dibujo asociado.', drawingError);
      }

      return duplicateProject;
    } catch (error) {
      const duplicateProject = createProjectRecord({
        name: payload.name,
        description: payload.description,
        snapshot: snapshotCopy,
        sourceProjectId: sourceProject.id
      });

      setProjects((currentProjects) => [duplicateProject, ...currentProjects]);
      setActiveProjectId(duplicateProject.id);

      return duplicateProject;
    }
  };

  const openProject = (projectId) => {
    const targetProject = projects.find((project) => project.id === projectId);

    if (!targetProject) {
      return null;
    }

    setActiveProjectId(projectId);
    skipDraftBackupRef.current = true;
    setWorkspaceSnapshot(targetProject.snapshot || {});
    navigate('/espacio-dibujo');

    return targetProject;
  };

  const deleteProject = async (projectId) => {
    try {
      await deleteRemoteProject(projectId, user?.correo);
    } catch (error) {
      console.warn('No se pudo eliminar el proyecto desde el backend.', error);
    }

    const nextProjects = projects.filter((project) => project.id !== projectId);
    setProjects(nextProjects);

    if (projectId === activeProjectId) {
      setActiveProjectId(nextProjects[0]?.id || null);
      setWorkspaceSnapshot(nextProjects[0]?.snapshot || {});
    }
  };

  const importProjects = (incomingProjects) => {
    const normalizedProjects = incomingProjects
      .filter((project) => project && project.name)
      .map((project) => ({
        id: project.id || `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: project.name,
        description: project.description || 'Proyecto importado desde archivo JSON.',
        createdAt: project.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceProjectId: project.sourceProjectId || null,
        snapshot: project.snapshot || {}
      }));

    if (normalizedProjects.length === 0) {
      return [];
    }

    setProjects((currentProjects) => [...normalizedProjects, ...currentProjects]);
    setActiveProjectId(normalizedProjects[0].id);
    setWorkspaceSnapshot(normalizedProjects[0].snapshot || {});

    return normalizedProjects;
  };

  const value = useMemo(
    () => ({
      projects,
      activeProjectId,
      activeProject,
      workspaceSnapshot,
      draftInfo,
      recoverDraft,
      discardDraft,
      setWorkspaceSnapshot,
      createProject,
      saveProject,
      saveProjectAs,
      openProject,
      deleteProject,
      importProjects,
      setActiveProjectId
    }),
    [activeProject, activeProjectId, draftInfo, projects, workspaceSnapshot]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

// Permite acceder a la biblioteca y operaciones de proyectos desde cualquier pantalla.
export function useProjectContext() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error('useProjectContext must be used within ProjectProvider');
  }

  return context;
}