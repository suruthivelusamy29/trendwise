"""
Sales Module

This module manages sales transactions, historical data tracking,
and Excel import functionality. Integrates with alerts for event-driven
stock monitoring.
"""

from .routes import sales_bp
from .service import (
    create_sale,
    list_sales,
    list_sales_by_product,
    upload_sales_excel
)

__all__ = [
    'sales_bp',
    'create_sale',
    'list_sales',
    'list_sales_by_product',
    'upload_sales_excel'
]
