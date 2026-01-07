export const compressToAVIF = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = async () => {
      const MAX_FILE_SIZE = 100 * 1024; // 100 KB

      // Start with larger dimensions and reduce if needed
      const dimensionSteps = [800, 600, 400, 300, 200, 150, 100];

      for (const maxSize of dimensionSteps) {
        let width = img.width;
        let height = img.height;

        // Resize maintaining aspect ratio
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // Try different quality levels for this dimension
        for (let quality = 0.9; quality >= 0.1; quality -= 0.05) {
          const blob = await new Promise<Blob | null>((res) => {
            canvas.toBlob((b) => res(b), "image/avif", quality);
          });

          if (blob && blob.size <= MAX_FILE_SIZE) {
            console.log(
              `Compressed to ${(blob.size / 1024).toFixed(2)} KB at ${width}x${height}px, quality ${quality.toFixed(2)}`,
            );
            resolve(blob);
            return;
          }
        }
      }

      // If we've tried all combinations and still can't get under 100KB
      reject(
        new Error(
          "Unable to compress image to 100 KB or less. Please try a different image.",
        ),
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};
