import json
import urllib.request
import os

# 성경 전체 데이터셋 다운로드 경로 및 저장 폴더 설정
BIBLE_URL = "https://cdn.jsdelivr.net/gh/thiagobodruk/bible@master/json/ko_ko.json"
OUTPUT_DIR = "./개역개정_성경_66권_전체"

# 성경 66권 한글 이름 매핑 (abbrev -> 한글명)
BOOK_NAMES = {
    "gn": "창세기", "ex": "출애굽기", "lv": "레위기", "nm": "민수기", "dt": "신명기",
    "js": "여호수아", "jud": "사사기", "rt": "룻기", "1sm": "사무엘상", "2sm": "사무엘하",
    "1kgs": "열왕기상", "2kgs": "열왕기하", "1ch": "역대상", "2ch": "역대하",
    "ezr": "에스라", "ne": "느헤미야", "et": "에스더", "job": "욥기", "ps": "시편",
    "prv": "잠언", "ec": "전도서", "so": "아가", "is": "이사야", "jr": "예레미야",
    "lm": "예레미야애가", "ez": "에스겔", "dn": "다니엘", "Os": "호세아", "jl": "요엘",
    "am": "아모스", "O": "오바댜", "jn": "요나", "mc": "미가", "na": "나훔",
    "O2": "하박국", "O3": "스바냐", "O4": "학개", "O5": "스가랴", "O6": "말라기",
    "mt": "마태복음", "mk": "마가복음", "lk": "누가복음", "jo": "요한복음",
    "act": "사도행전", "rm": "로마서", "1co": "고린도전서", "2co": "고린도후서",
    "gl": "갈라디아서", "eph": "에베소서", "ph": "빌립보서", "Se": "골로새서",
    "1ts": "데살로니가전서", "2ts": "데살로니가후서", "1tm": "디모데전서", "2tm": "디모데후서",
    "tt": "디도서", "O7": "빌레몬서", "O8": "히브리서", "O9": "야고보서",
    "1pe": "베드로전서", "2pe": "베드로후서", "1jo": "요한1서", "2jo": "요한2서",
    "3jo": "요한3서", "O10": "유다서", "O11": "요한계시록"
}

# 순서대로 66권 한글 이름 (abbrev가 매핑에 없을 경우 대비)
BOOK_NAMES_BY_INDEX = [
    "창세기", "출애굽기", "레위기", "민수기", "신명기",
    "여호수아", "사사기", "룻기", "사무엘상", "사무엘하",
    "열왕기상", "열왕기하", "역대상", "역대하",
    "에스라", "느헤미야", "에스더", "욥기", "시편",
    "잠언", "전도서", "아가", "이사야", "예레미야",
    "예레미야애가", "에스겔", "다니엘", "호세아", "요엘",
    "아모스", "오바댜", "요나", "미가", "나훔",
    "하박국", "스바냐", "학개", "스가랴", "말라기",
    "마태복음", "마가복음", "누가복음", "요한복음",
    "사도행전", "로마서", "고린도전서", "고린도후서",
    "갈라디아서", "에베소서", "빌립보서", "골로새서",
    "데살로니가전서", "데살로니가후서", "디모데전서", "디모데후서",
    "디도서", "빌레몬서", "히브리서", "야고보서",
    "베드로전서", "베드로후서", "요한1서", "요한2서",
    "요한3서", "유다서", "요한계시록"
]

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

print("성경 데이터를 가져오는 중입니다...")

try:
    req = urllib.request.Request(BIBLE_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        bible_data = json.loads(response.read().decode('utf-8-sig'))

    print(f"로드 성공! 총 {len(bible_data)}권 파일 생성을 시작합니다.\n")

    for idx, book in enumerate(bible_data):
        abbrev = book.get("abbrev", "")
        chapters = book.get("chapters", [])

        # 한글 이름 결정: abbrev 매핑 우선, 없으면 인덱스 기반
        if abbrev in BOOK_NAMES:
            book_name = BOOK_NAMES[abbrev]
        elif idx < len(BOOK_NAMES_BY_INDEX):
            book_name = BOOK_NAMES_BY_INDEX[idx]
        else:
            book_name = abbrev

        file_name = f"{idx+1:02d}_{book_name}.txt"
        file_path = os.path.join(OUTPUT_DIR, file_name)

        with open(file_path, "w", encoding="utf-8") as f:
            for c_idx, chapter in enumerate(chapters, start=1):
                for v_idx, verse in enumerate(chapter, start=1):
                    # HTML 엔티티 정리
                    verse_clean = verse.replace("&#x27;", "'").replace("&amp;", "&")
                    f.write(f"{c_idx}:{v_idx} {verse_clean}\n")

        print(f"[{idx+1:02d}/{len(bible_data)}] {file_name} 생성 완료")

    print(f"\n모든 작업 끝! '{OUTPUT_DIR}' 폴더를 확인하세요.")

except Exception as e:
    print(f"\n오류 발생: {e}")