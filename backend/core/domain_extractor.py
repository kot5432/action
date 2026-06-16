import re
from urllib.parse import urlparse

def extract_domain(window_title):
    """
    ウィンドウタイトルからドメインを抽出
    """
    if not window_title:
        return None
    
    # URLパターンを検出
    url_pattern = r'https?://[^\s]+'
    urls = re.findall(url_pattern, window_title)
    
    if urls:
        try:
            parsed = urlparse(urls[0])
            return parsed.netloc
        except:
            pass
    
    # ブラウザタイトルからドメインを抽出
    # Chrome: "Page Title - Google Chrome"
    # Edge: "Page Title - Microsoft Edge"
    # Firefox: "Page Title - Mozilla Firefox"
    
    # 一般的なパターン: "Page Title - Site Name" や "Site Name: Page Title"
    patterns = [
        r'[-–]\s*(?:Google Chrome|Microsoft Edge|Mozilla Firefox|Safari)$',
        r'^\s*[A-Za-z0-9.-]+\.[A-Za-z]{2,}\s*[-:]\s*',
    ]
    
    clean_title = window_title
    for pattern in patterns:
        clean_title = re.sub(pattern, '', clean_title)
    
    # ドメインっぽいパターンを抽出
    domain_pattern = r'[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
    domains = re.findall(domain_pattern, clean_title)
    
    if domains:
        # 最初のドメインを返す
        return domains[0].lower()
    
    return None

def should_mask_domain(domain):
    """
    プライバシーモード対象のドメインか判定
    """
    if not domain:
        return False
    
    privacy_domains = [
        'bank',
        ' securities',
        'finance',
        'password',
        'vault',
        '1password',
        'bitwarden',
        'lastpass',
    ]
    
    domain_lower = domain.lower()
    for privacy_domain in privacy_domains:
        if privacy_domain in domain_lower:
            return True
    
    return False

def mask_sensitive_info(window_title, domain):
    """
    プライバシーモード: 機密情報をマスク
    """
    if should_mask_domain(domain):
        return "***"
    
    # メールアドレスをマスク
    email_pattern = r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
    masked_title = re.sub(email_pattern, '***@***.***', window_title)
    
    return masked_title
