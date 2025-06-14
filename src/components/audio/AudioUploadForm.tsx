import React, { useState, useRef, useEffect } from 'react';
import { supabase, AUDIO_BUCKET } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Upload, X, Music, Tag, Play, Pause } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface AudioUploadFormProps {
  onClose: () => void;
  onUploadSuccess: () => void;
}

const AudioUploadForm: React.FC<AudioUploadFormProps> = ({ onClose, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { user } = useAuthStore();

  // Check if bucket exists on component mount
  useEffect(() => {
    const checkBucket = async () => {
      try {
        const { data: buckets, error: bucketsError } = await supabase
          .storage
          .listBuckets();

        if (bucketsError) throw bucketsError;

        const bucketExists = buckets.some(bucket => bucket.name === AUDIO_BUCKET);
        
        if (!bucketExists) {
          setError('Audio storage is not properly configured. Please contact support.');
          return;
        }
      } catch (error: any) {
        console.error('Error checking bucket:', error);
        setError('Failed to initialize audio storage. Please try again later.');
      }
    };

    checkBucket();
  }, []);

  // Audio event listeners
  useEffect(() => {
    if (audioRef.current && audioPreview) {
      const audio = audioRef.current;
      
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [audioPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setError('Please select an audio file (MP3, WAV, or OGG)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
      const objectUrl = URL.createObjectURL(file);
      setAudioPreview(objectUrl);
      
      // Auto-fill title from filename
      if (!title) {
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setTitle(fileName);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setError('Please select an audio file (MP3, WAV, or OGG)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
      const objectUrl = URL.createObjectURL(file);
      setAudioPreview(objectUrl);
      
      // Auto-fill title from filename
      if (!title) {
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setTitle(fileName);
      }
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview);
      setAudioPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const togglePlay = () => {
    if (audioRef.current && audioPreview) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !user) return;

    try {
      setLoading(true);
      setError(null);

      // Create a unique file path with user ID
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload audio file to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(AUDIO_BUCKET)
        .getPublicUrl(fileName);

      // Create audio track record in the database
      const { error: dbError } = await supabase
        .from('audio_tracks')
        .insert({
          user_id: user.id,
          title,
          audio_url: publicUrl,
          genre,
          tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        });

      if (dbError) throw dbError;

      // Reset form and close modal
      clearSelectedFile();
      setTitle('');
      setGenre('');
      setTags('');
      onUploadSuccess();
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      setError(error.message || 'Failed to upload audio track. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {!selectedFile ? (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="text-sm text-gray-400">
              <label
                htmlFor="audio-upload"
                className="relative cursor-pointer rounded-md font-medium text-blue-500 hover:text-blue-400"
              >
                <span>Upload an audio file</span>
                <input
                  id="audio-upload"
                  name="audio-upload"
                  type="file"
                  className="sr-only"
                  accept="audio/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">MP3, WAV, or OGG up to 10MB</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Audio Preview Player */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                >
                  {isPlaying ? (
                    <Pause size={20} className="text-white" />
                  ) : (
                    <Play size={20} className="text-white ml-0.5" />
                  )}
                </button>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                    <span>{selectedFile.name}</span>
                    <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 rounded-full h-2 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                
                <button
                  type="button"
                  className="text-red-500 hover:text-red-400"
                  onClick={clearSelectedFile}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Hidden audio element */}
            <audio
              ref={audioRef}
              src={audioPreview || undefined}
              preload="metadata"
            />
            
            <div className="text-sm text-gray-400">
              <p>Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter audio track title"
          required
        />

        <Input
          label="Genre"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="Enter genre (e.g., Pop, Rock, Hip Hop)"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Tags
          </label>
          <div className="flex items-center space-x-2">
            <Tag className="h-5 w-5 text-gray-400" />
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Enter tags separated by commas"
              className="flex-1"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Separate multiple tags with commas (e.g., pop, upbeat, dance)
          </p>
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!selectedFile || loading || !title.trim() || !genre.trim()}
        className="w-full"
      >
        {loading ? 'Uploading...' : 'Upload Audio Track'}
      </Button>
    </form>
  );
};

export default AudioUploadForm;