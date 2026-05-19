const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

if (process.env.NODE_ENV === "production") {
  if (!configuredApiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is required for production builds.")
  }

  const apiUrl = new URL(configuredApiUrl)

  if (["localhost", "127.0.0.1", "::1"].includes(apiUrl.hostname)) {
    throw new Error(
      "NEXT_PUBLIC_API_URL must not point to localhost in production builds."
    )
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
}

export default nextConfig
