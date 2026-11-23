<?php
// Профиль: имя, цели КБЖУ на день и фото (аватар).

// Цель КБЖУ: пустое поле — цель не задана (NULL), иначе число больше нуля.
function goal_value($data, $field, $isWhole)
{
    if (!isset($data[$field]) || $data[$field] === '') {
        return null;
    }
    if ($isWhole) {
        $value = whole_number_value($data, $field, 100000);
    } else {
        $value = number_value($data, $field, 10000);
    }
    if ($value <= 0) {
        invalid($field, 'Значение должно быть больше нуля.');
    }
    return $value;
}

function update_profile($userId, $data)
{
    $name = text_value($data, 'name', 100);
    $calories = goal_value($data, 'target_calories', true);
    $protein = goal_value($data, 'target_protein_g', false);
    $fat = goal_value($data, 'target_fat_g', false);
    $carbs = goal_value($data, 'target_carbs_g', false);

    query('UPDATE users SET name = ?, target_calories = ?, target_protein_g = ?, target_fat_g = ?, target_carbs_g = ?
        WHERE id = ?', [$name, $calories, $protein, $fat, $carbs, $userId]);
}

// Аватар приходит строкой вида data:image/jpeg;base64,... (браузер уже уменьшил фото)
// и так же хранится в базе. null — убрать аватар.
function update_avatar($userId, $data)
{
    $avatar = $data['avatar'] ?? null;
    if ($avatar !== null) {
        if (!is_string($avatar) || strlen($avatar) > 500000) {
            invalid('avatar', 'Картинка слишком большая. Выберите другое фото.');
        }
        if (!preg_match('#^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$#', $avatar)) {
            invalid('avatar', 'Подходят только фото JPG, PNG или WebP.');
        }
    }
    query('UPDATE users SET avatar = ? WHERE id = ?', [$avatar, $userId]);
}
