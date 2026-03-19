import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  type SelectChangeEvent,
} from '@mui/material';
import { TrendingUp } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from '../api/axios';
import Sidebar from '../components/Sidebar';
import DashboardNavbar from '../components/DashboardNavbar';

interface Product {
  p_id: number;
  name: string;
}

interface ForecastData {
  date: string;
  predicted_demand: number;
  lower_bound?: number;
  upper_bound?: number;
}

interface Metrics {
  mape: number;
  rmse: number;
  mae: number;
}

export default function ForecastingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [horizonDays, setHorizonDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/product/');
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleGenerateForecast = async () => {
    if (!selectedProduct) {
      alert('Please select a product');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        '/api/forecast/generate',
        {
          p_id: parseInt(selectedProduct),
          horizon_days: horizonDays,
        }
      );

      const forecast = response.data.forecast || [];
      const formattedData = forecast.map((item: any) => ({
        date: new Date(item.date).toLocaleDateString(),
        predicted_demand: Math.round(item.predicted_demand * 100) / 100,
        lower_bound: item.lower_bound ? Math.round(item.lower_bound * 100) / 100 : undefined,
        upper_bound: item.upper_bound ? Math.round(item.upper_bound * 100) / 100 : undefined,
      }));

      setForecastData(formattedData);
      setMetrics(response.data.metrics || null);
      alert('Forecast generated successfully!');
    } catch (error: any) {
      console.error('Error generating forecast:', error);
      alert(error.response?.data?.error || 'Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', background: '#0f0f1e', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, width: 'calc(100% - 280px)' }}>
        <DashboardNavbar />
        
        <Box sx={{ p: 4, mt: 8 }}>
          <Typography variant="h4" sx={{ color: 'white', mb: 4, fontWeight: 600 }}>
            Sales Forecasting
          </Typography>

          <Grid container spacing={3}>
            {/* Controls */}
            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 3,
                  background: 'rgba(26, 26, 46, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={5}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        Select Product
                      </InputLabel>
                      <Select
                        value={selectedProduct}
                        onChange={(e: SelectChangeEvent) => setSelectedProduct(e.target.value)}
                        sx={{
                          color: 'white',
                          '.MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                          },
                        }}
                      >
                        {products.map((product) => (
                          <MenuItem key={product.p_id} value={product.p_id.toString()}>
                            {product.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Forecast Period (Days)"
                      value={horizonDays}
                      onChange={(e) => setHorizonDays(parseInt(e.target.value) || 30)}
                      InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                      InputProps={{
                        style: { color: 'white' },
                        inputProps: { min: 1, max: 365 },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={20} /> : <TrendingUp />}
                      onClick={handleGenerateForecast}
                      disabled={loading}
                      sx={{
                        height: '56px',
                        background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                        '&:disabled': {
                          background: 'rgba(102, 126, 234, 0.3)',
                        },
                      }}
                    >
                      {loading ? 'Generating...' : 'Generate Forecast'}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Metrics */}
            {metrics && (
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Paper
                      sx={{
                        p: 2,
                        background: 'rgba(26, 26, 46, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                        MAPE (Accuracy)
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#10b981', fontWeight: 700 }}>
                        {(Number(metrics.mape) || 0).toFixed(2)}%
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper
                      sx={{
                        p: 2,
                        background: 'rgba(26, 26, 46, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                        RMSE
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                        {(Number(metrics.rmse) || 0).toFixed(2)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper
                      sx={{
                        p: 2,
                        background: 'rgba(26, 26, 46, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                        MAE
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#667eea', fontWeight: 700 }}>
                        {(Number(metrics.mae) || 0).toFixed(2)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Grid>
            )}

            {/* Chart */}
            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 3,
                  background: 'rgba(26, 26, 46, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  minHeight: '500px',
                }}
              >
                <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
                  Demand Forecast
                </Typography>

                {forecastData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.6)"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="rgba(255,255,255,0.6)" />
                      <Tooltip
                        contentStyle={{
                          background: '#1a1a2e',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="predicted_demand"
                        stroke="#667eea"
                        strokeWidth={3}
                        name="Predicted Demand"
                        dot={{ fill: '#667eea', r: 4 }}
                      />
                      {forecastData[0]?.lower_bound !== undefined && (
                        <>
                          <Line
                            type="monotone"
                            dataKey="lower_bound"
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Lower Bound"
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="upper_bound"
                            stroke="#ef4444"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Upper Bound"
                            dot={false}
                          />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Box
                    sx={{
                      height: 400,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem' }}>
                      Select a product and generate forecast to view the chart
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}
