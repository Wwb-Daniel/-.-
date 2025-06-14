import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface ProfileState {
  recordProfileVisit: (profileId: string) => Promise<void>;
  getProfileStats: (profileId: string) => Promise<{
    totalLikes: number;
    totalViews: number;
    totalVideos: number;
  }>;
}

export const useProfileStore = create<ProfileState>(() => ({
  recordProfileVisit: async (profileId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id === profileId) return; // Don't record self-visits

      await supabase.rpc('record_profile_visit', {
        p_profile_id: profileId,
        p_visitor_id: user.id
      });
    } catch (error) {
      console.error('Error recording profile visit:', error);
    }
  },

  getProfileStats: async (profileId: string) => {
    try {
      // Get user's videos first
      const { data: userVideos, error: videosError } = await supabase
        .from('videos')
        .select('id, likes_count, views_count')
        .eq('user_id', profileId);

      if (videosError) {
        console.error('Error fetching user videos:', videosError);
        return {
          totalLikes: 0,
          totalViews: 0,
          totalVideos: 0
        };
      }

      // Calculate totals from the videos data
      const totalLikes = (userVideos || []).reduce((sum, video) => sum + (video.likes_count || 0), 0);
      const totalViews = (userVideos || []).reduce((sum, video) => sum + (video.views_count || 0), 0);
      const totalVideos = (userVideos || []).length;

      return {
        totalLikes,
        totalViews,
        totalVideos
      };
    } catch (error) {
      console.error('Error getting profile stats:', error);
      return {
        totalLikes: 0,
        totalViews: 0,
        totalVideos: 0
      };
    }
  }
}));