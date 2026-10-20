-- Основная схема базы (MySQL 8). Файл можно импортировать в DrawSQL, чтобы получить диаграмму.
-- Все таблицы: движок InnoDB (нужен для внешних ключей и транзакций) и кодировка utf8mb4
-- (полный Юникод, в том числе русские буквы и эмодзи).

-- Пользователи. Регистрация всегда создаёт role = 'user', администратора назначает только create-admin.php.
-- target_* — личные цели КБЖУ, NULL значит «не задана».
CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    target_calories INT,
    target_protein_g DECIMAL(7, 2),
    target_fat_g DECIMAL(7, 2),
    target_carbs_g DECIMAL(7, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Справочник упражнений. is_active = 0 скрывает упражнение из выбора, но старые тренировки остаются.
-- BOOLEAN в MySQL — это TINYINT(1): хранится 1 (да) или 0 (нет).
CREATE TABLE exercises (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    muscle_group VARCHAR(100),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Справочник продуктов, КБЖУ на 100 г. is_active работает так же, как у упражнений.
CREATE TABLE products (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    calories_per_100g DECIMAL(8, 2) NOT NULL,
    protein_per_100g DECIMAL(8, 2) NOT NULL,
    fat_per_100g DECIMAL(8, 2) NOT NULL,
    carbs_per_100g DECIMAL(8, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Тренировка пользователя за конкретный день.
CREATE TABLE workouts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    workout_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Упражнения внутри тренировки; position задаёт порядок (1, 2, 3...).
-- ON DELETE CASCADE: удалили тренировку — её упражнения удалятся сами.
CREATE TABLE workout_exercises (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    workout_id BIGINT NOT NULL,
    exercise_id BIGINT NOT NULL,
    position INT NOT NULL CHECK (position > 0),
    notes TEXT,
    UNIQUE (workout_id, position),
    FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Подходы упражнения: номер, повторения и вес.
CREATE TABLE workout_sets (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    workout_exercise_id BIGINT NOT NULL,
    set_number INT NOT NULL CHECK (set_number > 0),
    repetitions INT NOT NULL CHECK (repetitions >= 0),
    weight_kg DECIMAL(7, 2) NOT NULL CHECK (weight_kg >= 0),
    notes TEXT,
    UNIQUE (workout_exercise_id, set_number),
    FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Приём пищи: день и тип (breakfast, lunch, snack, dinner).
CREATE TABLE meals (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    meal_date DATE NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Продукты в приёме пищи. Название и КБЖУ копируются сюда при записи,
-- чтобы поздняя правка справочника не меняла историю.
CREATE TABLE meal_items (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    meal_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_name_snapshot VARCHAR(150) NOT NULL,
    quantity_g DECIMAL(8, 2) NOT NULL CHECK (quantity_g > 0),
    -- Снимки КБЖУ продукта на 100 г на момент записи.
    calories_snapshot DECIMAL(8, 2) NOT NULL,
    protein_snapshot DECIMAL(8, 2) NOT NULL,
    fat_snapshot DECIMAL(8, 2) NOT NULL,
    carbs_snapshot DECIMAL(8, 2) NOT NULL,
    FOREIGN KEY (meal_id) REFERENCES meals (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
