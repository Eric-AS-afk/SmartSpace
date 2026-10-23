import { useMemo, useRef, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ProjectCard from '../components/projects/ProjectCard';
import ProjectFormDialog from '../components/projects/ProjectFormDialog';
import { useProjectContext } from '../context/ProjectContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { toFileName } from '../utils/projectStorage';

// Administra la biblioteca local de proyectos simulados y sus acciones principales.
export default function ProjectsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const {
    projects,
    activeProject,
    activeProjectId,
    createProject,
    saveProject,
    saveProjectAs,
    openProject,
    deleteProject,
    importProjects
  } = useProjectContext();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');

  useDocumentTitle('Gestión de proyectos | Sistema híbrido de dibujo arquitectónico');

  const selectedProject = activeProject || projects[0] || null;

  const summary = useMemo(
    () => ({
      total: projects.length,
      active: activeProject ? activeProject.name : 'Sin proyecto activo'
    }),
    [activeProject, projects.length]
  );

  const buildExportPayload = (project) => {
    const shapeCount = project?.snapshot?.shapes?.length || 0;
    const metadata = {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      shapeCount
    };

    return {
      metadata,
      project
    };
  };

  const downloadTextFile = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = (projectId = selectedProject?.id, format = exportFormat) => {
    const project = projects.find((entry) => entry.id === projectId);

    if (!project) {
      return;
    }

    const baseName = toFileName(project.name) || 'proyecto';

    if (format === 'json') {
      downloadTextFile(JSON.stringify(project, null, 2), `${baseName}.json`, 'application/json');
      return;
    }

    if (format === 'txt') {
      const payload = buildExportPayload(project);
      const lines = [
        `Proyecto: ${payload.metadata.name}`,
        `Descripcion: ${payload.metadata.description}`,
        `Creado: ${payload.metadata.createdAt}`,
        `Actualizado: ${payload.metadata.updatedAt}`,
        `Figuras: ${payload.metadata.shapeCount}`,
        '',
        'Snapshot:',
        JSON.stringify(payload.project.snapshot, null, 2)
      ].join('\n');

      downloadTextFile(lines, `${baseName}.txt`, 'text/plain');
      return;
    }

    if (format === 'csv') {
      const rows = [
        ['id', 'name', 'description', 'createdAt', 'updatedAt', 'shapeCount'],
        [project.id, project.name, project.description, project.createdAt, project.updatedAt, project.snapshot?.shapes?.length || 0]
      ];
      const csv = rows
        .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
      downloadTextFile(csv, `${baseName}.csv`, 'text/csv');
      return;
    }

    if (format === 'md') {
      const markdown = [
        `# ${project.name}`,
        '',
        `- Descripcion: ${project.description}`,
        `- Creado: ${project.createdAt}`,
        `- Actualizado: ${project.updatedAt}`,
        `- Figuras: ${project.snapshot?.shapes?.length || 0}`,
        '',
        '```json',
        JSON.stringify(project.snapshot, null, 2),
        '```'
      ].join('\n');

      downloadTextFile(markdown, `${baseName}.md`, 'text/markdown');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const fileText = await file.text();
    const parsed = JSON.parse(fileText);
    const incomingProjects = Array.isArray(parsed) ? parsed : [parsed];
    importProjects(incomingProjects);
    event.target.value = '';
  };

  return (
    <Box sx={{ py: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.22em' }}>
            GESTIÓN DE PROYECTOS
          </Typography>
          <Typography variant="h3" sx={{ mt: 1, fontSize: { xs: 30, md: 42 } }}>
            Biblioteca local de proyectos
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 760, lineHeight: 1.8, mt: 1 }}>
            Crear, guardar, guardar como, abrir, eliminar, exportar e importar se resuelven aquí con datos simulados
            y persistencia en memoria o LocalStorage.
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: '1px solid rgba(148, 163, 184, 0.16)',
            backgroundColor: 'rgba(15, 23, 42, 0.88)'
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
            <Stack spacing={0.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Proyecto activo: {summary.active}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {summary.total} proyecto(s) cargado(s) en la biblioteca local.
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="contained" onClick={() => setCreateDialogOpen(true)}>
                Crear
              </Button>
              <Button variant="outlined" onClick={() => saveProject(activeProjectId)}>
                Guardar
              </Button>
              <Button variant="outlined" onClick={() => setSaveAsDialogOpen(true)}>
                Guardar como
              </Button>
              <Button variant="outlined" onClick={() => navigate('/espacio-dibujo')}>
                Abrir
              </Button>
              <Button variant="outlined" color="error" onClick={() => activeProject && deleteProject(activeProject.id)}>
                Eliminar
              </Button>
              <Button variant="outlined" onClick={() => setExportFormat((current) => (current === 'json' ? 'txt' : current === 'txt' ? 'csv' : current === 'csv' ? 'md' : 'json'))}>
                Formato: {exportFormat.toUpperCase()}
              </Button>
              <Button variant="outlined" onClick={() => handleExport(activeProject?.id)}>
                Exportar
              </Button>
              <Button variant="outlined" onClick={() => fileInputRef.current?.click()}>
                Importar
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
          }}
        >
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isActive={project.id === activeProjectId}
              onSelect={() => openProject(project.id)}
              onOpen={() => openProject(project.id)}
              onDelete={deleteProject}
              onExport={handleExport}
            />
          ))}
        </Box>
      </Stack>

      <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImport} />

      <ProjectFormDialog
        open={createDialogOpen}
        title="Crear proyecto"
        confirmLabel="Crear"
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={({ name, description }) => createProject({ name, description })}
      />

      <ProjectFormDialog
        open={saveAsDialogOpen}
        title="Guardar como"
        confirmLabel="Guardar copia"
        initialValues={selectedProject}
        onClose={() => setSaveAsDialogOpen(false)}
        onSubmit={({ name, description }) => saveProjectAs({ name, description })}
      />
    </Box>
  );
}