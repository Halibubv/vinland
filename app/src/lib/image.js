// Подготовка фото для аватара прямо в браузере: вырезаем квадрат из середины
// и уменьшаем до size × size пикселей. Фото с телефона весит несколько мегабайт,
// а после уменьшения — десятки килобайт, поэтому его можно хранить прямо в базе.

export function squarePhoto(file, size = 256) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      // Сторона квадрата — меньшая из сторон фото; отступы — чтобы квадрат был по центру.
      const side = Math.min(image.width, image.height);
      const left = (image.width - side) / 2;
      const top = (image.height - side) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas.getContext('2d').drawImage(image, left, top, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      // Результат — строка data:image/jpeg;base64,... Её и отправляем на сервер.
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось открыть фото. Выберите JPG или PNG.'));
    };
    image.src = url;
  });
}
