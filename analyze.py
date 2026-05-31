import csv
from collections import defaultdict

totals = defaultdict(int)

with open("log.csv", "r", encoding="utf-8") as f:
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
        
        totals[app] += duration

print("=== 合計使用時間 ===")

for app, total in totals.items():
    minutes = total / 60
    print(f"{app}: {minutes:.1f}分")