// Asset yükleyici: SHEETS sözlüğündeki tüm görselleri paralel yükler.

export async function loadSheets(sheets) {
  /** @type {Map<string, HTMLImageElement>} */
  const images = new Map();
  await Promise.all(
    Object.entries(sheets).map(
      ([key, url]) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            images.set(key, img);
            resolve();
          };
          img.onerror = () => reject(new Error('Asset yüklenemedi: ' + url));
          img.src = url;
        })
    )
  );
  return images;
}
