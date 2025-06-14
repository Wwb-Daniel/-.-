import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Notification, Chat } from '../lib/supabase';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  subscribeToNotifications: () => void;
  unsubscribeFromNotifications: () => void;
}

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchChats: () => Promise<void>;
  sendMessage: (receiverId: string, message: string) => Promise<void>;
  markChatAsRead: (chatId: string) => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  subscribeToChats: () => void;
  unsubscribeFromChats: () => void;
}

interface ActorProfile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface NotificationWithActor extends Notification {
  actor_profile?: ActorProfile;
}

export const useNotificationStore = create<NotificationState>((set, get) => {
  let notificationSubscription: any = null;
  let isSubscribed = false;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  const setupSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Limpiar suscripción existente si hay una
      if (notificationSubscription) {
        await supabase.removeChannel(notificationSubscription);
        notificationSubscription = null;
        isSubscribed = false;
      }

      // Crear nueva suscripción
      notificationSubscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            get().fetchNotifications();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            isSubscribed = true;
            retryCount = 0; // Resetear contador de reintentos
          } else if (status === 'CLOSED' && retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(() => setupSubscription(), 1000 * retryCount); // Reintentar con backoff exponencial
          }
        });
    } catch (error) {
      console.error('Error setting up notification subscription:', error);
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(() => setupSubscription(), 1000 * retryCount);
      }
    }
  };

  return {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,

    fetchNotifications: async () => {
      set({ loading: true, error: null });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('notifications')
          .select(`
            id,
            user_id,
            type,
            content_id,
            actor_id,
            read,
            created_at,
            actor_profile:profiles!fk_notifications_actor(id, username, avatar_url)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        // Asegurarnos de que los datos tienen el formato correcto
        const formattedData = (data || []).map((notification: any) => ({
          ...notification,
          actor_profile: notification.actor_profile ? {
            id: notification.actor_profile.id,
            username: notification.actor_profile.username,
            avatar_url: notification.actor_profile.avatar_url
          } as ActorProfile : undefined
        })) as NotificationWithActor[];

        const unreadCount = formattedData.filter(n => !n.read).length;
        set({ notifications: formattedData, unreadCount });
      } catch (error: any) {
        console.error('Error fetching notifications:', error);
        set({ error: error.message });
      } finally {
        set({ loading: false });
      }
    },

    markAsRead: async (notificationId: string) => {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId);

        if (error) throw error;
        await get().fetchNotifications();
      } catch (error: any) {
        console.error('Error marking notification as read:', error);
      }
    },

    markAllAsRead: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false);

        if (error) throw error;
        await get().fetchNotifications();
      } catch (error: any) {
        console.error('Error marking all notifications as read:', error);
      }
    },

    subscribeToNotifications: () => {
      if (isSubscribed) return;
      setupSubscription();
    },

    unsubscribeFromNotifications: async () => {
      if (notificationSubscription) {
        try {
          await supabase.removeChannel(notificationSubscription);
        } catch (error) {
          console.error('Error unsubscribing from notifications:', error);
        } finally {
          notificationSubscription = null;
          isSubscribed = false;
          retryCount = 0;
        }
      }
    },
  };
});

export const useChatStore = create<ChatState>((set, get) => {
  let chatSubscription: any = null;

  return {
    chats: [],
    activeChat: null,
    unreadCount: 0,
    loading: false,
    error: null,

    fetchChats: async () => {
      set({ loading: true, error: null });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('chats')
          .select(`
            *,
            sender_profile:profiles!sender_id(*),
            receiver_profile:profiles!receiver_id(*)
          `)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const unreadCount = data?.filter(c => !c.read && c.receiver_id === user.id).length || 0;
        set({ chats: data || [], unreadCount });
      } catch (error: any) {
        set({ error: error.message });
      } finally {
        set({ loading: false });
      }
    },

    sendMessage: async (receiverId: string, message: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('chats')
          .insert({
            sender_id: user.id,
            receiver_id: receiverId,
            message,
          });

        if (error) throw error;
        await get().fetchChats();
      } catch (error: any) {
        console.error('Error sending message:', error);
      }
    },

    markChatAsRead: async (chatId: string) => {
      try {
        const { error } = await supabase
          .from('chats')
          .update({ read: true })
          .eq('id', chatId);

        if (error) throw error;
        await get().fetchChats();
      } catch (error: any) {
        console.error('Error marking chat as read:', error);
      }
    },

    setActiveChat: (chat) => {
      set({ activeChat: chat });
    },

    subscribeToChats: () => {
      const setupSubscription = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        chatSubscription = supabase
          .channel('chats')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chats',
              filter: `receiver_id=eq.${user.id}`,
            },
            () => {
              get().fetchChats();
            }
          )
          .subscribe();
      };

      setupSubscription();
    },

    unsubscribeFromChats: () => {
      if (chatSubscription) {
        supabase.removeChannel(chatSubscription);
      }
    },
  };
});