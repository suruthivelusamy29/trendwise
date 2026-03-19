from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.forecast.service import ForecastService
from src.alerts.service import alert_service
from src.db import get_db_connection

forecast_bp = Blueprint('forecast', __name__, url_prefix='/api/forecast')

# Initialize forecast service
forecast_service = ForecastService()


@forecast_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_forecast():
    """
    Generate forecast for a product
    Body: {
        "p_id": int,
        "horizon_days": int (optional, default 30)
    }
    """
    try:
        uid = get_jwt_identity()
        data = request.get_json()
        
        p_id = data.get('p_id')
        horizon_days = data.get('horizon_days', 30)
        
        if not p_id:
            return jsonify({'error': 'Product ID (p_id) is required'}), 400
        
        if horizon_days < 1 or horizon_days > 365:
            return jsonify({'error': 'Horizon days must be between 1 and 365'}), 400
        
        # Verify product belongs to user
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT p_id FROM product WHERE p_id = %s AND uid = %s", (p_id, uid))
        product = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not product:
            return jsonify({'error': 'Product not found or unauthorized'}), 404
        
        # Generate forecast
        run_id, forecast_data, metrics = forecast_service.train_forecast_model(
            uid, p_id, horizon_days
        )
        
        return jsonify({
            'success': True,
            'run_id': run_id,
            'forecast': forecast_data,
            'metrics': metrics,
            'message': 'Forecast generated successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to generate forecast: {str(e)}'}), 500


@forecast_bp.route('/latest/<int:p_id>', methods=['GET'])
@jwt_required()
def get_latest_forecast(p_id):
    """Get the most recent forecast for a product"""
    try:
        uid = get_jwt_identity()
        
        # Verify product belongs to user
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT p_id FROM product WHERE p_id = %s AND uid = %s", (p_id, uid))
        product = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not product:
            return jsonify({'error': 'Product not found or unauthorized'}), 404
        
        forecast_data = forecast_service.get_latest_forecast(uid, p_id)
        
        if not forecast_data:
            return jsonify({'error': 'No forecast available for this product'}), 404
        
        return jsonify({
            'success': True,
            'forecast': forecast_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve forecast: {str(e)}'}), 500


@forecast_bp.route('/run/<int:run_id>', methods=['GET'])
@jwt_required()
def get_forecast_by_run(run_id):
    """Get forecast by run_id"""
    try:
        uid = get_jwt_identity()
        
        # Verify run belongs to user
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT run_id FROM forecast_run WHERE run_id = %s AND uid = %s", (run_id, uid))
        run = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not run:
            return jsonify({'error': 'Forecast run not found or unauthorized'}), 404
        
        forecast_data = forecast_service.get_forecast_by_run_id(run_id)
        
        return jsonify({
            'success': True,
            'forecast': forecast_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve forecast: {str(e)}'}), 500


@forecast_bp.route('/reorder-point/<int:p_id>', methods=['GET'])
@jwt_required()
def calculate_reorder_point(p_id):
    """
    Calculate reorder point for a product
    Query params: 
        - lead_time_days (optional, default 7)
        - service_level (optional, default 0.95)
    """
    try:
        uid = get_jwt_identity()
        
        lead_time_days = request.args.get('lead_time_days', 7, type=int)
        service_level = request.args.get('service_level', 0.95, type=float)
        
        # Verify product belongs to user
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT p_id FROM product WHERE p_id = %s AND uid = %s", (p_id, uid))
        product = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not product:
            return jsonify({'error': 'Product not found or unauthorized'}), 404
        
        # Get latest forecast
        forecast_data = forecast_service.get_latest_forecast(uid, p_id)
        
        if not forecast_data:
            return jsonify({'error': 'No forecast available. Please generate a forecast first.'}), 404
        
        reorder_info = forecast_service.calculate_reorder_point(
            forecast_data, lead_time_days, service_level
        )
        
        return jsonify({
            'success': True,
            'reorder_info': reorder_info,
            'parameters': {
                'lead_time_days': lead_time_days,
                'service_level': service_level
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to calculate reorder point: {str(e)}'}), 500


@forecast_bp.route('/alerts/<int:p_id>', methods=['POST'])
@jwt_required()
def generate_alerts(p_id):
    """
    Generate inventory alerts for a product based on latest forecast.
    This endpoint is now deprecated - alerts are automatically generated
    after forecast completion. Use /api/alerts endpoints instead.
    """
    try:
        uid = get_jwt_identity()
        
        # Verify product belongs to user
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT p_id FROM product WHERE p_id = %s AND uid = %s", 
            (p_id, uid)
        )
        product = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not product:
            return jsonify({'error': 'Product not found or unauthorized'}), 404
        
        # Get latest forecast
        forecast_data = forecast_service.get_latest_forecast(uid, p_id)
        
        if not forecast_data:
            return jsonify({'error': 'No forecast available. Please generate a forecast first.'}), 404
        
        # Use alert service to generate forecast-based alerts
        alerts = alert_service.evaluate_forecast_alerts(uid, p_id, forecast_data)
        
        # Also evaluate reactive alerts
        reactive_alerts = alert_service.evaluate_all_alerts_for_product(uid, p_id)
        
        all_alerts = [a for a in (alerts + reactive_alerts) if a is not None]
        
        return jsonify({
            'success': True,
            'message': 'Please use /api/alerts endpoints for alert management',
            'alerts_created': len(all_alerts),
            'alerts': all_alerts
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to generate alerts: {str(e)}'}), 500


@forecast_bp.route('/kpis/<int:p_id>', methods=['GET'])
@jwt_required()
def get_inventory_kpis(p_id):
    """Get inventory KPIs for a product"""
    try:
        uid = get_jwt_identity()
        
        # Verify product belongs to user
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT p_id FROM product WHERE p_id = %s AND uid = %s", (p_id, uid))
        product = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not product:
            return jsonify({'error': 'Product not found or unauthorized'}), 404
        
        # Get forecast and historical data
        forecast_data = forecast_service.get_latest_forecast(uid, p_id)
        
        if not forecast_data:
            return jsonify({'error': 'No forecast available. Please generate a forecast first.'}), 404
        
        historical_data = forecast_service.get_sales_data_for_product(uid, p_id)
        
        kpis = forecast_service.get_inventory_kpis(forecast_data, historical_data)
        
        return jsonify({
            'success': True,
            'kpis': kpis
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to calculate KPIs: {str(e)}'}), 500


@forecast_bp.route('/insights/<int:p_id>', methods=['GET'])
@jwt_required()
def get_ai_insights(p_id):
    """Get AI-generated insights for a product"""
    try:
        uid = get_jwt_identity()
        
        # Verify product belongs to user
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT p_id FROM product WHERE p_id = %s AND uid = %s", (p_id, uid))
        product = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not product:
            return jsonify({'error': 'Product not found or unauthorized'}), 404
        
        # Get forecast and historical data
        forecast_data = forecast_service.get_latest_forecast(uid, p_id)
        
        if not forecast_data:
            return jsonify({'error': 'No forecast available. Please generate a forecast first.'}), 404
        
        historical_data = forecast_service.get_sales_data_for_product(uid, p_id)
        
        insights = forecast_service.generate_ai_insights(uid, p_id, forecast_data, historical_data)
        
        return jsonify({
            'success': True,
            'insights': insights
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to generate insights: {str(e)}'}), 500


@forecast_bp.route('/chat/<int:p_id>', methods=['POST'])
@jwt_required()
def chat_with_ai(p_id):
    """
    Chat with AI about product forecast
    Body: {
        "question": str
    }
    """
    try:
        uid = get_jwt_identity()
        data = request.get_json()
        
        question = data.get('question')
        if not question:
            return jsonify({'error': 'Question is required'}), 400
        
        # Verify product belongs to user
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT p_id FROM product WHERE p_id = %s AND uid = %s", (p_id, uid))
        product = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not product:
            return jsonify({'error': 'Product not found or unauthorized'}), 404
        
        # Get forecast data
        forecast_data = forecast_service.get_latest_forecast(uid, p_id)
        
        response = forecast_service.chat_with_ai(uid, p_id, question, forecast_data)
        
        return jsonify({
            'success': True,
            'response': response
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to process chat: {str(e)}'}), 500


@forecast_bp.route('/history', methods=['GET'])
@jwt_required()
def get_forecast_history():
    """Get all forecast runs for the user"""
    try:
        uid = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT fr.run_id, fr.run_date, fr.horizon_days, 
                   p.p_id, p.name as product_name,
                   COUNT(fres.result_id) as result_count
            FROM forecast_run fr
            LEFT JOIN forecast_result fres ON fr.run_id = fres.run_id
            LEFT JOIN product p ON fres.p_id = p.p_id
            WHERE fr.uid = %s
            GROUP BY fr.run_id, fr.run_date, fr.horizon_days, p.p_id, p.name
            ORDER BY fr.run_date DESC
            LIMIT 50
        """
        
        cursor.execute(query, (uid,))
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        history = [
            {
                'run_id': row[0],
                'run_date': str(row[1]),
                'horizon_days': row[2],
                'product_id': row[3],
                'product_name': row[4],
                'result_count': row[5]
            }
            for row in results
        ]
        
        return jsonify({
            'success': True,
            'history': history
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve forecast history: {str(e)}'}), 500
