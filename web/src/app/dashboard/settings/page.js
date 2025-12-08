'use client';

import { useState } from 'react';
import { Settings, Info, ChevronDown, ChevronUp } from 'lucide-react';

const COMMANDS = [
    {
        cmd: '/ban',
        desc: 'Забанить пользователя',
        examples: [
            '/ban user:@пользователь reason:Нарушение правил',
            '/ban user:@пользователь days:7 reason:Спам',
        ]
    },
    {
        cmd: '/unban',
        desc: 'Разбанить пользователя',
        examples: [
            '/unban user_id:123456789012345678',
            '/unban user_id:123456789012345678 reason:Апелляция принята',
        ]
    },
    {
        cmd: '/kick',
        desc: 'Кикнуть пользователя',
        examples: [
            '/kick user:@пользователь',
            '/kick user:@пользователь reason:Нарушение правил',
        ]
    },
    {
        cmd: '/timeout',
        desc: 'Выдать таймаут (мут)',
        examples: [
            '/timeout user:@пользователь duration:60',
            '/timeout user:@пользователь duration:1440 reason:Спам в чате',
        ]
    },
    {
        cmd: '/untimeout',
        desc: 'Снять таймаут',
        examples: [
            '/untimeout user:@пользователь',
            '/untimeout user:@пользователь reason:Ошибка модератора',
        ]
    },
    {
        cmd: '/warn',
        desc: 'Выдать предупреждение',
        examples: [
            '/warn user:@пользователь reason:Первое нарушение',
            '/warn user:@пользователь reason:Оскорбления в чате',
        ]
    },
    {
        cmd: '/unwarn',
        desc: 'Снять предупреждение',
        examples: [
            '/unwarn user:@пользователь',
            '/unwarn user:@пользователь id:5',
            '/unwarn user:@пользователь all:True',
        ]
    },
    {
        cmd: '/warnings',
        desc: 'Посмотреть предупреждения',
        examples: [
            '/warnings',
            '/warnings user:@пользователь',
        ]
    },
    {
        cmd: '/stats',
        desc: 'Статистика модерации сервера',
        examples: [
            '/stats',
            '/stats period:24h',
            '/stats period:30d',
        ]
    },
    {
        cmd: '/userinfo',
        desc: 'Информация о пользователе',
        examples: [
            '/userinfo',
            '/userinfo user:@пользователь',
        ]
    },
    {
        cmd: '/setlogchannel',
        desc: 'Установить канал для логов',
        examples: [
            '/setlogchannel channel:#mod-logs',
        ]
    },
    {
        cmd: '/clear',
        desc: 'Удалить сообщения в канале',
        examples: [
            '/clear amount:50',
            '/clear amount:100 user:@спамер',
        ]
    },
    {
        cmd: '/slowmode',
        desc: 'Установить задержку между сообщениями',
        examples: [
            '/slowmode seconds:10',
            '/slowmode seconds:0 channel:#general',
        ]
    },
    {
        cmd: '/lock',
        desc: 'Заблокировать канал',
        examples: [
            '/lock',
            '/lock channel:#general reason:Рейд',
        ]
    },
    {
        cmd: '/unlock',
        desc: 'Разблокировать канал',
        examples: [
            '/unlock',
            '/unlock channel:#general',
        ]
    },
    {
        cmd: '/role',
        desc: 'Добавить/удалить роль',
        examples: [
            '/role add user:@пользователь role:@VIP',
            '/role remove user:@пользователь role:@VIP',
        ]
    },
    {
        cmd: '/history',
        desc: 'История модерации пользователя',
        examples: [
            '/history user:@пользователь',
            '/history user:@пользователь page:2',
        ]
    },
    {
        cmd: '/note',
        desc: 'Заметки о пользователе',
        examples: [
            '/note add user:@пользователь text:Подозрительный аккаунт',
            '/note view user:@пользователь',
            '/note delete user:@пользователь id:5',
        ]
    },
];

export default function SettingsPage() {
    const [expandedCmd, setExpandedCmd] = useState(null);

    const toggleCmd = (cmd) => {
        setExpandedCmd(expandedCmd === cmd ? null : cmd);
    };

    return (
        <div className="p-6 animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Настройки</h1>
                <p className="text-gray-400">Настройки панели администратора</p>
            </div>

            {/* Settings Cards */}
            <div className="space-y-6">
                {/* API Info */}
                <div className="bg-discord-dark rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Info className="w-5 h-5 text-discord-blurple" />
                        <h2 className="text-xl font-semibold text-white">Информация о системе</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-discord-lighter rounded-lg p-4">
                            <p className="text-gray-400 text-sm mb-1">API URL</p>
                            <p className="text-white font-mono text-sm">
                                {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}
                            </p>
                        </div>
                        <div className="bg-discord-lighter rounded-lg p-4">
                            <p className="text-gray-400 text-sm mb-1">Версия панели</p>
                            <p className="text-white font-mono text-sm">1.0.0</p>
                        </div>
                    </div>
                </div>

                {/* Bot Commands */}
                <div className="bg-discord-dark rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings className="w-5 h-5 text-discord-blurple" />
                        <h2 className="text-xl font-semibold text-white">Доступные команды бота</h2>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">Нажмите на команду чтобы увидеть примеры использования</p>

                    <div className="space-y-2">
                        {COMMANDS.map((item) => (
                            <div key={item.cmd} className="bg-discord-lighter rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleCmd(item.cmd)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-discord-light transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <code className="text-discord-blurple font-mono">{item.cmd}</code>
                                        <span className="text-gray-400 text-sm">{item.desc}</span>
                                    </div>
                                    {expandedCmd === item.cmd ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>

                                {expandedCmd === item.cmd && (
                                    <div className="px-3 pb-3 border-t border-gray-700">
                                        <p className="text-gray-400 text-xs mt-2 mb-2">Примеры:</p>
                                        <div className="space-y-1">
                                            {item.examples.map((example, i) => (
                                                <div key={i} className="bg-discord-dark rounded p-2">
                                                    <code className="text-discord-green text-sm font-mono">{example}</code>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
