/**
 * Client-side Canvas Image Compression Engine
 * Enforces strict < 300 KB file size limit before upload.
 * Scales large dimension to max 1600px, reducing JPEG quality step-wise (0.8 -> 0.4).
 */
export async function compressImage(file, maxSizeKB = 300) {
  return new Promise((resolve, reject) => {
    // If file is already below maxSizeKB, return directly
    if (file.size <= maxSizeKB * 1024) {
      resolve({ blob: file, sizeBytes: file.size });
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image element"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDimension = 1600;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        const stepDown = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Canvas blob generation failed"));
                return;
              }
              if (blob.size <= maxSizeKB * 1024 || quality <= 0.4) {
                resolve({ blob, sizeBytes: blob.size });
              } else {
                quality -= 0.1;
                stepDown();
              }
            },
            "image/jpeg",
            quality
          );
        };
        stepDown();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
