import sqlite3

db_path = r"e:\prince\Projects\random projects\movie suggester\backend\movies.db"
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print("Tables:", cursor.fetchall())

    cursor.execute("PRAGMA table_info(movies);")
    columns = [row[1] for row in cursor.fetchall()]
    print("Columns:", columns)
    
except Exception as e:
    print("Error:", e)
