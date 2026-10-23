import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ActionCard from '../components/common/ActionCard';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { homeActions } from '../utils/homeActions';
import styles from './HomePage.module.css';

// Presenta la pantalla inicial con accesos rápidos al flujo de proyectos y dibujo.
export default function HomePage() {
  const navigate = useNavigate();

  useDocumentTitle('Inicio | Sistema híbrido de dibujo arquitectónico');

  return (
    <Box className={styles.heroShell}>
      <Box className={styles.heroInner}>
        <Stack spacing={4}>
          <Stack spacing={2} sx={{ maxWidth: 820 }}>
            <Box className={styles.brandMark}>
              <Chip label="Simulación visual" size="small" color="primary" variant="outlined" />
              <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.18em' }}>
                SIN HARDWARE CONECTADO
              </Typography>
            </Box>

            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.28em' }}>
              SISTEMA HÍBRIDO DE DIBUJO ARQUITECTÓNICO
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: 38, md: 58 }, lineHeight: 1.02 }}>
              Interfaz CAD oscura para dibujo arquitectónico asistido.
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 700, lineHeight: 1.8 }}>
              Esta primera etapa concentra la experiencia visual y la navegación del sistema usando datos simulados,
              lista para incorporar después el tablero digital, la Raspberry Pi y los periféricos.
            </Typography>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="contained" size="large" onClick={() => navigate('/espacio-dibujo')}>
              Nuevo Proyecto
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate('/proyectos/abrir')}>
              Abrir Proyecto
            </Button>
            <Button variant="text" size="large" onClick={() => navigate('/configuracion')}>
              Configuración
            </Button>
            <Button variant="text" size="large" onClick={() => navigate('/ayuda')}>
              Ayuda
            </Button>
          </Stack>

          <Box className={styles.actionGrid}>
            {homeActions.map((action) => (
              <Box
                key={action.id}
                className={
                  action.accent === 'primary'
                    ? styles.actionPrimary
                    : action.accent === 'secondary'
                      ? styles.actionSecondary
                      : styles.actionTertiary
                }
              >
                <ActionCard
                  title={action.title}
                  description={action.description}
                  route={action.route}
                  accent={action.accent}
                  onClick={() => navigate(action.route)}
                />
              </Box>
            ))}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}