import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  type SelectChangeEvent,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import axios from '../api/axios';
import Sidebar from '../components/Sidebar';
import DashboardNavbar from '../components/DashboardNavbar';

interface Product {
  p_id: number;
  name: string;
}

interface Insight {
  type: 'positive' | 'negative' | 'warning' | 'neutral';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export default function AIRecommendationsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchInsights();
    }
  }, [selectedProduct]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/product/');
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/forecast/insights/${selectedProduct}`);

      // Parse insights from the response
      const insightData = response.data.insights || [];
      const parsedInsights: Insight[] = [];

      if (typeof insightData === 'string') {
        // Parse text insights
        const lines = insightData.split('\n').filter((line: string) => line.trim());
        lines.forEach((line: string) => {
          if (line.includes('increase') || line.includes('growth') || line.includes('higher')) {
            parsedInsights.push({
              type: 'positive',
              title: 'Growth Opportunity',
              description: line,
              priority: 'high',
            });
          } else if (line.includes('decrease') || line.includes('decline') || line.includes('lower')) {
            parsedInsights.push({
              type: 'negative',
              title: 'Declining Trend',
              description: line,
              priority: 'high',
            });
          } else if (line.includes('stock') || line.includes('inventory') || line.includes('reorder')) {
            parsedInsights.push({
              type: 'warning',
              title: 'Inventory Alert',
              description: line,
              priority: 'medium',
            });
          } else {
            parsedInsights.push({
              type: 'neutral',
              title: 'Insight',
              description: line,
              priority: 'low',
            });
          }
        });
      } else if (Array.isArray(insightData)) {
        insightData.forEach((insight: any) => {
          parsedInsights.push({
            type: insight.type || 'neutral',
            title: insight.title || 'Insight',
            description: insight.description || insight.message || '',
            priority: insight.priority || 'medium',
          });
        });
      }

      setInsights(parsedInsights);
    } catch (error: any) {
      console.error('Error fetching insights:', error);
      if (error.response?.status === 404) {
        setInsights([
          {
            type: 'warning',
            title: 'No Forecast Available',
            description: 'Please generate a forecast for this product first to get AI-powered insights.',
            priority: 'high',
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <TrendingUp sx={{ fontSize: 40, color: '#10b981' }} />;
      case 'negative':
        return <TrendingDown sx={{ fontSize: 40, color: '#ef4444' }} />;
      case 'warning':
        return <Warning sx={{ fontSize: 40, color: '#f59e0b' }} />;
      default:
        return <Lightbulb sx={{ fontSize: 40, color: '#667eea' }} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#667eea';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'rgba(16, 185, 129, 0.1)';
      case 'negative':
        return 'rgba(239, 68, 68, 0.1)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.1)';
      default:
        return 'rgba(102, 126, 234, 0.1)';
    }
  };

  return (
    <Box sx={{ display: 'flex', background: '#0f0f1e', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, width: 'calc(100% - 280px)' }}>
        <DashboardNavbar />
        
        <Box sx={{ p: 4, mt: 8 }}>
          <Typography variant="h4" sx={{ color: 'white', mb: 4, fontWeight: 600 }}>
            AI-Powered Recommendations
          </Typography>

          {/* Product Selection */}
          <Paper
            sx={{
              p: 3,
              mb: 4,
              background: 'rgba(26, 26, 46, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxWidth: 500,
            }}
          >
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
          </Paper>

          {/* Loading */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#667eea' }} />
            </Box>
          )}

          {/* Insights */}
          {!loading && selectedProduct && (
            <Grid container spacing={3}>
              {insights.length === 0 ? (
                <Grid item xs={12}>
                  <Paper
                    sx={{
                      p: 4,
                      background: 'rgba(26, 26, 46, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      textAlign: 'center',
                    }}
                  >
                    <Lightbulb sx={{ fontSize: 80, color: '#667eea', mb: 2 }} />
                    <Typography sx={{ color: 'white', fontSize: '1.2rem' }}>
                      No insights available yet
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', mt: 1 }}>
                      Generate a forecast for this product to receive AI-powered recommendations
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                insights.map((insight, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Card
                      sx={{
                        background: getInsightColor(insight.type),
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        height: '100%',
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                          {getInsightIcon(insight.type)}
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                                {insight.title}
                              </Typography>
                              <Chip
                                label={insight.priority.toUpperCase()}
                                size="small"
                                sx={{
                                  background: getPriorityColor(insight.priority),
                                  color: 'white',
                                  fontSize: '0.7rem',
                                  height: 20,
                                }}
                              />
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6 }}
                            >
                              {insight.description}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          )}

          {!selectedProduct && !loading && (
            <Paper
              sx={{
                p: 4,
                background: 'rgba(26, 26, 46, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
              }}
            >
              <CheckCircle sx={{ fontSize: 80, color: '#667eea', mb: 2 }} />
              <Typography sx={{ color: 'white', fontSize: '1.2rem' }}>
                Select a product to view recommendations
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', mt: 1 }}>
                AI-powered insights will help you make better inventory decisions
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}
