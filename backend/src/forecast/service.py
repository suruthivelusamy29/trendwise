import numpy as np
import pandas as pd
import lightgbm as lgb
from datetime import datetime, timedelta
from sklearn.metrics import mean_absolute_error, mean_squared_error
from src.db import get_db_connection
from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

# Import alert service for triggering forecast-based alerts
try:
    from src.alerts.service import alert_service
except ImportError:
    alert_service = None

class ForecastService:
    def __init__(self):
        self.models = {}
        
        # Initialize Gemini AI for insights
        api_key = os.getenv('GEMINI_API_KEY')
        if api_key:
            self.client = genai.Client(api_key=api_key)
            self.ai_model = 'gemini-2.0-flash-exp'
        else:
            self.client = None
            self.ai_model = None
    
    def _prepare_features(self, data):
        """Convert date to features for LightGBM"""
        df = data.copy()
        df['day'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        df['weekday'] = df['date'].dt.weekday
        df['day_of_year'] = df['date'].dt.dayofyear
        df['week_of_year'] = df['date'].dt.isocalendar().week
        return df
    
    def get_sales_data_for_product(self, uid, p_id):
        """Fetch historical sales data for a product from database"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT sale_date as date, SUM(quantity) as quantity
            FROM sales
            WHERE uid = %s AND p_id = %s
            GROUP BY sale_date
            ORDER BY sale_date
        """
        
        cursor.execute(query, (uid, p_id))
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        if not results:
            return None
        
        # Convert to DataFrame
        df = pd.DataFrame(results, columns=['date', 'quantity'])
        df['date'] = pd.to_datetime(df['date'])
        
        return df
    
    def train_forecast_model(self, uid, p_id, horizon_days=30):
        """
        Train LightGBM model for a specific product and generate forecast
        Returns: (run_id, forecast_results, metrics)
        """
        # Get historical sales data
        sales_data = self.get_sales_data_for_product(uid, p_id)
        
        if sales_data is None or len(sales_data) < 7:
            raise ValueError("Insufficient historical data. Minimum 7 days required.")
        
        # Prepare features
        sales_data = self._prepare_features(sales_data)
        X_train = sales_data[['day', 'month', 'weekday', 'day_of_year', 'week_of_year']]
        y_train = sales_data['quantity']
        
        # Train LightGBM model
        train_set = lgb.Dataset(X_train, label=y_train)
        params = {
            'objective': 'regression',
            'metric': 'rmse',
            'learning_rate': 0.1,
            'num_leaves': 31,
            'min_data_in_leaf': 5,
            'verbose': -1
        }
        
        model = lgb.train(params, train_set, num_boost_round=100)
        
        # Store model
        model_key = f"{uid}_{p_id}"
        self.models[model_key] = model
        
        # Generate future dates
        last_date = sales_data['date'].max()
        future_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=horizon_days
        )
        
        future_df = pd.DataFrame({'date': future_dates})
        future_df = self._prepare_features(future_df)
        
        # Predict future sales
        X_future = future_df[['day', 'month', 'weekday', 'day_of_year', 'week_of_year']]
        predictions = model.predict(X_future)
        predictions = np.maximum(predictions, 0)  # No negative predictions
        
        # Create forecast results
        forecast_data = []
        for i, pred_date in enumerate(future_dates):
            forecast_data.append({
                'forecast_date': pred_date.strftime('%Y-%m-%d'),
                'predicted_demand': round(float(predictions[i]), 2)
            })
        
        # Save to database
        run_id = self._save_forecast_to_db(uid, p_id, horizon_days, forecast_data)
        
        # Calculate accuracy metrics
        metrics = self._calculate_accuracy_metrics(sales_data, model)
        
        # Trigger forecast-based alert evaluation
        try:
            if alert_service:
                alert_service.evaluate_forecast_alerts(uid, p_id, forecast_data)
        except Exception:
            # Don't fail forecast if alert generation fails
            pass
        
        return run_id, forecast_data, metrics
    
    def _save_forecast_to_db(self, uid, p_id, horizon_days, forecast_data):
        """Save forecast run and results to database"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert forecast run
        cursor.execute(
            "INSERT INTO forecast_run (uid, run_date, horizon_days) VALUES (%s, %s, %s)",
            (uid, datetime.now(), horizon_days)
        )
        run_id = cursor.lastrowid
        
        # Insert forecast results
        for item in forecast_data:
            cursor.execute(
                """INSERT INTO forecast_result 
                   (run_id, p_id, forecast_date, predicted_demand) 
                   VALUES (%s, %s, %s, %s)""",
                (run_id, p_id, item['forecast_date'], item['predicted_demand'])
            )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return run_id
    
    def _calculate_accuracy_metrics(self, historical_data, model, test_days=7):
        """Calculate model accuracy using last N days as test set"""
        if len(historical_data) < test_days + 7:
            return None
        
        # Split data - use only test data
        test_data = historical_data[-test_days:].copy()
        
        X_test = test_data[['day', 'month', 'weekday', 'day_of_year', 'week_of_year']]
        y_test = test_data['quantity']
        
        # Predict on test set
        predicted = model.predict(X_test)
        predicted = np.maximum(predicted, 0)
        
        # Calculate metrics
        mae = mean_absolute_error(y_test, predicted)
        rmse = mean_squared_error(y_test, predicted, squared=False)
        mape = np.mean(np.abs((y_test - predicted) / (y_test + 1e-5))) * 100
        
        return {
            'mae': round(float(mae), 2),
            'rmse': round(float(rmse), 2),
            'mape': round(float(mape), 2),
            'accuracy': round(max(0, 100 - mape), 2)
        }
    
    def get_forecast_by_run_id(self, run_id):
        """Retrieve forecast results by run_id"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT fr.forecast_date, fr.predicted_demand, p.name as product_name
            FROM forecast_result fr
            JOIN product p ON fr.p_id = p.p_id
            WHERE fr.run_id = %s
            ORDER BY fr.forecast_date
        """
        
        cursor.execute(query, (run_id,))
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return [
            {
                'forecast_date': str(row[0]),
                'predicted_demand': float(row[1]),
                'product_name': row[2]
            }
            for row in results
        ]
    
    def get_latest_forecast(self, uid, p_id):
        """Get the most recent forecast for a product"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT fr.run_id, fr.run_date, fr.horizon_days
            FROM forecast_run fr
            WHERE fr.uid = %s
            AND EXISTS (
                SELECT 1 FROM forecast_result fres 
                WHERE fres.run_id = fr.run_id AND fres.p_id = %s
            )
            ORDER BY fr.run_date DESC
            LIMIT 1
        """
        
        cursor.execute(query, (uid, p_id))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            conn.close()
            return None
        
        run_id = result[0]
        cursor.close()
        conn.close()
        
        return self.get_forecast_by_run_id(run_id)
    
    def calculate_reorder_point(self, forecast_data, lead_time_days=7, service_level=0.95):
        """
        Calculate reorder point based on forecast
        service_level 0.95 = 95% confidence (Z-score = 1.65)
        """
        if not forecast_data or len(forecast_data) < lead_time_days:
            return None
        
        # Get demand for lead time period
        lead_time_forecast = forecast_data[:lead_time_days]
        lead_time_demand = sum(item['predicted_demand'] for item in lead_time_forecast)
        
        # Calculate safety stock
        demands = [item['predicted_demand'] for item in forecast_data]
        demand_std = np.std(demands)
        safety_factor = 1.65  # For 95% service level
        safety_stock = safety_factor * demand_std * np.sqrt(lead_time_days)
        
        reorder_point = lead_time_demand + safety_stock
        
        return {
            'reorder_point': round(reorder_point, 0),
            'lead_time_demand': round(lead_time_demand, 0),
            'safety_stock': round(safety_stock, 0),
            'suggested_order_quantity': round(reorder_point * 1.5, 0)
        }
    
    def get_inventory_kpis(self, forecast_data, historical_data=None):
        """Calculate key inventory performance indicators"""
        if not forecast_data:
            return None
        
        demands = [item['predicted_demand'] for item in forecast_data]
        
        kpis = {
            'forecast_period_days': len(forecast_data),
            'total_predicted_demand': round(sum(demands), 0),
            'avg_daily_demand': round(np.mean(demands), 1),
            'peak_demand_value': round(max(demands), 0),
            'demand_volatility': round(np.std(demands), 1)
        }
        
        # Add growth rate if historical data available
        if historical_data is not None and len(historical_data) > 0:
            historical_avg = historical_data['quantity'].mean()
            forecast_avg = np.mean(demands)
            growth_rate = ((forecast_avg - historical_avg) / historical_avg) * 100
            kpis['predicted_growth_rate'] = round(growth_rate, 1)
        
        return kpis
    
    def generate_ai_insights(self, uid, p_id, forecast_data, historical_data=None):
        """Generate AI-powered insights using Gemini"""
        if not self.ai_model:
            return self._generate_rule_based_insights(forecast_data, historical_data)
        
        try:
            demands = [item['predicted_demand'] for item in forecast_data]
            avg_demand = np.mean(demands)
            trend = 'increasing' if demands[-1] > demands[0] else 'decreasing'
            volatility = np.std(demands)
            
            context = {
                'avg_predicted_demand': round(avg_demand, 1),
                'total_demand': round(sum(demands), 0),
                'trend': trend,
                'volatility': round(volatility, 1),
                'forecast_days': len(forecast_data)
            }
            
            if historical_data is not None and len(historical_data) > 0:
                historical_avg = historical_data['quantity'].mean()
                growth_rate = ((avg_demand - historical_avg) / historical_avg) * 100
                context['growth_rate'] = round(growth_rate, 1)
            
            prompt = f"""
            Analyze this inventory forecast data and provide key insights:
            
            Data Summary: {context}
            
            Provide 3-4 key insights covering:
            1. Demand patterns and trends
            2. Business opportunities or risks
            3. Inventory management recommendations
            4. Seasonal or volatility insights
            
            Be specific and actionable. Format as bullet points.
            """
            
            response = self.client.models.generate_content(
                model=self.ai_model,
                contents=prompt
            )
            return response.text
            
        except Exception:
            return self._generate_rule_based_insights(forecast_data, historical_data)
    
    def _generate_rule_based_insights(self, forecast_data, historical_data=None):
        """Generate insights using rule-based logic"""
        insights = []
        
        demands = [item['predicted_demand'] for item in forecast_data]
        avg_demand = np.mean(demands)
        volatility = np.std(demands)
        trend = 'increasing' if demands[-1] > demands[0] else 'decreasing'
        
        # Trend analysis
        if trend == 'increasing':
            insights.append("📈 Upward Trend: Demand is increasing. Consider increasing safety stock levels.")
        else:
            insights.append("📉 Downward Trend: Demand is decreasing. Review inventory levels to avoid overstocking.")
        
        # Volatility analysis
        cv = volatility / avg_demand if avg_demand > 0 else 0
        if cv >= 0.3:
            insights.append("⚠️ High Volatility: Significant demand fluctuations detected. Increase safety stock by 20-30%.")
        else:
            insights.append("✅ Stable Demand: Low volatility enables lean inventory management.")
        
        # Growth analysis
        if historical_data is not None and len(historical_data) > 0:
            historical_avg = historical_data['quantity'].mean()
            growth_rate = ((avg_demand - historical_avg) / historical_avg) * 100
            
            if growth_rate > 10:
                insights.append(f"🚀 Strong Growth: {round(growth_rate, 1)}% demand increase predicted. Scale up procurement.")
            elif growth_rate < -10:
                insights.append(f"📉 Declining Demand: {abs(round(growth_rate, 1))}% decrease. Consider promotional strategies.")
        
        return "\n".join(insights)
    
    def chat_with_ai(self, uid, p_id, user_question, forecast_data=None):
        """Chat with AI about forecast and inventory"""
        if not self.ai_model:
            return "AI insights are currently unavailable. Please check your API configuration."
        
        if forecast_data is None:
            forecast_data = self.get_latest_forecast(uid, p_id)
        
        if not forecast_data:
            return "Please generate a forecast first to ask questions."
        
        try:
            demands = [item['predicted_demand'] for item in forecast_data]
            
            context = f"""
            Product Forecast Context:
            - Average Predicted Demand: {round(np.mean(demands), 1)} units/day
            - Total Forecast Demand: {round(sum(demands), 0)} units
            - Peak Demand: {round(max(demands), 0)} units
            - Demand Volatility: {round(np.std(demands), 1)}
            - Forecast Period: {len(forecast_data)} days
            
            User Question: {user_question}
            
            Provide a helpful, specific answer based on the forecast data. 
            Be conversational but professional. Focus on actionable inventory insights.
            """
            
            response = self.client.models.generate_content(
                model=self.ai_model,
                contents=context
            )
            return response.text
            
        except Exception as e:
            return f"Error processing question: {str(e)}"
