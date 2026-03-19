from flask import Flask
from flask_cors import CORS
from src.config import Config
from src.extensions import jwt
from src.auth.routes import auth_bp
from src.product.routes import product_bp
from src.sales.routes import sales_bp
from src.billing.routes import billing_bp
from src.forecast.routes import forecast_bp
from src.alerts.routes import alerts_bp

app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
jwt.init_app(app)
CORS(app)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(product_bp)
app.register_blueprint(sales_bp)
app.register_blueprint(billing_bp)
app.register_blueprint(forecast_bp)
app.register_blueprint(alerts_bp)

# Home Route
@app.route("/")
def home():
    return "Trendwise Backend is running!"

if __name__ == "__main__":
    app.run(debug=True, port=8080)