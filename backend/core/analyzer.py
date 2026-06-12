import csv
import os
import sys
from collections import defaultdict

# プロジェクトルートをsys.pathに追加
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.core.normalizer import normalize_app_name

def analyze_logs():
    totals = defaultdict(int)
    log_file = os.path.join(ROOT, "data", "log.csv")
    
    if not os.path.exists(log_file):
        print("log.csv が見つかりません。")
        return

    with open(log_file, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        
        for row in reader:
            if len(row) == 4:
                app = row[2]
                duration = int(row[3])
            elif len(row) >= 5:
                app = row[3]
                duration = int(row[4])
            else:
                continue
            
            # アプリ名の正規化を適用
            normalized = normalize_app_name(app)
            totals[normalized] += duration

    print("=== 合計使用時間 ===")
    for app, total in totals.items():
        minutes = total / 60
        print(f"{app}: {minutes:.1f}分")

if __name__ == "__main__":
    analyze_logs()