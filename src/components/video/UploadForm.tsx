import React, { useState, useRef, useEffect } from 'react';
import { useVideoStore } from '../../store/videoStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, X, PlayCircle, Music, Volume2, VolumeX } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import AudioTrackSelector from '../audio/AudioTrackSelector';
import AudioUploadForm from '../audio/AudioUploadForm';
import type { AudioTrack } from '../../lib/supabase';
import { motion } from 'framer-motion';

const UploadForm: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<AudioTrack | null>(null);
  const [showAudioSelector, setShowAudioSelector] = useState(false);
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadVideo, isUploading, uploadProgress, uploadError, error } = useVideoStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we came from a video with selected audio
  useEffect(() => {
    if (location.state?.selectedAudioTrack) {
      setSelectedAudioTrack(location.state.selectedAudioTrack);
      setShowAudioSelector(false);
    }
  }, [location.state]);
  
  const captureThumbnail = async (video: HTMLVideoElement): Promise<string> => {
    return new Promise((resolve) => {
      // Asegurar que se capture a los 3 segundos
      video.currentTime = 3;
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(thumbnailUrl);
        } else {
          resolve('');
        }
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      try {
        setIsProcessing(true);

        // Validar tamaño
        if (file.size > 100 * 1024 * 1024) {
          throw new Error('El archivo es demasiado grande. Máximo 100MB');
        }

        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            if (video.duration > 600) {
              reject(new Error('El video es demasiado largo. Máximo 10 minutos'));
            }
            resolve(null);
          };
          video.onerror = () => reject(new Error('Error al cargar el video'));
        });

        // Capturar miniatura
        const thumbnail = await captureThumbnail(video);
        setThumbnailUrl(thumbnail);

      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setVideoPreview(objectUrl);
      
        // Auto-fill title
      if (!title) {
          const fileName = file.name.replace(/\.[^/.]+$/, "");
        setTitle(fileName);
        }

        URL.revokeObjectURL(video.src);
      } catch (error) {
        console.error('Error procesando el video:', error);
        alert(error instanceof Error ? error.message : 'Error al procesar el video');
      } finally {
        setIsProcessing(false);
      }
    }
  };
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const event = {
        target: {
          files: [file]
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      await handleFileChange(event);
    }
  };
  
  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    if (thumbnailUrl) {
      setThumbnailUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !title.trim()) {
      alert('Por favor, selecciona un video y agrega un título');
      return;
    }
    
    try {
      setIsProcessing(true);
    
      const options = {
        audioTrackId: selectedAudioTrack?.id,
        audioVolume
      };
    
      // Subir el video
      await uploadVideo(selectedFile, title, description, options);
      
      // Esperar a que se complete el procesamiento
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Limpiar el estado
      setSelectedFile(null);
      setVideoPreview(null);
      setTitle('');
      setDescription('');
      setSelectedAudioTrack(null);
      setAudioVolume(0.5);
      setIsAudioMuted(false);
      
      // Redirigir al feed
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error al subir el video:', err);
      alert('Error al subir el video. Por favor, intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Manejar cambios de volumen del audio
  const handleAudioVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    setAudioVolume(volume);
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    setIsAudioMuted(volume === 0);
  };

  // Alternar mute del audio
  const toggleAudioMute = () => {
    if (audioRef.current) {
      const newMuted = !isAudioMuted;
      setIsAudioMuted(newMuted);
      if (newMuted) {
        audioRef.current.volume = 0;
        setAudioVolume(0);
      } else {
        audioRef.current.volume = 0.5;
        setAudioVolume(0.5);
      }
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Upload a video</h1>
      
      {/* Show audio track info if coming from another video */}
      {location.state?.selectedAudioTrack && (
        <div className="mb-6 p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
              <Music size={20} className="text-white" />
            </div>
            <div>
              <p className="font-medium">Using audio: {selectedAudioTrack?.title}</p>
              <p className="text-sm text-gray-400">by @{selectedAudioTrack?.user_profile?.username}</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50 bg-opacity-10' : 'border-gray-700'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg mb-1">Drag and drop your video here</p>
            <p className="text-sm text-gray-500 mb-4">
              Or click to select a file
            </p>
            <Button type="button" variant="outline" size="sm">
              Select Video
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoPreview || undefined}
                className="w-full h-64 object-contain"
                controls
              />
              <button
                type="button"
                onClick={clearSelectedFile}
                className="absolute top-2 right-2 bg-black bg-opacity-70 rounded-full p-1 text-white hover:bg-opacity-90 transition-opacity"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
        
        <Input
          label="Title"
          placeholder="Add a title for your video"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          required
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description
          </label>
          <textarea
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Describe your video (optional)"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Audio Track Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-300">
              Audio Track {selectedAudioTrack ? '✓' : '(Optional)'}
            </label>
            {!location.state?.selectedAudioTrack && (
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAudioUpload(true)}
                >
                  <Music size={16} className="mr-1" />
                  Upload Audio
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAudioSelector(!showAudioSelector)}
                >
                  <Music size={16} className="mr-1" />
                  {showAudioSelector ? 'Hide' : 'Select'} Audio
                </Button>
              </div>
            )}
          </div>

          {showAudioSelector && !location.state?.selectedAudioTrack && (
            <div className="bg-gray-800 rounded-lg p-4">
              <AudioTrackSelector
                onSelect={(track) => {
                  setSelectedAudioTrack(track);
                  if (track) {
                    setShowAudioSelector(false);
                  }
                }}
                selectedAudioTrack={selectedAudioTrack}
              />
            </div>
          )}

          {selectedAudioTrack && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
                    <Music size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium">{selectedAudioTrack.title}</h4>
                    <p className="text-sm text-gray-400">{selectedAudioTrack.genre}</p>
                    {selectedAudioTrack.user_profile && (
                      <p className="text-xs text-gray-500">by @{selectedAudioTrack.user_profile.username}</p>
                    )}
                  </div>
                </div>
                
                {/* Controles de volumen del audio */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={toggleAudioMute}
                    className="text-white hover:text-gray-300"
                  >
                    {isAudioMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={audioVolume}
                    onChange={handleAudioVolumeChange}
                    className="w-24 accent-purple-500"
                  />
                  <span className="text-white text-sm">Audio</span>
                </div>

                {!location.state?.selectedAudioTrack && (
                  <button
                    type="button"
                    onClick={() => setSelectedAudioTrack(null)}
                    className="text-gray-400 hover:text-white ml-4"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              
              {/* Audio element oculto */}
              <audio
                ref={audioRef}
                src={selectedAudioTrack.audio_url}
                preload="metadata"
                onVolumeChange={(e) => setAudioVolume(e.currentTarget.volume)}
              />
            </div>
          )}
        </div>
        
        {/* Barra de progreso */}
        {isUploading && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Subiendo video</h3>
                <span className="text-blue-400 font-medium">{uploadProgress}%</span>
              </div>
              
              {/* Barra de progreso */}
              <div className="relative w-full h-3 bg-gray-800 rounded-full overflow-hidden mb-6">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              </div>

              {/* Mensaje de estado */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <div className={`w-2 h-2 rounded-full ${uploadProgress >= 10 ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span>Preparando archivo</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <div className={`w-2 h-2 rounded-full ${uploadProgress >= 30 ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span>Procesando audio</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <div className={`w-2 h-2 rounded-full ${uploadProgress >= 60 ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span>Subiendo video</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <div className={`w-2 h-2 rounded-full ${uploadProgress >= 70 ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span>Generando thumbnail</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <div className={`w-2 h-2 rounded-full ${uploadProgress >= 90 ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span>Finalizando</span>
                </div>
              </div>

              {/* Error si existe */}
              {uploadError && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg"
                >
                  <p className="font-medium">Error al subir el video</p>
                  <p className="text-sm mt-1">{uploadError}</p>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isProcessing}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!selectedFile || !title.trim() || isProcessing}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              !selectedFile || !title.trim() || isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Subiendo video...</span>
              </div>
            ) : (
              'Subir Video'
            )}
          </button>
        </div>

        {/* Mensaje de error general */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </form>

      {/* Audio Upload Modal */}
      {showAudioUpload && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
                  onClick={() => setShowAudioUpload(false)}
                >
          <div onClick={e => e.stopPropagation()}>
            <AudioUploadForm 
              onClose={() => setShowAudioUpload(false)}
              onUploadSuccess={() => {
                setShowAudioUpload(false);
              }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default UploadForm;