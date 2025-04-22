# Learn2Lead Application

## Environment Variables

This project uses environment variables for configuration. To keep your credentials safe, **do not commit** any local environment files. Make sure the following entries exist in your `.gitignore`:

```
.env.local
.env.*.local
```

A template for your environment variables is provided in `.env.example`.

## Development Setup

1. Copy the example file and rename it to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and fill in your real Supabase values:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Install dependencies and start the development server:
   ```bash
   npm install
   npm run dev
   ```

## Building for Production

Build the optimized production bundle:

```bash
npm run build
```

## Additional Configuration

For more information about Vite environment variables and modes, see [Vite's documentation](https://vitejs.dev/guide/env-and-mode.html).
