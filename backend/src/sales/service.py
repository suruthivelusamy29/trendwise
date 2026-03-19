from flask_jwt_extended import get_jwt_identity
from src.db import get_db_connection
import pandas as pd
from datetime import datetime
import logging

# Import alert service for event-driven alert evaluation
from src.alerts.service import alert_service

logger = logging.getLogger(__name__)

# Create a sale entry
def create_sale(data):
    uid = get_jwt_identity()
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check product ownership & stock
        cur.execute("""
            SELECT current_stock
            FROM product
            WHERE p_id = %s AND uid = %s
        """, (data["p_id"], uid))

        product = cur.fetchone()
        if not product:
            return {"error": "Product not found"}, 404

        if product["current_stock"] < data["quantity"]:
            return {"error": "Insufficient stock"}, 400

        # Insert sale
        sale_date = data.get('sale_date', datetime.utcnow())
        cur.execute("""
            INSERT INTO sales (uid, p_id, quantity, sale_date, source_type)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            uid,
            data["p_id"],
            data["quantity"],
            sale_date,
            'manual'
        ))

        # Reduce stock
        cur.execute("""
            UPDATE product
            SET current_stock = current_stock - %s
            WHERE p_id = %s AND uid = %s
        """, (
            data["quantity"],
            data["p_id"],
            uid
        ))

        conn.commit()
        
        # Trigger alert evaluation after stock change
        try:
            alert_service.evaluate_all_alerts_for_product(uid, data["p_id"])
            logger.info(f"Alert evaluation triggered for product {data['p_id']} after sale")
        except Exception as e:
            logger.warning(f"Alert evaluation failed for product {data['p_id']}: {e}")
        
        return {"message": "Sale recorded successfully"}, 201

    except KeyError as e:
        conn.rollback()
        return {"error": f"Missing field {str(e)}"}, 400

    except Exception as e:
        conn.rollback()
        logger.error(f"Sale creation failed: {e}")
        return {"error": str(e)}, 500
    
    finally:
        cur.close()
        conn.close()


# List all sales for user
def list_sales():
    uid = get_jwt_identity()
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT 
                s.sale_id,
                s.p_id,
                s.quantity,
                s.sale_date,
                s.source_type,
                p.name AS product_name,
                COALESCE(b.unit_price, p.price, 0) AS unit_price,
                COALESCE(b.total_price, s.quantity * p.price, 0) AS total_amount
            FROM sales s
            JOIN product p ON s.p_id = p.p_id
            LEFT JOIN billing b ON s.sale_id = b.sale_id
            WHERE s.uid = %s
            ORDER BY s.sale_date DESC
        """, (uid,))

        sales = cur.fetchall()
        return {"sales": sales}, 200

    except Exception as e:
        logger.error(f"Failed to list sales: {e}")
        return {"error": str(e)}, 500
    
    finally:
        cur.close()
        conn.close()


# List sales for a single product
def list_sales_by_product(p_id):
    uid = get_jwt_identity()
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT *
            FROM sales
            WHERE uid = %s AND p_id = %s
            ORDER BY sale_date
        """, (uid, p_id))

        sales = cur.fetchall()
        return {"sales": sales}, 200

    except Exception as e:
        logger.error(f"Failed to list product sales: {e}")
        return {"error": str(e)}, 500
    
    finally:
        cur.close()
        conn.close()
    
# Upload historical sales from Excel
def upload_sales_excel(request):
    if "file" not in request.files:
        return {"error": "Excel file required"}, 400

    file = request.files["file"]

    try:
        df = pd.read_excel(file)
    except Exception:
        return {"error": "Invalid Excel file"}, 400

    required_cols = {"product_name", "quantity", "sale_date"}
    if not required_cols.issubset(df.columns):
        return {
            "error": "Excel must contain: product_name, quantity, sale_date"
        }, 400

    uid = get_jwt_identity()
    conn = get_db_connection()
    cur = conn.cursor()

    inserted = 0
    created_products = set()

    try:
        for _, row in df.iterrows():
            product_name = str(row["product_name"]).strip()

            # Find product
            cur.execute("""
                SELECT p_id FROM product
                WHERE name = %s AND uid = %s
            """, (product_name, uid))

            product = cur.fetchone()

            # Create product if not found
            if not product:
                cur.execute("""
                    INSERT INTO product (
                        uid, name, description, current_stock, threshold, price
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    uid,
                    product_name,
                    "Auto-created from sales upload",
                    0,  # current_stock
                    0,  # threshold
                    0   # price
                ))
                product_id = cur.lastrowid
                created_products.add(product_name)
            else:
                product_id = product["p_id"]

            sale_date = row["sale_date"]
            if sale_date > datetime.utcnow():
                continue

            # Insert sale
            cur.execute("""
                INSERT INTO sales (uid, p_id, quantity, sale_date, source_type)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                uid,
                product_id,
                int(row["quantity"]),
                sale_date,
                'excel_upload'
            ))

            inserted += 1

        conn.commit()
        
        # Trigger alert evaluation for all affected products
        try:
            affected_products = df['product_name'].unique()
            for product_name in affected_products:
                cur.execute("""
                    SELECT p_id FROM product
                    WHERE name = %s AND uid = %s
                """, (str(product_name).strip(), uid))
                product = cur.fetchone()
                if product:
                    alert_service.evaluate_all_alerts_for_product(uid, product["p_id"])
        except Exception as e:
            logger.warning(f"Alert evaluation after upload failed: {e}")

        return {
            "message": "Sales data uploaded successfully",
            "rows_inserted": inserted,
            "products_auto_created": list(created_products)
        }, 201
    
    except Exception as e:
        conn.rollback()
        logger.error(f"Sales upload failed: {e}")
        return {"error": str(e)}, 500
    
    finally:
        cur.close()
        conn.close()
