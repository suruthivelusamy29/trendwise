import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Avatar,
  type SelectChangeEvent,
} from '@mui/material';
import { Send, SmartToy } from '@mui/icons-material';
import axios from '../api/axios';
import Sidebar from '../components/Sidebar';
import DashboardNavbar from '../components/DashboardNavbar';

interface Product {
  p_id: number;
  name: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  message: string;
}

export default function ChatWithAIPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedProduct) return;

    const userMessage = input;
    setInput('');
    setMessages([...messages, { role: 'user', message: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post(
        `/api/forecast/chat/${selectedProduct}`,
        { question: userMessage }
      );

      setMessages((prev) => [
        ...prev,
        { role: 'ai', message: response.data.response },
      ]);
    } catch (error: any) {
      console.error('Error chatting with AI:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          message: error.response?.data?.error || 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box sx={{ display: 'flex', background: '#0f0f1e', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, width: 'calc(100% - 280px)' }}>
        <DashboardNavbar />
        
        <Box sx={{ p: 4, mt: 8 }}>
          <Typography variant="h4" sx={{ color: 'white', mb: 4, fontWeight: 600 }}>
            Chat with AI Assistant
          </Typography>

          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {/* Product Selection */}
            <Paper
              sx={{
                p: 2,
                mb: 3,
                background: 'rgba(26, 26, 46, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  Select Product to Discuss
                </InputLabel>
                <Select
                  value={selectedProduct}
                  onChange={(e: SelectChangeEvent) => {
                    setSelectedProduct(e.target.value);
                    setMessages([]);
                  }}
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

            {/* Chat Messages */}
            <Paper
              sx={{
                p: 3,
                mb: 2,
                background: 'rgba(26, 26, 46, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                minHeight: '500px',
                maxHeight: '500px',
                overflowY: 'auto',
              }}
            >
              {!selectedProduct ? (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                    Select a product to start chatting with AI
                  </Typography>
                </Box>
              ) : messages.length === 0 ? (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SmartToy sx={{ fontSize: 80, color: '#667eea', mb: 2 }} />
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', mb: 1 }}>
                    Hi! I'm your AI assistant
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                    Ask me anything about sales trends, inventory, or forecasts
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {messages.map((msg, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        gap: 2,
                        mb: 3,
                        alignItems: 'flex-start',
                      }}
                    >
                      <Avatar
                        sx={{
                          background:
                            msg.role === 'ai'
                              ? 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)'
                              : '#1a1a2e',
                        }}
                      >
                        {msg.role === 'ai' ? <SmartToy /> : '👤'}
                      </Avatar>
                      <Paper
                        sx={{
                          flex: 1,
                          p: 2,
                          background:
                            msg.role === 'ai'
                              ? 'rgba(102, 126, 234, 0.1)'
                              : 'rgba(15, 15, 30, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <Typography sx={{ color: 'white', whiteSpace: 'pre-wrap' }}>
                          {msg.message}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                  {loading && (
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                        }}
                      >
                        <SmartToy />
                      </Avatar>
                      <CircularProgress size={24} sx={{ color: '#667eea' }} />
                    </Box>
                  )}
                </Box>
              )}
            </Paper>

            {/* Input */}
            <Paper
              sx={{
                p: 2,
                background: 'rgba(26, 26, 46, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder={
                    selectedProduct
                      ? 'Ask about sales trends, inventory levels, or forecasts...'
                      : 'Select a product first'
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!selectedProduct || loading}
                  InputProps={{ style: { color: 'white' } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                    },
                  }}
                />
                <Button
                  variant="contained"
                  endIcon={<Send />}
                  onClick={handleSendMessage}
                  disabled={!selectedProduct || !input.trim() || loading}
                  sx={{
                    background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    minWidth: 120,
                    '&:disabled': {
                      background: 'rgba(102, 126, 234, 0.3)',
                    },
                  }}
                >
                  Send
                </Button>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
