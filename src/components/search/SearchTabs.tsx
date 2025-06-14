import React, { useState, useEffect } from 'react';
import { Search, User, Play, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface Video {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  user_id: string;
  likes_count: number;
  views_count: number;
  user_profile?: {
    username: string;
    avatar_url?: string;
  };
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  followers_count: number;
}

const SearchTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'videos' | 'users'>('videos');
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'recent' | 'popular'>('relevance');

  useEffect(() => {
    if (query.trim()) {
      const debounceTimer = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setVideos([]);
      setUsers([]);
    }
  }, [query, activeTab, sortBy]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      if (activeTab === 'videos') {
        await searchVideos();
      } else {
        await searchUsers();
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchVideos = async () => {
    let queryBuilder = supabase
      .from('videos')
      .select(`
        *,
        user_profile:profiles!user_id(username, avatar_url)
      `)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
        break;
      case 'popular':
        queryBuilder = queryBuilder.order('likes_count', { ascending: false });
        break;
      default:
        queryBuilder = queryBuilder.order('views_count', { ascending: false });
    }

    const { data, error } = await queryBuilder.limit(20);
    if (error) throw error;
    setVideos(data || []);
  };

  const searchUsers = async () => {
    let queryBuilder = supabase
      .from('profiles')
      .select(`
        id,
        username,
        avatar_url,
        bio,
        created_at
      `)
      .or(`username.ilike.%${query}%,bio.ilike.%${query}%`);

    // Apply sorting
    switch (sortBy) {
      case 'popular':
        // Primero obtenemos los usuarios
        const { data: users, error: usersError } = await queryBuilder.limit(20);
        if (usersError) throw usersError;

        // Luego obtenemos el conteo de seguidores para cada usuario
        const usersWithFollowers = await Promise.all(
          (users || []).map(async (user) => {
            const { count } = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('following_id', user.id);
            
            return {
              ...user,
              followers_count: count || 0
            };
          })
        );

        // Ordenamos por número de seguidores
        usersWithFollowers.sort((a, b) => b.followers_count - a.followers_count);
        setUsers(usersWithFollowers);
        break;

      case 'recent':
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
        const { data: recentUsers, error: recentError } = await queryBuilder.limit(20);
        if (recentError) throw recentError;

        // Obtenemos el conteo de seguidores para cada usuario
        const recentUsersWithFollowers = await Promise.all(
          (recentUsers || []).map(async (user) => {
            const { count } = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('following_id', user.id);
            
            return {
              ...user,
              followers_count: count || 0
            };
          })
        );

        setUsers(recentUsersWithFollowers);
        break;

      default:
        // Por defecto, ordenamos por popularidad
        const { data: defaultUsers, error: defaultError } = await queryBuilder.limit(20);
        if (defaultError) throw defaultError;

        // Obtenemos el conteo de seguidores para cada usuario
        const defaultUsersWithFollowers = await Promise.all(
          (defaultUsers || []).map(async (user) => {
            const { count } = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('following_id', user.id);
            
            return {
              ...user,
              followers_count: count || 0
            };
          })
        );

        // Ordenamos por número de seguidores
        defaultUsersWithFollowers.sort((a, b) => b.followers_count - a.followers_count);
        setUsers(defaultUsersWithFollowers);
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Search</h1>
        
        {/* Search Input */}
        <div className="relative mb-4">
          <div className="flex items-center bg-gray-900 rounded-full px-4 py-2">
            <Search size={20} className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search for videos or users"
              className="bg-transparent border-none w-full focus:outline-none text-white"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="ml-2 p-1 hover:bg-gray-800 rounded-full"
            >
              <Filter size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 bg-gray-900 rounded-lg"
            >
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-400">Sort by:</span>
                {['relevance', 'recent', 'popular'].map((option) => (
                  <button
                    key={option}
                    onClick={() => setSortBy(option as any)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      sortBy === option
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex mb-6 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-colors ${
              activeTab === 'videos'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Play size={18} className="mr-2" />
            Videos
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <User size={18} className="mr-2" />
            Users
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Videos Tab */}
            {activeTab === 'videos' && (
              <div>
                {videos.length === 0 && query ? (
                  <div className="text-center py-12">
                    <Play size={48} className="mx-auto text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium mb-1">No videos found</h3>
                    <p className="text-gray-500">Try a different search term</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {videos.map((video) => (
                      <Link
                        key={video.id}
                        to={`/`}
                        className="rounded-lg overflow-hidden aspect-[9/16] relative bg-gray-900 group"
                      >
                        <video
                          src={video.video_url}
                          className="absolute inset-0 w-full h-full object-cover"
                          muted
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h4 className="text-sm font-medium truncate mb-1">{video.title}</h4>
                            <p className="text-xs text-gray-300">@{video.user_profile?.username}</p>
                            <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                              <span>{formatCount(video.views_count)} views</span>
                              <span>{formatCount(video.likes_count)} likes</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                {users.length === 0 && query ? (
                  <div className="text-center py-12">
                    <User size={48} className="mx-auto text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium mb-1">No users found</h3>
                    <p className="text-gray-500">Try a different search term</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => (
                      <Link
                        key={user.id}
                        to={`/profile/${user.id}`}
                        className="flex items-center p-4 hover:bg-gray-900 rounded-lg transition-colors"
                      >
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.username}
                            className="w-12 h-12 rounded-full object-cover mr-4"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mr-4">
                            <User size={24} className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">@{user.username}</div>
                          {user.bio && (
                            <p className="text-sm text-gray-400 truncate">{user.bio}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {formatCount(user.followers_count)} followers
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Initial State */}
            {!query && (
              <div className="text-center py-12">
                <Search size={48} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-medium mb-1">Search for content</h3>
                <p className="text-gray-500">Find videos, users, and more</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchTabs;