import { Container, Typography, Grid, Box, Button } from '@mui/material';
import {
  TrendingUp,
  Inventory,
  Psychology,
  Notifications,
  Receipt,
  BarChart,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import GradientBackground from '../components/GradientBackground';
import Navbar from '../components/Navbar';
import FeatureCard from '../components/FeatureCard';

const features = [
  {
    icon: <TrendingUp sx={{ fontSize: 48 }} />,
    title: 'Smart Forecasting',
    description: 'AI-powered demand prediction with LightGBM for accurate inventory planning',
  },
  {
    icon: <Inventory sx={{ fontSize: 48 }} />,
    title: 'Inventory Optimization',
    description: 'Automated reorder points and safety stock calculations',
  },
  {
    icon: <Psychology sx={{ fontSize: 48 }} />,
    title: 'AI Insights',
    description: 'Intelligent recommendations powered by Google Gemini',
  },
  {
    icon: <Notifications sx={{ fontSize: 48 }} />,
    title: 'Smart Notifications',
    description: 'Real-time alerts for low stock, stockouts, and demand spikes',
  },
  {
    icon: <Receipt sx={{ fontSize: 48 }} />,
    title: 'Billing',
    description: 'Seamless invoice management with automatic inventory updates',
  },
  {
    icon: <BarChart sx={{ fontSize: 48 }} />,
    title: 'Visual Charts',
    description: 'Interactive dashboards with comprehensive analytics',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <GradientBackground variant="landing">
      <Navbar showAuthButtons={true} />

      {/* Hero Section */}
      <Container maxWidth="lg">
        <Box
          sx={{
            textAlign: 'center',
            py: { xs: 8, md: 12 },
            px: 2,
          }}
        >
          <Typography
            variant="h1"
            sx={{
              color: 'white',
              mb: 3,
              fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4.5rem' },
              fontWeight: 800,
              lineHeight: 1.2,
            }}
          >
            Move from guesswork to
            <br />
            precision with{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(45deg, #f093fb 30%, #f5576c 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              AI-powered platform
            </Box>
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: 'rgba(255, 255, 255, 0.9)',
              mb: 6,
              maxWidth: '800px',
              mx: 'auto',
              fontSize: { xs: '1rem', md: '1.25rem' },
              fontWeight: 400,
              lineHeight: 1.6,
            }}
          >
            From raw numbers to actionable forecast in minutes.
            <br />A unified system for smarter inventory management
          </Typography>

          {/* Features Grid */}
          <Grid container spacing={3} sx={{ mt: 8 }}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <FeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              </Grid>
            ))}
          </Grid>

          {/* CTA */}
          <Box sx={{ mt: 8 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/signup')}
              sx={{
                background: 'white',
                color: '#667eea',
                px: 6,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.9)',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Get Started Now
            </Button>
          </Box>
        </Box>
      </Container>
    </GradientBackground>
  );
}
