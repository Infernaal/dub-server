const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const db = require('./database'); // Подключаем базу данных
const app = express();
const DeepL = require('deepl-node');

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
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Для доступа к загруженным изображениям

// Маршрут для страницы формы
app.get('/form', (req, res) => {
  res.render('form', { draft: null });
});

app.get('/video', (req, res) => {
  res.render('video', { draft: null }); // Просто рендерим EJS-файл
});

app.get('/faq', (req, res) => {
  res.render('faq-bot', { draft: null }); // Просто рендерим EJS-файл
});

app.get('/p2p', (req, res) => {
  res.render('p2p', { draft: null }); // Просто рендерим EJS-файл
});

app.get('/admin', (req, res) => {
  res.render('admin-panel', { draft: null }); // Просто рендерим EJS-файл
});

app.get('/filter', (req, res) => {
  res.render('filter', { draft: null }); // Просто рендерим EJS-файл
});

app.get('/category-photo', (req, res) => {
  res.render('category-photo', { draft: null }); // Просто рендерим EJS-файл
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

const authKey = "c2f89819-eddd-4a0c-84a5-862e3660a152:fx";
if (!authKey) {
  console.error("Не задан DEEPL_API_KEY в .env файле");
  process.exit(1);
}
const translator = new DeepL.Translator(authKey);

/**
 * Эндпоинт для перевода текста.
 * Ожидается POST-запрос с JSON:
 * {
 *   "text": "Hello world!",
 *   "targetLang": "RU"    // Двухбуквенный код целевого языка (например, "RU")
 * }
 */
app.post('/api/translate', async (req, res) => {
  const { text, targetLang } = req.body;
  console.log("Получен запрос на перевод:", { text, targetLang });
  if (!text || !targetLang || targetLang.trim() === "") {
    return res.status(400).json({ error: 'Не переданы text или targetLang (целевой язык не может быть пустым)' });
  }
  try {
    // Убеждаемся, что targetLang — непустая строка
    const effectiveTargetLang = targetLang.trim();
    // Перевод: первый параметр – текст, второй – целевой язык, третий – исходный язык (EN)
    const result = await translator.translateText(text, null, effectiveTargetLang);
    console.log("Результат перевода:", result);
    res.json({ translatedText: result.text });
  } catch (error) {
    console.error("Ошибка перевода:", error);
    res.status(500).json({ error: 'Ошибка перевода' });
  }
});
// Запуск сервера
app.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});