import React from 'react';
import type { Video } from '../lib/supabase';

interface VideoCardProps {
  video: Video;
  className?: string;
}

export function VideoCard({ video, className }: VideoCardProps) {
  return (
    <div className={`relative aspect-[9/16] rounded-lg overflow-hidden ${className}`}>
      <video
        src={video.video_url}
        className="w-full h-full object-cover"
        controls
        playsInline
      />
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <h3 className="text-white font-medium">{video.title}</h3>
        {video.description && (
          <p className="text-white/80 text-sm mt-1">{video.description}</p>
        )}
      </div>
    </div>
  );
}