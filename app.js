const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const db = require('./database'); // Подключаем базу данных
const app = express();

// Настройка хранения изображений
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Папка для сохранения изображений
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Генерация имени файла
  }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Только изображения (jpeg, jpg, png, gif) разрешены!'));
        }
    }
});

// Настройка приложения
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Для доступа к загруженным изображениям

// Маршрут для страницы формы
app.get('/form', (req, res) => {
  res.render('form', { draft: null });
});


app.post('/save-draft', upload.single('image'), (req, res) => {
    const { property_type, kitchen_area, house_area, rooms, floors, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;
  
    console.log(`Debug: ${image}`);  // Отладочный вывод для проверки пути к изображению
  
    const sql = `
      INSERT INTO listings (property_type, kitchen_area, house_area, rooms, floors, description, image, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
  
    db.run(sql, [property_type, kitchen_area, house_area, rooms, floors, description, image, 'draft'], function (err) {
      if (err) {
        console.error(err.message);  // Печатаем ошибку в консоль
        return res.status(500).send("Ошибка при сохранении в базу данных");
      }
      res.redirect(`/form?id=${this.lastID}`);
    });
  });
  
  // Обработка публикации объявления
  app.post('/publish', upload.single('image'), (req, res) => {
    if (req.fileValidationError) {
        return res.status(400).send(req.fileValidationError);
    }

    const { property_type, kitchen_area, house_area, rooms, floors, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    console.log(`Debug: ${image}`); // Проверка пути к изображению

    const sql = `
        INSERT INTO listings (property_type, kitchen_area, house_area, rooms, floors, description, image, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [property_type, kitchen_area, house_area, rooms, floors, description, image, 'published'], function (err) {
        if (err) {
            console.error("Ошибка базы данных:", err.message); // Печать ошибки базы данных
            return res.status(500).send("Ошибка при сохранении в базу данных");
        }
        res.redirect('/listings');
    });
});

// Страница со всеми объявлениями
app.get('/listings', (req, res) => {
  db.all('SELECT * FROM listings WHERE status = "published"', (err, rows) => {
    res.render('listings', { listings: rows });
  });
});

// Запуск сервера
app.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});