import { AudioTrack } from './supabase';

export async function processVideoAudio(
  videoBlob: Blob,
  audioTrack: AudioTrack | null,
  videoVolume: number,
  audioVolume: number,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  console.log('processVideoAudio: Iniciando procesamiento', {
    videoSize: videoBlob.size,
    hasAudioTrack: !!audioTrack,
    videoVolume,
    audioVolume
  });

  let videoElement: HTMLVideoElement | null = null;
  let audioContext: AudioContext | null = null;

  try {
    // Crear elemento de video para obtener la duración
    videoElement = document.createElement('video');
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.style.display = 'none';

    const videoDuration = await new Promise<number>((resolve, reject) => {
      videoElement!.onloadedmetadata = () => resolve(videoElement!.duration);
      videoElement!.onerror = (e) => reject(new Error('Error cargando video: ' + e));
      videoElement!.src = URL.createObjectURL(videoBlob);
    });

    // Crear contexto de audio y procesar
    audioContext = new AudioContext();
    const videoArrayBuffer = await videoBlob.arrayBuffer();
    const videoAudioBuffer = await audioContext.decodeAudioData(videoArrayBuffer);

    // Crear el buffer de salida basado en el audio del video
    const outputBuffer = audioContext.createBuffer(
      videoAudioBuffer.numberOfChannels,
      videoAudioBuffer.length,
      videoAudioBuffer.sampleRate
    );

    // 1. Primero procesamos el audio del video
    console.log('processVideoAudio: Procesando audio del video', {
      videoVolume,
      videoDuration
    });

    // Copiar el audio del video con su volumen
    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      const outputData = outputBuffer.getChannelData(channel);
      const videoData = videoAudioBuffer.getChannelData(channel);
      
      for (let i = 0; i < videoAudioBuffer.length; i++) {
        // Asegurarnos de que el volumen del video se aplique correctamente
        const normalizedVideoVolume = Math.max(0, Math.min(1, videoVolume));
        outputData[i] = videoData[i] * normalizedVideoVolume;
      }
    }

    // 2. Luego procesamos el audio track si existe y tiene volumen
    if (audioTrack && audioVolume > 0) {
      console.log('processVideoAudio: Añadiendo audio track', {
        audioVolume,
        hasAudioTrack: true
      });

      try {
        const audioResponse = await fetch(audioTrack.audio_url);
        const audioTrackArrayBuffer = await audioResponse.arrayBuffer();
        const audioTrackBuffer = await audioContext.decodeAudioData(audioTrackArrayBuffer);
        
        // Asegurarnos de que el audio track no sea más largo que el video
        const audioLength = Math.min(audioTrackBuffer.length, videoAudioBuffer.length);
        
        // Normalizar el volumen del audio track
        const normalizedAudioVolume = Math.max(0, Math.min(1, audioVolume)) * 0.8;

        // Mezclar el audio track con el audio del video
        for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
          const outputData = outputBuffer.getChannelData(channel);
          const audioData = audioTrackBuffer.getChannelData(channel % audioTrackBuffer.numberOfChannels);
          
          for (let i = 0; i < audioLength; i++) {
            // Mezclar los dos audios, asegurando que no haya clipping
            const mixed = outputData[i] + (audioData[i] * normalizedAudioVolume);
            outputData[i] = Math.max(-1, Math.min(1, mixed));
          }
        }
      } catch (error) {
        console.error('processVideoAudio: Error procesando audio track:', error);
        // Continuamos con el audio del video si hay error con el audio track
      }
    } else {
      console.log('processVideoAudio: Sin audio track o volumen en 0', {
        hasAudioTrack: !!audioTrack,
        audioVolume
      });
    }

    // Verificar que el audio del video no se haya perdido
    let hasAudio = false;
    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      const outputData = outputBuffer.getChannelData(channel);
      for (let i = 0; i < outputData.length; i++) {
        if (Math.abs(outputData[i]) > 0.001) {
          hasAudio = true;
          break;
        }
      }
      if (hasAudio) break;
    }

    if (!hasAudio && videoVolume > 0) {
      console.warn('processVideoAudio: No se detectó audio en el output, restaurando audio del video');
      // Restaurar el audio del video si se perdió
      for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
        const outputData = outputBuffer.getChannelData(channel);
        const videoData = videoAudioBuffer.getChannelData(channel);
        for (let i = 0; i < videoAudioBuffer.length; i++) {
          outputData[i] = videoData[i] * videoVolume;
        }
      }
    }

    // Convertir el buffer de audio procesado a WAV
    const processedAudioBlob = await audioBufferToWav(outputBuffer);
    console.log('processVideoAudio: Audio procesado creado', {
      size: processedAudioBlob.size,
      duration: videoDuration,
      videoVolume,
      audioVolume,
      hasAudio
    });

    // Procesar el video con el audio
    const videoFile = new File([videoBlob], 'video.webm', { type: 'video/webm' });
    const audioFile = new File([processedAudioBlob], 'audio.wav', { type: 'audio/wav' });
    
    const { videoBlob: processedBlob } = await combineVideoAndAudio(
      videoFile,
      audioFile,
      videoDuration,
      onProgress || ((progress: number) => {}),
      {
        videoVolume,
        audioVolume,
        isMuted: false,
        isAudioMuted: false
      }
    );

    console.log('processVideoAudio: Video final creado', {
      size: processedBlob.size,
      duration: videoDuration,
      videoVolume,
      audioVolume,
      hasAudio
    });

    return processedBlob;
  } catch (error) {
    console.error('processVideoAudio: Error durante el procesamiento:', error);
    throw error;
  } finally {
    // Limpiar recursos
    if (audioContext) audioContext.close();
    if (videoElement) {
      videoElement.pause();
      URL.revokeObjectURL(videoElement.src);
      videoElement.remove();
    }
  }
}

// Función auxiliar para convertir AudioBuffer a WAV
async function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  
  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);
  
  // Escribir el encabezado WAV
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Escribir los datos de audio
  const offset = 44;
  const channelData = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(buffer.getChannelData(i));
  }
  
  let pos = 0;
  while (pos < buffer.length) {
    for (let i = 0; i < numChannels; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i][pos]));
      const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset + pos * blockAlign + i * bytesPerSample, value, true);
    }
    pos++;
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Función auxiliar para escribir strings en el DataView
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

interface AudioOptions {
  videoVolume: number;
  audioVolume: number;
  isMuted: boolean;
  isAudioMuted: boolean;
}

export const combineVideoAndAudio = async (
  videoFile: File,
  audioFile: File,
  duration: number,
  onProgress: (progress: number) => void,
  options: AudioOptions
): Promise<{ videoBlob: Blob; thumbnailBlob: Blob }> => {
  // Aquí iría la lógica de procesamiento de audio y video
  // Por ahora retornamos los archivos originales
  return {
    videoBlob: videoFile,
    thumbnailBlob: new Blob()
  };
}; 