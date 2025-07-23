// script.js
// Constants
const API_BASE_URL = '';
const ITEMS_PER_PAGE = 5;
const CREDIT_CATEGORIES = ['Salary', 'Freelance', 'Refunds/Cashbacks', 'Other Income'];
const DEBIT_CATEGORIES = ['Food & Dining', 'Transport', 'Shopping', 'Bills & Utilities','Education / Learning', 'Household and Transfers', 'Entertainment', 'Health', "Miscellaneous"];

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
    
    // Initialize FAB functionality
    setupFloatingActionButtons();
    
    // Load initial data
    loadEntries();
    loadSummary();
    
    // Form submissions
    document.getElementById('expenseForm').addEventListener('submit', addDebit);
    document.getElementById('incomeForm').addEventListener('submit', addCredit);
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
    
    // Dark mode toggle
    document.getElementById('themeToggle')?.addEventListener('click', toggleDarkMode);
    document.getElementById('themeToggleDesktop')?.addEventListener('click', toggleDarkMode);
});

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
}

// Setup Floating Action Buttons
function setupFloatingActionButtons() {
    // Debit FAB
    const fabDebit = document.getElementById('fabExpense');
    const debitFormContainer = document.getElementById('expenseFormContainer');
    const closeDebitForm = document.getElementById('closeExpenseForm');
    
    fabDebit?.addEventListener('click', () => {
        debitFormContainer.classList.add('active');
        flatpickr("#expenseDate", {
            dateFormat: "Y-m-d",
            defaultDate: "today"
        });
    });
    
    closeDebitForm?.addEventListener('click', () => {
        debitFormContainer.classList.remove('active');
    });
    
    // Credit FAB
    const fabCredit = document.getElementById('fabIncome');
    const creditFormContainer = document.getElementById('incomeFormContainer');
    const closeCreditForm = document.getElementById('closeIncomeForm');
    
    fabCredit?.addEventListener('click', () => {
        creditFormContainer.classList.add('active');
        flatpickr("#incomeDate", {
            dateFormat: "Y-m-d",
            defaultDate: "today"
        });
    });
    
    closeCreditForm?.addEventListener('click', () => {
        creditFormContainer.classList.remove('active');
    });
    
    // Desktop Debit FAB
    const fabDebitDesktop = document.getElementById('fabExpenseDesktop');
    fabDebitDesktop?.addEventListener('click', (e) => {
        e.stopPropagation();
        debitFormContainer.classList.add('active');
        flatpickr("#expenseDate", {
            dateFormat: "Y-m-d",
            defaultDate: "today"
        });
    });

    // Desktop Credit FAB
    const fabCreditDesktop = document.getElementById('fabIncomeDesktop');
    fabCreditDesktop?.addEventListener('click', (e) => {
        e.stopPropagation();
        creditFormContainer.classList.add('active');
        flatpickr("#incomeDate", {
            dateFormat: "Y-m-d",
            defaultDate: "today"
        });
    });

    // Close forms when clicking outside
    document.addEventListener('click', (e) => {
        if (debitFormContainer && !debitFormContainer.contains(e.target) && e.target !== fabDebit) {
            debitFormContainer.classList.remove('active');
        }
        if (creditFormContainer && !creditFormContainer.contains(e.target) && e.target !== fabCredit) {
            creditFormContainer.classList.remove('active');
        }
    });
}

// Setup Modal Controls
function setupModalControls() {
    // Delete Modal
    document.getElementById('closeDeleteModal')?.addEventListener('click', () => {
        document.getElementById('deleteModal').classList.add('hidden');
    });
    
    document.getElementById('cancelDelete')?.addEventListener('click', () => {
        document.getElementById('deleteModal').classList.add('hidden');
    });
    
    document.getElementById('confirmDelete')?.addEventListener('click', confirmDeleteEntry);
    
    // Edit Modal
    document.getElementById('closeEditModal')?.addEventListener('click', () => {
        document.getElementById('editModal').classList.add('hidden');
    });
    
    document.getElementById('cancelEdit')?.addEventListener('click', () => {
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
        document.getElementById('totalIncome').textContent = `₹${summary.total_credits.toFixed(2)}`;
        document.getElementById('totalExpenses').textContent = `₹${summary.total_debits.toFixed(2)}`;
        document.getElementById('netSavings').textContent = `₹${summary.net_balance.toFixed(2)}`;
        document.getElementById('dailyAverage').textContent = `₹${summary.daily_average.toFixed(2)}`;
        
        // Update percentage changes
        updatePercentageChange('incomeChange', summary.percent_change_credits);
        updatePercentageChange('expenseChange', summary.percent_change_debits);
        updatePercentageChange('balanceChange', summary.percent_change_balance);
        updatePercentageChange('dailyChange', summary.percent_change_daily);
        
        // Update lower 4 cards
        updateHighestDisplay(summary.highest_debit_day, 'highestSpendingDay', 'debit', 'day');
        updateHighestDisplay(summary.highest_credit_day, 'highestIncomeDay', 'credit', 'day');
        updateHighestDisplay(summary.highest_debit_category, 'highestSpendingCategory', 'debit', 'category');
        updateHighestDisplay(summary.highest_credit_category, 'highestIncomeCategory', 'credit', 'category');
        
        // Color net savings based on value
        const netSavingsEl = document.getElementById('netSavings');
        if (summary.net_balance >= 0) {
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

function updatePercentageChange(elementId, percentChange) {
    const changeElement = document.getElementById(elementId);
    if (!changeElement) return;
    
    const absPercent = Math.abs(percentChange);
    const arrowIcon = percentChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    const textColor = percentChange >= 0 ? 'text-success-500' : 'text-danger-500';
    
    changeElement.innerHTML = `
        <span class="${textColor}">
            <i class="fas ${arrowIcon}"></i>
            ${absPercent}%
        </span>
        <span class="text-gray-500 dark:text-gray-400"> from last month</span>
    `;
}

function updateHighestDisplay(data, elementId, type, labelType) {
    const valueEl = document.getElementById(`${elementId}Value`);
    const labelEl = document.getElementById(`${elementId}Label`);
    if (!valueEl || !labelEl) return;

    if (data && data.amount > 0) {
        // Set value
        valueEl.textContent = `₹${data.amount.toFixed(2)}`;
        // Set label (the key, e.g. date or category)
        labelEl.textContent = data.date || data.category || 'N/A';
    } else {
        // Set value to 0
        valueEl.textContent = '₹0.00';
        // Set label to "No data available"
        labelEl.textContent = 'No data available';
    }
}

// Render entries to the table with pagination
function renderEntries() {
    const tableBody = document.getElementById('expenseTableBody');
    if (!tableBody) return;
    
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
            <td colspan="5" class="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                No transactions found
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    // Add new rows
    paginatedEntries.forEach(entry => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
        
        // Determine amount color and icon based on type
        const isCredit = entry.type === 'credit';
        const amountColor = isCredit ? 'text-success-500' : 'text-danger-500';
        const amountIcon = isCredit ? 'fa-plus-circle' : 'fa-minus-circle';
        
        row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap">${entry.date}</td>
            <td class="px-4 py-3 whitespace-nowrap">${entry.description}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full ${getCategoryColor(entry.category, isCredit)}">
                    ${entry.category}
                </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap ${amountColor}">
                <i class="fas ${amountIcon} mr-1"></i> ₹${parseFloat(entry.amount).toFixed(2)}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
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
function getCategoryColor(category, isCredit = false) {
    const colors = {
        'Food & Dining': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        'Transport': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'Shopping': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        'Bills & Utilities': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'Education / Learning': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
        'Entertainment': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
        'Household and Transfers': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        'Health': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        'Miscellaneous': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        'Salary': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'Freelance': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
        'Refunds/Cashbacks': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
        'Other Income': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
    };
    
    // Default to credit style if category not found but entry is credit
    if (isCredit && !colors[category]) {
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
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
                    label: ds.label === 'Income' ? 'Credits' : ds.label === 'Expense' ? 'Debits' : ds.label,
                    borderWidth: 1
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#1e293b'
                        }
                    },
                    title: {
                        display: true,
                        text: `${chartType === 'hybrid' ? 'Credit & Debit' : chartType.charAt(0).toUpperCase() + chartType.slice(1)} Trend`,
                        font: {
                            size: 14,
                            weight: '500'
                        },
                        color: '#1e293b'
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
                            },
                            color: '#64748b'
                        },
                        grid: {
                            color: '#e2e8f0'
                        }
                    },
                    x: {
                        stacked: chartType === 'hybrid',
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b'
                        }
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
                        text: 'Category Breakdown',
                        color: '#1e293b'
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
                            padding: 20,
                            color: '#1e293b'
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

// Update splurge info (highest spending/credit)
function updateSplurgeInfo() {
    // Group by day and type
    const dailyDebits = {};
    const dailyCredits = {};
    const debitCategories = {};
    const creditCategories = {};
    
    entries.forEach(entry => {
        const amount = parseFloat(entry.amount);
        if (entry.type === 'credit') {
            dailyCredits[entry.date] = (dailyCredits[entry.date] || 0) + amount;
            creditCategories[entry.category] = (creditCategories[entry.category] || 0) + amount;
        } else {
            dailyDebits[entry.date] = (dailyDebits[entry.date] || 0) + amount;
            debitCategories[entry.category] = (debitCategories[entry.category] || 0) + amount;
        }
    });
    
    // Find highest debit/credit days and categories
    const highestDebitDay = findMaxEntry(dailyDebits);
    const highestCreditDay = findMaxEntry(dailyCredits);
    const highestDebitCategory = findMaxEntry(debitCategories);
    const highestCreditCategory = findMaxEntry(creditCategories);
    
    // Update UI
    updateHighestDisplay(highestDebitDay, 'highestSpendingDay', 'debit', 'day');
    updateHighestDisplay(highestCreditDay, 'highestIncomeDay', 'credit', 'day');
    updateHighestDisplay(highestDebitCategory, 'highestSpendingCategory', 'debit', 'category');
    updateHighestDisplay(highestCreditCategory, 'highestIncomeCategory', 'credit', 'category');
}

// Helper to find entry with maximum value
function findMaxEntry(data) {
    if (Object.keys(data).length === 0) return null;
    const [key, value] = Object.entries(data).reduce((a, b) => a[1] > b[1] ? a : b);
    return { key, value };
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
        const isCredit = entryToEdit.type === 'credit';
        const form = document.getElementById('editEntryForm');
        
        // Reset and show appropriate category dropdown
        document.getElementById('editEntryCategory').innerHTML = '';
        const categories = isCredit ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;
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
            `Edit ${isCredit ? 'Credit' : 'Debit'}`;
            
        document.getElementById('editModal').classList.remove('hidden');
    }
}

// Add new debit
async function addDebit(e) {
    e.preventDefault();
    
    const date = document.getElementById('expenseDate').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const description = document.getElementById('expenseDescription').value;
    
    if (!date || isNaN(amount) || amount <= 0 || !category || !description) {
        showToast("Please fill in all fields correctly", "error");
        return;
    }
    
    const newDebit = {
        date,
        amount,
        category,
        description,
        type: "debit"
    };
    
    try {
        const response = await fetch(`/api/debits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newDebit)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        showToast("Debit recorded successfully");
        document.getElementById('expenseForm').reset();
        document.getElementById('expenseFormContainer').classList.remove('active');
        
        // Reload data
        loadEntries();
        loadSummary();

    } catch (error) {
        console.error("Error adding debit:", error);
        showToast(`Failed to record debit: ${error.message}`, "error");
    }
}

// Add new credit
async function addCredit(e) {
    e.preventDefault();
    
    const date = document.getElementById('incomeDate').value;
    const amount = parseFloat(document.getElementById('incomeAmount').value);
    const category = document.getElementById('incomeCategory').value;
    const description = document.getElementById('incomeDescription').value;
    
    if (!date || isNaN(amount) || amount <= 0 || !category || !description) {
        showToast("Please fill in all fields correctly", "error");
        return;
    }
    
    const newCredit = {
        date,
        amount,
        category,
        description,
        type: "credit"
    };
    
    try {
        const response = await fetch(`/api/credits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newCredit)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        showToast("Credit recorded successfully");
        document.getElementById('incomeForm').reset();
        document.getElementById('incomeFormContainer').classList.remove('active');
        
        // Reload data
        loadEntries();
        loadSummary();
    } catch (error) {
        console.error("Error adding credit:", error);
        showToast(`Failed to record credit: ${error.message}`, "error");
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

// Export to CSV using backend endpoint
async function exportToCsv() {
    try {
        const response = await fetch(`/api/transactions/export/csv`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
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

// Export to PDF using backend endpoint
async function exportToPdf() {
    try {
        const response = await fetch(`/api/transactions/export/pdf`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast("PDF export started");
    } catch (error) {
        console.error("Error exporting to PDF:", error);
        showToast("Failed to export to PDF", "error");
    }
}