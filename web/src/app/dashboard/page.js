'use client';

import { useState, useEffect } from 'react';
import {
    Ban,
    UserX,
    VolumeX,
    Volume2,
    AlertTriangle,
    Clock,
    TrendingUp,
    Users,
    Activity
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        try {
            const response = await fetch(`${API_URL}/api/stats`);
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-4 border-discord-blurple border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const actionStats = stats?.actionStats || {};

    return (
        <div className="p-6 animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Дашборд</h1>
                <p className="text-gray-400">Обзор активности модерации за последние 7 дней</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Всего действий"
                    value={stats?.totalActions || 0}
                    icon={<Activity className="w-6 h-6" />}
                    color="blurple"
                />
                <StatCard
                    title="Баны"
                    value={actionStats.BAN || 0}
                    icon={<Ban className="w-6 h-6" />}
                    color="red"
                />
                <StatCard
                    title="Кики"
                    value={actionStats.KICK || 0}
                    icon={<UserX className="w-6 h-6" />}
                    color="yellow"
                />
                <StatCard
                    title="Таймауты"
                    value={actionStats.TIMEOUT || 0}
                    icon={<VolumeX className="w-6 h-6" />}
                    color="gray"
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatCard
                    title="Предупреждения"
                    value={actionStats.WARN || 0}
                    icon={<AlertTriangle className="w-6 h-6" />}
                    color="yellow"
                    small
                />
                <StatCard
                    title="Разбаны"
                    value={actionStats.UNBAN || 0}
                    icon={<Volume2 className="w-6 h-6" />}
                    color="green"
                    small
                />
                <StatCard
                    title="Снятие таймаутов"
                    value={actionStats.REMOVE_TIMEOUT || 0}
                    icon={<Clock className="w-6 h-6" />}
                    color="green"
                    small
                />
            </div>

            {/* Top Moderators */}
            <div className="bg-discord-dark rounded-xl p-6 card-hover">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-discord-blurple" />
                    <h2 className="text-xl font-semibold text-white">Топ модераторов</h2>
                </div>

                {stats?.topModerators?.length > 0 ? (
                    <div className="space-y-3">
                        {stats.topModerators.slice(0, 5).map((mod, index) => (
                            <div
                                key={mod.moderatorId}
                                className="flex items-center justify-between p-3 bg-discord-lighter rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 flex items-center justify-center bg-discord-blurple rounded-full text-sm font-bold">
                                        {index + 1}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        <span className="text-white font-medium">
                                            {mod.user?.username || 'Неизвестный'}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-discord-blurple font-bold">
                                    {mod._count.moderatorId} действий
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-8">
                        Нет данных о модераторах
                    </p>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color, small }) {
    const colorClasses = {
        blurple: 'bg-discord-blurple/20 text-discord-blurple',
        red: 'bg-discord-red/20 text-discord-red',
        yellow: 'bg-discord-yellow/20 text-discord-yellow',
        green: 'bg-discord-green/20 text-discord-green',
        gray: 'bg-gray-600/20 text-gray-400',
    };

    return (
        <div className={`bg-discord-dark rounded-xl p-${small ? '4' : '6'} card-hover`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
            <p className="text-gray-400 text-sm mb-1">{title}</p>
            <p className={`text-${small ? '2xl' : '3xl'} font-bold text-white`}>{value}</p>
        </div>
    );
}
