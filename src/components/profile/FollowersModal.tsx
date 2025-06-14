import React, { useState, useEffect } from 'react';
import { X, User, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import Input from '../ui/Input';
import type { UserProfile } from '../../lib/supabase';

interface FollowersModalProps {
  userId: string;
  type: 'followers' | 'following';
  onClose: () => void;
}

// Definición correcta del tipo para los datos de perfil
type ProfileData = {
    id: string;
    username: string;
    avatar_url?: string;
    bio?: string;
  };

// Tipo para la respuesta de la base de datos
type DatabaseItem = {
  follower?: ProfileData;
  following?: ProfileData;
  };

const FollowersModal: React.FC<FollowersModalProps> = ({ userId, type, onClose }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [userId, type]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query;
      
      if (type === 'followers') {
        query = supabase
          .from('follows')
          .select(`
            follower:profiles!follower_id(
              id,
              username,
              avatar_url,
              bio
            )
          `)
          .eq('following_id', userId);
      } else {
        query = supabase
          .from('follows')
          .select(`
            following:profiles!following_id(
              id,
              username,
              avatar_url,
              bio
            )
          `)
          .eq('follower_id', userId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error en la consulta:', error);
        throw error;
      }

      console.log('Datos crudos recibidos:', JSON.stringify(data, null, 2));
      
      const userProfiles: UserProfile[] = [];
      
      if (data) {
        try {
          // Intentamos procesar cada item individualmente
          const typedData = (data as unknown) as DatabaseItem[];
          console.log('Datos tipados:', typedData);

          for (const item of typedData) {
            console.log('Procesando item:', JSON.stringify(item, null, 2));
            
            const profileData = type === 'followers' ? item.follower : item.following;
            console.log('Perfil encontrado:', profileData);

            if (profileData) {
            // Obtener el conteo de seguidores para este usuario
            const { count } = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
                .eq('following_id', profileData.id);
            
              const profile: UserProfile = {
                id: profileData.id,
                username: profileData.username,
                avatar_url: profileData.avatar_url,
                bio: profileData.bio,
              followers_count: count || 0,
              following_count: 0,
              created_at: new Date().toISOString()
              };
              
              console.log('Perfil creado:', profile);
            userProfiles.push(profile);
            } else {
              console.warn('No se encontró perfil en el item:', item);
        }
      }

          console.log('Total de perfiles procesados:', userProfiles.length);
      console.log('Perfiles finales:', userProfiles);

          if (userProfiles.length === 0) {
            console.warn('No se encontraron perfiles para mostrar');
          }

      setUsers(userProfiles);
      setFilteredUsers(userProfiles);
        } catch (error) {
          console.error('Error procesando los datos:', error);
          console.error('Datos que causaron el error:', data);
        }
      } else {
        console.warn('No se recibieron datos de la consulta');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-gray-900 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden"
      >
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold capitalize">{type}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-800">
          <Input
            placeholder={`Search ${type}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            className="bg-gray-800"
          />
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <User size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">
                {searchQuery ? 'No users found' : type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredUsers.map((user) => (
                <Link
                  key={user.id}
                  to={`/profile/${user.id}`}
                  onClick={onClose}
                  className="block p-4 hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                        <User size={24} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">@{user.username}</p>
                      {user.bio && (
                        <p className="text-sm text-gray-400 truncate">{user.bio}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {user.followers_count} followers
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FollowersModal;