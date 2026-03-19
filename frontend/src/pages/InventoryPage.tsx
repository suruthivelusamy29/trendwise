import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
} from '@mui/material';
import { Edit, Delete, Add, Image as ImageIcon } from '@mui/icons-material';
import axios from '../api/axios';
import Sidebar from '../components/Sidebar';
import DashboardNavbar from '../components/DashboardNavbar';

interface Product {
  p_id: number;
  name: string;
  description: string;
  image: string | null;
  current_stock: number;
  threshold: number;
  price: number;
}

const defaultImage = 'https://via.placeholder.com/300x200?text=No+Image';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    current_stock: 0,
    threshold: 0,
    price: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

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

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        current_stock: product.current_stock,
        threshold: product.threshold,
        price: product.price,
      });
      setImagePreview(product.image || '');
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        current_stock: 0,
        threshold: 0,
        price: 0,
      });
      setImagePreview('');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProduct = async () => {
    try {
      const formPayload = new FormData();
      formPayload.append('name', formData.name);
      formPayload.append('description', formData.description);
      formPayload.append('current_stock', formData.current_stock.toString());
      formPayload.append('threshold', formData.threshold.toString());
      formPayload.append('price', formData.price.toString());
      
      if (imageFile) {
        formPayload.append('image', imageFile);
      }

      if (editingProduct) {
        await axios.put(`/product/${editingProduct.p_id}`, formPayload);
      } else {
        await axios.post('/product/', formPayload);
      }

      fetchProducts();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await axios.delete(`/product/${id}`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  return (
    <Box sx={{ display: 'flex', background: '#0f0f1e', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, width: 'calc(100% - 280px)' }}>
        <DashboardNavbar />
        
        <Box sx={{ p: 4, mt: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
              Inventory Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                px: 3,
              }}
            >
              Add Product
            </Button>
          </Box>

          <Grid container spacing={3}>
            {products.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.p_id}>
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
                  <CardMedia
                    component="img"
                    height="200"
                    image={product.image || defaultImage}
                    alt={product.name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent>
                    <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                      {product.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 2 }}>
                      {product.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip label={`Stock: ${product.current_stock}`} size="small" sx={{ background: '#667eea' }} />
                      <Chip label={`$${product.price}`} size="small" sx={{ background: '#10b981' }} />
                      <Chip 
                        label={`Alert: ${product.threshold}`} 
                        size="small" 
                        sx={{ background: product.current_stock < product.threshold ? '#ef4444' : '#f59e0b' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => handleOpenDialog(product)}
                        sx={{ flex: 1, borderColor: '#667eea', color: '#667eea' }}
                      >
                        Edit
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteProduct(product.p_id)}
                        sx={{ color: '#ef4444' }}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Add/Edit Dialog */}
          <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ background: '#1a1a2e', color: 'white' }}>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </DialogTitle>
            <DialogContent sx={{ background: '#1a1a2e', pt: 3 }}>
              <TextField
                fullWidth
                label="Product Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ mb: 2 }}
                InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                InputProps={{ style: { color: 'white' } }}
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                sx={{ mb: 2 }}
                InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                InputProps={{ style: { color: 'white' } }}
              />
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Stock"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                    InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                    InputProps={{ style: { color: 'white' } }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Threshold"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value) || 0 })}
                    InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                    InputProps={{ style: { color: 'white' } }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Price"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                    InputProps={{ style: { color: 'white' } }}
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageIcon />}
                  sx={{ borderColor: '#667eea', color: '#667eea', mb: 2 }}
                >
                  Upload Image
                  <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                </Button>
                {imagePreview && (
                  <Box
                    component="img"
                    src={imagePreview}
                    sx={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 1 }}
                  />
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ background: '#1a1a2e', p: 2 }}>
              <Button onClick={handleCloseDialog} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveProduct}
                variant="contained"
                sx={{ background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)' }}
              >
                {editingProduct ? 'Update' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
}
