import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_profile?: {
    username: string;
    avatar_url: string;
  };
}

interface CommentBoxProps {
  videoId: string;
  onClose: () => void;
}

const CommentBox: React.FC<CommentBoxProps> = ({ videoId, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const { user } = useAuthStore();

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            content: newComment.trim(),
            video_id: videoId,
            user_id: user.id
          }
        ])
        .select(`
          *,
          user_profile:profiles!user_id(username, avatar_url)
        `)
        .single();

      if (error) throw error;

      setComments(prev => [data, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Error al publicar comentario:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-800 shadow-xl z-50"
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 border-b border-gray-800 flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold text-white">Comentarios</h2>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </motion.button>
        </motion.div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-gray-800 rounded-lg p-4"
              >
                <div className="flex items-start space-x-3">
                  <img
                    src={comment.user_profile?.avatar_url || '/default-avatar.png'}
                    alt={comment.user_profile?.username || 'User'}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">
                        {comment.user_profile?.username}
                      </span>
                      <span className="text-sm text-gray-400">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-300">{comment.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Comment Input */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 border-t border-gray-800"
        >
          <div className="flex items-center space-x-2">
            <img
              src={user?.user_metadata?.avatar_url || '/default-avatar.png'}
              alt="Your avatar"
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                rows={2}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
              className={`px-4 py-2 rounded-lg font-medium ${
                newComment.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Enviar
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CommentBox; 