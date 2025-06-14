-- Eliminar la tabla existente si existe
DROP TABLE IF EXISTS likes CASCADE;

-- Crear la tabla likes con las relaciones correctas
CREATE TABLE likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('video', 'comment')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, content_id, content_type)
);

-- Crear índices
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_content ON likes(content_id, content_type);
CREATE INDEX idx_likes_created_at ON likes(created_at);

-- Crear políticas de seguridad
CREATE POLICY "Users can view all likes"
    ON likes
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create their own likes"
    ON likes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
    ON likes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Crear función para manejar notificaciones de likes
CREATE OR REPLACE FUNCTION handle_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    content_owner_id UUID;
BEGIN
    -- Obtener el propietario del contenido
    IF NEW.content_type = 'video' THEN
        SELECT user_id INTO content_owner_id
        FROM videos
        WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'comment' THEN
        SELECT user_id INTO content_owner_id
        FROM comments
        WHERE id = NEW.content_id;
    END IF;

    -- No crear notificación si el usuario se da like a sí mismo
    IF content_owner_id = NEW.user_id THEN
        RETURN NEW;
    END IF;

    -- Crear notificación
    INSERT INTO notifications (
        user_id,
        type,
        content_id,
        actor_id
    ) VALUES (
        content_owner_id,
        'like',
        NEW.content_id,
        NEW.user_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para notificaciones de likes
CREATE TRIGGER on_like_created
    AFTER INSERT ON likes
    FOR EACH ROW
    EXECUTE FUNCTION handle_like_notification();

-- Modificar la tabla likes existente
ALTER TABLE likes
    -- Eliminar columnas redundantes si existen
    DROP COLUMN IF EXISTS video_id,
    DROP COLUMN IF EXISTS comment_id;

    -- Asegurar que las columnas necesarias existen con los tipos correctos
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN content_id SET NOT NULL,
    ALTER COLUMN content_type SET NOT NULL,
    ADD CONSTRAINT likes_content_type_check 
        CHECK (content_type IN ('video', 'comment')),
    ADD CONSTRAINT likes_user_content_unique 
        UNIQUE(user_id, content_id, content_type);

-- Crear índices si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_likes_user_id') THEN
        CREATE INDEX idx_likes_user_id ON likes(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_likes_content') THEN
        CREATE INDEX idx_likes_content ON likes(content_id, content_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_likes_created_at') THEN
        CREATE INDEX idx_likes_created_at ON likes(created_at);
    END IF;
END $$;

-- Crear o reemplazar políticas de seguridad
DROP POLICY IF EXISTS "Users can view all likes" ON likes;
DROP POLICY IF EXISTS "Users can create their own likes" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;

CREATE POLICY "Users can view all likes"
    ON likes
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create their own likes"
    ON likes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
    ON likes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Crear o reemplazar función para manejar notificaciones de likes
CREATE OR REPLACE FUNCTION handle_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    content_owner_id UUID;
BEGIN
    -- Obtener el propietario del contenido
    IF NEW.content_type = 'video' THEN
        SELECT user_id INTO content_owner_id
        FROM videos
        WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'comment' THEN
        SELECT user_id INTO content_owner_id
        FROM comments
        WHERE id = NEW.content_id;
    END IF;

    -- No crear notificación si el usuario se da like a sí mismo
    IF content_owner_id = NEW.user_id THEN
        RETURN NEW;
    END IF;

    -- Crear notificación
    INSERT INTO notifications (
        user_id,
        type,
        content_id,
        actor_id
    ) VALUES (
        content_owner_id,
        'like',
        NEW.content_id,
        NEW.user_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear o reemplazar trigger para notificaciones de likes
DROP TRIGGER IF EXISTS on_like_created ON likes;
CREATE TRIGGER on_like_created
    AFTER INSERT ON likes
    FOR EACH ROW
    EXECUTE FUNCTION handle_like_notification(); 