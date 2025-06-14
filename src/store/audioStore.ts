import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Audio {
  id: string;
  name: string;
  url: string;
  user_id: string;
  created_at: string;
  duration: number;
  waveform_url?: string;
}

interface AudioStore {
  audios: Audio[];
  loading: boolean;
  error: string | null;
  fetchAudios: () => Promise<void>;
  addAudio: (audio: Audio) => void;
  removeAudio: (id: string) => void;
}

export const useAudioStore = create<AudioStore>((set) => ({
  audios: [],
  loading: false,
  error: null,
  
  fetchAudios: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: audios, error } = await supabase
        .from('audio_tracks')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      set({ audios: audios || [], loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Error fetching audios',
        loading: false 
      });
    }
  },
  
  addAudio: (audio) => set((state) => ({ 
    audios: [audio, ...state.audios] 
  })),
  
  removeAudio: (id) => set((state) => ({ 
    audios: state.audios.filter(audio => audio.id !== id) 
  })),
})); 