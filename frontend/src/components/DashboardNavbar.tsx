import { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Box, 
  IconButton, 
  Badge, 
  Avatar, 
  Popover, 
  List, 
  ListItem, 
  ListItemText, 
  Typography,
  Chip,
  Divider 
} from '@mui/material';
import { Notifications, AccountCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

interface Alert {
  alert_id: number;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
  is_read: boolean;
  product_name: string;
}

export default function DashboardNavbar() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    fetchUnreadAlerts();
    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchUnreadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadAlerts = async () => {
    try {
      const response = await axios.get('/api/alerts/');
      const allAlerts = response.data.alerts || [];
      const unread = allAlerts.filter((a: Alert) => !a.is_read);
      setUnreadCount(unread.length);
      setAlerts(unread.slice(0, 5)); // Show only latest 5
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleViewAll = () => {
    handleClose();
    navigate('/alerts');
  };

  const open = Boolean(anchorEl);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#667eea';
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        ml: '280px',
        width: 'calc(100% - 280px)',
        background: 'rgba(26, 26, 46, 0.8)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'none',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'flex-end' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton
            onClick={handleClick}
            sx={{
              color: 'white',
              '&:hover': {
                background: 'rgba(102, 126, 234, 0.1)',
              },
            }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                mt: 1,
                width: 400,
                background: '#1a1a2e',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Typography variant="h6" sx={{ color: 'white' }}>
                Notifications
              </Typography>
              {unreadCount > 0 && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  You have {unreadCount} unread alert{unreadCount > 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
            
            <List sx={{ maxHeight: 400, overflow: 'auto', p: 0 }}>
              {alerts.length === 0 ? (
                <ListItem>
                  <ListItemText 
                    primary="No new alerts" 
                    primaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.6)', textAlign: 'center' } }}
                  />
                </ListItem>
              ) : (
                alerts.map((alert, index) => (
                  <Box key={alert.alert_id}>
                    <ListItem
                      sx={{
                        '&:hover': { background: 'rgba(102, 126, 234, 0.1)' },
                        cursor: 'pointer',
                      }}
                      onClick={handleViewAll}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Chip
                              label={alert.severity}
                              size="small"
                              sx={{
                                background: getSeverityColor(alert.severity),
                                color: 'white',
                                fontSize: '0.7rem',
                                height: 20,
                              }}
                            />
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                              {alert.product_name}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" sx={{ color: 'white', mb: 0.5 }}>
                              {alert.message}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                              {new Date(alert.created_at).toLocaleString()}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    {index < alerts.length - 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}
                  </Box>
                ))
              )}
            </List>

            {alerts.length > 0 && (
              <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
                <Typography
                  variant="body2"
                  onClick={handleViewAll}
                  sx={{
                    color: '#667eea',
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  View All Alerts
                </Typography>
              </Box>
            )}
          </Popover>

          <IconButton
            sx={{
              color: 'white',
              '&:hover': {
                background: 'rgba(102, 126, 234, 0.1)',
              },
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
              }}
            >
              <AccountCircle />
            </Avatar>
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
