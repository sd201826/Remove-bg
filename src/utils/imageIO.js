export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file was selected.'));
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    if (file.size > 40 * 1024 * 1024) return reject(new Error('Please choose an image smaller than 40 MB to keep browser editing responsive.'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The selected image could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function loadImage(source) {
  return new Promise((resolve, reject) => {
    if (!source) return reject(new Error('Image source is empty.'));
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The image could not be decoded.'));
    image.src = source;
  });
}
