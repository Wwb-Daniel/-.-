import React from 'react';
import { Music } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AudioTrack } from '../../lib/supabase';

interface AudioDiscPlayerProps {
  audioTrack: AudioTrack | null;
  isVideoPlaying: boolean;
  onDiscClick?: (event: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
}

const AudioDiscPlayer: React.FC<AudioDiscPlayerProps> = ({ 
  audioTrack, 
  isVideoPlaying,
  onDiscClick,
  size = 'md'
}) => {
  if (!audioTrack) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const innerSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  };

  const iconSizeClasses = {
    sm: 8,
    md: 12,
    lg: 16
  };

  const imageUrl = audioTrack.user_profile?.avatar_url || audioTrack.cover_image_url || audioTrack.thumbnail_url;

  return (
    <div className="relative">
      <motion.div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center cursor-pointer shadow-lg`}
        animate={{ 
          rotate: isVideoPlaying ? 360 : 0 
        }}
        transition={{ 
          duration: 3,
          repeat: isVideoPlaying ? Infinity : 0,
          ease: "linear"
        }}
        onClick={onDiscClick}
        whileTap={{ scale: 0.95 }}
      >
        <div className={`${innerSizeClasses[size]} rounded-full bg-black flex items-center justify-center`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={audioTrack.title || 'Audio cover'}
              className={`${innerSizeClasses[size]} rounded-full object-cover`}
            />
          ) : (
            <Music size={iconSizeClasses[size]} className="text-white" />
          )}
        </div>
      </motion.div>
      
      {/* Small dot in the center */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"></div>
    </div>
  );
};

export default AudioDiscPlayer;