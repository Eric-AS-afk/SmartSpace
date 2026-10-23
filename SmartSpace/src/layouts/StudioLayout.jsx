import React, { useState } from 'react';
import { Box, Container, Divider, Stack, Typography, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLogo from '../components/common/AppLogo';
import { useAppContext } from '../context/AppContext';
import { shutdownSystem } from '../services/api';

// Envuelve la aplicación con el marco visual oscuro y la cabecera global.
export default function StudioLayout({ children }) {
  const { appName } = useAppContext();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [shutdownConfirmOpen, setShutdownConfirmOpen] = useState(false);
  const [shuttingDown, setShuttingDown] = useState(false);

  // Visible en cualquier pantalla (no solo en el área de dibujo), ya que
  // StudioLayout envuelve todas las rutas. Pide confirmación antes de
  // apagar: en un panel táctil es fácil tocar por accidente, y apagar el
  // equipo no se puede deshacer.
  const handleShutdown = async () => {
    setShuttingDown(true);
    try {
      await shutdownSystem();
      // A partir de aquí el backend va a apagar el equipo en breve; no hay
      // una "respuesta final" que mostrar, así que dejamos el botón en
      // estado de carga indefinidamente en vez de revertirlo.
    } catch (error) {
      setShuttingDown(false);
      setShutdownConfirmOpen(false);
      // eslint-disable-next-line no-alert
      window.alert('No se pudo apagar el sistema. Verifica que el backend tenga permiso (sudoers) para ejecutar shutdown.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.24,
          backgroundImage:
            'linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(circle at center, black 48%, transparent 100%)'
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 4 }}
        >
          <AppLogo />
          <Stack direction="row" spacing={2} alignItems="center" divider={<Divider orientation="vertical" flexItem />}>
            <Typography variant="body2" sx={{ color: 'text.secondary', letterSpacing: '0.12em' }}>
              {appName}
            </Typography>
            <Typography variant="body2" sx={{ color: 'primary.main', letterSpacing: '0.12em' }}>
              Modo simulación
            </Typography>

            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => setShutdownConfirmOpen(true)}
            >
              ⏻ Apagar
            </Button>

            <Dialog open={shutdownConfirmOpen} onClose={() => (shuttingDown ? null : setShutdownConfirmOpen(false))}>
              <DialogTitle>Apagar el sistema</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  {shuttingDown
                    ? 'Apagando el equipo... en unos segundos perderá energía.'
                    : '¿Seguro que quieres apagar el Raspberry Pi? Esto detiene el controlador por completo; habrá que encenderlo físicamente para volver a usarlo.'}
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShutdownConfirmOpen(false)} disabled={shuttingDown}>Cancelar</Button>
                <Button onClick={handleShutdown} variant="contained" color="error" disabled={shuttingDown}>
                  {shuttingDown ? 'Apagando…' : 'Apagar'}
                </Button>
              </DialogActions>
            </Dialog>

            {!user ? (
              <>
                <Button component={Link} to="/login" size="small">Login</Button>
                <Button component={Link} to="/register" variant="contained" size="small">Register</Button>
              </>
            ) : (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setConfirmOpen(true)}
                >
                  Cerrar sesión
                </Button>

                <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                  <DialogTitle>Confirmar cierre de sesión</DialogTitle>
                  <DialogContent>
                    <DialogContentText>¿Estás seguro que quieres cerrar la sesión?</DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                    <Button
                      onClick={() => {
                        setConfirmOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      variant="contained"
                    >
                      Cerrar sesión
                    </Button>
                  </DialogActions>
                </Dialog>
              </>
            )}
          </Stack>
        </Stack>

        {children}
      </Container>
    </Box>
  );
}