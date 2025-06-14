import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, PlusSquare, User, Menu, X, Compass, Users, Settings, MessageCircle, Music, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useVideoStore } from '../../store/videoStore';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '../notifications/NotificationBell';
import ChatButton from '../chat/ChatButton';

const ImprovedNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { feedType, setFeedType } = useVideoStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Home', isActive: location.pathname === '/' },
    { to: '/search', icon: Search, label: 'Search', isActive: location.pathname === '/search' },
    { to: '/upload', icon: PlusSquare, label: 'Upload', isActive: location.pathname === '/upload' },
    { to: '/audio', icon: Music, label: 'Audio', isActive: location.pathname === '/audio' },
    { to: `/profile/${user?.id}`, icon: User, label: 'Profile', isActive: location.pathname.startsWith('/profile') }
  ];

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-md border-b border-gray-800/50 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <motion.img 
                src="/logo (2).png" 
                alt="OmniPlay Logo" 
                className="h-8 w-8"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <span className="text-xl font-bold bg-gradient-brand text-transparent bg-clip-text group-hover:scale-105 transition-transform">
                OmniPlay
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`
                    relative px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2
                    ${item.isActive 
                      ? 'bg-blue-700 shadow-lg' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                    }
                  `}
                >
                  <item.icon size={20} className={`${item.isActive ? '!text-white' : ''}`} />
                  <span className={`font-medium ${item.isActive ? '!text-white' : ''}`}>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">
              <NotificationBell />
              <ChatButton />
              
              {/* Settings Button */}
              <motion.button
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Settings size={20} />
              </motion.button>

              {/* Mobile Menu Button */}
              <button
                onClick={toggleMenu}
                className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Feed Type Selector (Desktop) */}
        {location.pathname === '/' && (
          <div className="hidden md:block border-t border-gray-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center space-x-1 py-2">
                <button
                  onClick={() => setFeedType('all')}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${feedType === 'all' 
                      ? 'bg-blue-700 shadow-md' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }
                  `}
                >
                  <Compass size={16} className={`inline mr-2 ${feedType === 'all' ? '!text-white' : ''}`} />
                  <span className={`${feedType === 'all' ? '!text-white' : ''}`}>For You</span>
                </button>
                <button
                  onClick={() => setFeedType('following')}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${feedType === 'following' 
                      ? 'bg-blue-700 shadow-md' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }
                  `}
                >
                  <Users size={16} className={`inline mr-2 ${feedType === 'following' ? '!text-white' : ''}`} />
                  <span className={`${feedType === 'following' ? '!text-white' : ''}`}>Following</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-gray-900 z-50 md:hidden overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-2">
                    <img src="/logo (2).png" alt="OmniPlay" className="h-8 w-8" />
                    <span className="text-xl font-bold bg-gradient-brand text-transparent bg-clip-text">
                      OmniPlay
                    </span>
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 text-gray-400 hover:text-white rounded-lg"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Feed Type Selector (Mobile) */}
                {location.pathname === '/' && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Feed</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setFeedType('all');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center px-3 py-3 rounded-lg transition-colors ${
                          feedType === 'all' ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <Compass size={20} className="mr-3 ${feedType === 'all' ? '!text-white' : ''}" />
                        <span className={`${feedType === 'all' ? '!text-white' : ''}`}>For You</span>
                      </button>
                      <button
                        onClick={() => {
                          setFeedType('following');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center px-3 py-3 rounded-lg transition-colors ${
                          feedType === 'following' ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <Users size={20} className="mr-3 ${feedType === 'following' ? '!text-white' : ''}" />
                        <span className={`${feedType === 'following' ? '!text-white' : ''}`}>Following</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Navigation Items */}
                <div className="space-y-2 mb-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMenuOpen(false)}
                      className={`
                        w-full flex items-center px-3 py-3 rounded-lg transition-colors
                        ${item.isActive 
                          ? 'bg-blue-700 text-white' 
                          : 'text-gray-300 hover:bg-gray-800'
                        }
                      `}
                    >
                      <item.icon size={20} className="mr-3 ${item.isActive ? '!text-white' : ''}" />
                      <span className={`font-medium ${item.isActive ? '!text-white' : ''}`}>{item.label}</span>
                    </Link>
                  ))}
                </div>

                {/* Settings */}
                <button
                  onClick={() => {
                    navigate('/settings');
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors mb-4"
                >
                  <Settings size={20} className="mr-3" />
                  <span>Settings</span>
                </button>

                {/* Sign Out */}
                <button
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div className="h-16" />
    </>
  );
};

export default ImprovedNavbar;