import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { AudioTrack } from '../lib/supabase';
import { generateThumbnail } from '../lib/thumbnailGenerator';

const VIDEO_BUCKET = 'videos';

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string;
  user_id: string;
  audio_track_id: string | null;
  video_volume?: number;
  audio_volume: number;
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
}

interface VideoState {
  videos: Video[];
  currentVideo: Video | null;
  loading: boolean;
  error: string | null;
  uploadProgress: number;
  isUploading: boolean;
  uploadError: string | null;
  hasMore: boolean;
  feedType: 'all' | 'following' | 'foryou' | 'explore';
  fetchVideos: (page: number) => Promise<void>;
  uploadVideo: (file: File, title: string, description: string, options?: UploadOptions) => Promise<Video>;
  updateVideo: (videoId: string, title: string, description: string | null) => Promise<void>;
  deleteVideo: (videoId: string) => Promise<void>;
  likeVideo: (videoId: string) => Promise<boolean>;
  saveVideo: (videoId: string) => Promise<void>;
  setCurrentVideo: (video: Video | null) => void;
  setFeedType: (type: 'all' | 'following' | 'foryou' | 'explore') => void;
  marcarVideoVisto: (videoId: string) => Promise<void>;
  updateVideoCommentsCount: (videoId: string) => void;
}

interface UploadProgress {
  loaded: number;
  total: number;
}

interface UploadOptions {
  audioTrackId?: string;
  audioVolume?: number;
}

const PAGE_SIZE = 5;

const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
};

const insertVideoRecord = async (data: {
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string;
  user_id: string;
  audio_track_id: string | null;
  audio_volume: number;
}): Promise<Video> => {
  const { data: record, error } = await supabase
    .from('videos')
    .insert([{
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select(`
      *,
      likes_count,
      comments_count,
      views_count
    `)
    .single();

  if (error) throw error;
  return {
    ...record,
    likes_count: record.likes_count || 0,
    comments_count: record.comments_count || 0,
    views_count: record.views_count || 0
  };
};

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  currentVideo: null,
  loading: false,
  error: null,
  uploadProgress: 0,
  isUploading: false,
  uploadError: null,
  hasMore: true,
  feedType: 'all',

  setFeedType: (type) => {
    set({ feedType: type, videos: [], hasMore: true });
    get().fetchVideos(0);
  },

  marcarVideoVisto: async (videoId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Primero verificar si ya existe la vista
      const { data: existingView } = await supabase
        .from('video_views')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      if (existingView) {
        // Si ya existe la vista, no hacer nada
        return;
      }

      // Si no existe, crear la vista
      const { error } = await supabase
        .from('video_views')
        .insert({
          user_id: user.id,
          video_id: videoId
        });

      if (error) {
        if (error.code === '23505') {
          // Ignorar error de duplicado (por si acaso)
          return;
        }
        console.error('Error marcando video como visto:', error);
        throw error;
      }

      // Actualizar el contador de vistas en el estado local
      set((state) => ({
        videos: state.videos.map(v => 
          v.id === videoId 
            ? { ...v, views_count: (v.views_count || 0) + 1 }
            : v
        ),
        currentVideo: state.currentVideo?.id === videoId 
          ? { ...state.currentVideo, views_count: (state.currentVideo.views_count || 0) + 1 }
          : state.currentVideo
      }));
    } catch (error: any) {
      console.error('Error marcando video como visto:', error);
      console.error('Detalles del error al marcar video como visto:', error.code, error.message, error);
      throw error;
    }
  },

  fetchVideos: async (page = 0) => {
    const { videos, feedType } = get();
    set({ loading: true, error: null });
    
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select(
          `
          *,
          likes_count,
          comments_count,
          views_count,
          user_profile:profiles!user_id(id,username,avatar_url,is_verified,is_vip),
          audio_track:audio_tracks!audio_track_id(id,title,audio_url,genre,tags,user_id,created_at,updated_at,user_profile:profiles!user_id(id,username,avatar_url)),
          video_hashtags(hashtag:hashtags(id,name)),
          challenge:challenges(id,name,description)
          `
        )
        .order('created_at', { ascending: false })
        .range(from, to);

      if (videosError) throw videosError;
      
      const transformedData = videosData.map(video => ({
        ...video,
        likes_count: video.likes_count || 0,
        comments_count: video.comments_count || 0,
        views_count: video.views_count || 0
      }));
      
      const newVideos = page === 0 ? transformedData : [...videos, ...transformedData];
      set({ 
        videos: newVideos,
        hasMore: videosData.length === PAGE_SIZE,
      });

      // Si hay un currentVideo, actualizarlo también
      const currentVideo = get().currentVideo;
      if (currentVideo) {
        const updatedCurrentVideo = transformedData.find(v => v.id === currentVideo.id);
        if (updatedCurrentVideo) {
          set({ currentVideo: updatedCurrentVideo });
        }
      }
    } catch (error: any) {
       set({ error: error.message });
       console.error('Error fetching videos:', error);
     } finally {
       set({ loading: false });
      }
    },

  uploadVideo: async (file: File, title: string, description: string, options?: UploadOptions) => {
    try {
      set({ isUploading: true, uploadProgress: 0, uploadError: null });
      
      // 1. Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado');

      // 2. Subir el video a Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: videoData, error: uploadError } = await supabase.storage
        .from(VIDEO_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Actualizar progreso
      set({ uploadProgress: 50 });

      // 3. Obtener la URL del video
      const { data: { publicUrl: videoUrl } } = supabase.storage
        .from(VIDEO_BUCKET)
        .getPublicUrl(fileName);

      // 4. Generar y subir thumbnail
      const thumbnailBlob = await generateThumbnail(file);
      const thumbnailFileName = `${user.id}/${Date.now()}_thumb.jpg`;
      
      const { error: thumbnailError } = await supabase.storage
        .from('thumbnails')
        .upload(thumbnailFileName, thumbnailBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        });

      if (thumbnailError) throw thumbnailError;

      // Actualizar progreso
      set({ uploadProgress: 75 });

      const { data: { publicUrl: thumbnailUrl } } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(thumbnailFileName);

      // 5. Insertar el registro en la base de datos
      const videoRecord = await insertVideoRecord({
        title,
        description: description || null,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        user_id: user.id,
        audio_track_id: options?.audioTrackId || null,
        audio_volume: options?.audioVolume || 0.5
      });

      // Actualizar progreso final
      set({ uploadProgress: 100, isUploading: false });
      return videoRecord;
    } catch (error) {
      console.error('Error uploading video:', error);
      set({ 
        isUploading: false, 
        uploadError: error instanceof Error ? error.message : 'Error uploading video' 
      });
      throw error;
    }
  },

  updateVideo: async (videoId, title, description) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('videos')
        .update({
          title,
          description: description || null,
          is_edited: true,
        })
        .eq('id', videoId);

      if (error) throw error;
      await get().fetchVideos(0);
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  deleteVideo: async (videoId) => {
    set({ loading: true, error: null });
    try {
      // 1. Obtener el video para tener la URL del archivo
      const { data: video, error: fetchError } = await supabase
        .from('videos')
        .select('video_url, user_id')
        .eq('id', videoId)
        .single();

      if (fetchError) throw fetchError;
      if (!video) throw new Error('Video no encontrado');

      // 2. Eliminar el archivo de almacenamiento
      if (video.video_url) {
        const fileName = video.video_url.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase
            .storage
            .from('videos')
            .remove([`${video.user_id}/${fileName}`]);

          if (storageError) {
            console.error('Error eliminando archivo de almacenamiento:', storageError);
            // Continuamos aunque falle la eliminación del archivo
          }
        }
      }

      // 3. Eliminar el registro del video (esto activará el trigger)
      const { error: deleteError } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (deleteError) throw deleteError;

      // 4. Actualizar la lista de videos
      await get().fetchVideos(0);
    } catch (error: any) {
      set({ error: error.message });
      console.error('Error eliminando video:', error);
    } finally {
      set({ loading: false });
    }
  },

  likeVideo: async (videoId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Primero verificar si ya existe el like
      const { data: existingLike, error: checkError } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', videoId)
        .eq('content_type', 'video')
        .maybeSingle();
        
      if (checkError) throw checkError;

      let wasLiked = false;

      if (existingLike) {
        // Si existe, eliminar el like
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) throw deleteError;
        wasLiked = false;
      } else {
        // Si no existe, crear el like
        const { error: insertError } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            content_id: videoId,
            content_type: 'video',
            video_id: videoId
          });

        if (insertError) {
          if (insertError.code === '23505') {
            console.log('Like already exists, ignoring insertion');
            return false;
          }
          throw insertError;
        }
        wasLiked = true;
      }

      // Obtener el conteo actualizado de likes
      const { count: newLikesCount, error: countError } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('content_id', videoId)
        .eq('content_type', 'video');

      if (countError) {
        console.error('Error obteniendo conteo de likes:', countError);
        throw countError;
      }

      // Actualizar el estado local con el conteo exacto
      set((state) => {
        const updatedVideos = state.videos.map(v => 
          v.id === videoId 
            ? { ...v, likes_count: newLikesCount || 0 }
            : v
        );
        const updatedCurrentVideo = state.currentVideo?.id === videoId 
          ? { ...state.currentVideo, likes_count: newLikesCount || 0 }
          : state.currentVideo;

        return {
          videos: updatedVideos,
          currentVideo: updatedCurrentVideo
        };
      });

      return wasLiked;
    } catch (error) {
      console.error('Error in likeVideo:', error);
      throw error;
    }
  },

  saveVideo: async (videoId) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');
      
      const { data: existingSave } = await supabase
        .from('video_saves')
        .select()
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();
        
      if (existingSave) {
        await supabase
          .from('video_saves')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
      } else {
        await supabase
          .from('video_saves')
          .insert({
            user_id: user.id,
            video_id: videoId,
          });
      }
    } catch (error) {
      console.error('Error saving video:', error);
    }
  },

  setCurrentVideo: (video) => set({ currentVideo: video }),

  updateVideoCommentsCount: async (videoId: string) => {
    try {
      // Obtener el conteo actualizado de comentarios
      const { count: newCommentsCount, error: countError } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId);

      if (countError) {
        console.error('Error obteniendo conteo de comentarios:', countError);
        throw countError;
      }

      // Actualizar el estado local con el conteo exacto
      set((state) => {
        const updatedVideos = state.videos.map(v => 
          v.id === videoId 
            ? { ...v, comments_count: newCommentsCount || 0 }
            : v
        );
        const updatedCurrentVideo = state.currentVideo?.id === videoId 
          ? { ...state.currentVideo, comments_count: newCommentsCount || 0 }
          : state.currentVideo;

        return {
          videos: updatedVideos,
          currentVideo: updatedCurrentVideo
        };
      });
    } catch (error) {
      console.error('Error updating comments count:', error);
      throw error;
    }
  },
}));
