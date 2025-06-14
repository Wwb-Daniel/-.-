import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layout
import AuthGuard from './components/layout/AuthGuard';
import AppLayout from './components/layout/AppLayout';
import ToastContainer from './components/ui/ToastContainer';

// Auth pages
import AuthPage from './pages/AuthPage';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';

// Main app pages
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import UploadPage from './pages/UploadPage';
import SearchPage from './pages/SearchPage';
import AudioTracksPage from './pages/AudioTracksPage';
import AudioDetailsPage from './pages/AudioDetailsPage';
import SettingsPage from './pages/SettingsPage';
import BlockedUsersPage from './pages/BlockedUsersPage';

function App() {
  const { initialize, initialized } = useAuthStore();
  
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center space-y-4">
          <img src="/logo (2).png" alt="OmniPlay" className="w-16 h-16 animate-pulse" />
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Loading OmniPlay...</p>
        </div>
      </div>
    );
  }
  
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white">
        <Routes>
          {/* Auth routes */}
          <Route path="/auth" element={<AuthPage />}>
            <Route path="login" element={<LoginForm />} />
            <Route path="register" element={<RegisterForm />} />
            <Route index element={<Navigate to="/auth/login" replace />} />
          </Route>
          
          {/* Protected routes */}
          <Route path="/" element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }>
            <Route index element={<HomePage />} />
            <Route path="profile/:id" element={<ProfilePage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="audio" element={<AudioTracksPage />} />
            <Route path="audio/:id" element={<AudioDetailsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/blocked-users" element={<BlockedUsersPage />} />
          </Route>
          
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Global Toast Container */}
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
}

export default App;