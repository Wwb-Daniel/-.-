import React, { useState } from 'react';
import { Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Home, Search, PlusSquare, User, LogOut, Menu, X, Compass, Users, Settings, MessageCircle, Music } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useVideoStore } from '../../store/videoStore';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '../notifications/NotificationBell';
import ChatButton from '../chat/ChatButton';

interface NavLink {
  path: string;
  label: string;
}

interface UserMenuItem {
  path: string;
  label: string;
}

const navLinks: NavLink[] = [
  { path: '/', label: 'Inicio' },
  { path: '/explore', label: 'Explorar' },
  { path: '/upload', label: 'Subir' },
  { path: '/profile', label: 'Perfil' }
];

const userMenuItems: UserMenuItem[] = [
  { path: '/profile', label: 'Mi Perfil' },
  { path: '/settings', label: 'Configuración' },
  { path: '/messages', label: 'Mensajes' }
];

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { feedType, setFeedType } = useVideoStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Función para determinar si una ruta está activa
  const isRouteActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Función para determinar si el feed está activo
  const isFeedActive = (type: string) => {
    return feedType === type;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 100,
        damping: 20
      }}
      className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-shrink-0"
          >
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="Logo" className="h-8 w-8" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                VideoApp
              </span>
        </Link>
          </motion.div>

          {/* Navigation Links */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="hidden md:flex items-center space-x-8"
          >
            {navLinks.map((link) => (
              <motion.div
                key={link.path}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <NavLink
                  to={link.path}
                  className={({ isActive }: { isActive: boolean }) =>
                    `text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-blue-500'
                        : 'text-gray-300 hover:text-white'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </motion.div>
            ))}
          </motion.div>

          {/* User Menu */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center space-x-4"
          >
            {user ? (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 focus:outline-none"
                >
                  <img
                    src={user.user_metadata.avatar_url || '/default-avatar.png'}
                    alt="Profile"
                    className="h-8 w-8 rounded-full"
                  />
                  <span className="text-sm font-medium text-gray-300">
                    {user.user_metadata.username}
                  </span>
                </motion.button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5"
                    >
                      <div className="py-1">
                        {userMenuItems.map((item) => (
                          <motion.div
                            key={item.label}
                            whileHover={{ x: 5 }}
                          >
                            <Link
                              to={item.path}
                              className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              {item.label}
                            </Link>
                          </motion.div>
                        ))}
                        <motion.div
                          whileHover={{ x: 5 }}
                          className="border-t border-gray-700"
                        >
                <button
                            onClick={handleSignOut}
                            className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                          >
                            Cerrar sesión
                </button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center space-x-4"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsLoginModalOpen(true)}
                  className="text-sm font-medium text-gray-300 hover:text-white"
                >
                  Iniciar sesión
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSignUpModalOpen(true)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Registrarse
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.nav>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isActive, onClick }) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center px-3 py-2 rounded-lg transition-colors duration-200 ${
        isActive 
          ? 'bg-blue-700 text-white' 
          : 'text-gray-300 hover:bg-gray-800'
      }`}
    >
      <div className="mr-3">{icon}</div>
      <span>{label}</span>
    </Link>
  );
};

export default Navbar;