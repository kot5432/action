import re

def normalize_app_name(app):
    """アプリ名を人間が読みやすい短い名前に正規化する"""
    if not app:
        return "不明"
    app_lower = app.lower()
    exe_match = app.split('.exe')[0].split('[')[0].strip().lower() + '.exe'
    if 'cursor' in app_lower:          return 'Cursor'
    if 'youtube' in app_lower:         return 'YouTube'
    if 'msedge' in app_lower:          return 'Edge'
    if 'chrome' in app_lower:
        return 'YouTube' if 'youtube' in app_lower else 'Chrome'
    if 'firefox' in app_lower:         return 'Firefox'
    if 'code.exe' in app_lower or 'vs code' in app_lower or 'vscode' in app_lower: return 'VS Code'
    if 'chatgpt' in app_lower:         return 'ChatGPT'
    if 'slack' in app_lower:           return 'Slack'
    if 'discord' in app_lower:         return 'Discord'
    if 'zoom' in app_lower:            return 'Zoom'
    if 'teams' in app_lower:           return 'Teams'
    if 'notion' in app_lower:          return 'Notion'
    if 'figma' in app_lower:           return 'Figma'
    if 'antigravity' in app_lower:     return 'Antigravity'
    if 'explorer.exe' in app_lower:    return 'エクスプローラー'
    if 'shellexperiencehost' in app_lower or 'startmenuexperiencehost' in app_lower: return 'Windowsシェル'
    if 'spotify' in app_lower:         return 'Spotify'
    if 'windowsterminal' in app_lower or 'pwsh' in app_lower or 'powershell' in app_lower: return 'ターミナル'
    if app_lower.strip() in ('unknown', ''): return '不明'
    if 'uiwinmgr' in app_lower:        return 'システム通知'
    if 'searchhost' in app_lower or 'searchapp' in app_lower: return '検索'
    # .exe ベース名を返す
    import re
    m = re.match(r'^([^\s\[]+)\.exe', app, re.IGNORECASE)
    if m:
        return m.group(1)
    return re.sub(r'\s*\[.*?\]', '', app).strip() or '不明'
