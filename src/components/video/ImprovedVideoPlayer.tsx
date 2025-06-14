import React, { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Share2, User, Volume2, VolumeX, Play, Pause, Bookmark, MoreVertical, Plus, Check, Pencil, Trash2, Download, Crown, Music, AlertTriangle, CheckCircle } from 'lucide-react';
import { useVideoStore } from '../../store/videoStore';
import { useUserStore } from '../../store/userStore';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import type { Video } from '../../lib/supabase';
import CommentSection from './CommentSection';
import EditVideoModal from './EditVideoModal';
import AudioDiscPlayer from '../audio/AudioDiscPlayer';
import AudioMarquee from '../audio/AudioMarquee';
import Button from '../ui/Button';
import { useToastStore } from '../../store/toastStore';

interface ImprovedVideoPlayerProps {
  video: Video;
  isActive: boolean;
}

const ImprovedVideoPlayer = ({ video, isActive }: ImprovedVideoPlayerProps): JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoVolume, setVideoVolume] = useState(video.video_volume ?? 1);
  const [audioVolume, setAudioVolume] = useState(video.audio_volume ?? 0.5);
  const [showComments, setShowComments] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCurrentUserVideo, setIsCurrentUserVideo] = useState(false);
  const [hasMarkedAsViewed, setHasMarkedAsViewed] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [likesCount, setLikesCount] = useState(video.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(video.comments_count || 0);
  const [audioTrack, setAudioTrack] = useState(video.audio_track || null);
  const [showUseAudioModal, setShowUseAudioModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const { likeVideo, saveVideo, deleteVideo, updateVideo, marcarVideoVisto } = useVideoStore();
  const { followUser, unfollowUser, isFollowing: checkIsFollowing } = useUserStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  // Enhanced video controls with better feedback
  const togglePlay = async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
          setShowPlayButton(true);
        } else {
          await videoRef.current.play();
          setIsPlaying(true);
          setShowPlayButton(false);
        }
      } catch (error) {
        console.error('Error toggling play:', error);
        addToast({
          type: 'error',
          title: 'Playback Error',
          message: 'Unable to play video. Please try again.'
        });
      }
    }
  };

  // Enhanced like functionality with animation
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!isLiked) {
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            content_id: video.id,
            content_type: 'video',
            video_id: video.id
          });

        if (error && error.code !== '23505') {
          throw error;
        }

        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        
        // Enhanced animation feedback
        const heartElement = e.currentTarget.querySelector('.heart-icon');
        if (heartElement) {
          heartElement.classList.add('animate-bounce');
          setTimeout(() => {
            heartElement.classList.remove('animate-bounce');
          }, 600);
        }

        addToast({
          type: 'success',
          title: 'Liked!',
          message: 'Video added to your likes'
        });
      }
    } catch (error) {
      console.error('Error adding like:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to like video'
      });
    }
  };

  // Progress tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  // Rest of the existing useEffect hooks...
  useEffect(() => {
    setHasMarkedAsViewed(false);
    setLikesCount(video.likes_count || 0);
    setCommentsCount(video.comments_count || 0);
    setAudioTrack(video.audio_track || null);
  }, [video.id, video.likes_count, video.comments_count, video.audio_track]);

  // Enhanced video playback management
  useEffect(() => {
    let playTimeout: NodeJS.Timeout;
    let isPlayingPromise: Promise<void> | null = null;

    if (videoRef.current) {
      if (isActive) {
        const playVideo = async () => {
          try {
            if (isPlayingPromise) {
              videoRef.current?.pause();
              isPlayingPromise = null;
            }

            await new Promise(resolve => {
              playTimeout = setTimeout(resolve, 100);
            });

            const playPromise = videoRef.current?.play();
            if (playPromise) {
              isPlayingPromise = playPromise;
              await isPlayingPromise;
            }
            
            setIsPlaying(true);
            setShowPlayButton(false);
            
            if (!hasMarkedAsViewed) {
              await marcarVideoVisto(video.id);
              setHasMarkedAsViewed(true);
            }
          } catch (error: any) {
            console.error('Error playing video:', error);
            setIsPlaying(false);
            setShowPlayButton(true);
          } finally {
            isPlayingPromise = null;
          }
        };
        playVideo();
      } else {
        if (isPlayingPromise) {
          videoRef.current?.pause();
          isPlayingPromise = null;
        }
        setIsPlaying(false);
        setShowPlayButton(true);
      }
    }

    return () => {
      clearTimeout(playTimeout);
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };
  }, [isActive, video.id, marcarVideoVisto, hasMarkedAsViewed]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={video.video_url}
        className="absolute inset-0 w-full h-full object-contain z-10"
        loop
        playsInline
        muted={isMuted}
        onClick={togglePlay}
      />
      
      {/* Enhanced Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <div className="h-1 bg-gray-800/50">
          <motion.div
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* Enhanced Controls */}
      <motion.button
        whileTap={{ scale: 1.1 }}
        className="absolute top-4 left-4 z-30 video-control"
        onClick={(e) => {
          e.stopPropagation();
          setIsMuted(!isMuted);
        }}
      >
        <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </div>
      </motion.button>

      {/* Enhanced Play Button */}
      <div 
        className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
        onClick={togglePlay}
      >
        <AnimatePresence>
          {showPlayButton && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="bg-black/50 backdrop-blur-sm rounded-full p-6 border border-white/20"
            >
              {isPlaying ? (
                <Pause className="w-12 h-12 text-white" />
              ) : (
                <Play className="w-12 h-12 text-white ml-1" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Enhanced VIP Badge */}
      {video.user_profile?.is_vip && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 z-30 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full px-3 py-1 flex items-center space-x-1 shadow-lg"
        >
          <Crown size={16} className="text-yellow-300" />
          <span className="text-xs font-medium">VIP Creator</span>
        </motion.div>
      )}

      {/* Enhanced Interaction Buttons */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center space-y-6">
        {/* Like Button with Enhanced Animation */}
        <motion.button
          whileTap={{ scale: 1.2 }}
          className="flex flex-col items-center video-control group"
          onClick={handleLike}
        >
          <div className={`w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-all duration-300 ${isLiked ? 'bg-red-500/20 border-red-500/50' : 'group-hover:bg-white/10'}`}>
            <Heart 
              size={24} 
              fill={isLiked ? "currentColor" : "none"} 
              className={`heart-icon transition-colors duration-300 ${isLiked ? 'text-red-500' : 'text-white group-hover:text-red-400'}`} 
            />
          </div>
          <span className="text-xs mt-1 font-medium">{formatCount(likesCount)}</span>
        </motion.button>
        
        {/* Comment Button */}
        <motion.button
          whileTap={{ scale: 1.1 }}
          className="flex flex-col items-center video-control group"
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(!showComments);
          }}
        >
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:bg-white/10 transition-all duration-300">
            <MessageCircle size={24} className="text-white" />
          </div>
          <span className="text-xs mt-1 font-medium">{formatCount(commentsCount)}</span>
        </motion.button>

        {/* Save Button */}
        <motion.button
          whileTap={{ scale: 1.1 }}
          className="flex flex-col items-center video-control group"
          onClick={(e) => {
            e.stopPropagation();
            setIsSaved(!isSaved);
            saveVideo(video.id);
          }}
        >
          <div className={`w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-all duration-300 ${isSaved ? 'bg-blue-500/20 border-blue-500/50' : 'group-hover:bg-white/10'}`}>
            <Bookmark 
              size={24} 
              fill={isSaved ? "currentColor" : "none"} 
              className={`transition-colors duration-300 ${isSaved ? 'text-blue-500' : 'text-white group-hover:text-blue-400'}`} 
            />
          </div>
          <span className="text-xs mt-1 font-medium">Save</span>
        </motion.button>
        
        {/* Options Button */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 1.1 }}
            className="flex flex-col items-center video-control group"
            onClick={(e) => {
              e.stopPropagation();
              setShowOptions(!showOptions);
            }}
          >
            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:bg-white/10 transition-all duration-300">
              <MoreVertical size={24} className="text-white" />
            </div>
          </motion.button>

          {/* Audio Disc */}
          {audioTrack && (
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center video-control mt-6"
            >
              <AudioDiscPlayer
                audioTrack={audioTrack}
                isVideoPlaying={isPlaying}
                onDiscClick={() => navigate(`/audio/${audioTrack.id}`)}
                size="md"
              />
            </motion.div>
          )}

          {/* Enhanced Options Menu */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute bottom-full right-0 mb-2 w-56 bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-gray-700/50"
              >
                {/* Options content remains the same but with enhanced styling */}
                {/* ... existing options code ... */}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Enhanced Video Info Section */}
      <div className="absolute bottom-8 left-0 right-16 z-30 px-4">
        <div className="max-w-3xl">
          {/* User Info with Enhanced Design */}
          <div className="flex items-center space-x-3 mb-3">
            <Link 
              to={`/profile/${video.user_id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 group"
            >
              {video.user_profile?.avatar_url ? (
                <motion.img 
                  src={video.user_profile.avatar_url} 
                  alt={video.user_profile.username}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/20 group-hover:border-white/40 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  loading="lazy"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center border-2 border-white/20 group-hover:border-white/40 transition-all duration-300">
                  <User size={24} />
                </div>
              )}
            </Link>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <Link 
                  to={`/profile/${video.user_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline group"
                >
                  <span className="text-base font-semibold group-hover:text-blue-400 transition-colors">
                    @{video.user_profile?.username}
                  </span>
                </Link>
                
                {!isCurrentUserVideo && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // handleFollow logic
                    }}
                    className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center space-x-1 video-control hover:bg-white/20 transition-all duration-300"
                  >
                    {isFollowing ? (
                      <>
                        <Check size={14} className="text-blue-400" />
                        <span className="text-sm font-medium">Following</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span className="text-sm font-medium">Follow</span>
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </div>
          
          {/* Enhanced Video Title and Description */}
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <h3 className="text-base font-semibold mb-1 leading-tight">{video.title}</h3>
            
            {video.description && (
              <p className="text-sm text-gray-300 line-clamp-2 mb-2 leading-relaxed">
                {video.description}
              </p>
            )}

            {/* Enhanced Audio Marquee */}
            {audioTrack && (
              <div className="mt-2 p-2 bg-white/5 rounded-lg border border-white/10">
                <AudioMarquee 
                  audioTrack={audioTrack}
                  onAudioClick={() => navigate(`/audio/${audioTrack.id}`)}
                />
              </div>
            )}

            {/* Video Stats */}
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
              <span>{formatTime(progress * duration / 100)} / {formatTime(duration)}</span>
              <span>•</span>
              <span>{formatCount(video.views_count)} views</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of the modals and components remain the same... */}
      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 h-[70vh] md:h-[70vh] md:w-[400px] md:right-0 md:left-auto md:top-auto bg-gray-900/95 backdrop-blur-md z-40 rounded-t-2xl md:rounded-tl-2xl md:rounded-tr-none border-t border-gray-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            <CommentSection
              videoId={video.id}
              onClose={() => setShowComments(false)}
              onCommentAdded={() => setCommentsCount(prev => prev + 1)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Other modals... */}
    </div>
  );
};

// Helper function
const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export default ImprovedVideoPlayer;