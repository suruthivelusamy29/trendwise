import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  Inventory,
  ShoppingCart,
  ShoppingBag,
  ShowChart,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from '../api/axios';
import Sidebar from '../components/Sidebar';
import DashboardNavbar from '../components/DashboardNavbar';

interface DashboardStats {
  totalProducts: number;
  revenueGenerated: number;
  soldProducts: number;
  boughtProducts: number;
  growthPercentage: number;
}

interface SalesData {
  date: string;
  count: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    revenueGenerated: 0,
    soldProducts: 0,
    boughtProducts: 0,
    growthPercentage: 0,
  });
  const [salesChart, setSalesChart] = useState<SalesData[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch products
      const productsRes = await axios.get('/product/');
      
      // Fetch sales
      const salesRes = await axios.get('/sales/');

      // Calculate stats from fetched data
      const products = productsRes.data.products || [];
      const sales = salesRes.data.sales || [];

      setStats({
        totalProducts: products.length,
        revenueGenerated: sales.reduce((sum: number, sale: any) => sum + (Number(sale.total_amount) || 0), 0),
        soldProducts: sales.reduce((sum: number, sale: any) => sum + (Number(sale.quantity) || 0), 0),
        boughtProducts: products.reduce((sum: number, prod: any) => sum + (Number(prod.current_stock) || 0), 0),
        growthPercentage: 0, // Calculate based on historical data
      });

      // Prepare chart data
      const chartData = sales.slice(0, 10).map((sale: any) => ({
        date: new Date(sale.sale_date).toLocaleDateString(),
        count: Number(sale.quantity) || 0,
      }));
      setSalesChart(chartData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('/sales/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Sales data uploaded successfully!');
      fetchDashboardData();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: <Inventory sx={{ fontSize: 40 }} />,
      color: '#667eea',
    },
    {
      title: 'Revenue Generated',
      value: `$${(Number(stats.revenueGenerated) || 0).toFixed(2)}`,
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      color: '#10b981',
    },
    {
      title: 'Sold Products',
      value: stats.soldProducts,
      icon: <ShoppingCart sx={{ fontSize: 40 }} />,
      color: '#f59e0b',
    },
    {
      title: 'Bought Products',
      value: stats.boughtProducts,
      icon: <ShoppingBag sx={{ fontSize: 40 }} />,
      color: '#8b5cf6',
    },
    {
      title: 'Growth Percentage',
      value: `${(Number(stats.growthPercentage) || 0).toFixed(1)}%`,
      icon: <ShowChart sx={{ fontSize: 40 }} />,
      color: '#ec4899',
    },
  ];

  return (
    <Box sx={{ display: 'flex', background: '#0f0f1e', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, width: 'calc(100% - 280px)' }}>
        <DashboardNavbar />
        
        <Box sx={{ p: 4, mt: 8 }}>
          <Typography variant="h4" sx={{ color: 'white', mb: 4, fontWeight: 600 }}>
            Dashboard Overview
          </Typography>

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {statCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={2.4} key={index}>
                <Card
                  sx={{
                    background: 'rgba(26, 26, 46, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                    },
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ color: card.color }}>{card.icon}</Box>
                    </Box>
                    <Typography variant="h4" sx={{ color: 'white', mb: 1, fontWeight: 700 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      {card.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Upload and Chart Section */}
          <Grid container spacing={3}>
            {/* Upload Section */}
            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 3,
                  background: 'rgba(26, 26, 46, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  height: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6" sx={{ color: 'white', mb: 3, textAlign: 'center' }}>
                  Upload Sales Data
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3, textAlign: 'center' }}>
                  Upload your Excel file containing sales data to update the dashboard
                </Typography>
                <Button
                  variant="contained"
                  component="label"
                  disabled={uploading}
                  sx={{
                    background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    px: 4,
                    py: 1.5,
                  }}
                >
                  {uploading ? 'Uploading...' : 'Choose File'}
                  <input
                    type="file"
                    hidden
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                  />
                </Button>
              </Paper>
            </Grid>

            {/* Chart Section */}
            <Grid item xs={12} md={8}>
              <Paper
                sx={{
                  p: 3,
                  background: 'rgba(26, 26, 46, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  height: '400px',
                }}
              >
                <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
                  Sold Products Over Time
                </Typography>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={salesChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" />
                    <YAxis stroke="rgba(255,255,255,0.6)" />
                    <Tooltip
                      contentStyle={{
                        background: '#1a1a2e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#667eea"
                      strokeWidth={3}
                      dot={{ fill: '#667eea', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}
