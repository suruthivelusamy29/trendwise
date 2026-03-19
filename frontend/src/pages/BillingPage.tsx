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
  IconButton,
  Chip,
} from '@mui/material';
import { Add, PictureAsPdf, Delete } from '@mui/icons-material';
import axios from '../api/axios';
import Sidebar from '../components/Sidebar';
import DashboardNavbar from '../components/DashboardNavbar';

interface Product {
  p_id: number;
  uid: number;
  name: string;
  description: string | null;
  image: string | null;
  current_stock: number;
  threshold: number;
  price: number | null;
}

interface BillItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Bill {
  billing_id: number;
  sale_id: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  product_name: string;
  quantity: number;
  sale_date: string;
}

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    fetchProducts();
    fetchBills();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/product/');
      const productsData = response.data.products || [];
      // Filter out products without prices
      setProducts(productsData.filter((p: Product) => p.price !== null && p.price > 0));
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchBills = async () => {
    try {
      const response = await axios.get('/billing/');
      setBills(response.data.bills || []);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  const handleAddItem = () => {
    try {
      console.log('Adding item - selectedProduct:', selectedProduct, 'quantity:', quantity);
      
      if (!selectedProduct || quantity <= 0) {
        alert('Please select a product and enter a valid quantity');
        return;
      }

      const product = products.find(p => p.p_id === selectedProduct);
      console.log('Found product:', product);
      
      if (!product) {
        alert('Product not found');
        return;
      }

      if (!product.price || product.price <= 0) {
        alert('Product price is not set. Please update the product price first.');
        return;
      }

      // Check stock availability
      const existingItem = billItems.find(item => item.product_id === selectedProduct);
      const totalQuantityInBill = existingItem ? existingItem.quantity + quantity : quantity;
      
      console.log('Stock check - current_stock:', product.current_stock, 'requested:', totalQuantityInBill);
      
      if (product.current_stock < totalQuantityInBill) {
        alert(`Insufficient stock! Available: ${product.current_stock}, Requested: ${totalQuantityInBill}`);
        return;
      }

      if (existingItem) {
        setBillItems(billItems.map(item =>
          item.product_id === selectedProduct
            ? { ...item, quantity: item.quantity + quantity, total: (item.quantity + quantity) * item.price }
            : item
        ));
      } else {
        const priceNum = Number(product.price);
        const newItem = {
          product_id: product.p_id,
          product_name: product.name,
          quantity,
          price: priceNum,
          total: quantity * priceNum,
        };
        console.log('Adding new item:', newItem);
        setBillItems([...billItems, newItem]);
      }

      setSelectedProduct(0);
      setQuantity(1);
    } catch (error) {
      console.error('Error in handleAddItem:', error);
      alert('Error adding item: ' + (error as Error).message);
    }
  };

  const handleRemoveItem = (productId: number) => {
    setBillItems(billItems.filter(item => item.product_id !== productId));
  };

  const handleCreateBill = async () => {
    if (billItems.length === 0) {
      alert('Please add items to the bill');
      return;
    }

    try {
      await axios.post(
        '/billing/',
        {
          items: billItems.map(item => ({
            p_id: item.product_id,
            quantity: item.quantity,
          })),
        }
      );

      alert('Bill created successfully!');
      setBillItems([]);
      setOpenDialog(false);
      fetchBills();
    } catch (error) {
      console.error('Error creating bill:', error);
      alert('Failed to create bill');
    }
  };

  const handleGeneratePDF = async (billId: number) => {
    try {
      const response = await axios.get(`/billing/${billId}/pdf`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bill_${billId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  const totalAmount = billItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <Box sx={{ display: 'flex', background: '#0f0f1e', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, width: 'calc(100% - 280px)' }}>
        <DashboardNavbar />
        
        <Box sx={{ p: 4, mt: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
              Billing Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
              sx={{
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                px: 3,
              }}
            >
              Create Bill
            </Button>
          </Box>

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
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Bill ID</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Product</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Quantity</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Unit Price</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Total</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.billing_id}>
                    <TableCell sx={{ color: 'white' }}>{bill.billing_id}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{bill.product_name || 'N/A'}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{bill.quantity || 0}</TableCell>
                    <TableCell sx={{ color: 'white' }}>${(Number(bill.unit_price) || 0).toFixed(2)}</TableCell>
                    <TableCell sx={{ color: 'white' }}>
                      <Chip 
                        label={`$${(Number(bill.total_price) || 0).toFixed(2)}`} 
                        sx={{ background: '#667eea', color: 'white' }} 
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'white' }}>
                      {bill.created_at ? new Date(bill.created_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleGeneratePDF(bill.billing_id)}
                        sx={{ color: '#667eea' }}
                      >
                        <PictureAsPdf />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Create Bill Dialog */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ background: '#1a1a2e', color: 'white' }}>
              Create New Bill
            </DialogTitle>
            <DialogContent sx={{ background: '#1a1a2e', pt: 3 }}>
              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                Add Items
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <TextField
                    select
                    fullWidth
                    label="Select Product"
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(Number(e.target.value))}
                    SelectProps={{ native: true }}
                    InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                    InputProps={{ style: { color: 'white' } }}
                  >
                    <option value={0}>Choose a product</option>
                    {products.map((product) => (
                      <option key={product.p_id} value={product.p_id}>
                        {product.name} - ${product.price} (Stock: {product.current_stock})
                      </option>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)' } }}
                    InputProps={{ style: { color: 'white' }, inputProps: { min: 1 } }}
                  />
                </Grid>
                <Grid item xs={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleAddItem}
                    sx={{
                      height: '100%',
                      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    }}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>

              {/* Bill Items */}
              <TableContainer
                sx={{
                  background: 'rgba(15, 15, 30, 0.5)',
                  borderRadius: 1,
                  mb: 2,
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>Product</TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>Qty</TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>Price</TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>Total</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {billItems.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell sx={{ color: 'white' }}>{item.product_name}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{item.quantity}</TableCell>
                        <TableCell sx={{ color: 'white' }}>${(item.price || 0).toFixed(2)}</TableCell>
                        <TableCell sx={{ color: 'white' }}>${(item.total || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveItem(item.product_id)}
                            sx={{ color: '#ef4444' }}
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Chip
                  label={`Total: $${(totalAmount || 0).toFixed(2)}`}
                  sx={{
                    background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    color: 'white',
                    fontSize: '1.1rem',
                    py: 2.5,
                    px: 2,
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions sx={{ background: '#1a1a2e', p: 2 }}>
              <Button onClick={() => setOpenDialog(false)} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateBill}
                variant="contained"
                sx={{ background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)' }}
              >
                Create Bill
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
}
