# app.py
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import json
import os
from datetime import datetime, timedelta
import uuid
from pathlib import Path
from collections import defaultdict

app = Flask(__name__, static_folder='static')
CORS(app)

# Configuration
TRANSACTIONS_FILE = 'transactions.json'
CREDIT_CATEGORIES = ['Salary', 'Freelance', 'Refunds/Cashbacks', 'Other Income']
DEBIT_CATEGORIES = ['Food & Dining', 'Transport', 'Shopping', 'Bills & Utilities','Education / Learning', 'Household and Transfers', 'Entertainment', 'Health', "Miscellaneous"]
DEFAULT_CURRENCY = 'INR'

# --- Helper Functions ---
def load_transactions():
    """Enhanced with error handling and data validation"""
    if not os.path.exists(TRANSACTIONS_FILE):
        return []
    
    try:
        with open(TRANSACTIONS_FILE, 'r') as f:
            data = json.load(f)
            # Validate each entry
            validated_data = []
            for entry in data:
                if all(key in entry for key in ['id', 'date', 'description', 'amount', 'category', 'type']):
                    validated_data.append(entry)
            return validated_data
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading data: {str(e)}")
        return []

def save_transactions(entries_list):
    """Atomic write operation with backup"""
    temp_file = f"{TRANSACTIONS_FILE}.tmp"
    try:
        with open(temp_file, 'w') as f:
            json.dump(entries_list, f, indent=4)
        # Replace original file only if write was successful
        os.replace(temp_file, TRANSACTIONS_FILE)
    except IOError as e:
        print(f"Error saving data: {str(e)}")
        if os.path.exists(temp_file):
            os.remove(temp_file)

def validate_entry_data(data, entry_type):
    """Centralized validation for entry data"""
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
    """Get all entries with filtering support"""
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
    """Enhanced analytics endpoint with 30-day focus and all required data"""
    try:
        entries = load_transactions()
        
        if not entries:
            return jsonify({
                "total_debits": 0,
                "total_credits": 0,
                "net_balance": 0,
                "daily_average": 0,
                "percent_change_credits": 0,
                "percent_change_debits": 0,
                "percent_change_balance": 0,
                "percent_change_daily": 0,
                "highest_debit_day": {"date": None, "amount": 0},
                "highest_credit_day": {"date": None, "amount": 0},
                "highest_debit_category": {"category": None, "amount": 0},
                "highest_credit_category": {"category": None, "amount": 0}
            })
        
        # Current period (last 30 days)
        end_date = datetime.now()
        current_start_date = end_date - timedelta(days=30)
        current_entries = [e for e in entries if 
                         datetime.strptime(e['date'], '%Y-%m-%d') >= current_start_date and
                         datetime.strptime(e['date'], '%Y-%m-%d') <= end_date]
        
        # Previous period (30 days before that)
        previous_start_date = current_start_date - timedelta(days=30)
        previous_entries = [e for e in entries if 
                          datetime.strptime(e['date'], '%Y-%m-%d') >= previous_start_date and
                          datetime.strptime(e['date'], '%Y-%m-%d') < current_start_date]
        
        # Calculate current period metrics
        current_credits = sum(float(e['amount']) for e in current_entries if e['type'] == 'credit')
        current_debits = sum(float(e['amount']) for e in current_entries if e['type'] == 'debit')
        current_net = current_credits - current_debits
        current_daily_avg = current_debits / 30  # Average over 30 days
        
        # Calculate previous period metrics
        previous_credits = sum(float(e['amount']) for e in previous_entries if e['type'] == 'credit')
        previous_debits = sum(float(e['amount']) for e in previous_entries if e['type'] == 'debit')
        previous_net = previous_credits - previous_debits
        previous_daily_avg = previous_debits / 30
        
        # Calculate percentage changes
        def calculate_change(current, previous):
            if previous == 0:
                return 0
            return ((current - previous) / previous) * 100
        
        # Find highest debit/credit days and categories (for current period)
        daily_debits = defaultdict(float)
        daily_credits = defaultdict(float)
        debit_categories = defaultdict(float)
        credit_categories = defaultdict(float)
        
        for entry in current_entries:
            amount = float(entry['amount'])
            if entry['type'] == 'credit':
                daily_credits[entry['date']] += amount
                credit_categories[entry['category']] += amount
            else:
                daily_debits[entry['date']] += amount
                debit_categories[entry['category']] += amount
        
        # Get highest values
        highest_debit_day = max(daily_debits.items(), key=lambda x: x[1], default=(None, 0))
        highest_credit_day = max(daily_credits.items(), key=lambda x: x[1], default=(None, 0))
        highest_debit_category = max(debit_categories.items(), key=lambda x: x[1], default=(None, 0))
        highest_credit_category = max(credit_categories.items(), key=lambda x: x[1], default=(None, 0))
        
        return jsonify({
            "total_debits": round(current_debits, 2),
            "total_credits": round(current_credits, 2),
            "net_balance": round(current_net, 2),
            "daily_average": round(current_daily_avg, 2),
            "percent_change_credits": round(calculate_change(current_credits, previous_credits), 1),
            "percent_change_debits": round(calculate_change(current_debits, previous_debits), 1),
            "percent_change_balance": round(calculate_change(current_net, previous_net), 1),
            "percent_change_daily": round(calculate_change(current_daily_avg, previous_daily_avg), 1),
            "highest_debit_day": {
                "date": highest_debit_day[0],
                "amount": round(highest_debit_day[1], 2)
            },
            "highest_credit_day": {
                "date": highest_credit_day[0],
                "amount": round(highest_credit_day[1], 2)
            },
            "highest_debit_category": {
                "category": highest_debit_category[0],
                "amount": round(highest_debit_category[1], 2)
            },
            "highest_credit_category": {
                "category": highest_credit_category[0],
                "amount": round(highest_credit_category[1], 2)
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/charts/trend')
def get_trend_chart_data():
    """Enhanced trend chart data with type filtering"""
    try:
        entries = load_transactions()
        
        # Get filters from request
        timeframe = request.args.get('timeframe', default='30', type=str)
        chart_type = request.args.get('type', default='hybrid', type=str)
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=int(timeframe))
        
        # Filter entries by date
        filtered = [e for e in entries if 
                   datetime.strptime(e['date'], '%Y-%m-%d') >= start_date and
                   datetime.strptime(e['date'], '%Y-%m-%d') <= end_date]
        
        # Group by date and type
        dates = sorted(list(set(e['date'] for e in filtered)))
        daily_data = {date: {'credit': 0, 'debit': 0} for date in dates}
        
        for entry in filtered:
            amount = float(entry['amount'])
            if entry['type'] == 'credit':
                daily_data[entry['date']]['credit'] += amount
            else:
                daily_data[entry['date']]['debit'] += amount
        
        # Prepare response based on chart type
        response = {
            "labels": dates,
            "datasets": []
        }
        
        if chart_type in ['hybrid', 'credit']:
            response["datasets"].append({
                "label": "Credits",
                "data": [daily_data[date]['credit'] for date in dates],
                "backgroundColor": "rgba(16, 185, 129, 0.7)",
                "borderColor": "rgba(16, 185, 129, 1)"
            })
        
        if chart_type in ['hybrid', 'debit']:
            response["datasets"].append({
                "label": "Debits",
                "data": [daily_data[date]['debit'] for date in dates],
                "backgroundColor": "rgba(239, 68, 68, 0.7)",
                "borderColor": "rgba(239, 68, 68, 1)"
            })
            
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/charts/categories')
def get_category_chart_data():
    """Enhanced category chart data with type filtering"""
    try:
        entries = load_transactions()
        
        # Get filters from request
        timeframe = request.args.get('timeframe', default='30', type=str)
        chart_type = request.args.get('type', default='all', type=str)
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=int(timeframe))
        
        # Filter entries
        filtered = [e for e in entries if 
                   datetime.strptime(e['date'], '%Y-%m-%d') >= start_date and
                   datetime.strptime(e['date'], '%Y-%m-%d') <= end_date]
        
        # Group by category and type
        categories = {
            'credit': defaultdict(float),
            'debit': defaultdict(float)
        }
        
        for entry in filtered:
            amount = float(entry['amount'])
            categories[entry['type']][entry['category']] += amount
        
        # Prepare response
        response = {
            "labels": [],
            "datasets": [{
                "data": [],
                "backgroundColor": []
            }]
        }
        
        # Add categories based on selected type
        if chart_type in ['all', 'debit']:
            for category, amount in categories['debit'].items():
                response['labels'].append(category)
                response['datasets'][0]['data'].append(amount)
                response['datasets'][0]['backgroundColor'].append(
                    get_category_color(category, False)
                )
        
        if chart_type in ['all', 'credit']:
            for category, amount in categories['credit'].items():
                response['labels'].append(category)
                response['datasets'][0]['data'].append(amount)
                response['datasets'][0]['backgroundColor'].append(
                    get_category_color(category, True)
                )
                
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_category_color(category, is_credit=False):
    """Helper to get consistent category colors"""
    color_map = {
        # Debit categories
        'Food & Dining': 'rgba(239, 68, 68, 0.7)',
        'Transport': 'rgba(59, 130, 246, 0.7)',
        'Shopping': 'rgba(168, 85, 247, 0.7)',
        'Bills & Utilities': 'rgba(16, 185, 129, 0.7)',
        'Education / Learning': 'rgba(20, 184, 166, 0.7)',
        'Household and Transfers': 'rgba(220, 38, 38, 0.7)',
        'Entertainment': 'rgba(244, 114, 182, 0.7)',
        'Health': 'rgba(234, 179, 8, 0.7)',
        'Miscellaneous': 'rgba(156, 163, 175, 0.7)',
        
        # Credit categories
        'Salary': 'rgba(16, 185, 129, 0.7)',
        'Freelance': 'rgba(20, 184, 166, 0.7)',
        'Refunds/Cashbacks': 'rgba(99, 102, 241, 0.7)',
        'Other Income': 'rgba(132, 204, 22, 0.7)'
    }
    return color_map.get(category, 
                       'rgba(132, 204, 22, 0.7)' if is_credit else 'rgba(156, 163, 175, 0.7)')

@app.route('/api/transactions/export/csv')
def export_csv():
    """Exports transactions as CSV."""
    try:
        output = []
        output.append(['ID', 'Date', 'Description', 'Category', 'Type', 'Amount'])
        entries = load_transactions()
        for entry in entries:
            output.append([
                entry['id'],
                entry['date'],
                entry['description'],
                entry['category'],
                'Credit' if entry['type'] == 'credit' else 'Debit',
                entry['amount']
            ])

        # Create in-memory CSV
        csv_data = []
        for row in output:
            csv_data.append(','.join(str(item) for item in row))
        
        return (
            '\n'.join(csv_data),
            200,
            {
                'Content-Type': 'text/csv',
                'Content-Disposition': f'attachment; filename=transactions_{datetime.now().strftime("%Y%m%d")}.csv'
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Create necessary directories
    Path('static').mkdir(exist_ok=True)
    Path('templates').mkdir(exist_ok=True)
    
    # Run the Flask app
    app.run(debug=True, host='127.0.0.1', port=9000)