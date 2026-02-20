// eslint-disable-next-line @typescript-eslint/no-explicit-any
const spectrumCache = new Map<string, any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setSpectrumCache(filePath: string, spectrumData: any): void {
  spectrumCache.set(filePath, spectrumData);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSpectrumCache(filePath: string): any | null {
  return spectrumCache.get(filePath) || null;
}
export function clearSpectrumCache(filePath?: string): void {
  if (filePath) {
    spectrumCache.delete(filePath);
  } else {
    spectrumCache.clear();
  }
}
