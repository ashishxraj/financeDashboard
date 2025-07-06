# app.py
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__, static_folder='static')
CORS(app) # Enable Cross-Origin Resource Sharing for the frontend

# Define the path for the JSON file where expenses will be stored
EXPENSES_FILE = 'expenses.json'

# --- Helper Functions for File Operations ---

def load_expenses():
    """Loads expenses from the JSON file."""
    if os.path.exists(EXPENSES_FILE):
        try:
            with open(EXPENSES_FILE, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            # Handle empty or malformed JSON file
            print(f"Warning: {EXPENSES_FILE} is empty or malformed. Starting with an empty list.")
            return []
    return [] # Return empty list if file doesn't exist

def save_expenses(expenses_list):
    """Saves the current list of expenses to the JSON file."""
    with open(EXPENSES_FILE, 'w') as f:
        json.dump(expenses_list, f, indent=4) # Use indent for pretty printing

# Load expenses when the application starts
expenses = load_expenses()

# --- API Endpoints ---

@app.route('/')
def index():
    """Serve the main application page."""
    return render_template('index.html')

@app.route('/expenses', methods=['GET'])
def get_expenses():
    """Returns the list of all expenses."""
    # Sort expenses by date in descending order (most recent first)
    # Convert date strings to datetime objects for proper comparison
    sorted_expenses = sorted(expenses, key=lambda x: datetime.strptime(x['date'], '%Y-%m-%d'), reverse=True)
    return jsonify(sorted_expenses)

@app.route('/expenses', methods=['POST'])
def add_expense():
    """Adds a new expense to the list."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON data"}), 400

    # Validate required fields
    required_fields = ['date', 'description', 'amount', 'category']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    try:
        amount = float(data['amount'])
        if amount <= 0:
            return jsonify({"error": "Amount must be a positive number"}), 400
    except ValueError:
        return jsonify({"error": "Amount must be a valid number"}), 400

    # Generate a unique ID for the new expense
    new_id = str(uuid.uuid4())
    new_expense = {
        "id": new_id,
        "date": data['date'],
        "description": data['description'],
        "amount": amount,
        "category": data['category'],
        "timestamp": datetime.now().isoformat() # Add a timestamp for consistent ordering if needed
    }

    expenses.append(new_expense)
    save_expenses(expenses) # Save updated list to file
    return jsonify(new_expense), 201 # Return the newly created expense with 201 status

@app.route('/expenses/<string:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    """Deletes an expense by its ID."""
    global expenses # Declare global to modify the list in place
    original_len = len(expenses)
    # Filter out the expense with the given ID
    expenses = [expense for expense in expenses if expense['id'] != expense_id]

    if len(expenses) == original_len:
        return jsonify({"error": "Expense not found"}), 404
    
    save_expenses(expenses) # Save updated list to file
    return jsonify({"message": "Expense deleted successfully"}), 200

# --- Running the Flask App ---
if __name__ == '__main__':
    # Run the Flask app in debug mode (useful for development)
    # Host on 0.0.0.0 to make it accessible from other devices on the network
    # if you are testing this from a different device than where the server is running.
    # For local development, '127.0.0.1' or 'localhost' is usually fine.
    app.run(debug=True, host='127.0.0.1', port=5000)
