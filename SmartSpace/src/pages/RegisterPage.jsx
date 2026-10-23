import { useState } from 'react';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await register({ nombre, apellido, correo, password });
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Register failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', mt: 8, px: 2 }}>
      <Typography variant="h5" gutterBottom>Registro</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} fullWidth margin="normal" />
        <TextField label="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} fullWidth margin="normal" />
        <TextField label="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} fullWidth margin="normal" />
        <TextField label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth margin="normal" />
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>Crear cuenta</Button>
      </form>
    </Box>
  );
}
