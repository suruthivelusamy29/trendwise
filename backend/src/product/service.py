from flask_jwt_extended import get_jwt_identity
from src.db import get_connection
import logging

# Import alert service for event-driven alert evaluation
from src.alerts.service import alert_service

logger = logging.getLogger(__name__)

# Get all products of logged-in user
def get_products():
    uid = get_jwt_identity()
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "SELECT * FROM product WHERE uid = %s",
            (uid,)
        )
        products = cur.fetchall()
        return {"products": products}, 200

    except Exception as e:
        return {"error": str(e)}, 500


# Get single product
def get_product_by_id(p_id):
    uid = get_jwt_identity()
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT * FROM product
            WHERE p_id = %s AND uid = %s
        """, (p_id, uid))

        product = cur.fetchone()
        if not product:
            return {"error": "Product not found"}, 404

        return {"product": product}, 200

    except Exception as e:
        return {"error": str(e)}, 500


# Add product
def add_product(data):
    uid = get_jwt_identity()
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO product
            (uid, name, description, image,
             current_stock, threshold, price)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            uid,
            data["name"],
            data.get("description"),
            data.get("image"),
            data["current_stock"],
            data["threshold"],
            data["price"]
        ))

        conn.commit()
        p_id = cur.lastrowid
        return {"message": "Product created successfully", "p_id": p_id}, 201

    except KeyError as e:
        return {"error": f"Missing field {str(e)}"}, 400

    except Exception as e:
        return {"error": str(e)}, 500


# Update product
def update_product(p_id, data):
    uid = get_jwt_identity()
    conn = get_connection()
    cur = conn.cursor()

    try:
        print(f"DEBUG: update_product called - p_id={p_id}, uid={uid}, data={data}")
        
        # If image is None, fetch existing image to keep it
        if data.get("image") is None:
            print(f"DEBUG: Fetching existing image for product {p_id}")
            cur.execute("SELECT image FROM product WHERE p_id=%s AND uid=%s", (p_id, uid))
            result = cur.fetchone()
            print(f"DEBUG: Existing image result: {result}")
            if result:
                # Handle dictionary cursor (DictCursor returns dict)
                if isinstance(result, dict):
                    data["image"] = result.get('image', '')
                else:
                    data["image"] = result[0] if result else ''
            else:
                data["image"] = ''  # Default to empty if product not found
        
        print(f"DEBUG: Updating product with data: {data}")
        cur.execute("""
            UPDATE product SET
                name=%s,
                description=%s,
                image=%s,
                current_stock=%s,
                threshold=%s,
                price=%s
            WHERE p_id=%s AND uid=%s
        """, (
            data["name"],
            data.get("description"),
            data.get("image"),
            data["current_stock"],
            data["threshold"],
            data["price"],
            p_id,
            uid
        ))

        if cur.rowcount == 0:
            return {"error": "Product not found"}, 404

        conn.commit()
        
        # Trigger alert evaluation after threshold change
        try:
            alert_service.evaluate_all_alerts_for_product(uid, p_id)
            logger.info(f"Alert evaluation triggered for product {p_id} after update")
        except Exception as e:
            logger.warning(f"Alert evaluation failed for product {p_id}: {e}")
        
        return {"message": "Product updated successfully"}, 200

    except KeyError as e:
        print(f"ERROR: KeyError in update_product: {e}")
        return {"error": f"Missing field {str(e)}"}, 400

    except Exception as e:
        print(f"ERROR: Exception in update_product: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500


# Delete product
def delete_product(p_id):
    uid = get_jwt_identity()
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            DELETE FROM product
            WHERE p_id=%s AND uid=%s
        """, (p_id, uid))

        if cur.rowcount == 0:
            return {"error": "Product not found"}, 404

        conn.commit()
        return {"message": "Product deleted successfully"}, 200

    except Exception as e:
        return {"error": str(e)}, 500
    

# Add stock to product
def add_stock_to_product(p_id, data):
    uid = get_jwt_identity()
    conn = get_connection()
    cur = conn.cursor()

    try:
        # Validate product ownership
        cur.execute("""
            SELECT current_stock
            FROM product
            WHERE p_id=%s AND uid=%s
        """, (p_id, uid))
        product = cur.fetchone()
        if not product:
            return {"error": "Product not found"}, 404

        # Update stock
        quantity = data.get("quantity", 0)
        if quantity <= 0:
            return {"error": "Quantity must be greater than 0"}, 400

        cur.execute("""
            UPDATE product
            SET current_stock = current_stock + %s
            WHERE p_id=%s AND uid=%s
        """, (quantity, p_id, uid))

        conn.commit()
        
        # Trigger alert evaluation after stock change
        try:
            alert_service.evaluate_all_alerts_for_product(uid, p_id)
            logger.info(f"Alert evaluation triggered for product {p_id} after stock increase")
        except Exception as e:
            logger.warning(f"Alert evaluation failed for product {p_id}: {e}")
        
        return {"message": f"Stock increased by {quantity}", "current_stock": product["current_stock"] + quantity}, 200

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500

