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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import FlowerIcon from '../components/FlowerIcon';
import AuthVisualPanel from '../components/AuthVisualPanel';

export default function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
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

  const handleSendOtp = async () => {
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axiosInstance.post('/api/alerts/send-otp', { email: formData.email });
      setOtpSent(true);
      setShowOtpDialog(true);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axiosInstance.post('/api/alerts/verify-otp', {
        email: formData.email,
        otp: otp,
      });
      setOtpVerified(true);
      setShowOtpDialog(false);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpVerified) {
      setError('Please verify your email with OTP first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axiosInstance.post('/auth/register', formData);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        sx={{
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
        }}
      >
        <Typography
          variant="h1"
          sx={{
            color: 'white',
            fontWeight: 700,
            fontSize: '4rem',
          }}
        >
          done
        </Typography>
      </Box>
    );
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
              Get Started
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Create your account to begin your journey
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Account created successfully! Redirecting to login...
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              sx={{ mb: 3 }}
              autoComplete="name"
            />

            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
              autoComplete="email"
              disabled={otpVerified}
            />

            {!otpVerified && (
              <Button
                fullWidth
                variant="outlined"
                onClick={handleSendOtp}
                disabled={loading || !formData.email}
                sx={{
                  mb: 3,
                  borderColor: '#667eea',
                  color: '#667eea',
                  '&:hover': {
                    borderColor: '#764ba2',
                    background: 'rgba(102, 126, 234, 0.1)',
                  },
                }}
              >
                {otpSent ? 'Resend OTP' : 'Send OTP to Email'}
              </Button>
            )}

            {otpVerified && (
              <Alert severity="success" sx={{ mb: 3 }}>
                ✓ Email verified successfully!
              </Alert>
            )}

            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              helperText="Minimum 6 characters"
              sx={{ mb: 4 }}
              autoComplete="new-password"
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || success || !otpVerified}
              sx={{
                py: 1.5,
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                fontSize: '1rem',
                fontWeight: 600,
                mb: 3,
                '&:hover': {
                  background: 'linear-gradient(45deg, #5568d3 30%, #6441a5 90%)',
                },
                '&:disabled': {
                  background: 'rgba(102, 126, 234, 0.3)',
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
            </Button>

            {!otpVerified && (
              <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'warning.main', mb: 2 }}>
                Please verify your email with OTP before creating account
              </Typography>
            )}

            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
              Already have an account?{' '}
              <Link
                onClick={() => navigate('/login')}
                sx={{
                  color: 'primary.main',
                  cursor: 'pointer',
                  fontWeight: 600,
                  '&:hover': { color: 'primary.light' },
                }}
              >
                Sign In
              </Link>
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Right Side - Visual Panel */}
      <AuthVisualPanel
        title="Join TrendWise"
        description="Transform your inventory management with AI-powered insights. Start making data-driven decisions today."
      />

      {/* OTP Verification Dialog */}
      <Dialog
        open={showOtpDialog}
        onClose={() => {}}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 2,
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Verify Your Email
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We've sent a 6-digit OTP to {formData.email}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setOtp(value);
              setError('');
            }}
            placeholder="000000"
            inputProps={{
              maxLength: 6,
              style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' },
            }}
            sx={{
              '& input': {
                fontWeight: 600,
              },
            }}
          />

          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: 'text.secondary' }}>
            OTP expires in 10 minutes
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, flexDirection: 'column', gap: 1 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleVerifyOtp}
            disabled={loading || otp.length !== 6}
            sx={{
              background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #5568d3 30%, #6441a5 90%)',
              },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify OTP'}
          </Button>

          <Button
            fullWidth
            variant="text"
            onClick={handleSendOtp}
            disabled={loading}
            sx={{ color: '#667eea' }}
          >
            Resend OTP
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
