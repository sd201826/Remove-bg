let removerPromise;

async function getBackgroundRemover() {
  if (!removerPromise) {
    removerPromise = import('@imgly/background-removal').then((module) => {
      const remove = module.removeBackground ?? module.default;
      if (typeof remove !== 'function') throw new Error('The background-removal module did not expose removeBackground().');
      return remove;
    }).catch((error) => {
      removerPromise = null;
      throw error;
    });
  }
  return removerPromise;
}

export async function removeImageBackground(imageSource, onProgress = () => {}) {
  if (!imageSource) throw new Error('Upload a photo before removing its background.');
  onProgress({ key: 'model', percent: 2, message: 'Loading the AI background-removal engine…' });
  const removeBackground = await getBackgroundRemover();
  const result = await removeBackground(imageSource, {
    progress: (key, current, total) => {
      const ratio = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
      const isDownload = key.startsWith('fetch:');
      const percent = isDownload ? Math.max(3, Math.round(ratio * 68)) : Math.min(99, 70 + Math.round(ratio * 29));
      const label = isDownload ? 'Downloading AI model assets…' : 'Separating the subject…';
      onProgress({ key, percent, message: label });
    },
  });
  onProgress({ key: 'complete', percent: 100, message: 'Background removed.' });
  return result;
}
