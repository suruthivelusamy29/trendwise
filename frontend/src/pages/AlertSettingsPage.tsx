import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import axios from '../api/axios';
import Sidebar from '../components/Sidebar';
import DashboardNavbar from '../components/DashboardNavbar';

interface Product {
  p_id: number;
  name: string;
  threshold: number;
  current_stock: number;
}

interface Alert {
  alert_id: number;
  product_id: number;
  product_name: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function AlertSettingsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openAddAlertDialog, setOpenAddAlertDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [threshold, setThreshold] = useState<number>(10);
  
  // New alert form
  const [newAlert, setNewAlert] = useState({
    product_id: 0,
    alert_type: 'LOW_STOCK',
    severity: 'MEDIUM',
    message: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchAlerts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/product/');
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get('/api/alerts/');
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const handleEvaluateAllAlerts = async () => {
    try {
      let alertsCreated = 0;
      const lowStockProducts = products.filter(p => p.current_stock < p.threshold);
      
      if (lowStockProducts.length === 0) {
        alert('No low stock products found to evaluate');
        return;
      }

      for (const product of lowStockProducts) {
        try {
          const response = await axios.post(`/api/alerts/evaluate/${product.p_id}`);
          console.log(`Evaluate response for ${product.name}:`, response.data);
          if (response.data.alerts_created && response.data.alerts_created > 0) {
            alertsCreated += response.data.alerts_created;
          }
        } catch (err: any) {
          console.error(`Failed to evaluate product ${product.name}:`, err.response?.data || err.message);
        }
      }
      
      alert(`Evaluated ${lowStockProducts.length} products. Created ${alertsCreated} new alert(s)`);
      fetchAlerts();
    } catch (error: any) {
      console.error('Error evaluating alerts:', error);
      alert(`Failed to evaluate alerts: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleOpenAddAlert = () => {
    setNewAlert({
      product_id: 0,
      alert_type: 'LOW_STOCK',
      severity: 'MEDIUM',
      message: '',
    });
    setOpenAddAlertDialog(true);
  };

  const handleCreateAlert = async () => {
    if (!newAlert.product_id || !newAlert.message.trim()) {
      alert('Please select a product and enter a message');
      return;
    }

    try {
      const product = products.find(p => p.p_id === newAlert.product_id);
      if (!product) return;

      await axios.post('/api/alerts/create', {
        p_id: newAlert.product_id,
        alert_type: newAlert.alert_type,
        severity: newAlert.severity,
        message: newAlert.message,
      });

      alert('Alert created successfully!');
      setOpenAddAlertDialog(false);
      fetchAlerts();
    } catch (error) {
      console.error('Error creating alert:', error);
      alert('Failed to create alert');
    }
  };

  const handleEditThreshold = (product: Product) => {
    setEditingProduct(product);
    setThreshold(product.threshold);
    setOpenDialog(true);
  };

  const handleSaveThreshold = async () => {
    if (!editingProduct) return;

    try {
      await axios.put(`/product/${editingProduct.p_id}`, {
        name: editingProduct.name,
        description: '',
        current_stock: editingProduct.current_stock,
        threshold: threshold,
        price: 0,
      });
      
      alert('Threshold updated successfully!');
      setOpenDialog(false);
      setEditingProduct(null);
      fetchProducts();
      
      // Trigger alert evaluation after threshold update
      await axios.post(`/api/alerts/evaluate/${editingProduct.p_id}`);
      fetchAlerts();
    } catch (error) {
      console.error('Error updating threshold:', error);
      alert('Failed to update threshold');
    }
  };

  const handleMarkAsRead = async (alertId: number) => {
    try {
      await axios.put(`/api/alerts/${alertId}/read`);
      fetchAlerts();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleDeleteAlert = async (alertId: number) => {
    try {
      await axios.delete(`/api/alerts/${alertId}`);
      fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
      alert('Failed to delete alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return '#ef4444';
      case 'HIGH':
        return '#f59e0b';
      case 'MEDIUM':
        return '#3b82f6';
      case 'LOW':
        return '#10b981';
      default:
        return '#667eea';
    }
  };

  const getStockStatusColor = (product: Product) => {
    if (product.current_stock < product.threshold) return '#ef4444';
    if (product.current_stock < product.threshold * 1.5) return '#f59e0b';
    return '#10b981';
  };

  return (
    <Box sx={{ display: 'flex', background: '#0f0f1e', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, width: 'calc(100% - 280px)' }}>
        <DashboardNavbar />
        
        <Box sx={{ p: 4, mt: 8 }}>
          <Typography variant="h4" sx={{ color: 'white', mb: 4, fontWeight: 600 }}>
            Alert Settings & Management
          </Typography>

          {/* Product Thresholds Configuration */}
          <Paper
            sx={{
              p: 4,
              background: 'rgba(26, 26, 46, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              mb: 4,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: 'white' }}>
                Product Alert Thresholds
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleEvaluateAllAlerts}
                sx={{
                  background: 'linear-gradient(45deg, #10b981 30%, #059669 90%)',
                }}
              >
                Auto-Generate Alerts
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Product Name</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Current Stock</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Alert Threshold</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                        No products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.p_id}>
                        <TableCell sx={{ color: 'white' }}>{product.name}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{product.current_stock}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{product.threshold}</TableCell>
                        <TableCell>
                          <Chip
                            label={product.current_stock < product.threshold ? 'LOW STOCK' : 'OK'}
                            size="small"
                            sx={{
                              background: getStockStatusColor(product),
                              color: 'white',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={() => handleEditThreshold(product)}
                            sx={{ color: '#667eea' }}
                            size="small"
                          >
                            <Edit />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Active Alerts */}
          <Paper
            sx={{
              p: 4,
              background: 'rgba(26, 26, 46, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: 'white' }}>
                Active Alerts
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleOpenAddAlert}
                sx={{
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                }}
              >
                Add New Alert
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Severity</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Message</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                        No alerts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    alerts.map((alert) => (
                      <TableRow key={alert.alert_id} sx={{ opacity: alert.is_read ? 0.5 : 1 }}>
                        <TableCell sx={{ color: 'white' }}>{alert.product_name}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{alert.alert_type}</TableCell>
                        <TableCell>
                          <Chip
                            label={alert.severity}
                            size="small"
                            sx={{
                              background: getSeverityColor(alert.severity),
                              color: 'white',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'white', maxWidth: 300 }}>{alert.message}</TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          {new Date(alert.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={alert.is_read ? 'Read' : 'Unread'}
                            size="small"
                            sx={{
                              background: alert.is_read ? '#6b7280' : '#667eea',
                              color: 'white',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {!alert.is_read && (
                              <Button
                                size="small"
                                onClick={() => handleMarkAsRead(alert.alert_id)}
                                sx={{ color: '#10b981', minWidth: 'auto' }}
                              >
                                Mark Read
                              </Button>
                            )}
                            <IconButton
                              onClick={() => handleDeleteAlert(alert.alert_id)}
                              sx={{ color: '#ef4444' }}
                              size="small"
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Edit Threshold Dialog */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ background: '#1a1a2e', color: 'white' }}>
              Edit Alert Threshold
            </DialogTitle>
            <DialogContent sx={{ background: '#1a1a2e', pt: 3 }}>
              {editingProduct && (
                <>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
                    Product: {editingProduct.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
                    Current Stock: {editingProduct.current_stock}
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    label="Alert Threshold"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                    InputProps={{ style: { color: 'white' }, inputProps: { min: 0 } }}
                    helperText="Alert will trigger when stock falls below this value"
                    FormHelperTextProps={{ style: { color: 'rgba(255,255,255,0.4)' } }}
                  />
                </>
              )}
            </DialogContent>
            <DialogActions sx={{ background: '#1a1a2e', p: 2 }}>
              <Button onClick={() => setOpenDialog(false)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveThreshold}
                variant="contained"
                sx={{ background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)' }}
              >
                Save
              </Button>
            </DialogActions>
          </Dialog>

          {/* Add New Alert Dialog */}
          <Dialog open={openAddAlertDialog} onClose={() => setOpenAddAlertDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ background: '#1a1a2e', color: 'white' }}>
              Create New Alert
            </DialogTitle>
            <DialogContent sx={{ background: '#1a1a2e', pt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.6)' }}>Product</InputLabel>
                    <Select
                      value={newAlert.product_id}
                      onChange={(e) => setNewAlert({ ...newAlert, product_id: Number(e.target.value) })}
                      sx={{
                        color: 'white',
                        '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                      }}
                    >
                      {products.map((product) => (
                        <MenuItem key={product.p_id} value={product.p_id}>
                          {product.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.6)' }}>Alert Type</InputLabel>
                    <Select
                      value={newAlert.alert_type}
                      onChange={(e) => setNewAlert({ ...newAlert, alert_type: e.target.value })}
                      sx={{
                        color: 'white',
                        '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                      }}
                    >
                      <MenuItem value="LOW_STOCK">Low Stock</MenuItem>
                      <MenuItem value="DEMAND_SPIKE">Demand Spike</MenuItem>
                      <MenuItem value="FORECASTED_STOCKOUT">Forecasted Stockout</MenuItem>
                      <MenuItem value="CUSTOM">Custom</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.6)' }}>Severity</InputLabel>
                    <Select
                      value={newAlert.severity}
                      onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value })}
                      sx={{
                        color: 'white',
                        '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                      }}
                    >
                      <MenuItem value="LOW">Low</MenuItem>
                      <MenuItem value="MEDIUM">Medium</MenuItem>
                      <MenuItem value="HIGH">High</MenuItem>
                      <MenuItem value="CRITICAL">Critical</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Alert Message"
                    value={newAlert.message}
                    onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
                    InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                    InputProps={{ style: { color: 'white' } }}
                    placeholder="Enter custom alert message..."
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ background: '#1a1a2e', p: 2 }}>
              <Button onClick={() => setOpenAddAlertDialog(false)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateAlert}
                variant="contained"
                sx={{ background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)' }}
              >
                Create Alert
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
}
