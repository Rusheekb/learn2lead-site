
# Learn2Lead Application

## Environment Variables

This project uses environment variables for configuration. Since we cannot modify the `.gitignore` file, please manually ensure that the following files are not committed to version control:

```
.env.local
.env.*.local
```

## Development Setup

1. Copy the `.env.local` file template:
   ```bash
   cp .env .env.local
   ```

2. Update any sensitive values in your `.env.local` file

3. Run the development server:
   ```bash
   npm run dev
   ```

## Building for Production

```bash
npm run build
```

## Additional Configuration

For more information about Vite environment variables, see [Vite's documentation](https://vitejs.dev/guide/env-and-mode.html).
