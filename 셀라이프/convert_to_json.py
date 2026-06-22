"""
개역개정 성경 66권 .txt 파일 → public/bible_ko.json 변환 스크립트
"""
import os
import json
import re

BIBLE_DIR = "개역개정_성경_66권_전체"
OUTPUT_FILE = os.path.join("public", "bible_ko.json")

BOOKS = [
    ("창세기", "창"), ("출애굽기", "출"), ("레위기", "레"), ("민수기", "민"), ("신명기", "신"),
    ("여호수아", "수"), ("사사기", "삿"), ("룻기", "룻"), ("사무엘상", "삼상"), ("사무엘하", "삼하"),
    ("열왕기상", "왕상"), ("열왕기하", "왕하"), ("역대상", "대상"), ("역대하", "대하"),
    ("에스라", "스"), ("느헤미야", "느"), ("에스더", "에"), ("욥기", "욥"), ("시편", "시"),
    ("잠언", "잠"), ("전도서", "전"), ("아가", "아"), ("이사야", "사"), ("예레미야", "렘"),
    ("예레미야애가", "애"), ("에스겔", "겔"), ("다니엘", "단"), ("호세아", "호"), ("요엘", "욜"),
    ("아모스", "암"), ("오바댜", "옵"), ("요나", "욘"), ("미가", "미"), ("나훔", "나"),
    ("하박국", "합"), ("스바냐", "습"), ("학개", "학"), ("스가랴", "슥"), ("말라기", "말"),
    ("마태복음", "마"), ("마가복음", "막"), ("누가복음", "눅"), ("요한복음", "요"),
    ("사도행전", "행"), ("로마서", "롬"), ("고린도전서", "고전"), ("고린도후서", "고후"),
    ("갈라디아서", "갈"), ("에베소서", "엡"), ("빌립보서", "빌"), ("골로새서", "골"),
    ("데살로니가전서", "살전"), ("데살로니가후서", "살후"), ("디모데전서", "딤전"), ("디모데후서", "딤후"),
    ("디도서", "딛"), ("빌레몬서", "몬"), ("히브리서", "히"), ("야고보서", "약"),
    ("베드로전서", "벧전"), ("베드로후서", "벧후"), ("요한1서", "요일"), ("요한2서", "요이"),
    ("요한3서", "요삼"), ("유다서", "유"), ("요한계시록", "계")
]

def parse_book_file(filepath):
    chapters = {}
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            m = re.match(r'^(\d+):(\d+)\s+(.+)$', line)
            if not m:
                continue
            ch = int(m.group(1))
            vs = int(m.group(2))
            text = m.group(3)
            # 대괄호 내 주석 제거 (예: [ (Ezekiel 1:29) ... ])
            text = re.sub(r'\s*\[.*?\]\s*', ' ', text).strip()
            if ch not in chapters:
                chapters[ch] = {}
            chapters[ch][vs] = text

    result = []
    for ch_num in sorted(chapters.keys()):
        ch = chapters[ch_num]
        if not ch:
            continue
        max_v = max(ch.keys())
        result.append([ch.get(v, '') for v in range(1, max_v + 1)])
    return result

def find_file(book_name):
    for fname in os.listdir(BIBLE_DIR):
        if book_name in fname and fname.endswith('.txt'):
            return os.path.join(BIBLE_DIR, fname)
    return None

def main():
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    bible_data = []
    for book_name, abbrev in BOOKS:
        fpath = find_file(book_name)
        if not fpath:
            print(f"[경고] 파일 없음: {book_name}")
            continue
        chapters = parse_book_file(fpath)
        bible_data.append({"name": book_name, "abbrev": abbrev, "chapters": chapters})
        print(f"[완료] {book_name} - {len(chapters)}장")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(bible_data, f, ensure_ascii=False, separators=(',', ':'))

    size_kb = os.path.getsize(OUTPUT_FILE) // 1024
    print(f"\n총 {len(bible_data)}권 → {OUTPUT_FILE} ({size_kb} KB)")

if __name__ == '__main__':
    main()
