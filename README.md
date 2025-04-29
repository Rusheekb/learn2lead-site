
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
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run database migrations:
   ```bash
   # On Unix/Linux/MacOS
   node scripts/make-executable.js
   ./scripts/db-migrate.js
   
   # On Windows
   node scripts/db-migrate.js
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Database Migrations

All SQL migrations are stored in the `supabase/migrations/` directory as timestamped .sql files. These files are run in alphabetical order (by timestamp) when you execute the migration script.

To add a new migration:

1. Create a new file in the `supabase/migrations/` directory with a timestamp prefix (YYYYMMDD_description.sql)
2. Add your SQL statements to the file
3. Run the migration script as described in the Development Setup section

## Building for Production

Build the optimized production bundle:

```bash
npm run build
```

## Additional Configuration

For more information about Vite environment variables and modes, see [Vite's documentation](https://vitejs.dev/guide/env-and-mode.html).

