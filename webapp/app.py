# app.py
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import json
import os
from datetime import datetime
import uuid
from pathlib import Path
from webapp.utils.export import export_to_csv, export_to_pdf
from utils.analytics import calculate_summary
from webapp.utils.chart import get_trend_chart_data, get_category_chart_data

app = Flask(__name__, static_folder='static')
CORS(app)

# Configuration
TRANSACTIONS_FILE = 'transactions.json'
CREDIT_CATEGORIES = ['Salary', 'Freelance', 'Refunds/Cashbacks', 'Other Income']
DEBIT_CATEGORIES = ['Food & Dining', 'Transport', 'Shopping', 'Bills & Utilities',
                   'Education / Learning', 'Household and Transfers', 'Entertainment', 
                   'Health', "Miscellaneous"]

# --- Helper Functions ---
def load_transactions():
    """Load transactions from JSON file"""
    if not os.path.exists(TRANSACTIONS_FILE):
        return []
    
    try:
        with open(TRANSACTIONS_FILE, 'r') as f:
            data = json.load(f)
            return [e for e in data if all(key in e for key in 
                   ['id', 'date', 'description', 'amount', 'category', 'type'])]
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading data: {str(e)}")
        return []

def save_transactions(entries_list):
    """Save transactions to JSON file"""
    Path('data').mkdir(exist_ok=True)
    temp_file = f"{TRANSACTIONS_FILE}.tmp"
    try:
        with open(temp_file, 'w') as f:
            json.dump(entries_list, f, indent=4)
        os.replace(temp_file, TRANSACTIONS_FILE)
    except IOError as e:
        print(f"Error saving data: {str(e)}")
        if os.path.exists(temp_file):
            os.remove(temp_file)

def validate_entry_data(data, entry_type):
    """Validate entry data"""
    required_fields = ['date', 'description', 'amount', 'category']
    for field in required_fields:
        if field not in data:
            return False, f"Missing field: {field}"
    
    try:
        amount = float(data['amount'])
        if amount <= 0:
            return False, "Amount must be positive"
    except ValueError:
        return False, "Invalid amount format"
    
    valid_categories = CREDIT_CATEGORIES if entry_type == 'credit' else DEBIT_CATEGORIES
    if data['category'] not in valid_categories:
        return False, f"Invalid category for {entry_type}"
    
    try:
        datetime.strptime(data['date'], '%Y-%m-%d')
    except ValueError:
        return False, "Invalid date format (YYYY-MM-DD required)"
    
    return True, ""

# --- Serve Frontend ---
@app.route('/')
def index():
    """Serve the main application page."""
    return render_template('index.html')

@app.route('/static/<path:path>')
def send_static(path):
    """Serve static files."""
    return send_from_directory('static', path)

# --- API Endpoints ---
@app.route('/api/entries', methods=['GET'])
def get_entries():
    """Get filtered entries"""
    try:
        entries = load_transactions()
        
        # Filtering parameters
        entry_type = request.args.get('type')  # 'credit' or 'debit'
        category = request.args.get('category')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')
        
        filtered = entries
        
        if entry_type:
            filtered = [e for e in filtered if e['type'] == entry_type]
        
        if category:
            filtered = [e for e in filtered if e['category'] == category]
        
        if start_date:
            filtered = [e for e in filtered if e['date'] >= start_date]
        
        if end_date:
            filtered = [e for e in filtered if e['date'] <= end_date]
        
        if search:
            search_lower = search.lower()
            filtered = [e for e in filtered if search_lower in e['description'].lower()]
        
        # Sorting
        filtered.sort(key=lambda x: (x['date'], x['timestamp']), reverse=True)
        
        return jsonify(filtered)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/debits', methods=['POST'])
def add_debit():
    """Add a new debit entry"""
    try:
        data = request.get_json()
        valid, message = validate_entry_data(data, 'debit')
        if not valid:
            return jsonify({"error": message}), 400
        
        new_debit = {
            "id": str(uuid.uuid4()),
            "date": data['date'],
            "description": data['description'],
            "amount": float(data['amount']),
            "category": data['category'],
            "type": "debit",
            "timestamp": datetime.now().isoformat()
        }

        transactions = load_transactions()
        transactions.append(new_debit)
        save_transactions(transactions)
        return jsonify(new_debit), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/credits', methods=['POST'])
def add_credit():
    """Add a new credit entry"""
    try:
        data = request.get_json()
        valid, message = validate_entry_data(data, 'credit')
        if not valid:
            return jsonify({"error": message}), 400
        
        new_credit = {
            "id": str(uuid.uuid4()),
            "date": data['date'],
            "description": data['description'],
            "amount": float(data['amount']),
            "category": data['category'],
            "type": "credit",
            "timestamp": datetime.now().isoformat()
        }

        transactions = load_transactions()
        transactions.append(new_credit)
        save_transactions(transactions)
        return jsonify(new_credit), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/entries/<string:entry_id>', methods=['PUT'])
def update_entry(entry_id):
    """Update an existing entry"""
    try:
        data = request.get_json()
        transactions = load_transactions()
        
        # Find the entry
        entry = next((e for e in transactions if e['id'] == entry_id), None)
        if not entry:
            return jsonify({"error": "Entry not found"}), 404
        
        # Validate based on existing type
        entry_type = entry['type']
        valid, message = validate_entry_data(data, entry_type)
        if not valid:
            return jsonify({"error": message}), 400
        
        # Update the entry
        entry.update({
            "date": data['date'],
            "description": data['description'],
            "amount": float(data['amount']),
            "category": data['category'],
            "timestamp": datetime.now().isoformat()
        })
        
        save_transactions(transactions)
        return jsonify(entry), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/entries/<string:entry_id>', methods=['DELETE'])
def delete_entry(entry_id):
    """Delete an entry"""
    try:
        transactions = load_transactions()
        original_len = len(transactions)
        transactions = [e for e in transactions if e['id'] != entry_id]

        if len(transactions) == original_len:
            return jsonify({"error": "Entry not found"}), 404
        
        save_transactions(transactions)
        return jsonify({"message": "Entry deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analytics/summary')
def get_summary():
    """Get summary analytics"""
    try:
        entries = load_transactions()
        return jsonify(calculate_summary(entries))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/charts/trend')
def get_trend_chart():
    """Get trend chart data"""
    try:
        entries = load_transactions()
        timeframe = request.args.get('timeframe', default='30', type=str)
        chart_type = request.args.get('type', default='hybrid', type=str)
        return jsonify(get_trend_chart_data(entries, timeframe, chart_type))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/charts/categories')
def get_category_chart():
    """Get category chart data"""
    try:
        entries = load_transactions()
        timeframe = request.args.get('timeframe', default='30', type=str)
        chart_type = request.args.get('type', default='debit', type=str)
        return jsonify(get_category_chart_data(entries, timeframe, chart_type))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/transactions/export/csv')
def export_csv():
    """Export transactions as CSV"""
    try:
        entries = load_transactions()
        return export_to_csv(entries)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/transactions/export/pdf')
def export_pdf():
    """Export transactions as PDF"""
    try:
        entries = load_transactions()
        summary = calculate_summary(entries)
        return export_to_pdf(entries, summary)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Create necessary directories
    Path('static').mkdir(exist_ok=True)
    Path('templates').mkdir(exist_ok=True)
    
    # Run the Flask app
    app.run(debug=True, host='127.0.0.1', port=9000)