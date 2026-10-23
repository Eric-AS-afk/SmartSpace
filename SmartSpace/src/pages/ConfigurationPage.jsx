import {
  Box,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { useAppContext } from '../context/AppContext';
import useDocumentTitle from '../hooks/useDocumentTitle';

// Permite ajustar preferencias simuladas que luego alimentarán el resto de la interfaz.
export default function ConfigurationPage() {
  const { settings, setSettings } = useAppContext();

  useDocumentTitle('Configuración | Sistema híbrido de dibujo arquitectónico');

  const updateSetting = (key, value) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value
    }));
  };

  return (
    <Box sx={{ py: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.22em' }}>
            VENTANA DE CONFIGURACIÓN
          </Typography>
          <Typography variant="h3" sx={{ mt: 1, fontSize: { xs: 30, md: 42 } }}>
            Preferencias generales del sistema
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 760, lineHeight: 1.8, mt: 1 }}>
            Estos controles son simulados y preparan la arquitectura para futuras integraciones con hardware,
            perfiles de usuario y persistencia.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
          }}
        >
          <Card elevation={0} sx={{ border: '1px solid rgba(148, 163, 184, 0.16)', backgroundColor: 'rgba(15, 23, 42, 0.88)' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Modo oscuro
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Mantiene la interfaz con estética CAD oscura de alto contraste.
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.darkMode}
                      onChange={(event) => updateSetting('darkMode', event.target.checked)}
                    />
                  }
                  label={settings.darkMode ? 'Activado' : 'Desactivado'}
                />
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid rgba(148, 163, 184, 0.16)', backgroundColor: 'rgba(15, 23, 42, 0.88)' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Idioma
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Define el idioma base de la interfaz y futuros mensajes del sistema.
                </Typography>
                <FormControl fullWidth size="small">
                  <Select value={settings.language} onChange={(event) => updateSetting('language', event.target.value)}>
                    <MenuItem value="es">Español</MenuItem>
                    <MenuItem value="en">Inglés</MenuItem>
                    <MenuItem value="pt">Portugués</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid rgba(148, 163, 184, 0.16)', backgroundColor: 'rgba(15, 23, 42, 0.88)' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Sensibilidad del tablero
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Simula la respuesta del tablero al gesto o presión del usuario.
                </Typography>
                <Box sx={{ px: 1 }}>
                  <Slider
                    value={settings.boardSensitivity}
                    min={0}
                    max={100}
                    onChange={(_, value) => updateSetting('boardSensitivity', value)}
                    valueLabelDisplay="auto"
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid rgba(148, 163, 184, 0.16)', backgroundColor: 'rgba(15, 23, 42, 0.88)' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Tamaño de cuadrícula
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Ajusta el espacio visual entre líneas de referencia del canvas.
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  inputProps={{ min: 8, max: 80, step: 2 }}
                  value={settings.gridSize}
                  onChange={(event) => updateSetting('gridSize', Number(event.target.value))}
                />
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.16)' }} />

        <Card elevation={0} sx={{ border: '1px solid rgba(148, 163, 184, 0.16)', backgroundColor: 'rgba(15, 23, 42, 0.88)' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Escala predeterminada
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Se aplicará como valor inicial en nuevos proyectos.
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={settings.defaultScale}
                  onChange={(event) => updateSetting('defaultScale', event.target.value)}
                >
                  <MenuItem value="1:20">1:20</MenuItem>
                  <MenuItem value="1:25">1:25</MenuItem>
                  <MenuItem value="1:50">1:50</MenuItem>
                  <MenuItem value="1:75">1:75</MenuItem>
                  <MenuItem value="1:100">1:100</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ border: '1px solid rgba(148, 163, 184, 0.16)', backgroundColor: 'rgba(15, 23, 42, 0.88)' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Unidad de medida
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Selecciona la unidad base que se usará al interpretar escalas y mostrar mediciones.
              </Typography>
              <FormControl fullWidth size="small">
                <Select value={settings.unit} onChange={(event) => updateSetting('unit', event.target.value)}>
                  <MenuItem value="mm">Milímetros (mm)</MenuItem>
                  <MenuItem value="cm">Centímetros (cm)</MenuItem>
                  <MenuItem value="m">Metros (m)</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}