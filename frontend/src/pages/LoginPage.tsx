import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Container,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { useAppDispatch } from '../store/hooks';
import { setToken } from '../store/authSlice';
import FlowerIcon from '../components/FlowerIcon';
import AuthVisualPanel from '../components/AuthVisualPanel';

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axiosInstance.post('/auth/login', formData);
      dispatch(setToken(response.data.token));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
        margin: 0,
        padding: 0,
      }}
    >
      {/* Left Side - Form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <FlowerIcon size={80} />
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              Welcome back
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Sign in to continue to TrendWise
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              sx={{ mb: 3 }}
              autoComplete="email"
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
              autoComplete="current-password"
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Link
                href="#"
                underline="hover"
                sx={{
                  color: 'primary.main',
                  fontSize: '0.875rem',
                  '&:hover': { color: 'primary.light' },
                }}
              >
                Forgot password?
              </Link>
            </Box>

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                fontSize: '1rem',
                fontWeight: 600,
                mb: 3,
                '&:hover': {
                  background: 'linear-gradient(45deg, #5568d3 30%, #6441a5 90%)',
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>

            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
              Are you new here?{' '}
              <Link
                onClick={() => navigate('/signup')}
                sx={{
                  color: 'primary.main',
                  cursor: 'pointer',
                  fontWeight: 600,
                  '&:hover': { color: 'primary.light' },
                }}
              >
                Get Started
              </Link>
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Right Side - Visual Panel */}
      <AuthVisualPanel
        title="TrendWise"
        description="Your AI-powered companion for intelligent inventory management and precise demand forecasting"
      />
    </Box>
  );
}
