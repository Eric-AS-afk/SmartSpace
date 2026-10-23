import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

// Recoge nombre y descripción para crear un proyecto nuevo o duplicarlo con otro nombre.
export default function ProjectFormDialog({
  open,
  title,
  confirmLabel,
  initialValues,
  onClose,
  onSubmit
}) {
  const [formState, setFormState] = useState({ name: '', description: '' });

  useEffect(() => {
    if (open) {
      setFormState({
        name: initialValues?.name || '',
        description: initialValues?.description || ''
      });
    }
  }, [initialValues, open]);

  const handleSubmit = () => {
    onSubmit(formState);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Los datos se guardan en memoria y LocalStorage durante esta etapa.
          </Typography>
          <TextField
            label="Nombre del proyecto"
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
            fullWidth
          />
          <TextField
            label="Descripción"
            value={formState.description}
            onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
            fullWidth
            multiline
            minRows={3}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}