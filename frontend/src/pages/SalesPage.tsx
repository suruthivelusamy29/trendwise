import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import {
  Add,
  Upload,
  ShoppingCart,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import axios from '../api/axios';
import Sidebar from '../components/Sidebar';
import DashboardNavbar from '../components/DashboardNavbar';

interface Product {
  p_id: number;
  name: string;
  price: number;
  current_stock: number;
}

interface Sale {
  sale_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Manual Sale Form
  const [saleForm, setSaleForm] = useState({
    product_id: 0,
    quantity: 1,
    unit_price: 0,
    sale_date: new Date().toISOString().split('T')[0],
  });

  // Stock Purchase Form
  const [purchaseForm, setPurchaseForm] = useState({
    product_id: 0,
    quantity: 1,
    unit_cost: 0,
    purchase_date: new Date().toISOString().split('T')[0],
  });
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchSales();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/product/');
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSales = async () => {
    try {
      const response = await axios.get('/sales/');
      setSales(response.data.sales || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
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
      fetchSales();
      fetchProducts();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert(error.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleAddSale = async () => {
    if (!saleForm.product_id || saleForm.quantity <= 0) {
      alert('Please select a product and enter valid quantity');
      return;
    }

    try {
      await axios.post(
        '/sales/',
        {
          p_id: saleForm.product_id,
          quantity: saleForm.quantity,
          unit_price: saleForm.unit_price,
          sale_date: saleForm.sale_date,
        }
      );

      alert('Sale recorded successfully!');
      setSaleForm({
        product_id: 0,
        quantity: 1,
        unit_price: 0,
        sale_date: new Date().toISOString().split('T')[0],
      });
      setOpenDialog(false);
      fetchSales();
      fetchProducts();
    } catch (error: any) {
      console.error('Error adding sale:', error);
      alert(error.response?.data?.error || 'Failed to record sale');
    }
  };

  const handleAddPurchase = async () => {
    if ((!isNewProduct && !purchaseForm.product_id) || purchaseForm.quantity <= 0) {
      alert('Please select a product or enter a new product name and valid quantity');
      return;
    }

    try {
      let productId = purchaseForm.product_id;

      // Create new product if needed
      if (isNewProduct && newProductName.trim()) {
        const newProductResponse = await axios.post('/product/', {
          name: newProductName.trim(),
          description: 'Created from stock purchase',
          current_stock: 0,
          threshold: 10,
          price: purchaseForm.unit_cost,
        });
        productId = newProductResponse.data.p_id;
        if (!productId) {
          alert('Failed to create product - no ID returned');
          return;
        }
        await fetchProducts(); // Refresh product list
      }

      await axios.post(
        `/product/${productId}/add-stock`,
        {
          quantity: purchaseForm.quantity,
          unit_cost: purchaseForm.unit_cost,
        }
      );

      alert('Stock purchase recorded successfully!');
      setPurchaseForm({
        product_id: 0,
        quantity: 1,
        unit_cost: 0,
        purchase_date: new Date().toISOString().split('T')[0],
      });
      setIsNewProduct(false);
      setNewProductName('');
      setOpenDialog(false);
      fetchProducts();
    } catch (error: any) {
      console.error('Error recording purchase:', error);
      alert(error.response?.data?.error || 'Failed to record purchase');
    }
  };

  const handleProductChange = (productId: number, isForSale: boolean) => {
    const product = products.find(p => p.p_id === productId);
    if (product && isForSale) {
      setSaleForm({
        ...saleForm,
        product_id: productId,
        unit_price: product.price,
      });
    } else if (product) {
      setPurchaseForm({
        ...purchaseForm,
        product_id: productId,
      });
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
              Sales & Stock Management
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={uploading ? null : <Upload />}
                disabled={uploading}
                sx={{
                  borderColor: '#667eea',
                  color: '#667eea',
                  '&:hover': {
                    borderColor: '#764ba2',
                    background: 'rgba(102, 126, 234, 0.1)',
                  },
                }}
              >
                {uploading ? 'Uploading...' : 'Upload Excel'}
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                />
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setOpenDialog(true)}
                sx={{
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                  px: 3,
                }}
              >
                Add Entry
              </Button>
            </Box>
          </Box>

          {/* Sales Table */}
          <TableContainer
            component={Paper}
            sx={{
              background: 'rgba(26, 26, 46, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Sale ID</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Product</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Quantity</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Unit Price</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Total</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 4 }}>
                      No sales recorded yet. Add your first sale or upload an Excel file.
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.sale_id}>
                      <TableCell sx={{ color: 'white' }}>{sale.sale_id}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{sale.product_name}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{sale.quantity}</TableCell>
                      <TableCell sx={{ color: 'white' }}>${(Number(sale.unit_price) || 0).toFixed(2)}</TableCell>
                      <TableCell sx={{ color: 'white' }}>
                        <Chip
                          label={`$${(Number(sale.total_amount) || 0).toFixed(2)}`}
                          sx={{ background: '#10b981', color: 'white' }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'white' }}>
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Add Entry Dialog */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ background: '#1a1a2e', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                sx={{
                  '& .MuiTab-root': { color: 'rgba(255,255,255,0.6)' },
                  '& .Mui-selected': { color: '#667eea' },
                  '& .MuiTabs-indicator': { background: '#667eea' },
                }}
              >
                <Tab icon={<ShoppingCart />} label="Record Sale" />
                <Tab icon={<InventoryIcon />} label="Stock Purchase" />
              </Tabs>
            </DialogTitle>
            
            <DialogContent sx={{ background: '#1a1a2e' }}>
              {/* Sale Tab */}
              <TabPanel value={tabValue} index={0}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
                  Record a product sale and reduce inventory
                </Typography>
                
                <TextField
                  select
                  fullWidth
                  label="Select Product"
                  value={saleForm.product_id}
                  onChange={(e) => handleProductChange(Number(e.target.value), true)}
                  SelectProps={{ native: true }}
                  sx={{ mb: 2 }}
                  InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                  InputProps={{ style: { color: 'white' } }}
                >
                  <option value={0}>Choose a product</option>
                  {products.map((product) => (
                    <option key={product.p_id} value={product.p_id}>
                      {product.name} (Stock: {product.current_stock})
                    </option>
                  ))}
                </TextField>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Quantity Sold"
                      value={saleForm.quantity}
                      onChange={(e) => setSaleForm({ ...saleForm, quantity: Number(e.target.value) })}
                      InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                      InputProps={{ style: { color: 'white' }, inputProps: { min: 1 } }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Unit Price"
                      value={saleForm.unit_price}
                      onChange={(e) => setSaleForm({ ...saleForm, unit_price: Number(e.target.value) })}
                      InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                      InputProps={{ style: { color: 'white' }, inputProps: { min: 0, step: 0.01 } }}
                    />
                  </Grid>
                </Grid>

                <TextField
                  fullWidth
                  type="date"
                  label="Sale Date"
                  value={saleForm.sale_date}
                  onChange={(e) => setSaleForm({ ...saleForm, sale_date: e.target.value })}
                  InputLabelProps={{ shrink: true, style: { color: 'rgba(255,255,255,0.6)' } }}
                  InputProps={{ style: { color: 'white' } }}
                  sx={{ mb: 2 }}
                />

                {saleForm.product_id > 0 && (
                  <Paper sx={{ p: 2, background: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
                      Total Amount: ${(saleForm.quantity * saleForm.unit_price).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                      Remaining Stock: {products.find(p => p.p_id === saleForm.product_id)?.current_stock! - saleForm.quantity}
                    </Typography>
                  </Paper>
                )}
              </TabPanel>

              {/* Purchase Tab */}
              <TabPanel value={tabValue} index={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    Record stock purchase and increase inventory
                  </Typography>
                  <Button
                    variant={isNewProduct ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => {
                      setIsNewProduct(!isNewProduct);
                      setPurchaseForm({ ...purchaseForm, product_id: 0 });
                    }}
                    sx={{
                      borderColor: '#667eea',
                      color: isNewProduct ? 'white' : '#667eea',
                      background: isNewProduct ? 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)' : 'transparent',
                    }}
                  >
                    {isNewProduct ? 'Select Existing' : 'Add New Product'}
                  </Button>
                </Box>

                {isNewProduct ? (
                  <TextField
                    fullWidth
                    label="New Product Name"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    sx={{ mb: 2 }}
                    InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                    InputProps={{ style: { color: 'white' } }}
                    placeholder="Enter product name"
                  />
                ) : (
                  <TextField
                    select
                    fullWidth
                    label="Select Product"
                    value={purchaseForm.product_id}
                    onChange={(e) => handleProductChange(Number(e.target.value), false)}
                    SelectProps={{ native: true }}
                    sx={{ mb: 2 }}
                    InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                    InputProps={{ style: { color: 'white' } }}
                  >
                    <option value={0}>Choose a product</option>
                    {products.map((product) => (
                      <option key={product.p_id} value={product.p_id}>
                        {product.name} (Current Stock: {product.current_stock})
                      </option>
                    ))}
                  </TextField>
                )}

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Quantity Bought"
                      value={purchaseForm.quantity}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: Number(e.target.value) })}
                      InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                      InputProps={{ style: { color: 'white' }, inputProps: { min: 1 } }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Unit Cost"
                      value={purchaseForm.unit_cost}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, unit_cost: Number(e.target.value) })}
                      InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                      InputProps={{ style: { color: 'white' }, inputProps: { min: 0, step: 0.01 } }}
                    />
                  </Grid>
                </Grid>

                <TextField
                  fullWidth
                  type="date"
                  label="Purchase Date"
                  value={purchaseForm.purchase_date}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                  InputLabelProps={{ shrink: true, style: { color: 'rgba(255,255,255,0.6)' } }}
                  InputProps={{ style: { color: 'white' } }}
                  sx={{ mb: 2 }}
                />

                {purchaseForm.product_id > 0 && (
                  <Paper sx={{ p: 2, background: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
                      Total Cost: ${(purchaseForm.quantity * purchaseForm.unit_cost).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                      New Stock Level: {products.find(p => p.p_id === purchaseForm.product_id)?.current_stock! + purchaseForm.quantity}
                    </Typography>
                  </Paper>
                )}
              </TabPanel>
            </DialogContent>

            <DialogActions sx={{ background: '#1a1a2e', p: 2 }}>
              <Button onClick={() => setOpenDialog(false)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                Cancel
              </Button>
              <Button
                onClick={tabValue === 0 ? handleAddSale : handleAddPurchase}
                variant="contained"
                sx={{ background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)' }}
              >
                {tabValue === 0 ? 'Record Sale' : 'Record Purchase'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
}
