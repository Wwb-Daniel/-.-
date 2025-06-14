import React, { useState, useEffect } from 'react';
import { Music, Trash2, Play, Pause, Clock, Crown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import type { AudioTrack } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

interface UserAudioTracksProps {
  userId: string;
}

interface AudioUsage {
  audio_track_id: string;
  count: number;
}

interface AudioTrackWithArtist extends AudioTrack {
  artist?: string;
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const UserAudioTracks: React.FC<UserAudioTracksProps> = ({ userId }) => {
  const [audioTracks, setAudioTracks] = useState<AudioTrackWithArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});
  const { user } = useAuthStore();
  const [isViralCreator, setIsViralCreator] = useState(false);
  const [isMusicCreator, setIsMusicCreator] = useState(false);
  const isCurrentUser = user?.id === userId;
  const navigate = useNavigate();

  useEffect(() => {
    fetchAudioTracks();
  }, [userId]);

  useEffect(() => {
    const audioElements: Record<string, HTMLAudioElement> = {};
    
    // Precargar duraciones de audio
    audioTracks.forEach(track => {
      if (!audioDurations[track.id]) {
        const audio = new Audio(track.audio_url);
        audioElements[track.id] = audio;
        
        audio.addEventListener('loadedmetadata', () => {
          setAudioDurations(prev => ({
            ...prev,
            [track.id]: audio.duration
          }));
        });
      }
    });

    return () => {
      // Limpiar elementos de audio al desmontar
      Object.values(audioElements).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [audioTracks]);

  const fetchAudioTracks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener los audios del usuario
      const { data: tracks, error: tracksError } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          user_profile:profiles(id, username, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (tracksError) throw tracksError;

      // Obtener el conteo de uso de cada audio
      const tracksWithUsage = await Promise.all((tracks || []).map(async (track) => {
        const { count } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('audio_track_id', track.id);

        return {
          ...track,
          usage_count: count || 0
        };
      }));

      setAudioTracks(tracksWithUsage);

      // Verificar si el usuario es un creador viral (tiene algún audio con más de 1000 usos)
      const hasViralTrack = tracksWithUsage.some(track => track.usage_count > 1000);
      setIsViralCreator(hasViralTrack);

      // Verificar si el usuario es un creador de música (más de 20 audios)
      setIsMusicCreator(tracksWithUsage.length > 20);

    } catch (error: any) {
      console.error('Error fetching audio tracks:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('audio_tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      // Actualizar la lista de audios
      setAudioTracks(prev => prev.filter(track => track.id !== trackId));
    } catch (error: any) {
      console.error('Error deleting audio track:', error);
      setError(error.message);
    }
  };

  const handlePlayPause = (trackId: string, audioUrl: string) => {
    if (currentlyPlaying === trackId) {
      // Pausar el audio actual
      const audio = document.querySelector(`audio[data-track-id="${trackId}"]`) as HTMLAudioElement;
      if (audio) {
        audio.pause();
      }
      setCurrentlyPlaying(null);
    } else {
      // Pausar cualquier audio que esté reproduciéndose
      if (currentlyPlaying) {
        const currentAudio = document.querySelector(`audio[data-track-id="${currentlyPlaying}"]`) as HTMLAudioElement;
        if (currentAudio) {
          currentAudio.pause();
        }
      }
      
      // Reproducir el nuevo audio
      const audio = document.querySelector(`audio[data-track-id="${trackId}"]`) as HTMLAudioElement;
      if (audio) {
        audio.play();
        setCurrentlyPlaying(trackId);
        
        audio.onended = () => {
          setCurrentlyPlaying(null);
        };
      }
    }
  };

  const handleUseAudio = (track: AudioTrackWithArtist) => {
    // Navegar a la página de upload con el audio seleccionado
    navigate('/upload', { 
      state: { 
        selectedAudioTrack: track
      } 
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-800 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  if (audioTracks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Badges de creador */}
      {(isViralCreator || isMusicCreator) && (
        <div className="flex justify-center space-x-4 mb-6">
          {isViralCreator && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-full"
            >
              <Crown className="text-yellow-300" />
              <span className="text-sm font-medium">Creador Viral</span>
            </motion.div>
          )}
          {isMusicCreator && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 rounded-full"
            >
              <Music className="animate-spin" />
              <span className="text-sm font-medium">Creador de Música</span>
            </motion.div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {audioTracks.map((track) => (
            <motion.div
              key={track.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={track.title}>
                      {track.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {track.artist || 'Artista desconocido'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.id === userId && (
                      <button
                        onClick={() => handleDelete(track.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Eliminar audio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleUseAudio(track)}
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                      title="Usar este audio"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePlayPause(track.id, track.audio_url)}
                      className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {currentlyPlaying === track.id ? (
                        <Pause className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      ) : (
                        <Play className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      )}
                    </button>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {audioDurations[track.id] ? formatDuration(audioDurations[track.id]) : '--:--'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {track.usage_count || 0} usos
                  </div>
                </div>

                <audio
                  data-track-id={track.id}
                  src={track.audio_url}
                  preload="metadata"
                  className="hidden"
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!loading && audioTracks.length === 0 && (
        <div className="text-center py-8">
          <Music className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {user?.id === userId 
              ? 'No has subido ningún audio todavía'
              : 'Este usuario no ha subido ningún audio todavía'}
          </p>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <p className="text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}; 