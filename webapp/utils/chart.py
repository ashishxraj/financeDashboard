from datetime import datetime, timedelta
from collections import defaultdict

def get_trend_chart_data(transactions, timeframe='30', chart_type='hybrid'):
    """Prepare data for trend chart"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=int(timeframe))
    
    filtered = [e for e in transactions if 
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
        
    return response

def get_category_chart_data(transactions, timeframe='30', chart_type='debit'):
    """Prepare data for category chart"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=int(timeframe))
    
    filtered = [e for e in transactions if 
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
            
    return response

def get_category_color(category, is_credit=False):
    """Get consistent category colors"""
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