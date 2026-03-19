import { Box, Typography } from '@mui/material';
import loginRightImage from '../assets/loginRIght.png';

interface AuthVisualPanelProps {
  title: string;
  description: string;
}

export default function AuthVisualPanel({ title, description }: AuthVisualPanelProps) {
  return (
    <Box
      sx={{
        flex: 1,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: { xs: 'none', md: 'flex' },
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Image */}
      <Box
        component="img"
        src={loginRightImage}
        alt="Auth visual"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.3,
        }}
      />
      
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          background:
            'radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
        }}
      />
      <Box sx={{ textAlign: 'center', zIndex: 1 }}>
        <Typography
          variant="h2"
          sx={{
            color: 'white',
            fontWeight: 700,
            mb: 3,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="h5"
          sx={{
            color: 'rgba(255, 255, 255, 0.9)',
            maxWidth: '500px',
            lineHeight: 1.6,
          }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  );
}
