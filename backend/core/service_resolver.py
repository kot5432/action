# service_resolver.py
# ウィンドウタイトル + アプリ名からサービス名とカテゴリを判定する
# MVPはルールベース。将来はブラウザ拡張経由のURL判定に置き換え可能。

# --- サービス判定ルール ---
# (マッチキーワード, サービス名) のリスト。先頭から順にマッチ判定。
SERVICE_RULES = [
    # --- 開発ツール ---
    ("Visual Studio Code",  "VS Code"),
    ("VS Code",             "VS Code"),
    ("code.exe",            "VS Code"),
    ("Cursor",              "Cursor"),
    ("PyCharm",             "PyCharm"),
    ("IntelliJ",            "IntelliJ"),
    ("WebStorm",            "WebStorm"),
    ("Android Studio",      "Android Studio"),
    ("Xcode",               "Xcode"),
    ("Sublime Text",        "Sublime Text"),
    ("Vim",                 "Vim"),
    ("Neovim",              "Neovim"),
    # --- バージョン管理 ---
    ("GitHub",              "GitHub"),
    ("GitLab",              "GitLab"),
    ("Bitbucket",           "Bitbucket"),
    # --- AI ツール ---
    ("ChatGPT",             "ChatGPT"),
    ("Claude",              "Claude"),
    ("Gemini",              "Gemini"),
    ("Copilot",             "Copilot"),
    ("Perplexity",          "Perplexity"),
    # --- 動画 ---
    ("YouTube",             "YouTube"),
    ("Netflix",             "Netflix"),
    ("Twitch",              "Twitch"),
    ("Hulu",                "Hulu"),
    ("Amazon Prime",        "Prime Video"),
    ("niconico",            "ニコニコ"),
    # --- SNS ---
    ("Twitter",             "X"),
    ("x.com",               "X"),
    ("TikTok",              "TikTok"),
    ("Instagram",           "Instagram"),
    ("Facebook",            "Facebook"),
    ("LinkedIn",            "LinkedIn"),
    ("Reddit",              "Reddit"),
    # --- コミュニケーション ---
    ("Slack",               "Slack"),
    ("Discord",             "Discord"),
    ("Microsoft Teams",     "Teams"),
    ("Teams",               "Teams"),
    ("Zoom",                "Zoom"),
    ("Gmail",               "Gmail"),
    ("Outlook",             "Outlook"),
    ("Thunderbird",         "Thunderbird"),
    # --- 学習・リファレンス ---
    ("Stack Overflow",      "Stack Overflow"),
    ("MDN",                 "MDN"),
    ("Wikipedia",           "Wikipedia"),
    ("Udemy",               "Udemy"),
    ("Qiita",               "Qiita"),
    ("Zenn",                "Zenn"),
    # --- 生産性 ---
    ("Notion",              "Notion"),
    ("Figma",               "Figma"),
    ("Google Docs",         "Google Docs"),
    ("Google Sheets",       "Google Sheets"),
    ("Google Slides",       "Google Slides"),
    ("Google Calendar",     "Google Calendar"),
    ("Trello",              "Trello"),
    ("Jira",                "Jira"),
    ("Confluence",          "Confluence"),
    # --- ターミナル ---
    ("Windows Terminal",    "ターミナル"),
    ("WindowsTerminal",     "ターミナル"),
    ("PowerShell",          "ターミナル"),
    ("Command Prompt",      "ターミナル"),
    ("cmd.exe",             "ターミナル"),
    ("Terminal",            "ターミナル"),
    # --- その他ブラウザ検索 ---
    ("Google",              "Google"),
]

# --- カテゴリ分類ルール ---
CATEGORY_RULES: dict[str, str] = {
    "VS Code":          "開発",
    "Cursor":           "開発",
    "PyCharm":          "開発",
    "IntelliJ":         "開発",
    "WebStorm":         "開発",
    "Android Studio":   "開発",
    "Xcode":            "開発",
    "Sublime Text":     "開発",
    "Vim":              "開発",
    "Neovim":           "開発",
    "GitHub":           "開発",
    "GitLab":           "開発",
    "Bitbucket":        "開発",
    "ターミナル":         "開発",
    "ChatGPT":          "学習",
    "Claude":           "学習",
    "Gemini":           "学習",
    "Copilot":          "学習",
    "Perplexity":       "学習",
    "Stack Overflow":   "学習",
    "MDN":              "学習",
    "Wikipedia":        "学習",
    "Udemy":            "学習",
    "Qiita":            "学習",
    "Zenn":             "学習",
    "YouTube":          "娯楽",
    "Netflix":          "娯楽",
    "Twitch":           "娯楽",
    "Hulu":             "娯楽",
    "Prime Video":      "娯楽",
    "ニコニコ":           "娯楽",
    "X":                "SNS",
    "TikTok":           "SNS",
    "Instagram":        "SNS",
    "Facebook":         "SNS",
    "LinkedIn":         "SNS",
    "Reddit":           "SNS",
    "Slack":            "コミュニケーション",
    "Discord":          "コミュニケーション",
    "Teams":            "コミュニケーション",
    "Zoom":             "コミュニケーション",
    "Gmail":            "コミュニケーション",
    "Outlook":          "コミュニケーション",
    "Thunderbird":      "コミュニケーション",
    "Notion":           "その他",
    "Figma":            "その他",
    "Google Docs":      "その他",
    "Google Sheets":    "その他",
    "Google Slides":    "その他",
    "Google Calendar":  "その他",
    "Trello":           "その他",
    "Jira":             "その他",
    "Confluence":       "その他",
    "Google":           "その他",
}

# プライバシーモードでマスク対象のサービス
PRIVACY_SERVICES = {
    "1Password", "Bitwarden", "LastPass", "Keychain",
    "Bank", "証券", "Finance",
}

# 脱線と判断するサービスのカテゴリ
DISTRACTION_CATEGORIES = {"娯楽", "SNS"}


def resolve_service(app_name: str, window_title: str) -> tuple[str, str]:
    """
    アプリ名とウィンドウタイトルからサービス名とカテゴリを返す。

    Returns:
        (service: str, category: str)
    """
    combined = f"{window_title or ''} {app_name or ''}".strip()

    for keyword, service in SERVICE_RULES:
        if keyword.lower() in combined.lower():
            category = CATEGORY_RULES.get(service, "その他")
            return service, category

    # マッチなし: アプリ名をそのまま使う
    service = _fallback_service(app_name)
    category = CATEGORY_RULES.get(service, "その他")
    return service, category


def _fallback_service(app_name: str) -> str:
    """
    ルールにマッチしなかった場合の後退処理。
    .exe を除去して先頭大文字化する。
    """
    if not app_name:
        return "不明"
    import re
    name = re.sub(r'\.exe$', '', app_name, flags=re.IGNORECASE)
    name = re.sub(r'[\[\]()]', '', name).strip()
    return name[:30] if name else "不明"


def get_category(service: str) -> str:
    """サービス名からカテゴリを取得する"""
    return CATEGORY_RULES.get(service, "その他")


def is_distraction(category: str) -> bool:
    """脱線カテゴリか判定する"""
    return category in DISTRACTION_CATEGORIES


def should_mask(service: str) -> bool:
    """プライバシーモード対象サービスか判定する"""
    service_lower = service.lower()
    return any(p.lower() in service_lower for p in PRIVACY_SERVICES)
