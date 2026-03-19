from flask_jwt_extended import get_jwt_identity
from src.db import get_db_connection
from datetime import datetime
import logging

# Import alert service for event-driven alert evaluation
from src.alerts.service import alert_service

logger = logging.getLogger(__name__)


def create_bill(data):
    uid = get_jwt_identity()
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        items = data.get("items", [])
        if not items or len(items) == 0:
            return {"error": "No items provided"}, 400

        invoice_time = datetime.now()

        for item in items:
            p_id = item["p_id"]
            quantity = item["quantity"]

            if quantity <= 0:
                raise ValueError("Quantity must be greater than zero")

            # Validate product & stock
            cur.execute("""
                SELECT price, current_stock
                FROM product
                WHERE p_id=%s AND uid=%s
            """, (p_id, uid))

            product = cur.fetchone()
            if not product:
                raise Exception(f"Product {p_id} not found")

            if product["current_stock"] < quantity:
                raise Exception(f"Insufficient stock for product {p_id}")

            unit_price = product["price"]
            total_price = unit_price * quantity

            # Insert into sales (forecasting purpose)
            cur.execute("""
                INSERT INTO sales (uid, p_id, quantity, sale_date, source_type)
                VALUES (%s, %s, %s, %s, %s)
            """, (uid, p_id, quantity, invoice_time, 'billing'))

            sale_id = cur.lastrowid

            # Insert into billing (billing-first logic)
            cur.execute("""
                INSERT INTO billing
                (sale_id, unit_price, total_price, created_at)
                VALUES (%s, %s, %s, %s)
            """, (
                sale_id,
                unit_price,
                total_price,
                invoice_time
            ))

            # Update stock
            cur.execute("""
                UPDATE product
                SET current_stock = current_stock - %s
                WHERE p_id=%s AND uid=%s
            """, (quantity, p_id, uid))
            
            # Trigger alert evaluation after stock change
            try:
                alert_service.evaluate_all_alerts_for_product(uid, p_id)
            except Exception as e:
                logger.warning(f"Alert evaluation failed for product {p_id}: {e}")

        conn.commit()

        return {
            "message": "Billing created successfully",
            "invoice_time": invoice_time.isoformat(),
            "items_count": len(items)
        }, 201

    except KeyError as e:
        conn.rollback()
        return {"error": f"Missing field {str(e)}"}, 400
    
    except ValueError as e:
        conn.rollback()
        return {"error": str(e)}, 400

    except Exception as e:
        conn.rollback()
        logger.error(f"Billing creation failed: {e}")
        return {"error": str(e)}, 500
    
    finally:
        cur.close()
        conn.close()


def get_bills():
    """Get all bills for the authenticated user"""
    uid = get_jwt_identity()
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                b.billing_id,
                b.sale_id,
                b.unit_price,
                b.total_price,
                b.created_at,
                p.name as product_name,
                s.quantity,
                s.sale_date
            FROM billing b
            LEFT JOIN sales s ON b.sale_id = s.sale_id
            LEFT JOIN product p ON s.p_id = p.p_id
            WHERE s.uid = %s
            ORDER BY b.created_at DESC
        """, (uid,))
        
        bills = cur.fetchall()
        
        return {
            "success": True,
            "bills": bills
        }, 200
        
    except Exception as e:
        logger.error(f"Failed to fetch bills: {e}")
        return {"error": str(e)}, 500
        
    finally:
        cur.close()
        conn.close()
