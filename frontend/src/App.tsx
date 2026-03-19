import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import theme from './theme';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import AlertSettingsPage from './pages/AlertSettingsPage';
import BillingPage from './pages/BillingPage';
import ForecastingPage from './pages/ForecastingPage';
import ChatWithAIPage from './pages/ChatWithAIPage';
import AIRecommendationsPage from './pages/AIRecommendationsPage';

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/alerts" element={<AlertSettingsPage />} />            <Route path="/billing" element={<BillingPage />} />
            <Route path="/forecasting" element={<ForecastingPage />} />
            <Route path="/chat" element={<ChatWithAIPage />} />
            <Route path="/recommendations" element={<AIRecommendationsPage />} />          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
