/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Accept the VITE_-prefixed names from the project brief as well as NEXT_PUBLIC_
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      "",
  },
}

export default nextConfig
