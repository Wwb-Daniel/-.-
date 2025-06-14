import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { motion } from 'framer-motion';

interface EditProfileModalProps {
  profile: {
    username: string;
    bio?: string;
    avatar_url?: string;
  };
  onClose: () => void;
  onUpdate: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  profile,
  onClose,
  onUpdate,
}) => {
  const [formData, setFormData] = useState({
    username: profile.username,
    bio: profile.bio || '',
    avatar_url: profile.avatar_url || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(profile.avatar_url || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (url: string) => {
    setFormData({ ...formData, avatar_url: url });
    setPreviewUrl(url);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe ser menor a 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Necesitas iniciar sesión para subir un avatar');
      }

      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log('Subiendo archivo:', {
        userId: user.id,
        filePath,
        fileType: file.type
      });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        console.error('Error de subida:', uploadError);
        throw new Error(`Error al subir la imagen: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Avatar subido exitosamente:', publicUrl);
      handleAvatarChange(publicUrl);

    } catch (err: any) {
      console.error('Error en handleImageUpload:', err);
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No autenticado');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
        })
        .eq('id', userData.user.id);

      if (updateError) throw updateError;

      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message);
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
        className="bg-gray-900 rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Editar Perfil</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-800">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Vista previa del avatar"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={() => setPreviewUrl('')}
                  />
                ) : (
                  <div className="w-full h-24 flex items-center justify-center text-gray-400">
                    <ImageIcon size={32} />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors"
                  disabled={uploadingImage}
                >
                  <Upload size={20} className="text-white" />
                </button>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="w-full">
              <Input
                label="URL de Avatar (opcional)"
                placeholder="Ingresa una URL de imagen o sube una"
                value={formData.avatar_url}
                onChange={(e) => handleAvatarChange(e.target.value)}
                fullWidth
              />
              <p className="text-xs text-gray-500 mt-1">
                Puedes pegar una URL de imagen o subir una desde tu dispositivo.
              </p>
            </div>
          </div>

          <Input
            label="Nombre de Usuario"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            fullWidth
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Biografía
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Cuéntanos sobre ti..."
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={loading || uploadingImage}
              className="flex-1"
            >
              Guardar Cambios
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default EditProfileModal;