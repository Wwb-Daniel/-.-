import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserProfile, Video } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Grid, Heart, Bookmark, ArrowLeft, Eye, Music } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import EditProfileModal from '../components/profile/EditProfileModal';
import VideoViewer from '../components/video/VideoViewer';
import ProfileHeader from '../components/profile/ProfileHeader';
import { AnimatePresence } from 'framer-motion';
import { UserAudioTracks } from '../components/profile/UserAudioTracks';
import { toast } from 'react-toastify';

type TabType = 'videos' | 'likes' | 'saved' | 'audios';

const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isBlockedByCurrentUser, setIsBlockedByCurrentUser] = useState(false);

  // Obtener el tab activo de la URL o establecer 'videos' como predeterminado
  const getActiveTabFromUrl = (): TabType => {
    const tab = searchParams.get('tab') as TabType;
    if (['videos', 'likes', 'saved', 'audios'].includes(tab)) {
      return tab;
    }
    return 'videos';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getActiveTabFromUrl());
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const navigate = useNavigate();
  
  const isCurrentUser = user?.id === id;

  useEffect(() => {
    // Actualizar el parámetro de la URL cuando el tab activo cambie
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  const fetchProfileData = async () => {
    if (!id) {
      setError('Profile ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setIsBlockedByCurrentUser(false);

      // Check if current user has blocked this profile
      if (user && user.id !== id) { // Don't check if blocking self
        const { data: blockedData, error: blockedError } = await supabase
          .from('blocked_users')
          .select('id')
          .eq('user_id', user.id)
          .eq('blocked_user_id', id)
          .single();

        if (blockedError && blockedError.code !== 'PGRST116') { // PGRST116 means no rows found
          throw blockedError;
        }
        if (blockedData) {
          setIsBlockedByCurrentUser(true);
          setError('Este usuario ha sido bloqueado por ti.');
          setLoading(false);
          return;
        }
      }

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          throw new Error('Profile not found');
        }
        throw profileError;
      }

      if (!profileData) {
        throw new Error('Profile not found');
      }

      setProfile(profileData);

      // Fetch user's videos
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select(`
          *,
          user_profile:profiles(id, username, avatar_url)
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      // Update video counts
      const updatedVideos = await Promise.all((videosData || []).map(async (video) => {
        const { count: viewsCount } = await supabase
          .from('video_views')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', video.id);

        return {
          ...video,
          views_count: viewsCount || 0
        };
      }));

      setVideos(updatedVideos);

      if (isCurrentUser) {
        // Fetch liked videos
        const { data: likedVideoIds } = await supabase
          .from('likes')
          .select('content_id')
          .eq('user_id', id)
          .eq('content_type', 'video');

        const validLikedVideoIds = (likedVideoIds || [])
          .map(like => like.content_id)
          .filter(Boolean);

        if (validLikedVideoIds.length > 0) {
          const { data: likedData, error: likedError } = await supabase
            .from('videos')
            .select(`
              *,
              user_profile:profiles(id, username, avatar_url)
            `)
            .in('id', validLikedVideoIds)
            .order('created_at', { ascending: false });

          if (likedError) throw likedError;

          const updatedLikedVideos = await Promise.all((likedData || []).map(async (video) => {
            const { count: viewsCount } = await supabase
              .from('video_views')
              .select('*', { count: 'exact', head: true })
              .eq('video_id', video.id);

            return {
              ...video,
              views_count: viewsCount || 0
            };
          }));

          setLikedVideos(updatedLikedVideos);
        }

        // Fetch saved videos
        const { data: savedVideoIds } = await supabase
          .from('video_saves')
          .select('video_id')
          .eq('user_id', id);

        const validSavedVideoIds = (savedVideoIds || [])
          .map(save => save.video_id)
          .filter(Boolean);

        if (validSavedVideoIds.length > 0) {
          const { data: savedData, error: savedError } = await supabase
            .from('videos')
            .select(`
              *,
              user_profile:profiles(id, username, avatar_url)
            `)
            .in('id', validSavedVideoIds)
            .order('created_at', { ascending: false });

          if (savedError) throw savedError;

          const updatedSavedVideos = await Promise.all((savedData || []).map(async (video) => {
            const { count: viewsCount } = await supabase
              .from('video_views')
              .select('*', { count: 'exact', head: true })
              .eq('video_id', video.id);

            return {
              ...video,
              views_count: viewsCount || 0
            };
          }));

          setSavedVideos(updatedSavedVideos);
        }
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setError(error.message || 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [id, isCurrentUser, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
      </div>
    );
  }

  if (error || !profile || isBlockedByCurrentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-black">
        <Grid size={64} className="text-gray-500 mb-4" />
        <h2 className="text-xl font-bold text-white">{error || 'Profile not found'}</h2>
        <p className="text-gray-500 mb-6">{isBlockedByCurrentUser ? 'Este perfil no está disponible para ti.' : 'The profile you\'re looking for doesn\'t exist or is unavailable.'}</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Go to Home
        </Button>
      </div>
    );
  }

  const getCurrentVideos = () => {
    switch (activeTab) {
      case 'likes':
        return likedVideos;
      case 'saved':
        return savedVideos;
      default:
        return videos;
    }
  };

  const renderVideoGrid = (videos: Video[]) => {
    if (videos.length === 0) {
      return (
        <div className="py-12 text-center">
          <Grid size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium mb-1">No videos yet</h3>
          <p className="text-gray-500">
            {activeTab === 'videos' && isCurrentUser && 'Upload your first video today!'}
            {activeTab === 'videos' && !isCurrentUser && 'This user has not uploaded any videos.'}
            {activeTab === 'likes' && 'No liked videos yet.'}
            {activeTab === 'saved' && 'No saved videos yet.'}
          </p>
          {activeTab === 'videos' && isCurrentUser && (
            <Link to="/upload">
              <Button className="mt-4">Upload Video</Button>
            </Link>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-2">
        {videos.map((video) => (
          <div
            key={video.id}
            className="relative w-full aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => setSelectedVideo(video)}>
            <img
              src={video.thumbnail_url || '/placeholder.jpg'}
              alt={video.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-25 group-hover:bg-opacity-40 transition-opacity flex flex-col justify-end p-2 sm:p-3">
              <p className="text-white text-xs sm:text-sm font-medium line-clamp-2 mb-1">{video.title}</p>
              <div className="flex items-center text-gray-300 text-xs">
                  <Eye size={12} className="mr-1" />
                <span>{video.views_count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'videos':
        return renderVideoGrid(videos);
      case 'likes':
        return renderVideoGrid(likedVideos);
      case 'saved':
        return renderVideoGrid(savedVideos);
      case 'audios':
        return <UserAudioTracks userId={profile.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <Link 
            to="/"
            className="text-gray-300 hover:text-white transition-colors flex items-center"
          >
            <ArrowLeft size={20} className="mr-2" />
            Volver
          </Link>
          {profile && (
            <h1 className="text-2xl font-bold">@{profile.username}</h1>
          )}
          <div className="w-16" /> {/* Spacer for alignment */}
        </div>
        
        {profile && (
        <ProfileHeader
          profile={profile}
          onEditClick={() => setShowEditModal(true)}
        />
        )}

        {profile && !isCurrentUser && (
          <div className="flex justify-center space-x-4 mb-6">
            {/* Additional buttons like Message and Block could go here */}
          </div>
        )}

        {profile && (
          <div className="border-b border-gray-700 mb-6">
            <div className="flex">
              <div className="flex-1 text-center">
            <button
                  className={`py-2 px-4 w-full text-sm font-medium transition-colors duration-200 ${
                    activeTab === 'videos' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('videos')}
            >
                  <Grid size={20} className="inline-block mr-2" />
                  Videos
            </button>
              </div>
              <div className="flex-1 text-center">
                <button
                  className={`py-2 px-4 w-full text-sm font-medium transition-colors duration-200 ${
                    activeTab === 'audios' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setActiveTab('audios')}
                >
                  <Music size={20} className="inline-block mr-2" />
                  Audios
                </button>
              </div>
              <div className="flex-1 text-center">
                <button
                  className={`py-2 px-4 w-full text-sm font-medium transition-colors duration-200 ${
                    activeTab === 'likes' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setActiveTab('likes')}
                >
                  <Heart size={20} className="inline-block mr-2" />
                  Likes
                </button>
              </div>
              {isCurrentUser && (
                <div className="flex-1 text-center">
                <button
                    className={`py-2 px-4 w-full text-sm font-medium transition-colors duration-200 ${
                      activeTab === 'saved' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setActiveTab('saved')}
                >
                    <Bookmark size={20} className="inline-block mr-2" />
                    Saved
                </button>
                </div>
            )}
            </div>
          </div>
        )}
          
          <div className="py-4">
            {renderContent()}
        </div>
      </div>

      {showEditModal && profile && (
      <AnimatePresence>
          <EditProfileModal
            profile={profile}
            onClose={() => setShowEditModal(false)}
            onUpdate={fetchProfileData}
          />
        </AnimatePresence>
        )}

      {selectedVideo && (
      <AnimatePresence>
          <VideoViewer
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
          />
        </AnimatePresence>
        )}
    </div>
  );
};

export default ProfilePage;