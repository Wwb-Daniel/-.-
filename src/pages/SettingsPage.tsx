import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Lock, Bell, HelpCircle, DollarSign, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { UserSettings } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import ChangePasswordForm from '../components/auth/ChangePasswordForm';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('account');
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivateAccountToggle = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ private_account: !settings.private_account })
        .eq('user_id', settings.user_id);

      if (error) throw error;
      setSettings({ ...settings, private_account: !settings.private_account });
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReceiveNotificationsToggle = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ receive_notifications: !settings.receive_notifications })
        .eq('user_id', settings.user_id);

      if (error) throw error;
      setSettings({ ...settings, receive_notifications: !settings.receive_notifications });
    } catch (error) {
      console.error('Error updating notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDonationClick = () => {
    window.open('https://paypal.me/Daniel13341?country.x=DO&locale.x=es_XC', '_blank');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return (
          <section className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Cuenta</h2>
            <div className="space-y-6">
              <p className="text-gray-300">Correo electrónico: <span className="font-medium text-white">{user?.email}</span></p>
              {!showChangePassword ? (
                <Button
                  onClick={() => setShowChangePassword(true)}
                  className="w-full flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white"
                >
                  <span>Cambiar Contraseña</span>
                </Button>
              ) : (
                <ChangePasswordForm onPasswordChanged={() => setShowChangePassword(false)} />
              )}
            </div>
          </section>
        );
      case 'privacy':
        return (
          <section className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Privacidad</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cuenta Privada</p>
                  <p className="text-sm text-gray-400">Solo los seguidores aprobados pueden ver tus videos</p>
                </div>
                <button
                  onClick={handlePrivateAccountToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings?.private_account ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                  disabled={saving}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings?.private_account ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <Button
                onClick={() => navigate('/settings/blocked-users')}
                className="w-full flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white"
              >
                <span>Usuarios Bloqueados</span>
              </Button>
            </div>
          </section>
        );
      case 'notifications':
        return (
          <section className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Notificaciones</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Recibir Notificaciones</p>
                <p className="text-sm text-gray-400">Recibe actualizaciones sobre nuevos videos, likes y comentarios</p>
              </div>
              <button
                onClick={handleReceiveNotificationsToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings?.receive_notifications ? 'bg-blue-500' : 'bg-gray-700'
                }`}
                disabled={saving}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.receive_notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>
        );
      case 'about':
        return (
          <section className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Acerca de</h2>
            <div className="space-y-2">
              <a href="#" className="block text-gray-300 hover:text-white transition-colors">Términos de Servicio</a>
              <a href="#" className="block text-gray-300 hover:text-white transition-colors">Política de Privacidad</a>
              <a href="#" className="block text-gray-300 hover:text-white transition-colors">Acerca de OmniPlay</a>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
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
            <h1 className="text-xl font-bold">Ajustes</h1>
            <div className="w-20" /> {/* Spacer for alignment */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Navigation Sidebar */}
          <div className="md:col-span-1">
            <nav className="space-y-1 bg-gray-800/50 rounded-lg p-4">
              <button 
                onClick={() => setActiveSection('account')}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'account' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <User size={20} className="mr-3" />
                <span>Cuenta</span>
              </button>
              <button 
                onClick={() => setActiveSection('privacy')}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'privacy' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Lock size={20} className="mr-3" />
                <span>Privacidad</span>
              </button>
              <button 
                onClick={() => setActiveSection('notifications')}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'notifications' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Bell size={20} className="mr-3" />
                <span>Notificaciones</span>
              </button>
              <button 
                onClick={() => setActiveSection('about')}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'about' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <HelpCircle size={20} className="mr-3" />
                <span>Acerca de</span>
              </button>
              <button 
                onClick={handleDonationClick}
                className="w-full flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <DollarSign size={20} className="mr-3" />
                <span>Apoyar</span>
              </button>
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut size={20} className="mr-3" />
                <span>Cerrar Sesión</span>
              </button>
            </nav>
          </div>

          {/* Settings Content */}
          <div className="md:col-span-2">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 