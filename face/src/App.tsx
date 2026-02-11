import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Typography, Box } from '@mui/material';

// Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#4caf50',
    },
    secondary: {
      main: '#f44336',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 4 }}>
        <Typography variant="h4">OpenClaw Face</Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Agent status visualization dashboard
        </Typography>
      </Box>
    </ThemeProvider>
  );
}

export default App;