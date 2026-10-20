-- Дополнительные проверки данных и индексы для частых запросов.

-- Email хранится в нижнем регистре, цели КБЖУ если заданы, то больше нуля.
ALTER TABLE users ADD CONSTRAINT normalized_email CHECK (email = LOWER(email));
ALTER TABLE users ADD CONSTRAINT valid_targets CHECK (
    (target_calories IS NULL OR target_calories > 0) AND
    (target_protein_g IS NULL OR target_protein_g > 0) AND
    (target_fat_g IS NULL OR target_fat_g > 0) AND
    (target_carbs_g IS NULL OR target_carbs_g > 0));

-- КБЖУ продуктов и снимков не бывает отрицательным.
ALTER TABLE products ADD CONSTRAINT nonnegative_nutrients CHECK (
    calories_per_100g >= 0 AND protein_per_100g >= 0 AND fat_per_100g >= 0 AND carbs_per_100g >= 0);
ALTER TABLE meal_items ADD CONSTRAINT nonnegative_snapshots CHECK (
    calories_snapshot >= 0 AND protein_snapshot >= 0 AND fat_snapshot >= 0 AND carbs_snapshot >= 0);

-- Индексы: списки «мои тренировки/приёмы пищи по дате».
-- Для внешних ключей (meal_items.meal_id и т. п.) MySQL создаёт индексы сам.
CREATE INDEX workouts_user_date ON workouts (user_id, workout_date);
CREATE INDEX meals_user_date ON meals (user_id, meal_date);
