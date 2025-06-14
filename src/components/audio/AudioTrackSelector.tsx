import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AudioTrack } from '../../lib/supabase';
import { Search, Music, X } from 'lucide-react';
import Input from '../ui/Input';

interface AudioTrackSelectorProps {
  onSelect: (track: AudioTrack | null) => void;
  selectedAudioTrack: AudioTrack | null;
}

const AudioTrackSelector: React.FC<AudioTrackSelectorProps> = ({
  onSelect,
  selectedAudioTrack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAudioTracks = async (query: string = '') => {
    try {
      setLoading(true);
      setError(null);

      let queryBuilder = supabase
        .from('audio_tracks')
        .select(`
          *,
          user_profile:profiles(id, username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (query) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,genre.ilike.%${query}%,tags.cs.{${query}}`);
      }

      const { data, error: fetchError } = await queryBuilder;

      if (fetchError) throw fetchError;
      setAudioTracks(data || []);
    } catch (error: any) {
      console.error('Error fetching audio tracks:', error);
      setError(error.message || 'Failed to load audio tracks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudioTracks(searchQuery);
  }, [searchQuery]);

  const handlePlay = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play();
  };

  return (
    <div className="space-y-4">
      {selectedAudioTrack ? (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handlePlay(selectedAudioTrack.audio_url)}
                className="bg-blue-500 rounded-full p-2 hover:bg-blue-600 transition-colors"
              >
                <Music className="h-5 w-5" />
              </button>
              <div>
                <h4 className="font-medium">{selectedAudioTrack.title}</h4>
                <p className="text-sm text-gray-400">{selectedAudioTrack.genre}</p>
              </div>
            </div>
            <button
              onClick={() => onSelect(null)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audio tracks..."
              className="pl-10"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-6 w-6 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {audioTracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => onSelect(track)}
                  className="w-full text-left bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlay(track.audio_url);
                      }}
                      className="bg-blue-500 rounded-full p-2 hover:bg-blue-600 transition-colors"
                    >
                      <Music className="h-5 w-5" />
                    </button>
                    <div>
                      <h4 className="font-medium">{track.title}</h4>
                      <p className="text-sm text-gray-400">{track.genre}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AudioTrackSelector; 