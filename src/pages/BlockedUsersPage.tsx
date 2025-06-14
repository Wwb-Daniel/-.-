import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

interface BlockedUser {
  id: string;
  blocked_user_id: string;
  blocked_user_username: string;
}

const BlockedUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('No autenticado.');
        navigate('/auth');
        return;
      }

      // Paso 1: Obtener los IDs de los usuarios bloqueados
      const { data: blockedData, error: blockedError } = await supabase
        .from('blocked_users')
        .select('id, blocked_user_id')
        .eq('user_id', user.id);

      if (blockedError) throw blockedError;

      // Paso 2: Obtener el nombre de usuario de cada perfil bloqueado
      const blockedUsersWithUsernames: BlockedUser[] = [];
      for (const blockedItem of blockedData) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', blockedItem.blocked_user_id) // Asumiendo que profiles.id es el user ID
          .single();

        if (profileError) {
          console.error(`Error fetching profile for ${blockedItem.blocked_user_id}:`, profileError);
          blockedUsersWithUsernames.push({
            id: blockedItem.id,
            blocked_user_id: blockedItem.blocked_user_id,
            blocked_user_username: 'Desconocido',
          });
        } else {
          blockedUsersWithUsernames.push({
            id: blockedItem.id,
            blocked_user_id: blockedItem.blocked_user_id,
            blocked_user_username: profileData.username,
          });
        }
      }
      
      setBlockedUsers(blockedUsersWithUsernames);

    } catch (error: any) {
      console.error('Error fetching blocked users:', error);
      toast.error(`Error al cargar usuarios bloqueados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUser = async (blockedUserId: string) => {
    setUnblocking(blockedUserId);
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('id', blockedUserId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(user => user.id !== blockedUserId));
      toast.success('Usuario desbloqueado exitosamente!');
    } catch (error: any) {
      console.error('Error unblocking user:', error);
      toast.error(`Error al desbloquear usuario: ${error.message}`);
    } finally {
      setUnblocking(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-900 text-white"
    >
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" />
              <span>Volver</span>
            </button>
            <h1 className="text-xl font-bold">Usuarios Bloqueados</h1>
            <div className="w-20" /> {/* Spacer for alignment */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800/50 rounded-lg p-6">
          {blockedUsers.length === 0 ? (
            <p className="text-gray-400 text-center">No tienes usuarios bloqueados.</p>
          ) : (
            <ul className="space-y-4">
              {blockedUsers.map(user => (
                <li key={user.id} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                  <span className="font-medium">{user.blocked_user_username}</span>
                  <button
                    onClick={() => handleUnblockUser(user.id)}
                    className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white transition-colors"
                    disabled={unblocking === user.id}
                  >
                    <UserX size={16} />
                    <span>{unblocking === user.id ? 'Desbloqueando...' : 'Desbloquear'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BlockedUsersPage; 