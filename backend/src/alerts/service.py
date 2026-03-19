from datetime import datetime, timedelta
from src.db import get_db_connection
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import random
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Email Configuration from environment variables
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")


class AlertService:
    """
    Alert Service for TrendWise Inventory Management
    
    Implements three types of alerts:
    1. Low Stock Alert (Reactive) - triggered when current_stock < threshold
    2. Forecasted Stock-Out Alert (Predictive) - triggered when forecasted demand > current stock
    3. Demand Spike Alert (Behavioral) - triggered when recent sales spike abnormally
    
    Design Principles:
    - Event-driven execution (no background polling)
    - De-duplication (no alert spam)
    - Immutable alert records (audit trail)
    - Severity-based escalation
    """
    
    def __init__(self):
        self.spike_factor = 1.5  # 50% above historical average triggers spike alert
        self.recent_days_window = 7  # Days to consider for "recent" sales
        self.historical_days_window = 30  # Days to consider for historical baseline
    
    def evaluate_all_alerts_for_product(self, uid, p_id):
        """
        Comprehensive alert evaluation for a product.
        Called after: sales insertion, billing entry, stock updates.
        """
        alerts_created = []
        
        # Type 1: Low Stock Alert (Reactive)
        low_stock_alert = self._evaluate_low_stock(uid, p_id)
        if low_stock_alert:
            alerts_created.append(low_stock_alert)
        
        # Type 3: Demand Spike Alert (Behavioral)
        spike_alert = self._evaluate_demand_spike(uid, p_id)
        if spike_alert:
            alerts_created.append(spike_alert)
        
        return alerts_created
    
    def evaluate_forecast_alerts(self, uid, p_id, forecast_data):
        """
        Evaluate forecast-based alerts after forecast completion.
        Called only after successful forecast generation.
        
        Args:
            uid: User ID
            p_id: Product ID
            forecast_data: List of forecast predictions
        """
        alerts_created = []
        
        # Type 2: Forecasted Stock-Out Alert (Predictive)
        stockout_alert = self._evaluate_forecasted_stockout(uid, p_id, forecast_data)
        if stockout_alert:
            alerts_created.append(stockout_alert)
        
        return alerts_created
    
    def _evaluate_low_stock(self, uid, p_id):
        """
        Type 1: Low Stock Alert (Reactive)
        Condition: current_stock < threshold
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get product stock and threshold
            cursor.execute("""
                SELECT p_id, name, current_stock, threshold
                FROM product
                WHERE uid = %s AND p_id = %s
            """, (uid, p_id))
            
            product = cursor.fetchone()
            if not product:
                print(f"DEBUG: Product {p_id} not found for user {uid}")
                return None
            
            p_id = product['p_id']
            name = product['name']
            current_stock = int(product['current_stock']) if product['current_stock'] is not None else 0
            threshold = int(product['threshold']) if product['threshold'] is not None else 0
            
            print(f"DEBUG: Product {name} - Stock: {current_stock}, Threshold: {threshold}")
            
            # Check if alert condition is met
            if threshold > 0 and current_stock < threshold:
                severity = self._calculate_low_stock_severity(current_stock, threshold)
                message = f"Low stock alert: {name} has {current_stock} units left (threshold: {threshold})"
                
                print(f"DEBUG: Creating alert - Severity: {severity}, Message: {message}")
                
                # Create alert with de-duplication
                alert = self._create_alert_if_not_exists(
                    cursor, uid, p_id, 'LOW_STOCK', severity, message
                )
                
                if alert:
                    print(f"DEBUG: Alert created with ID: {alert.get('alert_id')}")
                else:
                    print("DEBUG: Alert not created (duplicate exists)")
                
                conn.commit()
                return alert
            else:
                print(f"DEBUG: Alert condition not met - threshold: {threshold}, current_stock: {current_stock}")
            
            return None
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def _evaluate_forecasted_stockout(self, uid, p_id, forecast_data):
        """
        Type 2: Forecasted Stock-Out Alert (Predictive)
        Condition: forecasted_demand (next N days) > current_stock
        """
        if not forecast_data or len(forecast_data) == 0:
            return None
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get current stock
            cursor.execute("""
                SELECT p_id, name, current_stock
                FROM product
                WHERE uid = %s AND p_id = %s
            """, (uid, p_id))
            
            product = cursor.fetchone()
            if not product:
                return None
            
            p_id, name, current_stock = product
            
            # Calculate cumulative forecast demand
            cumulative_demand = 0
            stockout_date = None
            
            for forecast in forecast_data:
                cumulative_demand += forecast.get('predicted_demand', 0)
                
                if cumulative_demand > current_stock:
                    stockout_date = forecast.get('forecast_date')
                    break
            
            # If stockout detected
            if stockout_date:
                days_until_stockout = (
                    datetime.strptime(str(stockout_date), '%Y-%m-%d').date() - 
                    datetime.now().date()
                ).days
                
                severity = self._calculate_stockout_severity(days_until_stockout)
                message = f"Predicted stockout: {name} may run out by {stockout_date} (current stock: {current_stock} units, forecasted demand: {round(cumulative_demand, 0)} units)"
                
                # Create alert with de-duplication
                alert = self._create_alert_if_not_exists(
                    cursor, uid, p_id, 'FORECASTED_STOCKOUT', severity, message
                )
                
                conn.commit()
                return alert
            
            return None
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def _evaluate_demand_spike(self, uid, p_id):
        """
        Type 3: Demand Spike Alert (Behavioral)
        Condition: recent_avg_sales > historical_avg_sales × spike_factor
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get product info
            cursor.execute("""
                SELECT p_id, name
                FROM product
                WHERE uid = %s AND p_id = %s
            """, (uid, p_id))
            
            product = cursor.fetchone()
            if not product:
                return None
            
            p_id = product['p_id']
            name = product['name']
            
            # Calculate recent average (last 7 days)
            recent_cutoff = datetime.now() - timedelta(days=self.recent_days_window)
            cursor.execute("""
                SELECT COALESCE(AVG(quantity), 0) as recent_avg
                FROM sales
                WHERE uid = %s AND p_id = %s AND sale_date >= %s
            """, (uid, p_id, recent_cutoff))
            
            result = cursor.fetchone()
            recent_avg = float(result['recent_avg']) if result else 0
            
            # Calculate historical average (30-37 days ago)
            historical_end = datetime.now() - timedelta(days=self.recent_days_window)
            historical_start = historical_end - timedelta(days=self.historical_days_window)
            
            cursor.execute("""
                SELECT COALESCE(AVG(quantity), 0) as historical_avg
                FROM sales
                WHERE uid = %s AND p_id = %s 
                AND sale_date BETWEEN %s AND %s
            """, (uid, p_id, historical_start, historical_end))
            
            result = cursor.fetchone()
            historical_avg = float(result['historical_avg']) if result else 0
            
            # Check if spike detected
            if historical_avg > 0 and recent_avg > (historical_avg * self.spike_factor):
                spike_percentage = ((recent_avg - historical_avg) / historical_avg) * 100
                
                severity = self._calculate_spike_severity(spike_percentage)
                message = f"Demand spike detected: {name} sales increased {round(spike_percentage, 1)}% (recent avg: {round(recent_avg, 1)}, historical avg: {round(historical_avg, 1)})"
                
                # Create alert with de-duplication
                alert = self._create_alert_if_not_exists(
                    cursor, uid, p_id, 'DEMAND_SPIKE', severity, message
                )
                
                conn.commit()
                return alert
            
            return None
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def _create_alert_if_not_exists(self, cursor, uid, p_id, alert_type, severity, message):
        """
        Create alert only if no recent unread alert of same type exists (de-duplication).
        Automatically sends email notification for new alerts.
        Returns created alert or None if duplicate.
        """
        # Check for existing unread alert of same type created in last 24 hours
        cursor.execute("""
            SELECT alert_id
            FROM alerts
            WHERE uid = %s AND p_id = %s AND alert_type = %s AND is_read = 0
            AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ORDER BY created_at DESC
            LIMIT 1
        """, (uid, p_id, alert_type))
        
        existing = cursor.fetchone()
        
        # If recent unread alert exists, don't create duplicate
        if existing:
            return None
        
        # Get product name and user email for notification
        cursor.execute("""
            SELECT p.name, u.email
            FROM product p
            JOIN user u ON p.uid = u.uid
            WHERE p.uid = %s AND p.p_id = %s
        """, (uid, p_id))
        
        product_info = cursor.fetchone()
        product_name = product_info['name'] if product_info else 'Unknown Product'
        user_email = product_info['email'] if product_info else None
        
        # Create new alert
        cursor.execute("""
            INSERT INTO alerts 
            (uid, p_id, alert_type, severity, message, created_at, is_read)
            VALUES (%s, %s, %s, %s, %s, %s, 0)
        """, (uid, p_id, alert_type, severity, message, datetime.now()))
        
        alert_id = cursor.lastrowid
        
        alert_result = {
            'alert_id': alert_id,
            'alert_type': alert_type,
            'severity': severity,
            'message': message,
            'created_at': datetime.now().isoformat()
        }
        
        # Send email notification if user email is available
        if user_email:
            # Check if we already sent an email for this alert type + product in last 24 hours
            email_key = f"{user_email}:{p_id}:{alert_type}"
            current_time = datetime.now()
            
            # Clean up old entries from sent_alert_emails
            global sent_alert_emails
            sent_alert_emails = {
                k: v for k, v in sent_alert_emails.items()
                if (current_time - v).total_seconds() < 86400  # 24 hours
            }
            
            # Only send email if we haven't sent one recently for this specific alert
            if email_key not in sent_alert_emails:
                alert_data = {
                    'alert_type': alert_type,
                    'severity': severity,
                    'message': message,
                    'product_name': product_name
                }
                
                success, email_message = send_alert_email(user_email, alert_data)
                if success:
                    sent_alert_emails[email_key] = current_time
                    print(f"✓ Alert email sent to {user_email} for {product_name}")
                else:
                    print(f"✗ Failed to send alert email: {email_message}")
        
        return alert_result
    
    def _calculate_low_stock_severity(self, current_stock, threshold):
        """Calculate severity for low stock alerts"""
        if current_stock <= 0:
            return 'CRITICAL'
        elif current_stock < threshold * 0.5:
            return 'HIGH'
        elif current_stock < threshold * 0.75:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def _calculate_stockout_severity(self, days_until_stockout):
        """Calculate severity for forecasted stockout alerts"""
        if days_until_stockout <= 3:
            return 'CRITICAL'
        elif days_until_stockout <= 7:
            return 'HIGH'
        elif days_until_stockout <= 14:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def _calculate_spike_severity(self, spike_percentage):
        """Calculate severity for demand spike alerts"""
        if spike_percentage >= 200:
            return 'CRITICAL'
        elif spike_percentage >= 100:
            return 'HIGH'
        elif spike_percentage >= 50:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def get_user_alerts(self, uid, unread_only=False, severity_filter=None):
        """
        Get all alerts for a user with optional filters.
        Prevents duplicate alerts by only showing the most recent alert per product+type combination.
        
        Args:
            uid: User ID
            unread_only: If True, return only unread alerts
            severity_filter: Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get only the most recent alert for each product+alert_type combination
            query = """
                SELECT a.alert_id, a.p_id, p.name as product_name, 
                       a.alert_type, a.severity, a.message, 
                       a.created_at, a.is_read
                FROM alerts a
                JOIN product p ON a.p_id = p.p_id
                WHERE a.uid = %s
                AND a.alert_id IN (
                    SELECT MAX(alert_id)
                    FROM alerts
                    WHERE uid = %s
                    GROUP BY p_id, alert_type
                )
            """
            params = [uid, uid]
            
            if unread_only:
                query += " AND a.is_read = 0"
            
            if severity_filter:
                query += " AND a.severity = %s"
                params.append(severity_filter)
            
            query += " ORDER BY a.created_at DESC LIMIT 100"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            alerts = [
                {
                    'alert_id': row['alert_id'],
                    'product_id': row['p_id'],
                    'product_name': row['product_name'],
                    'alert_type': row['alert_type'],
                    'severity': row['severity'],
                    'message': row['message'],
                    'created_at': str(row['created_at']),
                    'is_read': bool(row['is_read'])
                }
                for row in results
            ]
            
            return alerts
            
        finally:
            cursor.close()
            conn.close()
    
    def get_product_alerts(self, uid, p_id, unread_only=False):
        """Get all alerts for a specific product"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            query = """
                SELECT alert_id, alert_type, severity, message, created_at, is_read
                FROM alerts
                WHERE uid = %s AND p_id = %s
            """
            params = [uid, p_id]
            
            if unread_only:
                query += " AND is_read = 0"
            
            query += " ORDER BY created_at DESC LIMIT 50"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            alerts = [
                {
                    'alert_id': row['alert_id'],
                    'alert_type': row['alert_type'],
                    'severity': row['severity'],
                    'message': row['message'],
                    'created_at': str(row['created_at']),
                    'is_read': bool(row['is_read'])
                }
                for row in results
            ]
            
            return alerts
            
        finally:
            cursor.close()
            conn.close()
    
    def mark_alert_as_read(self, uid, alert_id):
        """Mark a specific alert as read"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Verify alert belongs to user
            cursor.execute("""
                UPDATE alerts
                SET is_read = 1
                WHERE alert_id = %s AND uid = %s
            """, (alert_id, uid))
            
            rows_affected = cursor.rowcount
            conn.commit()
            
            return rows_affected > 0
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def mark_all_alerts_as_read(self, uid):
        """Mark all alerts for a user as read"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                UPDATE alerts
                SET is_read = 1
                WHERE uid = %s AND is_read = 0
            """, (uid,))
            
            rows_affected = cursor.rowcount
            conn.commit()
            
            return rows_affected
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def delete_alert(self, uid, alert_id):
        """
        Permanently delete a specific alert.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Delete the alert (verify ownership)
            cursor.execute("""
                DELETE FROM alerts
                WHERE alert_id = %s AND uid = %s
            """, (alert_id, uid))
            
            deleted = cursor.rowcount > 0
            conn.commit()
            return deleted
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def get_alert_statistics(self, uid):
        """Get alert statistics for dashboard"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Total unread alerts
            cursor.execute("""
                SELECT COUNT(*) as unread_count
                FROM alerts
                WHERE uid = %s AND is_read = 0
            """, (uid,))
            unread_count = cursor.fetchone()['unread_count']
            
            # Alerts by severity
            cursor.execute("""
                SELECT severity, COUNT(*) as count
                FROM alerts
                WHERE uid = %s AND is_read = 0
                GROUP BY severity
            """, (uid,))
            severity_counts = {row['severity']: row['count'] for row in cursor.fetchall()}
            
            # Alerts by type
            cursor.execute("""
                SELECT alert_type, COUNT(*) as count
                FROM alerts
                WHERE uid = %s AND is_read = 0
                GROUP BY alert_type
            """, (uid,))
            type_counts = {row['alert_type']: row['count'] for row in cursor.fetchall()}
            
            # Recent alerts (last 24 hours)
            cursor.execute("""
                SELECT COUNT(*) as recent_count
                FROM alerts
                WHERE uid = %s AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            """, (uid,))
            recent_count = cursor.fetchone()['recent_count']
            
            return {
                'total_unread': unread_count,
                'by_severity': severity_counts,
                'by_type': type_counts,
                'last_24_hours': recent_count
            }
            
        finally:
            cursor.close()
            conn.close()

# In-memory OTP storage
otp_store = {}
# Track sent alert emails to prevent duplicates
sent_alert_emails = {}

def send_alert_email(to_email, alert_data):
    """
    Send email notification for an alert.
    
    Args:
        to_email: Recipient email address
        alert_data: Dictionary with alert_type, severity, message, product_name
    
    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        # Create email subject based on alert type and severity
        alert_type_display = alert_data['alert_type'].replace('_', ' ').title()
        subject = f"🔔 {alert_data['severity']} Alert: {alert_type_display}"
        
        # Create HTML email body
        severity_colors = {
            'CRITICAL': '#dc3545',
            'HIGH': '#fd7e14',
            'MEDIUM': '#ffc107',
            'LOW': '#17a2b8'
        }
        
        severity_color = severity_colors.get(alert_data['severity'], '#6c757d')
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; border-radius: 10px;">
                    <div style="background: linear-gradient(45deg, #667eea 30%, #764ba2 90%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">TrendWise Alert</h1>
                    </div>
                    
                    <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
                        <div style="background-color: {severity_color}; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: center;">
                            <h2 style="margin: 0; font-size: 20px;">{alert_data['severity']} PRIORITY</h2>
                        </div>
                        
                        <h3 style="color: #667eea; margin-top: 0;">{alert_type_display}</h3>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid {severity_color}; margin: 20px 0;">
                            <p style="margin: 0; font-size: 16px;"><strong>Product:</strong> {alert_data.get('product_name', 'N/A')}</p>
                            <p style="margin: 10px 0 0 0; font-size: 16px;"><strong>Message:</strong></p>
                            <p style="margin: 5px 0 0 0; font-size: 15px; color: #555;">{alert_data['message']}</p>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                            <p style="color: #6c757d; font-size: 14px; margin: 0;">Log in to your TrendWise dashboard to take action.</p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
                        <p>This is an automated alert from TrendWise Inventory Management System</p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Attach HTML content
        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)
        
        # Send email
        '''with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)'''
        


        with smtplib.SMTP_SSL(SMTP_SERVER, 465) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
        
        return (True, "Alert email sent successfully")
    
    except Exception as e:
        print(f"Failed to send alert email: {str(e)}")
        return (False, f"Failed to send email: {str(e)}")
def generate_otp():
    """Generate a random 6-digit OTP"""
    return str(random.randint(100000, 999999))

def send_otp_email(to_email, otp):
    """Send OTP to user's email"""
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = 'TrendWise - Email Verification OTP'
        
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h2 style="color: #667eea; text-align: center;">TrendWise Email Verification</h2>
                    <p style="font-size: 16px; color: #333;">Hello,</p>
                    <p style="font-size: 16px; color: #333;">Thank you for signing up with TrendWise! Please use the following OTP to verify your email address:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; padding: 15px 30px; background-color: #f0f0f0; border-radius: 5px; display: inline-block;">{otp}</span>
                    </div>
                    <p style="font-size: 14px; color: #666;">This OTP will expire in 10 minutes.</p>
                    <p style="font-size: 14px; color: #666;">If you didn't request this verification, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999; text-align: center;">© 2026 TrendWise - Inventory Management System</p>
                </div>
            </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        '''server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)'''
        server = smtplib.SMTP_SSL(SMTP_SERVER, 465)
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        return True, "OTP sent successfully"
        
    except Exception as e:
        return False, f"Failed to send email: {str(e)}"

def create_and_send_otp(email):
    """Generate OTP, store it, and send to email"""
    try:
        otp = generate_otp()
        otp_store[email] = {
            "otp": otp,
            "expires_at": datetime.now() + timedelta(minutes=10),
            "verified": False
        }
        
        success, message = send_otp_email(email, otp)
        
        if success:
            return {"success": True, "message": "OTP sent to your email"}, 200
        else:
            return {"error": message}, 500
            
    except Exception as e:
        return {"error": f"Failed to send OTP: {str(e)}"}, 500

def verify_otp(email, entered_otp):
    """Verify the OTP entered by user"""
    try:
        if email not in otp_store:
            return {"error": "No OTP found for this email. Please request a new OTP."}, 400
        
        otp_data = otp_store[email]
        
        if datetime.now() > otp_data["expires_at"]:
            del otp_store[email]
            return {"error": "OTP has expired. Please request a new OTP."}, 400
        
        if otp_data["otp"] != entered_otp:
            return {"error": "Invalid OTP. Please try again."}, 400
        
        otp_store[email]["verified"] = True
        
        return {"success": True, "message": "Email verified successfully"}, 200
        
    except Exception as e:
        return {"error": f"Verification failed: {str(e)}"}, 500

def is_email_verified(email):
    """Check if email has been verified"""
    if email in otp_store:
        return otp_store[email].get("verified", False)
    return False

def cleanup_verified_otp(email):
    """Remove OTP from store after successful registration"""
    if email in otp_store:
        del otp_store[email]


# Global alert service instance
alert_service = AlertService()
