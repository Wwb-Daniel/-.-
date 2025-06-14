import { createClient } from '@supabase/supabase-js';
import { useViewsStore } from '../store/viewsStore';

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with explicit options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Storage bucket names
export const VIDEO_BUCKET = 'videos';
export const AUDIO_BUCKET = 'audio_tracks';

export type UserProfile = {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  followers_count: number;
  following_count: number;
  is_vip?: boolean;
}

export type UserSettings = {
  user_id: string;
  private_account: boolean;
  receive_notifications: boolean;
};

export type AudioTrack = {
  id: string;
  user_id: string;
  title: string;
  audio_url: string;
  description?: string;
  genre?: string;
  tags?: string[];
  created_at: string;
  user_profile?: UserProfile;
  usage_count?: number;
  cover_image_url?: string;
  thumbnail_url?: string;
  // Add videos property for usage tracking
  videos?: {
    count: number;
  };
}

export type Video = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  audio_track_id: string | null;
  video_volume: number;
  audio_volume: number;
  user_profile?: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_vip: boolean;
    is_verified?: boolean;
  };
  audio_track?: AudioTrack;
  thumbnail_url?: string;
};

export type Comment = {
  id: string;
  content: string;
  user_id: string;
  content_id: string;
  content_type: 'video' | 'image_post';
  created_at: string;
  reactions?: Record<string, number>;
  user_profile?: UserProfile;
}

export type Follow = {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

// Add proper types for follow relationships
export type FollowWithProfile = {
  follower_id: string;
  following_id: string;
  follower?: UserProfile[];
  following?: UserProfile[];
}

export type VideoSave = {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
}

export type Chat = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read: boolean;
  created_at: string;
  sender_profile?: UserProfile;
  receiver_profile?: UserProfile;
}

export type Notification = {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'comment_reply' | 'follow' | 'message' | 'mention';
  content_id: string;
  actor_id: string;
  read: boolean;
  created_at: string;
  actor_profile?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export async function recordViewAndUpdate(videoId: string) {
  try {
    // Registrar la vista en la base de datos
    const { error: insertError } = await supabase
      .from('video_views')
      .insert({
        video_id: videoId,
      });

    if (insertError) {
      // Si es un error de duplicado, lo ignoramos (el usuario ya vio el video)
      if (insertError.code === '23505') return;
      throw insertError;
    }

    // Obtener el contador actualizado desde la base de datos
    const { data: updatedVideo, error: selectError } = await supabase
      .from('videos')
      .select('views_count')
      .eq('id', videoId)
      .single();

    if (selectError) throw selectError;

    if (updatedVideo) {
      // Actualizar el store local
      useViewsStore.getState().setView(videoId, updatedVideo.views_count);
    }
  } catch (error) {
    console.error('Error recording view:', error);
  }
}

// Function to get audio track usage count
export async function getAudioTrackUsageCount(audioTrackId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('audio_track_id', audioTrackId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting audio track usage count:', error);
    return 0;
  }
}

// Function to get videos using specific audio track
export async function getVideosByAudioTrack(audioTrackId: string, limit: number = 20, offset: number = 0) {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        user_profile:profiles!user_id(
          id, 
          username, 
          avatar_url, 
          is_vip
        ),
        audio_track:audio_tracks!audio_track_id(
          id,
          title,
          audio_url,
          genre,
          tags,
          user_id,
          created_at,
          updated_at,
          user_profile:profiles!user_id(id, username, avatar_url)
        )
      `)
      .eq('audio_track_id', audioTrackId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting videos by audio track:', error);
    return [];
  }
}