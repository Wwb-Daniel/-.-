import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AudioTrack } from '../../lib/supabase';

interface AudioPlayerProps {
  audioTrack: AudioTrack | null;
  isVideoPlaying: boolean;
  className?: string;
  onAudioClick?: () => void;
  showProgress?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  audioTrack, 
  isVideoPlaying,
  className = '',
  onAudioClick,
  showProgress = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && audioTrack) {
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
  }, [audioTrack]);

  // Sync audio with video playback
  useEffect(() => {
    if (audioRef.current) {
      if (isVideoPlaying && isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isVideoPlaying, isPlaying]);

  const togglePlay = () => {
    if (audioRef.current && audioTrack) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!audioTrack) {
    return null;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={audioTrack.audio_url}
        preload="metadata"
      />
      
      {/* Spinning disc */}
      <div className="relative">
        <motion.div
          className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center cursor-pointer"
          animate={{ 
            rotate: isPlaying && isVideoPlaying ? 360 : 0 
          }}
          transition={{ 
            duration: 3,
            repeat: isPlaying && isVideoPlaying ? Infinity : 0,
            ease: "linear"
          }}
          onClick={onAudioClick}
        >
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
            {audioTrack.cover_image_url || audioTrack.thumbnail_url ? (
              <img
                src={audioTrack.cover_image_url || audioTrack.thumbnail_url}
                alt={audioTrack.title}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <Music size={12} className="text-white" />
            )}
          </div>
        </motion.div>
        
        {/* Play/Pause button overlay */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity"
        >
          {isPlaying ? (
            <Pause size={16} className="text-white" />
          ) : (
            <Play size={16} className="text-white ml-0.5" />
          )}
        </button>
      </div>

      {/* Audio info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <Music size={14} className="text-white flex-shrink-0" />
          <div 
            className="text-sm text-white truncate cursor-pointer hover:underline"
            onClick={onAudioClick}
          >
            {audioTrack.title}
          </div>
        </div>
        
        {/* Progress bar - only show if showProgress is true */}
        {showProgress && (
          <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
            <div 
              className="bg-white rounded-full h-1 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        
        {/* Genre and tags */}
        <div className="flex items-center space-x-2 mt-1">
          {audioTrack.genre && (
            <span className="text-xs text-gray-400">
              {audioTrack.genre}
            </span>
          )}
          {audioTrack.tags && audioTrack.tags.length > 0 && (
            <span className="text-xs text-gray-400">
              #{audioTrack.tags.join(' #')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;