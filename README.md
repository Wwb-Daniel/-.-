# OmniPlay - Modern Video Sharing Platform

OmniPlay is a modern video sharing application built with React, TypeScript, and Supabase. It provides a TikTok-like experience where users can upload, view, and interact with short-form videos.

## Features

- Complete user authentication (sign up, login)
- Video upload and playback
- Infinite scroll video feed
- User profiles
- Video interactions (likes, comments)
- Search functionality
- Responsive design for all devices

## Tech Stack

- **Frontend:** React, TypeScript, TailwindCSS, Framer Motion
- **Backend:** Supabase (Authentication, Database, Storage)
- **State Management:** Zustand
- **Routing:** React Router
- **Build Tool:** Vite

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials

4. Start the development server:
   ```
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

### Manual Build

```bash
npm run build
```

## Supabase Setup

Before running the application, you need to set up Supabase:

1. Create a new Supabase project
2. Run the SQL migration in `supabase/migrations/create_initial_schema.sql`
3. Set up Storage buckets (REQUIRED):
   - Go to Storage in your Supabase dashboard
   - Create buckets: "videos", "audio_tracks", "avatars", "thumbnails"
   - Enable public access for all buckets
   - Set appropriate CORS configuration

## Project Structure

- `/src/components` - React components organized by feature
- `/src/pages` - Page components for different routes
- `/src/lib` - Utility functions and shared code
- `/src/store` - Zustand stores for state management
- `/supabase` - Supabase migrations and configuration

## License

MIT