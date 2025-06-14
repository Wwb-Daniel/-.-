export const generateThumbnail = async (videoFile: File): Promise<Blob> => {
  return new Promise<Blob>(async (resolve, reject) => {
      const video = document.createElement('video');
    const videoUrl = URL.createObjectURL(videoFile);
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.crossOrigin = 'anonymous';
    let attempts = 0;
      const MAX_ATTEMPTS = 3;

    // Esperar a que el video esté listo
    const waitForVideoLoad = () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout después de 60 segundos'));
        }, 60000); // Aumentado a 60 segundos

        video.onloadeddata = () => {
          console.log('generateThumbnail: Video cargado completamente', {
              width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState
            });
          clearTimeout(timeout);
          resolve();
        };

        video.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });
    };

    try {
      await waitForVideoLoad();

      // Configurar eventos del video
      video.onseeked = () => {
        console.log('generateThumbnail: Video seek completado, intentando capturar frame');
        tryCapture();
      };

      // Intentar capturar el frame
      const tryCapture = () => {
        if (attempts >= MAX_ATTEMPTS) {
          reject(new Error('No se pudo capturar el frame después de varios intentos'));
          return;
        }

        attempts++;
        console.log(`generateThumbnail: Intento de captura ${attempts}/${MAX_ATTEMPTS}`);

        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('No se pudo obtener el contexto del canvas');
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
              if (blob) {
                console.log('generateThumbnail: Thumbnail generado exitosamente', {
                  width: canvas.width,
                  height: canvas.height,
                  size: blob.size
                });
                resolve(blob);
              } else {
              reject(new Error('Error al generar el blob del thumbnail'));
              }
          }, 'image/jpeg', 0.8);
        } catch (error) {
          console.error('generateThumbnail: Error al capturar frame:', error);
          if (attempts < MAX_ATTEMPTS) {
            setTimeout(tryCapture, 1000);
        } else {
            reject(error);
          }
        }
      };

      // Intentar capturar el frame
          tryCapture();
    } catch (error) {
        console.error('generateThumbnail: Error al cargar el video:', error);
      reject(error);
    } finally {
      // Limpiar recursos
        URL.revokeObjectURL(videoUrl);
        video.remove();
    }
  });
}; 