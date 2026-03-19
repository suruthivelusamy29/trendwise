import { Box } from '@mui/material';

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'landing' | 'auth';
}

export default function GradientBackground({ 
  children, 
  variant = 'landing' 
}: GradientBackgroundProps) {
  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        background:
          variant === 'landing'
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
        position: 'relative',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
      }}
    >
      {/* Animated Background Effects */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          background:
            'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.2) 0%, transparent 50%)',
        }}
      />
      
      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {children}
      </Box>
    </Box>
  );
}
