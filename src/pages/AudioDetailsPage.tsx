import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, User, Video as VideoIcon, Music, Heart, Eye, Pause } from 'lucide-react';
import { supabase, getAudioTrackUsageCount, getVideosByAudioTrack } from '../lib/supabase';
import type { AudioTrack, Video } from '../lib/supabase';
import Button from '../components/ui/Button';
import VideoViewer from '../components/video/VideoViewer';
import AudioDiscPlayer from '../components/audio/AudioDiscPlayer';
import { AnimatePresence } from 'framer-motion';

const AudioDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [usageCount, setUsageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (id) {
      fetchAudioDetails();
    }
  }, [id]);

  useEffect(() => {
    if (audioTrack) {
      audioRef.current = new Audio(audioTrack.audio_url);
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
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [audioTrack]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatDuration = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const fetchAudioDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch audio track details
      const { data: audioData, error: audioError } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          user_profile:profiles!user_id(id, username, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (audioError) throw audioError;
      if (!audioData) throw new Error('Audio track not found');

      setAudioTrack(audioData);

      // Fetch usage count and videos
      const [count, videosData] = await Promise.all([
        getAudioTrackUsageCount(id),
        getVideosByAudioTrack(id, 20, 0)
      ]);

      setUsageCount(count);
      setVideos(videosData);
    } catch (error: any) {
      console.error('Error fetching audio details:', error);
      setError(error.message || 'Failed to load audio details');
    } finally {
      setLoading(false);
    }
  };

  const handleUseAudio = () => {
    navigate('/upload', { 
      state: { 
        selectedAudioTrack: audioTrack,
        fromAudioDetails: true 
      } 
    });
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
      </div>
    );
  }

  if (error || !audioTrack) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
        <Music size={64} className="text-gray-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">{error || 'Audio track not found'}</h2>
        <p className="text-gray-500 mb-6">The audio track you're looking for doesn't exist or is unavailable.</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black bg-opacity-90 backdrop-blur-sm z-40 p-4 border-b border-gray-800">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-semibold">Audio Details</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Audio Info Section */}
        <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-4">
            {/* Audio Disc */}
            <div className="flex-shrink-0">
              <div onClick={togglePlay} className="cursor-pointer">
                <AudioDiscPlayer
                  audioTrack={audioTrack}
                  isVideoPlaying={isPlaying}
                  size="lg"
                />
                <div className="mt-2 text-center">
                  <span className="text-sm text-gray-400">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                </div>
              </div>
            </div>

            {/* Audio Details */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold mb-2">{audioTrack.title}</h2>
              
              {audioTrack.user_profile && (
                <div className="flex items-center space-x-2 mb-3">
                  {audioTrack.user_profile.avatar_url ? (
                    <img
                      src={audioTrack.user_profile.avatar_url}
                      alt={audioTrack.user_profile.username}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                      <User size={12} />
                    </div>
                  )}
                  <Link
                    to={`/profile/${audioTrack.user_id}`}
                    className="text-sm text-gray-300 hover:text-white hover:underline"
                  >
                    @{audioTrack.user_profile.username}
                  </Link>
                </div>
              )}

              {audioTrack.genre && (
                <div className="mb-3">
                  <span className="inline-block bg-gray-800 px-3 py-1 rounded-full text-sm">
                    {audioTrack.genre}
                  </span>
                </div>
              )}

              {audioTrack.tags && audioTrack.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {audioTrack.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs bg-gray-700 px-2 py-1 rounded-full text-gray-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Usage Stats */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  <VideoIcon size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-300">
                    {usageCount === 0 ? 'No videos yet' : `Used in ${formatCount(usageCount)} video${usageCount !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>

              {/* Use Audio Button */}
              <Button
                onClick={handleUseAudio}
                className="w-full sm:w-auto"
              >
                <VideoIcon size={18} className="mr-2" />
                Use this audio
              </Button>
            </div>
          </div>
        </div>

        {/* Videos Section */}
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4">
            {usageCount === 0 ? 'Be the first to use this audio' : `Videos using this audio (${usageCount})`}
          </h3>

          {videos.length === 0 ? (
            <div className="text-center py-12">
              <VideoIcon size={48} className="mx-auto text-gray-600 mb-4" />
              <h4 className="text-lg font-medium mb-2">No videos yet</h4>
              <p className="text-gray-500 mb-6">
                Be the first to create a video with this audio!
              </p>
              <Button onClick={handleUseAudio}>
                <VideoIcon size={18} className="mr-2" />
                Create Video
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className="aspect-[9/16] relative bg-gray-900 overflow-hidden rounded-lg group"
                >
                  <video
                    src={video.video_url}
                    className="absolute inset-0 w-full h-full object-cover"
                    muted
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <h4 className="text-sm font-medium truncate mb-1">{video.title}</h4>
                      <p className="text-xs text-gray-300">@{video.user_profile?.username}</p>
                      <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Eye size={10} />
                          <span>{formatCount(video.views_count)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart size={10} />
                          <span>{formatCount(video.likes_count)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video Viewer Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoViewer
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AudioDetailsPage;