# Обновление версии проекта

## Автоматическое обновление через Git Tag

Когда вы создаете новый тег версии, GitHub Actions автоматически обновит версию во всех package.json файлах.

### Как обновить версию:

```bash
# 1. Создайте новый тег с версией (формат: v1.0.1)
git tag v1.0.1

# 2. Запушьте тег в GitHub
git push origin v1.0.1
```

### Что произойдет автоматически:

1. GitHub Actions запустит workflow `Update Version`
2. Версия обновится во всех файлах:
   - `package.json` (корневой)
   - `web/package.json`
   - `bot/package.json`
   - `api/package.json`
3. Изменения будут закоммичены и запушены в main
4. Версия автоматически появится в админ-панели (внизу слева)

### Примеры версий:

```bash
# Патч обновление (исправление багов)
git tag v1.0.1
git push origin v1.0.1

# Минор обновление (новые функции)
git tag v1.1.0
git push origin v1.1.0

# Мажор обновление (большие изменения)
git tag v2.0.0
git push origin v2.0.0
```

### Проверка текущей версии:

```bash
# Посмотреть все теги
git tag

# Посмотреть последний тег
git describe --tags --abbrev=0

# Посмотреть версию в package.json
cat package.json | grep version
```

### Удаление тега (если ошиблись):

```bash
# Удалить локально
git tag -d v1.0.1

# Удалить на GitHub
git push origin :refs/tags/v1.0.1
```

## Где отображается версия

- **Админ-панель**: Внизу слева в боковом меню
- **Package.json**: Во всех package.json файлах
- **GitHub**: В разделе Releases

## Формат версии (Semantic Versioning)

`MAJOR.MINOR.PATCH` (например: 1.2.3)

- **MAJOR** (1.x.x) - несовместимые изменения API
- **MINOR** (x.2.x) - новые функции, обратно совместимые
- **PATCH** (x.x.3) - исправление багов
