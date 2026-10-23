import { Box, Paper, Stack, Typography } from '@mui/material';
import useDocumentTitle from '../hooks/useDocumentTitle';

// Sirve como pantalla temporal para secciones que aún no tienen implementación final.
export default function PlaceholderPage({ title, description }) {
  useDocumentTitle(`${title} | Sistema híbrido de dibujo arquitectónico`);

  return (
    <Box sx={{ py: { xs: 2, md: 4 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 5 },
          border: '1px solid rgba(148, 163, 184, 0.16)',
          backgroundColor: 'rgba(15, 23, 42, 0.88)'
        }}
      >
        <Stack spacing={2} sx={{ maxWidth: 680 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.22em' }}>
            PANTALLA EN CONSTRUCCIÓN
          </Typography>
          <Typography variant="h3" sx={{ fontSize: { xs: 30, md: 40 } }}>
            {title}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            {description}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}