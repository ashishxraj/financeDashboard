from datetime import datetime, timedelta
from collections import defaultdict

def calculate_summary(transactions):
    """Calculate all summary metrics"""
    if not transactions:
        return empty_summary()
    
    # Current period (last 30 days)
    end_date = datetime.now()
    current_start_date = end_date - timedelta(days=30)
    current_entries = filter_by_date_range(transactions, current_start_date, end_date)
    
    # Previous period (30 days before that)
    previous_start_date = current_start_date - timedelta(days=30)
    previous_entries = filter_by_date_range(transactions, previous_start_date, current_start_date)
    
    # Current period metrics
    current_credits = sum(float(e['amount']) for e in current_entries if e['type'] == 'credit')
    current_debits = sum(float(e['amount']) for e in current_entries if e['type'] == 'debit')
    current_net = current_credits - current_debits
    current_daily_avg = current_debits / 30
    
    # Previous period metrics
    previous_credits = sum(float(e['amount']) for e in previous_entries if e['type'] == 'credit')
    previous_debits = sum(float(e['amount']) for e in previous_entries if e['type'] == 'debit')
    previous_net = previous_credits - previous_debits
    previous_daily_avg = previous_debits / 30
    
    # Calculate percentage changes
    def calculate_change(current, previous):
        if previous == 0:
            return 0
        return ((current - previous) / previous) * 100
    
    # Find highest values
    highest_values = find_highest_values(current_entries)
    
    return {
        "total_debits": round(current_debits, 2),
        "total_credits": round(current_credits, 2),
        "net_balance": round(current_net, 2),
        "daily_average": round(current_daily_avg, 2),
        "percent_change_credits": round(calculate_change(current_credits, previous_credits), 1),
        "percent_change_debits": round(calculate_change(current_debits, previous_debits), 1),
        "percent_change_balance": round(calculate_change(current_net, previous_net), 1),
        "percent_change_daily": round(calculate_change(current_daily_avg, previous_daily_avg), 1),
        **highest_values
    }

def filter_by_date_range(transactions, start_date, end_date):
    """Filter transactions by date range"""
    return [e for e in transactions if 
            datetime.strptime(e['date'], '%Y-%m-%d') >= start_date and
            datetime.strptime(e['date'], '%Y-%m-%d') <= end_date]

def find_highest_values(transactions):
    """Find highest spending/income days and categories"""
    daily_debits = defaultdict(float)
    daily_credits = defaultdict(float)
    debit_categories = defaultdict(float)
    credit_categories = defaultdict(float)
    
    for entry in transactions:
        amount = float(entry['amount'])
        if entry['type'] == 'credit':
            daily_credits[entry['date']] += amount
            credit_categories[entry['category']] += amount
        else:
            daily_debits[entry['date']] += amount
            debit_categories[entry['category']] += amount
    
    def get_max(data):
        if not data:
            return {"amount": 0, "date": None, "category": None}
        key, value = max(data.items(), key=lambda x: x[1])
        return {"amount": round(value, 2), "date": key, "category": key}
    
    return {
        "highest_debit_day": get_max(daily_debits),
        "highest_credit_day": get_max(daily_credits),
        "highest_debit_category": get_max(debit_categories),
        "highest_credit_category": get_max(credit_categories)
    }

def empty_summary():
    """Return empty summary structure"""
    return {
        "total_debits": 0,
        "total_credits": 0,
        "net_balance": 0,
        "daily_average": 0,
        "percent_change_credits": 0,
        "percent_change_debits": 0,
        "percent_change_balance": 0,
        "percent_change_daily": 0,
        "highest_debit_day": {"amount": 0, "date": None},
        "highest_credit_day": {"amount": 0, "date": None},
        "highest_debit_category": {"amount": 0, "category": None},
        "highest_credit_category": {"amount": 0, "category": None}
    }