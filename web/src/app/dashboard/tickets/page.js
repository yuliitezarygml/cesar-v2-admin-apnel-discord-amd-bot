'use client';

import { useState, useEffect } from 'react';

export default function TicketsPage() {
    const [guilds, setGuilds] = useState([]);
    const [selectedGuild, setSelectedGuild] = useState('');
    const [tickets, setTickets] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    
    // Модальное окно с деталями тикета
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [ticketMessages, setTicketMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closeReason, setCloseReason] = useState('');
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        fetchGuilds();
    }, []);

    useEffect(() => {
        if (selectedGuild) {
            fetchTicketData();
        }
    }, [selectedGuild]);

    const fetchGuilds = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/guilds');
            const data = await res.json();
            setGuilds(data);
            if (data.length > 0) {
                setSelectedGuild(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching guilds:', error);
        }
    };

    const fetchTicketData = async () => {
        setLoading(true);
        try {
            const [ticketsRes, settingsRes] = await Promise.all([
                fetch(`http://localhost:3001/api/tickets/${selectedGuild}`),
                fetch(`http://localhost:3001/api/tickets/${selectedGuild}/settings`)
            ]);
            
            const ticketsData = await ticketsRes.json();
            const settingsData = await settingsRes.json();
            
            setTickets(ticketsData);
            setSettings(settingsData);
        } catch (error) {
            console.error('Error fetching ticket data:', error);
        } finally {
            setLoading(false);
        }
    };

    const openTicketDetails = async (ticket) => {
        setSelectedTicket(ticket);
        setMessagesLoading(true);
        setTicketMessages([]);
        
        try {
            const res = await fetch(`http://localhost:3001/api/tickets/${selectedGuild}/ticket/${ticket.id}/messages`);
            const data = await res.json();
            setTicketMessages(data.messages || []);
        } catch (error) {
            console.error('Error fetching ticket messages:', error);
        } finally {
            setMessagesLoading(false);
        }
    };

    const closeTicket = async () => {
        if (!selectedTicket) return;
        
        setClosing(true);
        try {
            const res = await fetch(
                `http://localhost:3001/api/tickets/${selectedGuild}/ticket/${selectedTicket.id}/close`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        reason: closeReason || 'Закрыт через веб-панель',
                        closedBy: 'web-panel'
                    })
                }
            );
            
            if (res.ok) {
                alert('✅ Тикет закрыт! Пользователь получит уведомление, канал удалится через 10 секунд.');
                setShowCloseModal(false);
                setSelectedTicket(null);
                setCloseReason('');
                fetchTicketData();
            } else {
                const error = await res.json();
                alert('❌ Ошибка: ' + (error.error || 'Не удалось закрыть тикет'));
            }
        } catch (error) {
            console.error('Error closing ticket:', error);
            alert('❌ Ошибка соединения с сервером');
        } finally {
            setClosing(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            'OPEN': { color: 'bg-green-600', text: '🟢 Открыт' },
            'CLAIMED': { color: 'bg-yellow-600', text: '🟡 В работе' },
            'CLOSED': { color: 'bg-red-600', text: '🔴 Закрыт' }
        };
        const badge = badges[status] || badges['OPEN'];
        return (
            <span className={`${badge.color} text-white text-xs px-2 py-1 rounded`}>
                {badge.text}
            </span>
        );
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const isImageFile = (contentType) => {
        return contentType && contentType.startsWith('image/');
    };

    const filteredTickets = tickets.filter(ticket => {
        if (filter === 'all') return true;
        return ticket.status === filter;
    });

    const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'OPEN').length,
        claimed: tickets.filter(t => t.status === 'CLAIMED').length,
        closed: tickets.filter(t => t.status === 'CLOSED').length
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">🎫 Тикеты поддержки</h1>
                <select
                    value={selectedGuild}
                    onChange={(e) => setSelectedGuild(e.target.value)}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                    {guilds.map((guild) => (
                        <option key={guild.id} value={guild.id}>
                            {guild.name}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="text-center text-gray-400 py-10">Загрузка...</div>
            ) : (
                <>
                    {/* Статистика */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="text-3xl font-bold text-white">{stats.total}</div>
                            <div className="text-gray-400">Всего тикетов</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="text-3xl font-bold text-green-400">{stats.open}</div>
                            <div className="text-gray-400">Открытых</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="text-3xl font-bold text-yellow-400">{stats.claimed}</div>
                            <div className="text-gray-400">В работе</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="text-3xl font-bold text-red-400">{stats.closed}</div>
                            <div className="text-gray-400">Закрытых</div>
                        </div>
                    </div>

                    {/* Настройки */}
                    {settings && (
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-white mb-4">⚙️ Настройки тикетов</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-400">Статус:</span>
                                    <span className={`ml-2 ${settings.enabled ? 'text-green-400' : 'text-red-400'}`}>
                                        {settings.enabled ? '✓ Включено' : '✗ Выключено'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Макс. тикетов на юзера:</span>
                                    <span className="ml-2 text-white">{settings.maxTicketsPerUser}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Роль поддержки:</span>
                                    <span className="ml-2 text-white">{settings.supportRoleId || 'Не указана'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Категория:</span>
                                    <span className="ml-2 text-white">{settings.categoryId || 'Не указана'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Фильтры */}
                    <div className="flex gap-2">
                        {['all', 'OPEN', 'CLAIMED', 'CLOSED'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    filter === f 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {f === 'all' ? 'Все' : f === 'OPEN' ? 'Открытые' : f === 'CLAIMED' ? 'В работе' : 'Закрытые'}
                            </button>
                        ))}
                    </div>

                    {/* Список тикетов */}
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-700">
                                <tr>
                                    <th className="text-left px-6 py-3 text-gray-300">#</th>
                                    <th className="text-left px-6 py-3 text-gray-300">Пользователь</th>
                                    <th className="text-left px-6 py-3 text-gray-300">Статус</th>
                                    <th className="text-left px-6 py-3 text-gray-300">Взял</th>
                                    <th className="text-left px-6 py-3 text-gray-300">Создан</th>
                                    <th className="text-left px-6 py-3 text-gray-300">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTickets.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center text-gray-500 py-8">
                                            Тикеты не найдены
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTickets.map((ticket) => (
                                        <tr key={ticket.id} className="border-b border-gray-700 hover:bg-gray-750">
                                            <td className="px-6 py-4 text-white font-mono">#{ticket.ticketNumber || ticket.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {ticket.user?.avatarUrl && (
                                                        <img src={ticket.user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                                                    )}
                                                    <span className="text-white">{ticket.user?.displayName || ticket.userId}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{getStatusBadge(ticket.status)}</td>
                                            <td className="px-6 py-4">
                                                {ticket.claimedByUser ? (
                                                    <div className="flex items-center gap-2">
                                                        {ticket.claimedByUser.avatarUrl && (
                                                            <img src={ticket.claimedByUser.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                                                        )}
                                                        <span className="text-gray-300">{ticket.claimedByUser.displayName}</span>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-400">
                                                {new Date(ticket.createdAt).toLocaleString('ru')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openTicketDetails(ticket)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm"
                                                    >
                                                        👁️ Просмотр
                                                    </button>
                                                    {ticket.status !== 'CLOSED' && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedTicket(ticket);
                                                                setShowCloseModal(true);
                                                            }}
                                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                                                        >
                                                            🔒 Закрыть
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Модальное окно просмотра тикета */}
            {selectedTicket && !showCloseModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Заголовок */}
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    🎫 Тикет #{selectedTicket.ticketNumber || selectedTicket.id}
                                </h2>
                                <div className="flex gap-4 mt-1 text-sm text-gray-400 items-center">
                                    <span className="flex items-center gap-1">
                                        Создатель:
                                        {selectedTicket.user?.avatarUrl && (
                                            <img src={selectedTicket.user.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                                        )}
                                        <span className="text-white">{selectedTicket.user?.displayName || selectedTicket.userId}</span>
                                    </span>
                                    <span>{getStatusBadge(selectedTicket.status)}</span>
                                    <span>{new Date(selectedTicket.createdAt).toLocaleString('ru')}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {selectedTicket.status !== 'CLOSED' && (
                                    <button
                                        onClick={() => setShowCloseModal(true)}
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                                    >
                                        🔒 Закрыть тикет
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                                >
                                    ✕ Закрыть
                                </button>
                            </div>
                        </div>

                        {/* Сообщения */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messagesLoading ? (
                                <div className="text-center text-gray-400 py-10">
                                    Загрузка сообщений...
                                </div>
                            ) : ticketMessages.length === 0 ? (
                                <div className="text-center text-gray-500 py-10">
                                    Сообщения не найдены
                                </div>
                            ) : (
                                ticketMessages.map((msg, index) => (
                                    <div key={msg.id || index} className={`flex gap-3 ${msg.isBot ? 'opacity-75' : ''}`}>
                                        {/* Аватар */}
                                        <div className="flex-shrink-0">
                                            {msg.avatarUrl ? (
                                                <img 
                                                    src={msg.avatarUrl} 
                                                    alt={msg.username}
                                                    className="w-10 h-10 rounded-full"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                                                    {(msg.username || 'U')[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>

                                        {/* Контент */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`font-semibold ${msg.isBot ? 'text-indigo-400' : 'text-white'}`}>
                                                    {msg.username || msg.userId}
                                                </span>
                                                {msg.isBot && (
                                                    <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded">BOT</span>
                                                )}
                                                <span className="text-gray-500 text-xs">
                                                    {new Date(msg.createdAt).toLocaleString('ru')}
                                                </span>
                                            </div>

                                            {/* Текст сообщения */}
                                            {msg.content && (
                                                <p className="text-gray-300 whitespace-pre-wrap break-words">
                                                    {msg.content}
                                                </p>
                                            )}

                                            {/* Упоминания */}
                                            {msg.mentions && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {msg.mentions.users?.map(u => (
                                                        <span key={u.id} className="bg-blue-600/30 text-blue-400 text-xs px-2 py-1 rounded">
                                                            @{u.username}
                                                        </span>
                                                    ))}
                                                    {msg.mentions.channels?.map(c => (
                                                        <span key={c.id} className="bg-green-600/30 text-green-400 text-xs px-2 py-1 rounded">
                                                            #{c.name}
                                                        </span>
                                                    ))}
                                                    {msg.mentions.roles?.map(r => (
                                                        <span key={r.id} className="bg-purple-600/30 text-purple-400 text-xs px-2 py-1 rounded">
                                                            @{r.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Вложения (картинки) */}
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div className="mt-2 space-y-2">
                                                    {msg.attachments.map((att) => (
                                                        <div key={att.id} className="inline-block">
                                                            {isImageFile(att.contentType) ? (
                                                                <a href={att.url} target="_blank" rel="noopener noreferrer">
                                                                    <img 
                                                                        src={att.proxyUrl || att.url}
                                                                        alt={att.name}
                                                                        className="max-w-md max-h-80 rounded-lg border border-gray-700 hover:opacity-90 transition-opacity"
                                                                        loading="lazy"
                                                                    />
                                                                </a>
                                                            ) : (
                                                                <a 
                                                                    href={att.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 rounded-lg p-3 transition-colors"
                                                                >
                                                                    <span className="text-2xl">📎</span>
                                                                    <div>
                                                                        <div className="text-white">{att.name}</div>
                                                                        <div className="text-gray-400 text-sm">{formatFileSize(att.size)}</div>
                                                                    </div>
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Эмбеды */}
                                            {msg.embeds && msg.embeds.length > 0 && (
                                                <div className="mt-2 space-y-2">
                                                    {msg.embeds.map((embed, i) => (
                                                        <div 
                                                            key={i}
                                                            className="border-l-4 rounded bg-gray-700/50 p-3"
                                                            style={{ borderColor: embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#5865F2' }}
                                                        >
                                                            {embed.title && (
                                                                <div className="font-semibold text-white mb-1">{embed.title}</div>
                                                            )}
                                                            {embed.description && (
                                                                <div className="text-gray-300 text-sm whitespace-pre-wrap">{embed.description}</div>
                                                            )}
                                                            {embed.fields && embed.fields.length > 0 && (
                                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                                    {embed.fields.map((field, fi) => (
                                                                        <div key={fi} className={field.inline ? '' : 'col-span-2'}>
                                                                            <div className="text-gray-400 text-xs font-semibold">{field.name}</div>
                                                                            <div className="text-gray-300 text-sm">{field.value}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {embed.image && (
                                                                <img src={embed.image} alt="" className="mt-2 max-w-full rounded" />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно закрытия тикета */}
            {showCloseModal && selectedTicket && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-white mb-4">
                            🔒 Закрыть тикет #{selectedTicket.ticketNumber || selectedTicket.id}?
                        </h2>
                        
                        <div className="mb-4">
                            <label className="block text-gray-300 mb-2">Причина закрытия:</label>
                            <textarea
                                value={closeReason}
                                onChange={(e) => setCloseReason(e.target.value)}
                                placeholder="Опишите причину закрытия..."
                                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg resize-none"
                                rows="3"
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowCloseModal(false);
                                    setCloseReason('');
                                }}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={closeTicket}
                                disabled={closing}
                                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                            >
                                {closing ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        Закрытие...
                                    </>
                                ) : (
                                    <>🔒 Закрыть тикет</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
