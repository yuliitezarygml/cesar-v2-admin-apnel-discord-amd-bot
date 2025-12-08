import './globals.css'

export const metadata = {
    title: 'Discord Moderation Panel',
    description: 'Admin panel for Discord moderation bot',
}

export default function RootLayout({ children }) {
    return (
        <html lang="ru">
            <body>{children}</body>
        </html>
    )
}
