const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных на диске
const db = new sqlite3.Database(path.resolve(__dirname, 'house.db'), (err) => {
  if (err) {
    console.error('Ошибка при подключении к базе данных', err.message);
  } else {
    console.log('Успешно подключено к house.db');
  }
});

// Создание таблицы, если её нет
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_type TEXT,
      kitchen_area REAL,
      house_area REAL,
      rooms INTEGER,
      floors INTEGER,
      description TEXT,
      image TEXT,
      status TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Ошибка при создании таблицы', err.message);
    } else {
      console.log('Таблица listings создана или уже существует');
    }
  });
});

module.exports = db;