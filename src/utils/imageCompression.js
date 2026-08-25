import imageCompression from 'browser-image-compression'

/**
 * Compresses a photo before it ever touches Supabase Storage.
 *
 * The goal isn't image quality — it's confirming "this device is off" —
 * so we compress aggressively. At these settings a typical phone photo
 * (3-8 MB) becomes roughly 60-150 KB, which keeps the whole project
 * comfortably inside Supabase's free-tier 1 GB storage bucket even with
 * many students, many devices, and weeks of retention.
 *
 * Tune maxSizeMB / maxWidthOrHeight here if photos need to be clearer
 * (e.g. small status LEDs that are hard to read once compressed).
 */
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.2, // ~200 KB hard ceiling
  maxWidthOrHeight: 1000,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.7
}

export async function compressPhoto(file) {
  try {
    return await imageCompression(file, COMPRESSION_OPTIONS)
  } catch (err) {
    console.error('Image compression failed, uploading original file instead.', err)
    return file
  }
}
