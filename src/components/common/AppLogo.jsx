import { Box, Typography } from '@mui/material';

// Representa la marca visual compacta del sistema para la cabecera y las vistas principales.
export default function AppLogo({ compact = false }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box
        aria-hidden="true"
        sx={{
          width: compact ? 44 : 56,
          height: compact ? 44 : 56,
          borderRadius: 3,
          position: 'relative',
          background:
            'linear-gradient(145deg, rgba(88, 183, 255, 0.22), rgba(24, 32, 48, 0.92))',
          border: '1px solid rgba(88, 183, 255, 0.35)',
          boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.03) inset'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: '18%',
            border: '1px solid rgba(237, 242, 247, 0.85)',
            borderRadius: 1.5
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            left: '18%',
            right: '18%',
            top: '48%',
            height: 1,
            background: 'rgba(88, 183, 255, 0.9)'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '18%',
            bottom: '18%',
            left: '48%',
            width: 1,
            background: 'rgba(88, 183, 255, 0.9)'
          }}
        />
      </Box>
      {!compact && (
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.22em' }}>
            CAD INTERACTIVO
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.1, fontWeight: 700 }}>
            Tablero Digital
          </Typography>
        </Box>
      )}
    </Box>
  );
}