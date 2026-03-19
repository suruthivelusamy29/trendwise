# TrendWise

An AI-powered inventory management and demand forecasting platform that helps businesses optimize stock levels, predict future demand, and make data-driven decisions.

![TrendWise](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-Private-red)

## 🚀 Features

### Core Functionality
- **Smart Forecasting**: AI-powered demand prediction using LightGBM machine learning
- **Inventory Management**: Real-time product tracking with automated reorder points
- **Sales Analytics**: Comprehensive sales tracking with visual dashboards
- **AI Chat Assistant**: Intelligent recommendations powered by Google Gemini
- **Smart Alerts**: Automated notifications for low stock, stockouts, and demand spikes
- **Billing System**: Invoice management with subscription plans
- **Advanced Analytics**: Interactive charts and insights with Recharts

### AI & Machine Learning
- Demand forecasting with LightGBM
- Time-series analysis for trend prediction
- Intelligent reorder point calculations
- AI-powered business recommendations via Google Gemini

## 🏗️ Architecture

This is a **monorepo** containing both frontend and backend:

```
Trendwise-next/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/    # Application pages
│   │   ├── components/  # Reusable UI components
│   │   ├── store/    # Redux state management
│   │   └── api/      # Axios API client
│   └── package.json
│
├── backend/           # Flask REST API
│   ├── src/
│   │   ├── auth/     # Authentication
│   │   ├── product/  # Product management
│   │   ├── sales/    # Sales tracking
│   │   ├── forecast/ # ML forecasting
│   │   ├── alerts/   # Alert system
│   │   └── billing/  # Billing management
│   └── requirements.txt
│
└── README.md         # This file
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: Redux Toolkit
- **Routing**: React Router v7
- **Charts**: Recharts
- **HTTP Client**: Axios

### Backend
- **Framework**: Flask (Python)
- **Authentication**: JWT (Flask-JWT-Extended)
- **Database**: MySQL
- **ML Framework**: LightGBM, scikit-learn, pandas
- **AI**: Google Gemini API
- **Server**: Gunicorn (production)

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.9+
- **MySQL** 8.0+
- **Git**

### Clone Repository
```bash
git clone https://github.com/suruthivelusamy29/trendwise.git
cd Trendwise-next
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`

### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Create .env file with your configuration
python src/app.py
```
Backend runs on `http://localhost:8080`

See individual README files for detailed setup:
- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)

## 🌐 Deployment

This monorepo supports independent deployment:

### Vercel (Frontend)
1. Connect GitHub repository
2. Set **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. Deploy ✅

### Render (Backend)
1. Connect GitHub repository  
2. Set **Root Directory**: `backend`
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `gunicorn src.app:app`
5. Add environment variables
6. Deploy ✅

## 📱 Application Pages

- **Landing Page** - Product showcase and features
- **Authentication** - Login and signup
- **Dashboard** - Overview with key metrics
- **Inventory** - Product management
- **Sales** - Sales tracking and analytics
- **Forecasting** - AI demand predictions
- **AI Chat** - Intelligent assistant
- **AI Recommendations** - Business insights
- **Alerts** - Notification settings
- **Billing** - Subscription management

## 🔐 Environment Variables

### Frontend
```env
VITE_API_URL=http://localhost:8080
```

### Backend
```env
JWT_SECRET_KEY=your-secret-key
MYSQL_HOST=your-mysql-host
MYSQL_USERNAME=your-username
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=trendwise_db
GEMINI_API_KEY=your-gemini-api-key
SMTP_SERVER=smtp.gmail.com
SENDER_EMAIL=your-email@gmail.com
SENDER_PASSWORD=your-app-password
```

## 📄 License

Private - All rights reserved

## 👤 Author

**Suruthi**
