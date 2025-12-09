'use client';

import { useState, useEffect } from 'react';

export default function PollsPage() {
    const [guilds, setGuilds] = useState([]);
    const [selectedGuild, setSelectedGuild] = useState('');
    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedPoll, setSelectedPoll] = useState(null);
    
    // Форма создания опроса
    const [newPoll, setNewPoll] = useState({
        question: '',
        options: ['', ''],
        multipleChoice: false,
        anonymous: false,
        duration: 0
    });

    useEffect(() => {
        fetchGuilds();
    }, []);

    useEffect(() => {
        if (selectedGuild) {
            fetchPolls();
        }
    }, [selectedGuild, filter]);

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

    const fetchPolls = async () => {
        setLoading(true);
        try {
            const url = filter === 'all' 
                ? `http://localhost:3001/api/polls/${selectedGuild}`
                : `http://localhost:3001/api/polls/${selectedGuild}?status=${filter}`;
            const res = await fetch(url);
            const data = await res.json();
            setPolls(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching polls:', error);
            setPolls([]);
        } finally {
            setLoading(false);
        }
    };

    const createPoll = async () => {
        if (!newPoll.question.trim()) {
            alert('Введите вопрос!');
            return;
        }
        
        const validOptions = newPoll.options.filter(o => o.trim());
        if (validOptions.length < 2) {
            alert('Нужно минимум 2 варианта ответа!');
            return;
        }

        try {
            const res = await fetch(`http://localhost:3001/api/polls/${selectedGuild}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: newPoll.question,
                    options: validOptions,
                    multipleChoice: newPoll.multipleChoice,
                    anonymous: newPoll.anonymous,
                    duration: newPoll.duration
                })
            });
            
            if (res.ok) {
                setShowCreateModal(false);
                setNewPoll({ question: '', options: ['', ''], multipleChoice: false, anonymous: false, duration: 0 });
                fetchPolls();
            } else {
                const error = await res.json();
                alert(error.error || 'Ошибка создания опроса');
            }
        } catch (error) {
            console.error('Error creating poll:', error);
            alert('Ошибка создания опроса');
        }
    };

    const endPoll = async (pollId) => {
        if (!confirm('Завершить опрос?')) return;
        
        try {
            await fetch(`http://localhost:3001/api/polls/${selectedGuild}/poll/${pollId}/end`, {
                method: 'POST'
            });
            fetchPolls();
            if (showDetailsModal) setShowDetailsModal(false);
        } catch (error) {
            console.error('Error ending poll:', error);
        }
    };

    const addOption = () => {
        if (newPoll.options.length < 10) {
            setNewPoll({ ...newPoll, options: [...newPoll.options, ''] });
        }
    };

    const removeOption = (index) => {
        if (newPoll.options.length > 2) {
            const options = [...newPoll.options];
            options.splice(index, 1);
            setNewPoll({ ...newPoll, options });
        }
    };

    const updateOption = (index, value) => {
        const options = [...newPoll.options];
        options[index] = value;
        setNewPoll({ ...newPoll, options });
    };

    const getStatusBadge = (status) => {
        const badges = {
            'ACTIVE': { color: 'bg-green-600', text: '🟢 Активен' },
            'ENDED': { color: 'bg-gray-600', text: '⚫ Завершён' },
            'CANCELLED': { color: 'bg-red-600', text: '🔴 Отменён' }
        };
        const badge = badges[status] || badges['ACTIVE'];
        return (
            <span className={`${badge.color} text-white text-xs px-2 py-1 rounded`}>
                {badge.text}
            </span>
        );
    };

    const getTotalVotes = (poll) => {
        return poll.options?.reduce((sum, opt) => 
            sum + (opt._count?.votes || opt.votes?.length || 0), 0
        ) || 0;
    };

    const getOptionVotes = (option) => {
        return option._count?.votes || option.votes?.length || 0;
    };

    const filteredPolls = polls.filter(poll => {
        if (filter === 'all') return true;
        return poll.status === filter;
    });

    const stats = {
        total: polls.length,
        active: polls.filter(p => p.status === 'ACTIVE').length,
        ended: polls.filter(p => p.status === 'ENDED').length,
        totalVotes: polls.reduce((sum, p) => sum + getTotalVotes(p), 0)
    };

    return (
        <div className="p-6 space-y-6">
            {/* Заголовок */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">📊 Опросы и голосования</h1>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                        ➕ Создать опрос
                    </button>
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
            </div>

            {loading ? (
                <div className="text-center text-gray-400 py-10">Загрузка...</div>
            ) : (
                <>
                    {/* Статистика */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="text-3xl font-bold text-white">{stats.total}</div>
                            <div className="text-gray-400">Всего опросов</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="text-3xl font-bold text-green-400">{stats.active}</div>
                            <div className="text-gray-400">Активных</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="text-3xl font-bold text-gray-400">{stats.ended}</div>
                            <div className="text-gray-400">Завершённых (история)</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="text-3xl font-bold text-indigo-400">{stats.totalVotes}</div>
                            <div className="text-gray-400">Всего голосов</div>
                        </div>
                    </div>

                    {/* Фильтры */}
                    <div className="flex gap-2">
                        {['all', 'ACTIVE', 'ENDED'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    filter === f 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {f === 'all' ? '📋 Все' : f === 'ACTIVE' ? '🟢 Активные' : '📁 История'}
                            </button>
                        ))}
                    </div>

                    {/* Список опросов */}
                    <div className="grid gap-4">
                        {filteredPolls.length === 0 ? (
                            <div className="bg-gray-800 rounded-lg p-8 text-center">
                                <div className="text-4xl mb-4">📊</div>
                                <h2 className="text-xl text-white mb-2">Опросов пока нет</h2>
                                <p className="text-gray-400 mb-4">
                                    Создайте опрос через кнопку выше или команду /poll create в Discord
                                </p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg"
                                >
                                    Создать первый опрос
                                </button>
                            </div>
                        ) : (
                            filteredPolls.map((poll) => {
                                const totalVotes = getTotalVotes(poll);
                                return (
                                    <div key={poll.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-semibold text-white mb-1">
                                                    {poll.question}
                                                </h3>
                                                <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                                                    <span>📅 {new Date(poll.createdAt).toLocaleString('ru')}</span>
                                                    <span>•</span>
                                                    <span>👥 {totalVotes} голосов</span>
                                                    {poll.multipleChoice && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-indigo-400">✓ Множественный</span>
                                                        </>
                                                    )}
                                                    {poll.anonymous && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-yellow-400">🔒 Анонимный</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(poll.status)}
                                                {poll.status === 'ACTIVE' && (
                                                    <button
                                                        onClick={() => endPoll(poll.id)}
                                                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                                                    >
                                                        Завершить
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setSelectedPoll(poll);
                                                        setShowDetailsModal(true);
                                                    }}
                                                    className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-3 py-1 rounded"
                                                >
                                                    Детали
                                                </button>
                                            </div>
                                        </div>

                                        {/* Варианты ответов с прогресс барами */}
                                        <div className="space-y-2">
                                            {poll.options?.slice(0, 5).map((option) => {
                                                const votes = getOptionVotes(option);
                                                const percentage = totalVotes > 0 
                                                    ? Math.round((votes / totalVotes) * 100) 
                                                    : 0;
                                                
                                                return (
                                                    <div key={option.id} className="relative bg-gray-700 rounded overflow-hidden">
                                                        <div 
                                                            className="absolute inset-0 bg-indigo-600 opacity-30 transition-all"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                        <div className="relative flex justify-between items-center px-4 py-2">
                                                            <span className="text-white">
                                                                {option.emoji} {option.text}
                                                            </span>
                                                            <span className="text-gray-300 font-medium">
                                                                {votes} ({percentage}%)
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {poll.options?.length > 5 && (
                                                <div className="text-center text-gray-500 text-sm py-1">
                                                    +{poll.options.length - 5} ещё вариантов...
                                                </div>
                                            )}
                                        </div>

                                        {poll.endsAt && (
                                            <div className="mt-4 text-sm text-gray-400">
                                                ⏰ {poll.status === 'ACTIVE' ? 'Автозавершение' : 'Завершился'}: {new Date(poll.endsAt).toLocaleString('ru')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {/* Модалка создания опроса */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-white mb-4">📊 Создать опрос</h2>
                        
                        <div className="space-y-4">
                            {/* Вопрос */}
                            <div>
                                <label className="text-gray-300 text-sm block mb-1">Вопрос *</label>
                                <input
                                    type="text"
                                    value={newPoll.question}
                                    onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
                                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
                                    placeholder="Какой ваш любимый цвет?"
                                />
                            </div>

                            {/* Варианты ответов */}
                            <div>
                                <label className="text-gray-300 text-sm block mb-1">
                                    Варианты ответов * ({newPoll.options.length}/10)
                                </label>
                                <div className="space-y-2">
                                    {newPoll.options.map((option, index) => (
                                        <div key={index} className="flex gap-2">
                                            <span className="text-gray-500 py-2">{index + 1}.</span>
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => updateOption(index, e.target.value)}
                                                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded"
                                                placeholder={`Вариант ${index + 1}`}
                                            />
                                            {newPoll.options.length > 2 && (
                                                <button
                                                    onClick={() => removeOption(index)}
                                                    className="text-red-400 hover:text-red-300 px-2"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {newPoll.options.length < 10 && (
                                    <button
                                        onClick={addOption}
                                        className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm"
                                    >
                                        + Добавить вариант
                                    </button>
                                )}
                            </div>

                            {/* Настройки */}
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newPoll.multipleChoice}
                                        onChange={(e) => setNewPoll({ ...newPoll, multipleChoice: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-gray-300">Множественный выбор</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newPoll.anonymous}
                                        onChange={(e) => setNewPoll({ ...newPoll, anonymous: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-gray-300">Анонимное</span>
                                </label>
                            </div>

                            {/* Длительность */}
                            <div>
                                <label className="text-gray-300 text-sm block mb-1">
                                    Длительность (минуты, 0 = бессрочно)
                                </label>
                                <input
                                    type="number"
                                    value={newPoll.duration}
                                    onChange={(e) => setNewPoll({ ...newPoll, duration: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg"
                                    min="0"
                                    max="10080"
                                />
                                <div className="text-gray-500 text-xs mt-1">
                                    Популярные: 
                                    <button type="button" onClick={() => setNewPoll({ ...newPoll, duration: 60 })} className="text-indigo-400 ml-2 hover:underline">1 час</button>
                                    <button type="button" onClick={() => setNewPoll({ ...newPoll, duration: 1440 })} className="text-indigo-400 ml-2 hover:underline">24 часа</button>
                                    <button type="button" onClick={() => setNewPoll({ ...newPoll, duration: 10080 })} className="text-indigo-400 ml-2 hover:underline">7 дней</button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={createPoll}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Создать опрос
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модалка деталей опроса */}
            {showDetailsModal && selectedPoll && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{selectedPoll.question}</h2>
                                <div className="text-gray-400 text-sm mt-1">
                                    Создан: {new Date(selectedPoll.createdAt).toLocaleString('ru')}
                                </div>
                            </div>
                            {getStatusBadge(selectedPoll.status)}
                        </div>

                        {/* Детальные результаты */}
                        <div className="space-y-3 mb-6">
                            {selectedPoll.options?.map((option) => {
                                const totalVotes = getTotalVotes(selectedPoll);
                                const votes = getOptionVotes(option);
                                const percentage = totalVotes > 0 
                                    ? Math.round((votes / totalVotes) * 100) 
                                    : 0;
                                const isWinner = selectedPoll.status === 'ENDED' && 
                                    votes === Math.max(...selectedPoll.options.map(o => getOptionVotes(o))) && votes > 0;
                                
                                return (
                                    <div key={option.id} className={`relative rounded-lg overflow-hidden ${
                                        isWinner ? 'ring-2 ring-yellow-500' : ''
                                    }`}>
                                        <div 
                                            className={`absolute inset-0 ${isWinner ? 'bg-yellow-600' : 'bg-indigo-600'} opacity-30`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                        <div className="relative flex justify-between items-center px-4 py-3 bg-gray-700">
                                            <div className="flex items-center gap-2">
                                                {isWinner && <span>🏆</span>}
                                                <span className="text-white font-medium">
                                                    {option.emoji} {option.text}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-white font-bold">{percentage}%</span>
                                                <span className="text-gray-400 ml-2">({votes} голосов)</span>
                                            </div>
                                        </div>
                                        
                                        {/* Список проголосовавших (если не анонимный) */}
                                        {!selectedPoll.anonymous && option.votes?.length > 0 && (
                                            <div className="px-4 py-2 bg-gray-750 text-sm text-gray-400 border-t border-gray-600 flex flex-wrap gap-2">
                                                <span>Голосовали:</span>
                                                {option.votes.slice(0, 10).map((v, i) => (
                                                    <span key={i} className="flex items-center gap-1 bg-gray-700 px-2 py-0.5 rounded">
                                                        {v.user?.avatarUrl && (
                                                            <img src={v.user.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
                                                        )}
                                                        <span className="text-gray-300">{v.user?.displayName || v.userId}</span>
                                                    </span>
                                                ))}
                                                {option.votes.length > 10 && (
                                                    <span className="text-gray-500">+{option.votes.length - 10} ещё</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Информация */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-gray-700 rounded p-3 text-center">
                                <div className="text-xl font-bold text-white">{getTotalVotes(selectedPoll)}</div>
                                <div className="text-gray-400 text-sm">Всего голосов</div>
                            </div>
                            <div className="bg-gray-700 rounded p-3 text-center">
                                <div className="text-xl font-bold text-white">{selectedPoll.options?.length}</div>
                                <div className="text-gray-400 text-sm">Вариантов</div>
                            </div>
                            <div className="bg-gray-700 rounded p-3 text-center">
                                <div className="text-xl font-bold text-white">
                                    {selectedPoll.multipleChoice ? '✓' : '✕'}
                                </div>
                                <div className="text-gray-400 text-sm">Множественный</div>
                            </div>
                            <div className="bg-gray-700 rounded p-3 text-center">
                                <div className="text-xl font-bold text-white">
                                    {selectedPoll.anonymous ? '✓' : '✕'}
                                </div>
                                <div className="text-gray-400 text-sm">Анонимный</div>
                            </div>
                        </div>

                        {selectedPoll.endsAt && (
                            <div className="text-gray-400 text-sm mb-4">
                                ⏰ {selectedPoll.status === 'ACTIVE' ? 'Автозавершение' : 'Завершился'}: {new Date(selectedPoll.endsAt).toLocaleString('ru')}
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            {selectedPoll.status === 'ACTIVE' && (
                                <button
                                    onClick={() => endPoll(selectedPoll.id)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    Завершить опрос
                                </button>
                            )}
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
