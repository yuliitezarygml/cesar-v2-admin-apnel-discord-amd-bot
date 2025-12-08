/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['cdn.discordapp.com'],
    },
    output: 'standalone', // Для Docker
}

module.exports = nextConfig
