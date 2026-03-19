from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from src.product.service import (
    get_products,
    add_product,
    get_product_by_id,
    update_product,
    delete_product,
    add_stock_to_product,
)

product_bp = Blueprint("product", __name__, url_prefix="/product")

@product_bp.route("/", methods=["GET"])
@jwt_required()
def list_products():
    return get_products()


@product_bp.route("/", methods=["POST"])
@jwt_required()
def create_product():
    # Handle both JSON and FormData (for image uploads)
    if request.is_json:
        data = request.json
    else:
        # Parse FormData
        data = {
            'name': request.form.get('name'),
            'description': request.form.get('description'),
            'current_stock': int(request.form.get('current_stock', 0)),
            'threshold': int(request.form.get('threshold', 0)),
            'price': float(request.form.get('price', 0))
        }
        # Handle image file if present - convert to base64
        if 'image' in request.files:
            image_file = request.files['image']
            if image_file.filename:
                import base64
                image_data = base64.b64encode(image_file.read()).decode('utf-8')
                data['image'] = f"data:image/jpeg;base64,{image_data}"
    
    return add_product(data)


@product_bp.route("/<int:p_id>", methods=["GET"])
@jwt_required()
def fetch_product(p_id):
    return get_product_by_id(p_id)


@product_bp.route("/<int:p_id>", methods=["PUT"])
@jwt_required()
def edit_product(p_id):
    try:
        # Handle both JSON and FormData (for image uploads)
        if request.is_json:
            data = request.json
        else:
            # Parse FormData
            data = {
                'name': request.form.get('name'),
                'description': request.form.get('description'),
                'current_stock': int(request.form.get('current_stock', 0)),
                'threshold': int(request.form.get('threshold', 0)),
                'price': float(request.form.get('price', 0))
            }
            # Handle image file if present - convert to base64
            if 'image' in request.files:
                image_file = request.files['image']
                if image_file.filename:
                    import base64
                    image_data = base64.b64encode(image_file.read()).decode('utf-8')
                    data['image'] = f"data:image/jpeg;base64,{image_data}"
            else:
                # If no new image, keep existing one (get from database)
                data['image'] = None  # Will be handled by update_product to keep existing
        
        return update_product(p_id, data)
    except Exception as e:
        print(f"ERROR in edit_product: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return {"error": str(e)}, 500


@product_bp.route("/<int:p_id>", methods=["DELETE"])
@jwt_required()
def remove_product(p_id):
    return delete_product(p_id)


@product_bp.route("/<int:p_id>/add-stock", methods=["POST"])
@jwt_required()
def add_stock(p_id):
    return add_stock_to_product(p_id, request.json)

