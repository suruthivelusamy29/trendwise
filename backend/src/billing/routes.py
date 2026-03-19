from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from src.billing.service import create_bill, get_bills

billing_bp = Blueprint("billing", __name__, url_prefix="/billing")


@billing_bp.route("/", methods=["GET"])
@jwt_required()
def list_bills():
    return get_bills()


@billing_bp.route("/", methods=["POST"])
@jwt_required()
def create_billing():
    return create_bill(request.json)
