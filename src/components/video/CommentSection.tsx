import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, User, Send, Gift, Crown, Reply, AtSign, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Comment, UserProfile } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import TokenPurchaseModal from '../chat/TokenPurchaseModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '../../hooks/use-toast';
import { useVideoStore } from '../../store/videoStore';

// Utility function for time formatting
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

interface CommentSectionProps {
  videoId: string;
  onClose: () => void;
  onCommentAdded: () => void;
}

interface CommentWithReplies extends Omit<Comment, 'user_profile'> {
  replies?: CommentWithReplies[];
  user_profile?: UserProfile;
  replyText?: string;
  mentions?: Mention[];
}

interface Mention {
  id: string;
  username: string;
  avatar_url?: string | null;
}

interface MentionResult {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface MentionData {
  mentioned_user_id: string;
  profiles: {
    id: string;
    username: string;
  };
}

interface SupabaseMentionResponse {
  mentioned_user_id: string;
  profiles: {
    id: string;
    username: string;
  };
}

const CommentSection: React.FC<CommentSectionProps> = ({ videoId, onClose, onCommentAdded }) => {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommentWithReplies | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userTokens, setUserTokens] = useState(0);
  const [showTokenPurchase, setShowTokenPurchase] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [showReactionMenu, setShowReactionMenu] = useState<string | null>(null);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionResults, setMentionResults] = useState<MentionResult[]>([]);
  const [showMentionResults, setShowMentionResults] = useState(false);
  const [lastAtIndex, setLastAtIndex] = useState(-1);
  const [commentMentions, setCommentMentions] = useState<Record<string, Mention[]>>({});
  const commentInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { updateVideoCommentsCount } = useVideoStore();

  useEffect(() => {
    Promise.all([fetchComments(), fetchUserTokens()]);
  }, [videoId]);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUserId();
  }, []);

  const fetchUserTokens = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserTokens(profile.coins);
      }
    } catch (error) {
      console.error('Error fetching user tokens:', error);
      setError('Failed to fetch user tokens');
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user_profile:profiles!user_id(id, username, avatar_url, is_vip),
          mentions:comment_mentions(
            mentioned_user_id,
            profiles:profiles!comment_mentions_mentioned_user_id_fkey(id, username, avatar_url)
          )
        `)
        .eq('content_id', videoId)
        .eq('content_type', 'video')
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Obtener respuestas para cada comentario
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('comments')
            .select(`
              *,
              user_profile:profiles!user_id(id, username, avatar_url, is_vip),
              mentions:comment_mentions(
                mentioned_user_id,
                profiles:profiles!comment_mentions_mentioned_user_id_fkey(id, username, avatar_url)
              )
            `)
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true });

          // Procesar las menciones para cada comentario y respuesta
          const processedComment = {
            ...comment,
            mentions: (comment.mentions as any[] || []).map((m: { mentioned_user_id: string; profiles: { username: string; avatar_url: string | null } }) => ({
              id: m.mentioned_user_id,
              username: m.profiles.username,
              avatar_url: m.profiles.avatar_url
            }))
          };

          const processedReplies = (replies || []).map(reply => ({
            ...reply,
            mentions: (reply.mentions as any[] || []).map((m: { mentioned_user_id: string; profiles: { username: string; avatar_url: string | null } }) => ({
              id: m.mentioned_user_id,
              username: m.profiles.username,
              avatar_url: m.profiles.avatar_url
            }))
          }));

          return {
            ...processedComment,
            replies: processedReplies
          };
        })
      );

      setComments(commentsWithReplies);
      console.log('Comments after fetch and processing:', commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Failed to load comments');
    }
  };

  const handleMentionSearch = async (search: string) => {
    // Si el término de búsqueda está vacío, no mostrar resultados
    if (!search.trim()) {
      setMentionResults([]);
      setShowMentionResults(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${search}%`)
        .limit(5);

      if (error) {
        console.error('Error searching mentions:', error);
        setMentionResults([]);
        setShowMentionResults(false);
        return;
      }
      
      const formattedResults: MentionResult[] = (data || []).map(user => ({
        id: user.id as string,
        username: user.username as string,
        avatar_url: user.avatar_url as string | null
      }));
      
      setMentionResults(formattedResults);
      setShowMentionResults(formattedResults.length > 0);
    } catch (error) {
      console.error('Error in mention search:', error);
      setMentionResults([]);
      setShowMentionResults(false);
    }
  };

  const handleMentionSelect = (user: MentionResult) => {
    if (!commentInputRef.current) return;

    const input = commentInputRef.current;
    const beforeMention = newComment.substring(0, lastAtIndex);
    const afterMention = newComment.substring(input.selectionStart || 0);
    const newText = `${beforeMention}@${user.username} ${afterMention}`;
    
    setNewComment(newText);
    setShowMentionResults(false);
    setMentionSearch('');
    setLastAtIndex(-1);
    
    // Enfocar el input y mover el cursor al final de la mención
    input.focus();
    const newCursorPos = beforeMention.length + user.username.length + 2; // +2 por el @ y el espacio
    input.setSelectionRange(newCursorPos, newCursorPos);
  };

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    const commentText = parentId ? replyText : newComment;
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('Not authenticated');

      // Extraer menciones del texto usando una expresión regular más precisa
      const mentionRegex = /@([^\s@]+(?: [^\s@]+)*)/g;
      const mentions = [...commentText.matchAll(mentionRegex)].map(match => match[1]);
      console.log('Mentions extracted from text (new regex):', mentions);

      // Buscar IDs de usuarios mencionados
      console.log('Attempting to fetch mentioned users for usernames:', mentions);
      const { data: mentionedUsers, error: mentionedUsersError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', mentions)
        .not('id', 'is', null);

      if (mentionedUsersError) {
        console.error('Error fetching mentioned users from DB:', mentionedUsersError);
        throw mentionedUsersError;
      }

      console.log('Mentioned users fetched from DB:', mentionedUsers);

      // Insertar el comentario
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          content: commentText.trim(),
          content_id: videoId,
          content_type: 'video',
          user_id: userData.user.id,
          parent_id: parentId
        })
        .select(`
          *,
          user_profile:profiles!user_id(id, username, avatar_url, is_vip)
        `)
        .single();

      if (commentError) throw commentError;

      // Insertar menciones si hay usuarios válidos
      if (mentionedUsers && mentionedUsers.length > 0) {
        // Insertar las menciones en comment_mentions
        const mentionInserts = mentionedUsers.map(user => ({
          comment_id: comment.id,
          mentioned_user_id: user.id
        }));

        const { error: mentionError } = await supabase
          .from('comment_mentions')
          .insert(mentionInserts);

        if (mentionError) {
          console.error('Error creating mentions:', mentionError);
        }

        // Crear notificaciones para las menciones
        const mentionNotifications = mentionedUsers.map(user => ({
          user_id: user.id,
          type: 'mention',
          content_id: comment.id,
          actor_id: userData.user.id
        }));

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(mentionNotifications);

        if (notificationError) {
          console.error('Error creating mention notifications:', notificationError);
        }
      }

      // Crear el objeto de comentario con las menciones
      const commentWithMentions = {
        ...comment,
        mentions: mentionedUsers?.map(user => ({
          id: user.id,
          username: user.username
        })) || []
      };

      // Actualizar el estado local
      if (parentId) {
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === parentId
              ? {
                  ...c,
                  replies: [...(c.replies || []), commentWithMentions]
                }
              : c
          )
        );
        setReplyingTo(null);
        setReplyText('');
      } else {
        setComments(prevComments => [commentWithMentions, ...prevComments]);
        setNewComment('');
      }

      // Notificar al componente padre y actualizar contador
      onCommentAdded();
      updateVideoCommentsCount(videoId);

      toast({
        type: 'success',
        title: parentId ? "Respuesta publicada" : "Comentario publicado",
        message: parentId ? "Tu respuesta ha sido publicada" : "Tu comentario ha sido publicado"
      });

    } catch (error: any) {
      console.error('Error posting comment:', error);
      setError('Failed to post comment');
      toast({
        type: 'error',
        title: "Error",
        message: "No se pudo publicar el comentario"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string, parentId?: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este comentario? Esta acción es irreversible.")) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUserId); // Ensure only owner can delete

      if (error) throw error;

      // Update local state
      setComments(prevComments => {
        if (parentId) {
          // If it's a reply, find parent and remove reply
          return prevComments.map(c => {
            if (c.id === parentId && c.replies) {
              return {
                ...c,
                replies: c.replies.filter(reply => reply.id !== commentId)
              };
            }
            return c;
          });
        } else {
          // If it's a top-level comment
          return prevComments.filter(c => c.id !== commentId);
        }
      });

      // Actualizar el contador de comentarios en la base de datos y en el store global
      // Obtener el nuevo total de comentarios para el video
      const { count, error: countError } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('content_id', videoId)
        .eq('content_type', 'video');

      if (countError) {
        console.error('Error al obtener el nuevo contador de comentarios después de eliminar:', countError);
      } else {
        updateVideoCommentsCount(videoId);
        console.log(`Comments count updated to: ${count} for video: ${videoId}`);
      }

      toast({
        type: 'success',
        title: "Comentario eliminado",
        message: "El comentario ha sido eliminado correctamente."
      });

    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast({
        type: 'error',
        title: "Error",
        message: "No se pudo eliminar el comentario: " + error.message
      });
    }
  };

  const handleReaction = async (commentId: string, reactionType: string, coinCost: number) => {
    try {
      if (userTokens < coinCost) {
        setShowTokenPurchase(true);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get comment owner and their current balance
      const comment = comments.find(c => c.id === commentId);
      if (!comment) throw new Error('Comment not found');

      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('coins, total_earnings')
        .eq('id', comment.user_id)
        .single();

      if (!receiverProfile) throw new Error('Receiver profile not found');

      // Create transaction
      const { error: transactionError } = await supabase
        .from('virtual_currency_transactions')
        .insert({
          user_id: user.id,
          amount: -coinCost,
          transaction_type: 'reaction',
          reference_id: commentId,
          status: 'completed'
        });

      if (transactionError) throw transactionError;

      // Update sender's balance
      const { error: senderError } = await supabase
        .from('profiles')
        .update({ coins: userTokens - coinCost })
        .eq('id', user.id);

      if (senderError) throw senderError;

      // Update comment owner's balance
      const updatedCoins = receiverProfile.coins + coinCost;
      const updatedEarnings = receiverProfile.total_earnings + (coinCost * 0.01);

      const { error: ownerError } = await supabase
        .from('profiles')
        .update({ 
          coins: updatedCoins,
          total_earnings: updatedEarnings
        })
        .eq('id', comment.user_id);

      if (ownerError) throw ownerError;

      // Update comment reactions
      const currentReactions = comment.reactions || {};
      const { error: reactionError } = await supabase
        .from('comments')
        .update({
          reactions: {
            ...currentReactions,
            [reactionType]: (currentReactions[reactionType] || 0) + 1
          }
        })
        .eq('id', commentId);

      if (reactionError) throw reactionError;

      setShowReactionMenu(null);
      await Promise.all([fetchComments(), fetchUserTokens()]);
    } catch (error: any) {
      console.error('Error sending reaction:', error);
      setError('Failed to send reaction');
    }
  };

  const loadCommentMentions = useCallback(async (commentId: string) => {
    try {
      const { data, error } = await supabase
        .from('comment_mentions')
        .select(`
          mentioned_user_id,
          profiles!comment_mentions_mentioned_user_id_fkey(id, username)
        `)
        .eq('comment_id', commentId);

      if (error) throw error;

      if (data) {
        const formattedMentions = (data as unknown as SupabaseMentionResponse[]).map(m => ({
          id: m.mentioned_user_id,
          username: m.profiles.username
        }));
        
        setCommentMentions((prev: Record<string, Mention[]>) => ({
          ...prev,
          [commentId]: formattedMentions
        }));
      }
    } catch (error) {
      console.error('Error loading mentions:', error);
    }
  }, []);

  // Cargar menciones cuando se cargan los comentarios
  useEffect(() => {
    comments.forEach(comment => {
      loadCommentMentions(comment.id);
      if (comment.replies) {
        comment.replies.forEach(reply => loadCommentMentions(reply.id));
      }
    });
  }, [comments, loadCommentMentions]);

  const toggleReplies = useCallback((commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  }, []);

  const formatCommentContent = useCallback((content: string, mentions: Mention[] = []) => {
    if (!mentions.length) return content;

    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    // Ordenar menciones por posición en el texto
    const sortedMentions = [...mentions].sort((a, b) => {
      const posA = content.toLowerCase().indexOf(`@${a.username.toLowerCase()}`);
      const posB = content.toLowerCase().indexOf(`@${b.username.toLowerCase()}`);
      return posA - posB;
    });

    sortedMentions.forEach((mention, index) => {
      const mentionText = `@${mention.username}`;
      const mentionIndex = content.toLowerCase().indexOf(`@${mention.username.toLowerCase()}`, lastIndex);

      if (mentionIndex !== -1) {
        // Agregar texto antes de la mención
        if (mentionIndex > lastIndex) {
          parts.push(
            <span key={`text-${index}`}>
              {content.slice(lastIndex, mentionIndex)}
            </span>
          );
        }

        // Agregar la mención como enlace con estilo TikTok
        parts.push(
          <Link
            key={`mention-${index}`}
            to={`/profile/${mention.id}`}
            className="inline-flex items-center text-[#1890ff] hover:text-[#40a9ff] transition-colors duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {mentionText}
          </Link>
        );

        lastIndex = mentionIndex + mentionText.length;
      }
    });

    // Agregar cualquier texto restante
    if (lastIndex < content.length) {
      parts.push(
        <span key="text-last">
          {content.slice(lastIndex)}
        </span>
      );
    }

    return <>{parts}</>;
  }, []);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.3 }}
      className="fixed right-0 top-0 h-full w-full max-w-md bg-black bg-opacity-90 backdrop-blur-sm z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">Comments ({comments.length})</h2>
        <button onClick={onClose} className="text-white hover:text-gray-300">
          <X size={24} />
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && <p className="text-gray-400">Loading comments...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && comments.length === 0 && (
          <p className="text-gray-400 text-center">No comments yet. Be the first to comment!</p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="flex space-x-3 text-white">
            <Link to={`/profile/${comment.user_profile?.id}`} onClick={(e) => e.stopPropagation()}>
              <Avatar className="w-10 h-10">
                <AvatarImage src={comment.user_profile?.avatar_url || ''} alt={comment.user_profile?.username || 'User'} />
                <AvatarFallback>{comment.user_profile?.username?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <p className="text-sm font-semibold inline-flex items-center">
                <Link to={`/profile/${comment.user_profile?.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                  @{comment.user_profile?.username}
                </Link>
                {comment.user_profile?.is_vip && <Crown size={16} className="ml-1 text-yellow-400" />}
              </p>
              <p className="text-gray-300 text-sm mt-1">
                {formatCommentContent(comment.content, comment.mentions)}
              </p>
              {/* Reactions and Reply Button */}
              <div className="flex items-center mt-2 space-x-4 text-gray-400 text-xs">
                {/* ... (Reaction buttons) ... */}
                <button
                  onClick={() => setReplyingTo(comment)}
                  className="flex items-center space-x-1 hover:text-white"
                >
                  <Reply size={14} />
                  <span>Reply</span>
                </button>
                <span className="text-gray-500">{formatTimeAgo(comment.created_at)}</span> {/* Time display */}
                {currentUserId === comment.user_id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="flex items-center space-x-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
              
              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 border-l border-gray-700 pl-4">
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className="text-blue-400 hover:underline text-sm mb-2"
                  >
                    {expandedReplies.has(comment.id) ? 'Hide replies' : `View all ${comment.replies.length} replies`}
                  </button>
                  {expandedReplies.has(comment.id) && (
                    <div className="space-y-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex space-x-3 text-white">
                          <Link to={`/profile/${reply.user_profile?.id}`} onClick={(e) => e.stopPropagation()}>
                            <Avatar className="w-8 h-8"> {/* Smaller avatar for replies */}
                              <AvatarImage src={reply.user_profile?.avatar_url || ''} alt={reply.user_profile?.username || 'User'} />
                              <AvatarFallback>{reply.user_profile?.username?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1">
                            <p className="text-xs font-semibold inline-flex items-center"> {/* Smaller font for replies */}
                              <Link to={`/profile/${reply.user_profile?.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                                @{reply.user_profile?.username}
                              </Link>
                              {reply.user_profile?.is_vip && <Crown size={12} className="ml-1 text-yellow-400" />}
                            </p>
                            <p className="text-gray-300 text-xs mt-1"> {/* Smaller font for replies */}
                              {formatCommentContent(reply.content, reply.mentions)}
                            </p>
                            {/* Reactions, Reply Button, and Time for replies */}
                            <div className="flex items-center mt-2 space-x-3 text-gray-400 text-xs"> {/* Smaller spacing for replies */}
                              {/* ... (Reaction buttons) ... */}
                              <span className="text-gray-500">{formatTimeAgo(reply.created_at)}</span> {/* Time display for replies */}
                              {currentUserId === reply.user_id && (
                                <button
                                  onClick={() => handleDeleteComment(reply.id, comment.id)} // Pass parentId for replies
                                  className="flex items-center space-x-1 text-red-400 hover:text-red-300"
                                >
                                  <Trash2 size={12} /> {/* Smaller icon for replies */}
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comment Input */}
      <div className="p-4 border-t border-gray-700 bg-black">
        {replyingTo && (
          <div className="flex items-center text-sm text-gray-400 mb-2">
            Replying to @{replyingTo.user_profile?.username}
            <button onClick={() => setReplyingTo(null)} className="ml-2 text-red-400">
              <X size={16} />
            </button>
          </div>
        )}
        <form onSubmit={(e) => handleSubmit(e, replyingTo?.id)} className="relative">
          <div className="relative flex items-center bg-neutral-800 rounded-full px-4 py-2">
            <Input
              ref={commentInputRef}
              type="text"
              placeholder={replyingTo ? 'Add a reply...' : 'Add a comment...'}
              className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-400 pr-10"
              value={replyingTo ? replyText : newComment}
              onChange={(e) => {
                const value = e.target.value;
                if (replyingTo) {
                  setReplyText(value);
                } else {
                  setNewComment(value);
                }

                const lastAt = value.lastIndexOf('@');
                if (lastAt !== -1) {
                  const search = value.substring(lastAt + 1).split(' ')[0];
                  if (search) {
                    setLastAtIndex(lastAt);
                    setMentionSearch(search);
                    handleMentionSearch(search);
                  } else {
                    setShowMentionResults(false);
                    setMentionSearch('');
                  }
                } else {
                  setShowMentionResults(false);
                  setMentionSearch('');
                  setLastAtIndex(-1);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowMentionResults(false);
                } else if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e, replyingTo?.id);
                }
              }}
            />
            <button
              type="submit"
              disabled={isSubmitting || (replyingTo ? !replyText.trim() : !newComment.trim())}
              className="absolute right-4 text-blue-400 hover:text-blue-300 disabled:opacity-50"
            >
              <Send size={24} />
            </button>
          </div>

          {/* Mention Results Dropdown */}
          {showMentionResults && mentionResults.length > 0 && (
            <div className="absolute bottom-full left-0 w-full bg-neutral-800 border border-neutral-700 rounded-lg max-h-48 overflow-y-auto z-50 shadow-lg">
              {mentionResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center p-2 hover:bg-neutral-700 cursor-pointer"
                  onClick={() => handleMentionSelect(user)}
                >
                  <Avatar className="w-8 h-8 mr-2">
                    <AvatarImage src={user.avatar_url || ''} alt={user.username} />
                    <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-white">{user.username}</span>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Token Purchase Modal */}
      <AnimatePresence>
        {showTokenPurchase && (
          <TokenPurchaseModal
            onClose={() => setShowTokenPurchase(false)}
            onPurchaseSuccess={fetchUserTokens}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CommentSection;
