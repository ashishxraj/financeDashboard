
import sqlite3
#opening the notebook
conn = sqlite3.connect("ExpenseTracker.db") #ExpenseTracker.db is database name
cursor = conn.cursor()

#creating a table in the database to list our expenses 
cursor.execute('''CREATE TABLE IF NOT EXISTS Expenses(ID INTEGER PRIMARY KEY AUTOINCREMENT, Date TEXT, Category TEXT, Description TEXT, Amount REAL)''')
print("Expense table is ready")
conn.commit()  #to save changes

#function to insert data in the database

def add_expense(Date, Category, Description, Amount):
    cursor.execute('''INSERT INTO Expenses(Date, Category, Description, Amount) VALUES (?,?,?,?)''',(Date, Category, Description, Amount))

conn.commit()
print("function created succesfully!")

#test the fucntion
add_expense("17-03-2024", "Personal Care", "Bought Bellavita perfume", 335)
add_expense("17-03-2024", "Transport", "Metro Fare", 50)
conn.commit()
print("Data added succesfully!")

#function to view all expense in the database
def view_expense():
    cursor.execute('SELECT * FROM Expenses')
    expenses = cursor.fetchall() #fetch all rows of the result
    if expenses:
        for expense in expenses:
            print(f"ID: {expense[0]}, Date: {expense[1]}, Category: {expense[2]}, Description: {expense[3]}, Amount:{expense[4]}")
    else:
            print("No expenses found.")

add_expense("2024-12-21", "Food", "Dinner with friends", 500.00)

view_expense()
