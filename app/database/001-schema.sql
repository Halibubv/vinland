-- Основная схема базы (PostgreSQL). Файл можно импортировать в DrawSQL, чтобы получить диаграмму.

-- Пользователи. Регистрация всегда создаёт role = 'user', администратора назначает только create-admin.php.
-- target_* — личные цели КБЖУ, NULL значит «не задана».
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    target_calories INTEGER,
    target_protein_g NUMERIC(7, 2),
    target_fat_g NUMERIC(7, 2),
    target_carbs_g NUMERIC(7, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Справочник упражнений. is_active = FALSE скрывает упражнение из выбора, но старые тренировки остаются.
CREATE TABLE exercises (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    muscle_group VARCHAR(100),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Справочник продуктов, КБЖУ на 100 г. is_active работает так же, как у упражнений.
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    calories_per_100g NUMERIC(8, 2) NOT NULL,
    protein_per_100g NUMERIC(8, 2) NOT NULL,
    fat_per_100g NUMERIC(8, 2) NOT NULL,
    carbs_per_100g NUMERIC(8, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Тренировка пользователя за конкретный день.
CREATE TABLE workouts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    workout_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Упражнения внутри тренировки; position задаёт порядок (1, 2, 3...).
CREATE TABLE workout_exercises (
    id BIGSERIAL PRIMARY KEY,
    workout_id BIGINT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id BIGINT NOT NULL REFERENCES exercises(id),
    position INTEGER NOT NULL CHECK (position > 0),
    notes TEXT,
    UNIQUE (workout_id, position)
);

-- Подходы упражнения: номер, повторения и вес.
CREATE TABLE workout_sets (
    id BIGSERIAL PRIMARY KEY,
    workout_exercise_id BIGINT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL CHECK (set_number > 0),
    repetitions INTEGER NOT NULL CHECK (repetitions >= 0),
    weight_kg NUMERIC(7, 2) NOT NULL CHECK (weight_kg >= 0),
    notes TEXT,
    UNIQUE (workout_exercise_id, set_number)
);

-- Приём пищи: день и тип (breakfast, lunch, snack, dinner).
CREATE TABLE meals (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    meal_date DATE NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Продукты в приёме пищи. Название и КБЖУ копируются сюда при записи,
-- чтобы поздняя правка справочника не меняла историю.
CREATE TABLE meal_items (
    id BIGSERIAL PRIMARY KEY,
    meal_id BIGINT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    product_name_snapshot VARCHAR(150) NOT NULL,
    quantity_g NUMERIC(8, 2) NOT NULL CHECK (quantity_g > 0),
    -- Снимки КБЖУ продукта на 100 г на момент записи.
    calories_snapshot NUMERIC(8, 2) NOT NULL,
    protein_snapshot NUMERIC(8, 2) NOT NULL,
    fat_snapshot NUMERIC(8, 2) NOT NULL,
    carbs_snapshot NUMERIC(8, 2) NOT NULL
);
