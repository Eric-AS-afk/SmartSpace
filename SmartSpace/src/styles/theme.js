import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0a0f18',
      paper: '#111827'
    },
    primary: {
      main: '#58b7ff'
    },
    secondary: {
      main: '#9fb0c3'
    },
    text: {
      primary: '#edf2f7',
      secondary: '#a7b4c4'
    },
    divider: 'rgba(148, 163, 184, 0.16)'
  },
  shape: {
    borderRadius: 18
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.04em'
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.03em'
    },
    button: {
      textTransform: 'none',
      fontWeight: 600
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            'radial-gradient(circle at top left, rgba(88, 183, 255, 0.12), transparent 32%), radial-gradient(circle at top right, rgba(131, 96, 255, 0.10), transparent 28%)'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))'
        }
      }
    }
  }
});