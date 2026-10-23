import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';

// Presenta un proyecto individual para abrirlo, revisarlo o gestionarlo.
export default function ProjectCard({ project, isActive, onSelect, onOpen, onDelete, onExport }) {
  return (
    <Card
      elevation={0}
      sx={{
        border: isActive ? '1px solid rgba(88, 183, 255, 0.52)' : '1px solid rgba(148, 163, 184, 0.16)',
        backgroundColor: isActive ? 'rgba(13, 24, 42, 0.96)' : 'rgba(15, 23, 42, 0.86)'
      }}
    >
      <CardActionArea onClick={onSelect} sx={{ alignItems: 'stretch' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {project.name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  {project.description}
                </Typography>
              </Stack>
              <Chip size="small" color={isActive ? 'primary' : 'default'} label={isActive ? 'Activo' : 'Guardado'} />
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" variant="outlined" label={`Escala: ${project.snapshot?.scale || '1:50'}`} />
              <Chip size="small" variant="outlined" label={`Actualizado: ${new Date(project.updatedAt).toLocaleDateString('es-ES')}`} />
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label="Abrir" onClick={(event) => { event.stopPropagation(); onOpen(project.id); }} />
              <Chip size="small" label="Exportar" onClick={(event) => { event.stopPropagation(); onExport(project.id); }} />
              <Chip size="small" label="Eliminar" color="error" onClick={(event) => { event.stopPropagation(); onDelete(project.id); }} />
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}