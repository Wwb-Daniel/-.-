import React from 'react';
import { Music } from 'lucide-react';
import type { AudioTrack } from '../../lib/supabase';

interface AudioMarqueeProps {
  audioTrack: AudioTrack | null;
  onAudioClick?: () => void;
}

const AudioMarquee: React.FC<AudioMarqueeProps> = ({ 
  audioTrack, 
  onAudioClick 
}) => {
  if (!audioTrack) {
    return null;
  }

  const audioText = audioTrack.title;
  const shouldAnimate = audioText.length > 30; // Animate if text is long

  return (
    <div 
      className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={onAudioClick}
    >
      <Music size={14} className="text-white flex-shrink-0" />
      <div className="flex-1 min-w-0 overflow-hidden">
        {shouldAnimate ? (
          <div className="relative">
            <div className="animate-marquee whitespace-nowrap text-sm text-white">
              {audioText} • {audioText} • {audioText}
            </div>
          </div>
        ) : (
          <span className="text-sm text-white truncate">
            {audioText}
          </span>
        )}
      </div>
    </div>
  );
};

export default AudioMarquee;