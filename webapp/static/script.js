// script.js
// Constants
const API_BASE_URL = '';
const ITEMS_PER_PAGE = 5;
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Refunds/Cashbacks', 'Other Income'];
const EXPENSE_CATEGORIES = ['Food & Dining', 'Transport', 'Shopping', 'Bills & Utilities','Education / Learning', 'Household and Transfers', 'Entertainment', 'Health', "Miscellaneous"];

// Global variables
let entries = [];
let filteredEntries = [];
let currentPage = 1;
let totalPages = 1;
let trendChart = null;
let categoryChart = null;
let entryToDelete = null;
let entryToEdit = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize date pickers
    flatpickr("#expenseDate", {
        dateFormat: "Y-m-d",
        defaultDate: "today"
    });
    
    flatpickr("#incomeDate", {
        dateFormat: "Y-m-d",
        defaultDate: "today"
    });
    
    flatpickr("#editEntryDate", {
        dateFormat: "Y-m-d"
    });
    
    // Mobile menu toggle
    document.getElementById('mobileMenuButton').addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('active');
    });
    
    // Initialize FAB functionality
    setupFloatingActionButtons();
    
    // Load initial data
    loadEntries();
    loadSummary();
    
    // Form submissions
    document.getElementById('expenseForm').addEventListener('submit', addExpense);
    document.getElementById('incomeForm').addEventListener('submit', addIncome);
    document.getElementById('editEntryForm').addEventListener('submit', updateEntry);
    
    // Export buttons
    document.getElementById('exportCsv').addEventListener('click', exportToCsv);
    document.getElementById('exportPdf').addEventListener('click', exportToPdf);
    
    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderEntries();
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderEntries();
        }
    });
    
    // Chart controls
    document.getElementById('trendTimeframe').addEventListener('change', renderTrendChart);
    document.getElementById('trendType').addEventListener('change', renderTrendChart);
    document.getElementById('categoryTimeframe').addEventListener('change', renderCategoryChart);
    document.getElementById('categoryType').addEventListener('change', renderCategoryChart);
    
    // Modal controls
    setupModalControls();
});

// Setup Floating Action Buttons
function setupFloatingActionButtons() {
    // Expense FAB
    const fabExpense = document.getElementById('fabExpense');
    const expenseFormContainer = document.getElementById('expenseFormContainer');
    const closeExpenseForm = document.getElementById('closeExpenseForm');
    
    fabExpense.addEventListener('click', () => {
        expenseFormContainer.classList.add('active');
        flatpickr("#expenseDate", {
            dateFormat: "Y-m-d",
            defaultDate: "today"
        });
    });
    
    closeExpenseForm.addEventListener('click', () => {
        expenseFormContainer.classList.remove('active');
    });
    
    // Income FAB
    const fabIncome = document.getElementById('fabIncome');
    const incomeFormContainer = document.getElementById('incomeFormContainer');
    const closeIncomeForm = document.getElementById('closeIncomeForm');
    
    fabIncome.addEventListener('click', () => {
        incomeFormContainer.classList.add('active');
        flatpickr("#incomeDate", {
            dateFormat: "Y-m-d",
            defaultDate: "today"
        });
    });
    
    closeIncomeForm.addEventListener('click', () => {
        incomeFormContainer.classList.remove('active');
    });
    
    // Close forms when clicking outside
    document.addEventListener('click', (e) => {
        if (!expenseFormContainer.contains(e.target) && e.target !== fabExpense) {
            expenseFormContainer.classList.remove('active');
        }
        if (!incomeFormContainer.contains(e.target) && e.target !== fabIncome) {
            incomeFormContainer.classList.remove('active');
        }
    });
}

// Setup Modal Controls
function setupModalControls() {
    // Delete Modal
    document.getElementById('closeDeleteModal').addEventListener('click', () => {
        document.getElementById('deleteModal').classList.add('hidden');
    });
    
    document.getElementById('cancelDelete').addEventListener('click', () => {
        document.getElementById('deleteModal').classList.add('hidden');
    });
    
    document.getElementById('confirmDelete').addEventListener('click', confirmDeleteEntry);
    
    // Edit Modal
    document.getElementById('closeEditModal').addEventListener('click', () => {
        document.getElementById('editModal').classList.add('hidden');
    });
    
    document.getElementById('cancelEdit').addEventListener('click', () => {
        document.getElementById('editModal').classList.add('hidden');
    });
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast';
    
    // Set background color based on type
    if (type === 'error') {
        toast.classList.add('bg-danger-500');
    } else if (type === 'warning') {
        toast.classList.add('bg-warning-500');
    } else {
        toast.classList.add('bg-success-500');
    }
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Load entries from API
async function loadEntries() {
    try {
        const response = await fetch(`/api/entries`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        entries = await response.json();
        filteredEntries = [...entries];
        renderEntries();
        renderTrendChart();
        renderCategoryChart();
        updateSplurgeInfo();
    } catch (error) {
        console.error("Error fetching entries:", error);
        showToast("Failed to load entries. Please try again.", "error");
    }
}

// Load summary data
async function loadSummary() {
    try {
        const response = await fetch(`/api/analytics/summary`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const summary = await response.json();
        
        // Update top 4 cards
        document.getElementById('totalIncome').textContent = `₹${summary.total_income.toFixed(2)}`;
        document.getElementById('totalExpenses').textContent = `₹${summary.total_expenses.toFixed(2)}`;
        document.getElementById('netSavings').textContent = `₹${summary.net_savings.toFixed(2)}`;
        document.getElementById('dailyAverage').textContent = `₹${summary.daily_average.toFixed(2)}`;
        
        // Update percentage changes
        updatePercentageChange('totalIncome', summary.percent_change_income);
        updatePercentageChange('totalExpenses', summary.percent_change_expenses);
        updatePercentageChange('netSavings', summary.percent_change_savings);
        updatePercentageChange('dailyAverage', summary.percent_change_daily);
        
        // Update lower 4 cards
        updateHighestDisplay(summary.highest_spending_day, 'highestSpendingDay', 'spending', 'day');
        updateHighestDisplay(summary.highest_income_day, 'highestIncomeDay', 'income', 'day');
        updateHighestDisplay(summary.highest_spending_category, 'highestSpendingCategory', 'spending', 'category');
        updateHighestDisplay(summary.highest_income_category, 'highestIncomeCategory', 'income', 'category');
        
        // Color net savings based on value
        const netSavingsEl = document.getElementById('netSavings');
        if (summary.net_savings >= 0) {
            netSavingsEl.classList.remove('text-danger-500');
            netSavingsEl.classList.add('text-success-500');
        } else {
            netSavingsEl.classList.remove('text-success-500');
            netSavingsEl.classList.add('text-danger-500');
        }
        
    } catch (error) {
        console.error("Error fetching summary:", error);
    }
}

function updatePercentageChange(cardType, percentChange) {
    const card = document.getElementById(cardType).closest('.card');
    const changeElement = card.querySelector('p.text-xs');
    
    const absPercent = Math.abs(percentChange);
    const arrowIcon = percentChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    const textColor = percentChange >= 0 ? 'text-success-500' : 'text-danger-500';
    
    changeElement.innerHTML = `
        <span class="${textColor}">
            <i class="fas ${arrowIcon}"></i>
            ${absPercent}%
        </span>
        <span class="text-gray-500"> from last month</span>
    `;
}

function updateHighestDisplay(data, elementId, type, labelType) {
    const element = document.getElementById(elementId);
    const card = element.closest('.card');
    
    if (data) {
        // Update the title (h3)
        const titleElement = card.querySelector('h3');
        titleElement.innerHTML = `₹${data.value.toFixed(2)}`;
        
        // Update the subtitle (p)
        const subtitleElement = card.querySelector('p.text-sm');
        subtitleElement.textContent = data.key;
        
        // Update the footer text
        const footerElement = card.querySelector('p.text-xs');
        footerElement.innerHTML = `
            <span class="text-gray-500">Highest ${type} ${labelType}</span>
        `;
        
        // Update the icon color if needed
        const iconElement = card.querySelector('div > div');
        iconElement.className = `p-3 rounded-lg ${type === 'income' ? 'bg-success-100 text-success-500' : 'bg-danger-100 text-danger-500'}`;
    } else {
        const titleElement = card.querySelector('h3');
        titleElement.innerHTML = `<i class="fas ${labelType === 'category' ? 'fa-tags' : 'fa-calendar-day'}"></i>`;
        
        const subtitleElement = card.querySelector('p.text-sm');
        subtitleElement.textContent = 'No data available';
        
        const footerElement = card.querySelector('p.text-xs');
        footerElement.innerHTML = `
            <span class="text-gray-500">Highest ${type} ${labelType}</span>
        `;
    }
}

function updatePercentageChange(cardType, percentChange) {
    const card = document.getElementById(cardType).closest('.card');
    const changeElement = card.querySelector('p.text-xs'); // Target the existing percentage element
    
    const absPercent = Math.abs(percentChange);
    const arrowIcon = percentChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    const textColor = percentChange >= 0 ? 'text-success-500' : 'text-danger-500';
    
    changeElement.innerHTML = `
        <span class="${textColor}">
            <i class="fas ${arrowIcon}"></i>
            ${absPercent}%
        </span>
        <span class="text-gray-500"> from last month</span>
    `;
}

// Update highest spending/income displays
function updateHighestSpendingDisplay(data, elementId) {
    const element = document.getElementById(elementId);
    if (data && data.amount > 0) {
        element.innerHTML = `
            <div class="text-center">
                <div class="text-4xl font-bold ${elementId.includes('income') ? 'text-green-600' : 'text-danger-500'} mb-2">
                    ₹${data.amount.toFixed(2)}
                </div>
                <p class="text-gray-700">${data.category || data.date}</p>
                <p class="text-sm text-gray-500 mt-1">${elementId.includes('Category') ? 'Category' : 'Day'}</p>
            </div>
        `;
    } else {
        element.innerHTML = `
            <div class="text-center">
                <div class="text-4xl font-bold ${elementId.includes('income') ? 'text-green-600' : 'text-danger-500'} mb-2">
                    <i class="fas ${elementId.includes('Category') ? 'fa-tags' : 'fa-calendar-day'}"></i>
                </div>
                <p class="text-gray-500">No data available</p>
            </div>
        `;
    }
}

// Render entries to the table with pagination
function renderEntries() {
    const tableBody = document.getElementById('expenseTableBody');
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedEntries = filteredEntries.slice(startIndex, endIndex);
    totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
    
    // Update pagination controls
    document.getElementById('showingCount').textContent = 
        filteredEntries.length > 0 ? startIndex + 1 : 0;
    document.getElementById('totalCount').textContent = filteredEntries.length;
    
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (paginatedEntries.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                No entries found
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    // Add new rows
    paginatedEntries.forEach(entry => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        // Determine amount color and icon based on type
        const isIncome = entry.type === 'income';
        const amountColor = isIncome ? 'text-green-600' : 'text-danger-500';
        const amountIcon = isIncome ? 'fa-plus-circle' : 'fa-minus-circle';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${entry.date}</td>
            <td class="px-6 py-4 whitespace-nowrap">${entry.description}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full ${getCategoryColor(entry.category, isIncome)}">
                    ${entry.category}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap ${amountColor}">
                <i class="fas ${amountIcon} mr-1"></i> ₹${parseFloat(entry.amount).toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full ${isIncome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${isIncome ? 'Income' : 'Expense'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <button class="text-primary-500 hover:text-primary-700 mr-3 edit-btn" data-id="${entry.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="text-danger-500 hover:text-danger-700 delete-btn" data-id="${entry.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const entryId = e.currentTarget.getAttribute('data-id');
            openEditModal(entryId);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const entryId = e.currentTarget.getAttribute('data-id');
            openDeleteModal(entryId);
        });
    });
}

// Get color class for category badge
function getCategoryColor(category, isIncome = false) {
    const colors = {
        'Food & Dining': 'bg-orange-100 text-orange-800',
        'Transport': 'bg-blue-100 text-blue-800',
        'Shopping': 'bg-purple-100 text-purple-800',
        'Bills & Utilities': 'bg-green-100 text-green-800',
        'Education / Learning': 'bg-teal-100 text-teal-800',
        'Entertainment': 'bg-pink-100 text-pink-800',
        'Household and Transfers': 'bg-red-100 text-red-800',
        'Health': 'bg-yellow-100 text-yellow-800',
        'Miscellaneous': 'bg-gray-100 text-gray-800',
        'Salary': 'bg-green-100 text-green-800',
        'Freelance': 'bg-teal-100 text-teal-800',
        'Refunds/Cashbacks': 'bg-indigo-100 text-indigo-800',
        'Other Income': 'bg-lime-100 text-lime-800',
    };
    
    // Default to income style if category not found but entry is income
    if (isIncome && !colors[category]) {
        return 'bg-green-100 text-green-800';
    }
    
    return colors[category] || 'bg-gray-100 text-gray-800';
}

// Render trend chart
async function renderTrendChart() {
    try {
        const timeframe = document.getElementById('trendTimeframe').value;
        const chartType = document.getElementById('trendType').value;
        
        const response = await fetch(`/api/charts/trend?timeframe=${timeframe}&type=${chartType}`);
        if (!response.ok) throw new Error('Failed to load trend data');
        
        const chartData = await response.json();
        
        const ctx = document.getElementById('trendChart').getContext('2d');
        
        if (trendChart) trendChart.destroy();
        
        trendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: chartData.datasets.map(ds => ({
                    ...ds,
                    borderWidth: 1
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${chartType === 'hybrid' ? 'Income & Expense' : chartType.charAt(0).toUpperCase() + chartType.slice(1)} Trend`
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ₹${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return `₹${value}`;
                            }
                        }
                    },
                    x: {
                        stacked: chartType === 'hybrid', // Stacked only in hybrid mode
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        stacked: chartType === 'hybrid' // Stacked only in hybrid mode
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error rendering trend chart:", error);
        showToast("Failed to load trend data", "error");
    }
}

// Render category chart
async function renderCategoryChart() {
    try {
        const timeframe = document.getElementById('categoryTimeframe').value;
        const chartType = document.getElementById('categoryType').value;
        
        const response = await fetch(`/api/charts/categories?timeframe=${timeframe}&type=${chartType}`);
        if (!response.ok) throw new Error('Failed to load category data');
        
        const chartData = await response.json();
        
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        if (categoryChart) categoryChart.destroy();
        
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.labels,
                datasets: [{
                    data: chartData.datasets[0].data,
                    backgroundColor: chartData.datasets[0].backgroundColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Category Breakdown'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${context.label}: ₹${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            padding: 20
                        }
                    }
                },
                cutout: '70%'
            }
        });
    } catch (error) {
        console.error("Error rendering category chart:", error);
        showToast("Failed to load category data", "error");
    }
}

// Update splurge info (highest spending/income)
function updateSplurgeInfo() {
    // Group by day and type
    const dailyExpenses = {};
    const dailyIncomes = {};
    const expenseCategories = {};
    const incomeCategories = {};
    
    entries.forEach(entry => {
        const amount = parseFloat(entry.amount);
        if (entry.type === 'income') {
            dailyIncomes[entry.date] = (dailyIncomes[entry.date] || 0) + amount;
            incomeCategories[entry.category] = (incomeCategories[entry.category] || 0) + amount;
        } else {
            dailyExpenses[entry.date] = (dailyExpenses[entry.date] || 0) + amount;
            expenseCategories[entry.category] = (expenseCategories[entry.category] || 0) + amount;
        }
    });
    
    // Find highest spending/income days and categories
    const highestSpendingDay = findMaxEntry(dailyExpenses);
    const highestIncomeDay = findMaxEntry(dailyIncomes);
    const highestSpendingCategory = findMaxEntry(expenseCategories);
    const highestIncomeCategory = findMaxEntry(incomeCategories);
    
    // Update UI
    updateHighestDisplay(highestSpendingDay, 'highestSpendingDay', 'spending', 'day');
    updateHighestDisplay(highestIncomeDay, 'highestIncomeDay', 'income', 'day');
    updateHighestDisplay(highestSpendingCategory, 'highestSpendingCategory', 'spending', 'category');
    updateHighestDisplay(highestIncomeCategory, 'highestIncomeCategory', 'income', 'category');
}

// Helper to find entry with maximum value
function findMaxEntry(data) {
    if (Object.keys(data).length === 0) return null;
    const [key, value] = Object.entries(data).reduce((a, b) => a[1] > b[1] ? a : b);
    return { key, value };
}

// Update highest display
function updateHighestDisplay(data, elementId, type, labelType) {
    const element = document.getElementById(elementId);
    if (data) {
        element.innerHTML = `
            <div class="text-center">
                <div class="text-4xl font-bold ${type === 'income' ? 'text-green-600' : 'text-danger-500'} mb-2">
                    ₹${data.value.toFixed(2)}
                </div>
                <p class="text-gray-700">${data.key}</p>
                <p class="text-sm text-gray-500 mt-1">Highest ${type} ${labelType}</p>
            </div>
        `;
    } else {
        element.innerHTML = `
            <div class="text-center">
                <div class="text-4xl font-bold ${type === 'income' ? 'text-green-600' : 'text-danger-500'} mb-2">
                    <i class="fas ${labelType === 'category' ? 'fa-tags' : 'fa-calendar-day'}"></i>
                </div>
                <p class="text-gray-500">No data available</p>
            </div>
        `;
    }
}

// Open delete confirmation modal
function openDeleteModal(entryId) {
    entryToDelete = entries.find(e => e.id === entryId);
    if (entryToDelete) {
        document.getElementById('deleteModal').classList.remove('hidden');
    }
}

// Confirm entry deletion
async function confirmDeleteEntry() {
    if (!entryToDelete) return;
    
    try {
        const response = await fetch(`/api/entries/${entryToDelete.id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        showToast("Entry deleted successfully");
        document.getElementById('deleteModal').classList.add('hidden');
        loadEntries();
        loadSummary();
    } catch (error) {
        console.error("Error deleting entry:", error);
        showToast("Failed to delete entry", "error");
    } finally {
        entryToDelete = null;
    }
}

// Open edit modal
function openEditModal(entryId) {
    entryToEdit = entries.find(e => e.id === entryId);
    if (entryToEdit) {
        // Populate form based on entry type
        const isIncome = entryToEdit.type === 'income';
        const form = document.getElementById('editEntryForm');
        
        // Reset and show appropriate category dropdown
        document.getElementById('editEntryCategory').innerHTML = '';
        const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            if (category === entryToEdit.category) {
                option.selected = true;
            }
            document.getElementById('editEntryCategory').appendChild(option);
        });
        
        // Fill form fields
        document.getElementById('editEntryId').value = entryToEdit.id;
        document.getElementById('editEntryDate').value = entryToEdit.date;
        document.getElementById('editEntryAmount').value = entryToEdit.amount;
        document.getElementById('editEntryDescription').value = entryToEdit.description;
        
        // Update date picker
        const datePicker = document.getElementById('editEntryDate')._flatpickr;
        if (datePicker) {
            datePicker.setDate(entryToEdit.date);
        }
        
        // Update modal title based on type
        document.getElementById('editModalTitle').textContent = 
            `Edit ${isIncome ? 'Income' : 'Expense'}`;
            
        document.getElementById('editModal').classList.remove('hidden');
    }
}

// Add new expense
async function addExpense(e) {
    e.preventDefault();
    
    const date = document.getElementById('expenseDate').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const description = document.getElementById('expenseDescription').value;
    
    if (!date || isNaN(amount) || amount <= 0 || !category || !description) {
        showToast("Please fill in all fields correctly", "error");
        return;
    }
    
    const newExpense = {
        date,
        amount,
        category,
        description,
        type: "expense"
    };
    
    try {
        const response = await fetch(`/api/expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newExpense)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        showToast("Expense added successfully");
        document.getElementById('expenseForm').reset();
        document.getElementById('expenseFormContainer').classList.remove('active');
        
        // Reload data
        loadEntries();
        loadSummary();
    } catch (error) {
        console.error("Error adding expense:", error);
        showToast(`Failed to add expense: ${error.message}`, "error");
    }
}

// Add new income
async function addIncome(e) {
    e.preventDefault();
    
    const date = document.getElementById('incomeDate').value;
    const amount = parseFloat(document.getElementById('incomeAmount').value);
    const category = document.getElementById('incomeCategory').value;
    const description = document.getElementById('incomeDescription').value;
    
    if (!date || isNaN(amount) || amount <= 0 || !category || !description) {
        showToast("Please fill in all fields correctly", "error");
        return;
    }
    
    const newIncome = {
        date,
        amount,
        category,
        description,
        type: "income"
    };
    
    try {
        const response = await fetch(`/api/incomes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newIncome)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        showToast("Income added successfully");
        document.getElementById('incomeForm').reset();
        document.getElementById('incomeFormContainer').classList.remove('active');
        
        // Reload data
        loadEntries();
        loadSummary();
    } catch (error) {
        console.error("Error adding income:", error);
        showToast(`Failed to add income: ${error.message}`, "error");
    }
}

// Update existing entry
async function updateEntry(e) {
    e.preventDefault();
    
    if (!entryToEdit) return;
    
    const date = document.getElementById('editEntryDate').value;
    const amount = parseFloat(document.getElementById('editEntryAmount').value);
    const category = document.getElementById('editEntryCategory').value;
    const description = document.getElementById('editEntryDescription').value;
    
    if (!date || isNaN(amount) || amount <= 0 || !category || !description) {
        showToast("Please fill in all fields correctly", "error");
        return;
    }
    
    const updatedEntry = {
        date,
        amount,
        category,
        description
    };
    
    try {
        const response = await fetch(`/api/entries/${entryToEdit.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedEntry)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        showToast("Entry updated successfully");
        document.getElementById('editModal').classList.add('hidden');
        
        // Reload data
        loadEntries();
        loadSummary();
    } catch (error) {
        console.error("Error updating entry:", error);
        showToast(`Failed to update entry: ${error.message}`, "error");
    } finally {
        entryToEdit = null;
    }
}

// Export to CSV
async function exportToCsv() {
    try {
        const response = await fetch(`/api/expenses/export/csv`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast("CSV export started");
    } catch (error) {
        console.error("Error exporting to CSV:", error);
        showToast("Failed to export to CSV", "error");
    }
}

// Export to PDF
async function exportToPdf() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text('Expense Report', 105, 20, { align: 'center' });
        
        // Add date
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 28, { align: 'center' });
        
        // Add summary
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        
        const summaryResponse = await fetch(`/api/analytics/summary`);
        if (summaryResponse.ok) {
            const summary = await summaryResponse.json();
            
            doc.text(`Total Income: ₹${summary.total_income.toFixed(2)}`, 14, 40);
            doc.text(`Total Expenses: ₹${summary.total_expenses.toFixed(2)}`, 14, 48);
            doc.text(`Net Savings: ₹${summary.net_savings.toFixed(2)}`, 14, 56);
            doc.text(`Daily Average: ₹${summary.daily_average.toFixed(2)}`, 14, 64);
        }
        
        // Add table
        const headers = [['Date', 'Description', 'Category', 'Type', 'Amount']];
        const data = filteredEntries.map(entry => [
            entry.date,
            entry.description,
            entry.category,
            entry.type === 'income' ? 'Income' : 'Expense',
            `₹${parseFloat(entry.amount).toFixed(2)}`
        ]);
        
        doc.autoTable({
            head: headers,
            body: data,
            startY: 80,
            theme: 'grid',
            headStyles: {
                fillColor: [59, 130, 246], // Primary color
                textColor: 255,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 60 },
                2: { cellWidth: 30 },
                3: { cellWidth: 20 },
                4: { cellWidth: 25, halign: 'right' }
            },
            styles: {
                fontSize: 10,
                cellPadding: 3
            }
        });
        
        // Save the PDF
        doc.save(`expense_report_${new Date().toISOString().split('T')[0]}.pdf`);
        
        showToast("PDF export completed");
    } catch (error) {
        console.error("Error exporting to PDF:", error);
        showToast("Failed to export to PDF", "error");
    }
}