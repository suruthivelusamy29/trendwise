from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.alerts.service import alert_service, create_and_send_otp, verify_otp

alerts_bp = Blueprint('alerts', __name__, url_prefix='/api/alerts')


@alerts_bp.route('/create', methods=['POST'])
@jwt_required()
def create_manual_alert():
    """
    Create a manual/custom alert.
    Body: {
        "p_id": int,
        "alert_type": str,
        "severity": str,
        "message": str
    }
    """
    try:
        uid = get_jwt_identity()
        data = request.get_json()
        
        p_id = data.get('p_id')
        alert_type = data.get('alert_type', 'CUSTOM')
        severity = data.get('severity', 'MEDIUM')
        message = data.get('message')
        
        if not p_id or not message:
            return jsonify({'error': 'Product ID and message are required'}), 400
        
        # Verify product belongs to user
        from src.db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT p_id FROM product WHERE p_id = %s AND uid = %s", (p_id, uid))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Product not found or unauthorized'}), 404
        
        # Create alert directly without de-duplication for manual alerts
        from datetime import datetime
        cursor.execute("""
            INSERT INTO alerts 
            (uid, p_id, alert_type, severity, message, created_at, is_read)
            VALUES (%s, %s, %s, %s, %s, %s, 0)
        """, (uid, p_id, alert_type, severity, message, datetime.now()))
        
        conn.commit()
        alert_id = cursor.lastrowid
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'alert_id': alert_id,
            'message': 'Alert created successfully'
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Failed to create alert: {str(e)}'}), 500


@alerts_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_alerts():
    """
    Get all alerts for the authenticated user.
    Query params:
        - unread_only: boolean (optional)
        - severity: CRITICAL|HIGH|MEDIUM|LOW (optional)
    """
    try:
        uid = get_jwt_identity()
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        severity_filter = request.args.get('severity', None)
        
        if severity_filter and severity_filter not in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            return jsonify({'error': 'Invalid severity. Must be CRITICAL, HIGH, MEDIUM, or LOW'}), 400
        
        alerts = alert_service.get_user_alerts(uid, unread_only, severity_filter)
        
        return jsonify({
            'success': True,
            'count': len(alerts),
            'alerts': alerts
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve alerts: {str(e)}'}), 500


@alerts_bp.route('/product/<int:p_id>', methods=['GET'])
@jwt_required()
def get_product_alerts(p_id):
    """
    Get all alerts for a specific product.
    Query params:
        - unread_only: boolean (optional)
    """
    try:
        uid = get_jwt_identity()
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        alerts = alert_service.get_product_alerts(uid, p_id, unread_only)
        
        return jsonify({
            'success': True,
            'product_id': p_id,
            'count': len(alerts),
            'alerts': alerts
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve product alerts: {str(e)}'}), 500


@alerts_bp.route('/<int:alert_id>/read', methods=['PUT'])
@jwt_required()
def mark_alert_read(alert_id):
    """Mark a specific alert as read"""
    try:
        uid = get_jwt_identity()
        
        success = alert_service.mark_alert_as_read(uid, alert_id)
        
        if not success:
            return jsonify({'error': 'Alert not found or unauthorized'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Alert marked as read'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to mark alert as read: {str(e)}'}), 500


@alerts_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_alerts_read():
    """Mark all alerts as read for the authenticated user"""
    try:
        uid = get_jwt_identity()
        
        count = alert_service.mark_all_alerts_as_read(uid)
        
        return jsonify({
            'success': True,
            'message': f'{count} alert(s) marked as read'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to mark alerts as read: {str(e)}'}), 500


@alerts_bp.route('/<int:alert_id>', methods=['DELETE'])
@jwt_required()
def delete_alert(alert_id):
    """Permanently delete a specific alert"""
    try:
        uid = get_jwt_identity()
        
        success = alert_service.delete_alert(uid, alert_id)
        
        if not success:
            return jsonify({'error': 'Alert not found or unauthorized'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Alert permanently deleted'
        }), 200
        
    except Exception as e:
        print(f"ERROR in delete_alert: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': f'Failed to delete alert: {str(e)}'}), 500


@alerts_bp.route('/statistics', methods=['GET'])
@jwt_required()
def get_alert_statistics():
    """Get alert statistics for dashboard"""
    try:
        uid = get_jwt_identity()
        
        stats = alert_service.get_alert_statistics(uid)
        
        return jsonify({
            'success': True,
            'statistics': stats
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve statistics: {str(e)}'}), 500


@alerts_bp.route('/evaluate/<int:p_id>', methods=['POST'])
@jwt_required()
def evaluate_product_alerts(p_id):
    """
    Manually trigger alert evaluation for a product.
    Useful for testing or forcing re-evaluation.
    """
    try:
        uid = get_jwt_identity()
        
        print(f"DEBUG: Evaluating alerts for product {p_id}, user {uid}")
        alerts = alert_service.evaluate_all_alerts_for_product(uid, p_id)
        print(f"DEBUG: Evaluation complete, alerts: {alerts}")
        
        return jsonify({
            'success': True,
            'product_id': p_id,
            'alerts_created': len([a for a in alerts if a is not None]),
            'alerts': [a for a in alerts if a is not None]
        }), 200
        
    except Exception as e:
        import traceback
        print(f"ERROR in evaluate_product_alerts: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Failed to evaluate alerts: {str(e)}'}), 500


@alerts_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_alert_settings():
    """
    Get alert settings for the user.
    Returns configured rules and email notification preferences.
    """
    try:
        get_jwt_identity()
        
        # For now, return empty settings as this is a placeholder
        # In a full implementation, you would fetch from a settings table
        return jsonify({
            'success': True,
            'rules': [],
            'email_notifications': True
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve settings: {str(e)}'}), 500


@alerts_bp.route('/settings', methods=['POST'])
@jwt_required()
def save_alert_settings():
    """
    Save alert settings for the user.
    Body: {
        "rules": [{"product_id": int, "priority": str, "threshold": int}],
        "email_notifications": bool
    }
    """
    try:
        get_jwt_identity()
        data = request.get_json()
        
        rules = data.get('rules', [])
        data.get('email_notifications', True)
        
        # For now, just acknowledge the save
        # In a full implementation, you would save to a settings table
        # and use these rules to configure alert thresholds
        
        return jsonify({
            'success': True,
            'message': f'Saved {len(rules)} alert rules'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to save settings: {str(e)}'}), 500


@alerts_bp.route('/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to email for verification"""
    try:
        data = request.get_json()
        
        if not data or "email" not in data:
            return jsonify({"error": "Email is required"}), 400
        
        result, status = create_and_send_otp(data["email"])
        return jsonify(result), status
        
    except Exception as e:
        return jsonify({"error": f"Failed to send OTP: {str(e)}"}), 500


@alerts_bp.route('/verify-otp', methods=['POST'])
def verify_otp_route():
    """Verify OTP entered by user"""
    try:
        data = request.get_json()
        
        if not data or "email" not in data or "otp" not in data:
            return jsonify({"error": "Email and OTP are required"}), 400
        
        result, status = verify_otp(data["email"], data["otp"])
        return jsonify(result), status
        
    except Exception as e:
        return jsonify({"error": f"Verification failed: {str(e)}"}), 500
