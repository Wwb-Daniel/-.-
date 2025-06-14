import React, { useState, useEffect } from 'react';
import { Eye, User, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileVisitorsProps {
  profileId: string;
}

interface Visitor {
  id: string;
  username: string;
  avatar_url?: string;
  visited_at: string;
  viewed: boolean;
}

interface ProfileVisitorData {
  visited_at: string;
  viewed: boolean;
  visitor: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

const ProfileVisitors: React.FC<ProfileVisitorsProps> = ({ profileId }) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [unviewedCount, setUnviewedCount] = useState(0);

  useEffect(() => {
    fetchVisitors();
  }, [profileId]);

  const fetchVisitors = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_visitors')
        .select(`
          visited_at,
          viewed,
          visitor:profiles!visitor_id(
            id,
            username,
            avatar_url
          )
        `)
        .eq('profile_id', profileId)
        .order('visited_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const visitorsList: Visitor[] = (data || [])
        .filter((item: any) => item.visitor !== null)
        .map((item: any) => ({
          id: item.visitor.id,
          username: item.visitor.username,
          avatar_url: item.visitor.avatar_url,
          visited_at: item.visited_at,
          viewed: item.viewed || false
        }));

      setVisitors(visitorsList);
      setUnviewedCount(visitorsList.filter(v => !v.viewed).length);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const markVisitorsAsViewed = async () => {
    try {
      const unviewedVisitors = visitors.filter(v => !v.viewed);
      if (unviewedVisitors.length === 0) return;

      const { error } = await supabase
        .from('profile_visitors')
        .update({ viewed: true })
        .in('visitor_id', unviewedVisitors.map(v => v.id))
        .eq('profile_id', profileId);

      if (error) throw error;

      // Actualizar el estado local
      setVisitors(prev => prev.map(v => ({ ...v, viewed: true })));
      setUnviewedCount(0);
    } catch (error) {
      console.error('Error marking visitors as viewed:', error);
    }
  };

  const handleModalOpen = () => {
    setShowModal(true);
    markVisitorsAsViewed();
  };

  const scrollLeft = () => {
    const container = document.getElementById('visitors-container');
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = document.getElementById('visitors-container');
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="fixed top-20 right-4 z-40">
        <div className="animate-pulse">
          <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
            <Eye size={20} className="text-gray-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {visitors.length > 0 && (
        <button
          onClick={handleModalOpen}
          className="fixed top-20 right-4 z-40 group"
        >
          <div className="relative">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center border border-gray-800 hover:border-blue-500 transition-colors">
              <Eye size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
            {unviewedCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs font-medium text-white">
                {unviewedCount}
              </div>
            )}
          </div>
        </button>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden"
            >
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Eye size={20} />
                  <h2 className="text-lg font-semibold">Visitantes Recientes</h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                {visitors.length === 0 ? (
                  <div className="p-8 text-center">
                    <Eye size={48} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400">No hay visitantes recientes</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {visitors.map((visitor) => (
                      <Link
                        key={visitor.id}
                        to={`/profile/${visitor.id}`}
                        onClick={() => setShowModal(false)}
                        className="block p-4 hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {visitor.avatar_url ? (
                            <img
                              src={visitor.avatar_url}
                              alt={visitor.username}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                              <User size={24} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">@{visitor.username}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDistanceToNow(new Date(visitor.visited_at), { addSuffix: true }).replace('about ', '')}
                            </p>
                          </div>
                          {!visitor.viewed && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProfileVisitors;