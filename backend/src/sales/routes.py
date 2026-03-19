from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from src.sales.service import upload_sales_excel

from src.sales.service import (
    create_sale,
    list_sales,
    list_sales_by_product
)

sales_bp = Blueprint("sales", __name__, url_prefix="/sales")


@sales_bp.route("/", methods=["POST"])
@jwt_required()
def add_sale():
    return create_sale(request.json)


@sales_bp.route("/", methods=["GET"])
@jwt_required()
def get_all_sales():
    return list_sales()


@sales_bp.route("/product/<int:p_id>", methods=["GET"])
@jwt_required()
def get_sales_for_product(p_id):
    return list_sales_by_product(p_id)


@sales_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_sales():
    return upload_sales_excel(request)
