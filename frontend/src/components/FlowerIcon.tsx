import { Box } from '@mui/material';

interface FlowerIconProps {
  size?: number;
}

export default function FlowerIcon({ size = 80 }: FlowerIconProps) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        mx: 'auto',
        mb: 3,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${size * 0.6}px`,
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
      }}
    >
      🌸
    </Box>
  );
}
