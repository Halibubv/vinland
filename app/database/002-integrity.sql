ALTER TABLE users ADD CONSTRAINT normalized_email CHECK (email = lower(email));
ALTER TABLE users ADD CONSTRAINT valid_targets CHECK (
    (target_calories IS NULL OR target_calories > 0) AND
    (target_protein_g IS NULL OR target_protein_g > 0) AND
    (target_fat_g IS NULL OR target_fat_g > 0) AND
    (target_carbs_g IS NULL OR target_carbs_g > 0));
ALTER TABLE products ADD CONSTRAINT nonnegative_nutrients CHECK (
    calories_per_100g >= 0 AND protein_per_100g >= 0 AND fat_per_100g >= 0 AND carbs_per_100g >= 0);
ALTER TABLE meal_items ADD CONSTRAINT nonnegative_snapshots CHECK (
    calories_snapshot >= 0 AND protein_snapshot >= 0 AND fat_snapshot >= 0 AND carbs_snapshot >= 0);
CREATE INDEX workouts_user_date ON workouts (user_id, workout_date DESC);
CREATE INDEX meals_user_date ON meals (user_id, meal_date DESC);
CREATE INDEX meal_items_meal ON meal_items (meal_id);
CREATE INDEX workout_sets_exercise ON workout_sets (workout_exercise_id);
