import Link from 'next/link';
import { Shield, ArrowRight, BarChart3, ScrollText, Users } from 'lucide-react';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-discord-darker via-discord-dark to-discord-darker flex flex-col">
            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
                <div className="text-center max-w-3xl mx-auto animate-fadeIn">
                    {/* Logo */}
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-discord-blurple rounded-2xl mb-8 shadow-lg shadow-discord-blurple/30">
                        <Shield className="w-10 h-10 text-white" />
                    </div>

                    <h1 className="text-5xl font-bold text-white mb-4">
                        Discord Moderation
                        <span className="text-discord-blurple"> Panel</span>
                    </h1>

                    <p className="text-xl text-gray-400 mb-8 max-w-xl mx-auto">
                        Полный контроль над модерацией вашего Discord сервера.
                        Отслеживайте действия, анализируйте статистику.
                    </p>

                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-discord-blurple text-white font-semibold rounded-xl hover:bg-discord-blurple/80 transition-all hover:scale-105 shadow-lg shadow-discord-blurple/30"
                    >
                        Открыть панель
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto px-4">
                    <FeatureCard
                        icon={<ScrollText className="w-8 h-8" />}
                        title="Логи модерации"
                        description="Все действия модераторов записываются автоматически"
                    />
                    <FeatureCard
                        icon={<BarChart3 className="w-8 h-8" />}
                        title="Статистика"
                        description="Подробная аналитика активности модерации"
                    />
                    <FeatureCard
                        icon={<Users className="w-8 h-8" />}
                        title="История пользователей"
                        description="Полная история взаимодействий с каждым пользователем"
                    />
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-gray-500 text-sm">
                <p>Discord Moderation Bot © {new Date().getFullYear()}</p>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <div className="bg-discord-dark/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 card-hover">
            <div className="text-discord-blurple mb-4">{icon}</div>
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-400 text-sm">{description}</p>
        </div>
    );
}
