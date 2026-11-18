-- Картинки в справочниках, свои упражнения и продукты пользователя, аватар.

-- image — имя файла картинки из public/assets/catalog (NULL — картинки нет).
-- user_id — владелец своей записи. NULL — общая запись справочника (её ведёт администратор),
-- число — упражнение или продукт, который пользователь добавил сам; видит его только он.
ALTER TABLE exercises
    ADD COLUMN image VARCHAR(100),
    ADD COLUMN user_id BIGINT,
    ADD FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE products
    ADD COLUMN image VARCHAR(100),
    ADD COLUMN user_id BIGINT,
    ADD FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

-- Аватар хранится прямо в базе как картинка в формате data:image/jpeg;base64,...
-- Браузер заранее уменьшает фото до 256×256, поэтому строка небольшая (десятки килобайт).
-- Так аватар не пропадает при перезапуске сервера на Render, где файлы на диске не сохраняются.
ALTER TABLE users
    ADD COLUMN avatar MEDIUMTEXT;

-- Картинки для начального справочника (файлы лежат в public/assets/catalog).
UPDATE exercises SET image = 'squat.jpg' WHERE name = 'Приседания со штангой' AND user_id IS NULL;
UPDATE exercises SET image = 'leg-press.jpg' WHERE name = 'Жим ногами' AND user_id IS NULL;
UPDATE exercises SET image = 'lunges.jpg' WHERE name = 'Выпады с гантелями' AND user_id IS NULL;
UPDATE exercises SET image = 'romanian-deadlift.jpg' WHERE name = 'Румынская тяга' AND user_id IS NULL;
UPDATE exercises SET image = 'calf-raise.jpg' WHERE name = 'Подъём на носки стоя' AND user_id IS NULL;
UPDATE exercises SET image = 'bench-press.jpg' WHERE name = 'Жим лёжа' AND user_id IS NULL;
UPDATE exercises SET image = 'incline-press.jpg' WHERE name = 'Жим гантелей на наклонной скамье' AND user_id IS NULL;
UPDATE exercises SET image = 'dips.jpg' WHERE name = 'Отжимания на брусьях' AND user_id IS NULL;
UPDATE exercises SET image = 'deadlift.jpg' WHERE name = 'Становая тяга' AND user_id IS NULL;
UPDATE exercises SET image = 'pull-ups.jpg' WHERE name = 'Подтягивания' AND user_id IS NULL;
UPDATE exercises SET image = 'barbell-row.jpg' WHERE name = 'Тяга штанги в наклоне' AND user_id IS NULL;
UPDATE exercises SET image = 'lat-pulldown.jpg' WHERE name = 'Тяга верхнего блока' AND user_id IS NULL;
UPDATE exercises SET image = 'overhead-press.jpg' WHERE name = 'Армейский жим' AND user_id IS NULL;
UPDATE exercises SET image = 'lateral-raise.jpg' WHERE name = 'Махи гантелями в стороны' AND user_id IS NULL;
UPDATE exercises SET image = 'biceps-curl.jpg' WHERE name = 'Подъём штанги на бицепс' AND user_id IS NULL;
UPDATE exercises SET image = 'french-press.jpg' WHERE name = 'Французский жим' AND user_id IS NULL;
UPDATE exercises SET image = 'hammer-curl.jpg' WHERE name = 'Молотковые сгибания' AND user_id IS NULL;
UPDATE exercises SET image = 'plank.jpg' WHERE name = 'Планка' AND user_id IS NULL;
UPDATE exercises SET image = 'crunches.jpg' WHERE name = 'Скручивания' AND user_id IS NULL;

UPDATE products SET image = 'chicken-breast.jpg' WHERE name = 'Куриная грудка' AND user_id IS NULL;
UPDATE products SET image = 'beef.jpg' WHERE name = 'Говядина постная' AND user_id IS NULL;
UPDATE products SET image = 'turkey.jpg' WHERE name = 'Индейка, филе' AND user_id IS NULL;
UPDATE products SET image = 'salmon.jpg' WHERE name = 'Лосось' AND user_id IS NULL;
UPDATE products SET image = 'cod.jpg' WHERE name = 'Треска' AND user_id IS NULL;
UPDATE products SET image = 'egg.jpg' WHERE name = 'Яйцо куриное' AND user_id IS NULL;
UPDATE products SET image = 'cottage-cheese.jpg' WHERE name = 'Творог 5%' AND user_id IS NULL;
UPDATE products SET image = 'greek-yogurt.jpg' WHERE name = 'Греческий йогурт 2%' AND user_id IS NULL;
UPDATE products SET image = 'milk.jpg' WHERE name = 'Молоко 2,5%' AND user_id IS NULL;
UPDATE products SET image = 'cheese.jpg' WHERE name = 'Сыр твёрдый' AND user_id IS NULL;
UPDATE products SET image = 'oats.jpg' WHERE name = 'Овсяные хлопья' AND user_id IS NULL;
UPDATE products SET image = 'rice.jpg' WHERE name = 'Рис варёный' AND user_id IS NULL;
UPDATE products SET image = 'buckwheat.jpg' WHERE name = 'Гречка варёная' AND user_id IS NULL;
UPDATE products SET image = 'pasta.jpg' WHERE name = 'Макароны варёные' AND user_id IS NULL;
UPDATE products SET image = 'bread.jpg' WHERE name = 'Хлеб цельнозерновой' AND user_id IS NULL;
UPDATE products SET image = 'potato.jpg' WHERE name = 'Картофель варёный' AND user_id IS NULL;
UPDATE products SET image = 'banana.jpg' WHERE name = 'Банан' AND user_id IS NULL;
UPDATE products SET image = 'apple.jpg' WHERE name = 'Яблоко' AND user_id IS NULL;
UPDATE products SET image = 'broccoli.jpg' WHERE name = 'Брокколи' AND user_id IS NULL;
UPDATE products SET image = 'cucumber.jpg' WHERE name = 'Огурец' AND user_id IS NULL;
UPDATE products SET image = 'tomato.jpg' WHERE name = 'Помидор' AND user_id IS NULL;
UPDATE products SET image = 'avocado.jpg' WHERE name = 'Авокадо' AND user_id IS NULL;
UPDATE products SET image = 'almonds.jpg' WHERE name = 'Миндаль' AND user_id IS NULL;
UPDATE products SET image = 'peanut-butter.jpg' WHERE name = 'Арахисовая паста' AND user_id IS NULL;
UPDATE products SET image = 'olive-oil.jpg' WHERE name = 'Масло оливковое' AND user_id IS NULL;
UPDATE products SET image = 'honey.jpg' WHERE name = 'Мёд' AND user_id IS NULL;
