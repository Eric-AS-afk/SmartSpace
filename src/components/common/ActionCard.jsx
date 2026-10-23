import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';

const accentStyles = {
  primary: {
    borderColor: 'rgba(88, 183, 255, 0.26)',
    glow: 'rgba(88, 183, 255, 0.18)'
  },
  secondary: {
    borderColor: 'rgba(159, 176, 195, 0.24)',
    glow: 'rgba(159, 176, 195, 0.14)'
  },
  neutral: {
    borderColor: 'rgba(148, 163, 184, 0.18)',
    glow: 'rgba(148, 163, 184, 0.10)'
  }
};

// Muestra accesos rápidos reutilizables en la pantalla de inicio.
export default function ActionCard({ title, description, route, accent = 'neutral', onClick }) {
  const tone = accentStyles[accent] || accentStyles.neutral;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: `1px solid ${tone.borderColor}`,
        background:
          'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.015) 100%)',
        backdropFilter: 'blur(8px)',
        transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 18px 40px ${tone.glow}`,
          borderColor: 'rgba(88, 183, 255, 0.42)'
        }
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent sx={{ p: 3, height: '100%' }}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.22em' }}>
              {route.replace('/', '').toUpperCase()}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', flexGrow: 1, lineHeight: 1.7 }}>
              {description}
            </Typography>
            <Box sx={{ color: 'primary.main', display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Abrir
              </Typography>
              <Typography aria-hidden="true" variant="body2" sx={{ fontSize: 18, lineHeight: 1 }}>
                →
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}