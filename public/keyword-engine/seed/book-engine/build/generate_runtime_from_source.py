#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path
from collections import defaultdict

def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def dump_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def safe_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        return v
    return [v]

def normalize_title(s: str) -> str:
    return (s or "").replace(" ", "").replace("·", "").replace(":", "").strip().lower()

def make_book_id(book, idx):
    candidate = (book.get("book_id_runtime_candidate") or "").strip()
    if candidate:
        return candidate
    title_norm = normalize_title(book.get("title", ""))
    if title_norm:
        return f"booksrc_{title_norm[:32]}"
    return f"booksrc_{idx:04d}"

def build_starter_entry(book, book_id):
    title = book.get("title", "")
    authors = safe_list(book.get("authors"))
    author = ", ".join([a for a in authors if a]) if authors else ""
    linked_subjects = safe_list(book.get("recommended_subjects_raw"))
    linked_majors = safe_list(book.get("recommended_majors_raw"))
    fit_keywords = safe_list(book.get("recommended_themes_raw")) + linked_subjects[:4]
    starter_questions = safe_list(book.get("starter_questions"))[:3]
    summary_short = (book.get("summary_short") or "").strip()
    if not summary_short:
        summary_short = f"{title} 관련 탐구 확장용 등록 도서"
    broad_theme = safe_list(book.get("recommended_themes_raw"))[:3]
    return {
        "book_id": book_id,
        "title": title,
        "author": author,
        "summary_short": summary_short,
        "starter_questions": starter_questions,
        "linked_subjects": linked_subjects,
        "linked_majors": linked_majors,
        "fit_keywords": fit_keywords,
        "fit_modes": ["compare", "case", "career"] if book.get("status") == "active" else ["catalog", "pending_detail"],
        "engine_subject_routes": [],
        "task_fit": safe_list(book.get("task_fit_raw")) or (["탐구보고서"] if book.get("status") == "active" else ["참고도서"]),
        "broad_theme": broad_theme
    }

def add_index_entry(idx, key, value):
    if not key:
        return
    idx[key].append(value)

def dedupe_preserve(items, key=lambda x: (x.get("book_id"), x.get("title"))):
    seen = set()
    out = []
    for it in items:
        k = key(it)
        if k in seen:
            continue
        seen.add(k)
        out.append(it)
    return out

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--book-engine-root", required=True, help="book-engine 폴더 경로")
    parser.add_argument("--include-pending", action="store_true", help="pending_detail 도 starter에 포함")
    args = parser.parse_args()

    root = Path(args.book_engine_root).resolve()
    source_root = root / "source"
    books_dir = source_root / "books"
    bridges_dir = source_root / "bridges"
    generated_dir = root / "generated"

    books = []
    for p in sorted(books_dir.glob("*.json")):
        if p.name.startswith("_TEMPLATE"):
            continue
        try:
            book = load_json(p)
            book["_source_path"] = str(p.relative_to(root))
            books.append(book)
        except Exception as e:
            print(f"skip {p.name}: {e}")

    major_bridge = load_json(bridges_dir / "book_to_major_bridge.json") if (bridges_dir / "book_to_major_bridge.json").exists() else {}
    subject_bridge = load_json(bridges_dir / "book_to_subject_bridge.json") if (bridges_dir / "book_to_subject_bridge.json").exists() else {}
    theme_bridge = load_json(bridges_dir / "book_to_theme_bridge.json") if (bridges_dir / "book_to_theme_bridge.json").exists() else {}

    starter = []
    career_index = defaultdict(list)
    subject_index = defaultdict(list)
    theme_index = defaultdict(list)
    rules = []

    included = 0
    skipped_pending = 0

    for i, book in enumerate(books, start=1):
        status = (book.get("status") or "active").strip()
        if status != "active" and not args.include_pending:
            skipped_pending += 1
            continue

        book_id = make_book_id(book, i)
        title = book.get("title", "")
        entry = {"book_id": book_id, "title": title}
        starter.append(build_starter_entry(book, book_id))
        included += 1

        major_keys = safe_list(book.get("recommended_majors_raw")) + safe_list(major_bridge.get(book.get("book_uid"), []))
        subject_keys = safe_list(book.get("recommended_subjects_raw")) + safe_list(subject_bridge.get(book.get("book_uid"), []))
        theme_keys = safe_list(book.get("recommended_themes_raw")) + safe_list(theme_bridge.get(book.get("book_uid"), []))

        for mj in major_keys:
            add_index_entry(career_index, mj.replace("학과", ""), entry)
            add_index_entry(career_index, mj, entry)
        for sj in subject_keys:
            add_index_entry(subject_index, sj, entry)
        for th in theme_keys:
            add_index_entry(theme_index, th, entry)

        if subject_keys or theme_keys:
            rules.append({
                "rule_id": f"generated_{book_id}",
                "subjects": subject_keys[:5],
                "concepts": [],
                "keywords": theme_keys[:6] + subject_keys[:3],
                "recommended_books": [book_id],
                "blocked_books": [],
                "recommended_modes": ["compare", "case", "career"] if status == "active" else ["catalog", "pending_detail"],
                "recommended_views": theme_keys[:4]
            })

    # dedupe
    for idx in [career_index, subject_index, theme_index]:
        for k in list(idx.keys()):
            idx[k] = dedupe_preserve(idx[k])

    dump_json(generated_dir / "mini_book_engine_books_starter.generated.json", starter)
    dump_json(generated_dir / "book_recommendation_filter_mapping.generated.json", {"subject_keyword_rules": rules})
    dump_json(generated_dir / "book_engine_lookup.generated.json", {
        "career_index": dict(sorted(career_index.items())),
        "subject_index": dict(sorted(subject_index.items())),
        "theme_index": dict(sorted(theme_index.items()))
    })
    dump_json(generated_dir / "runtime_build_report.json", {
        "source_total_books": len(books),
        "starter_included_books": included,
        "skipped_pending_books": skipped_pending,
        "include_pending": args.include_pending,
        "career_index_keys": len(career_index),
        "subject_index_keys": len(subject_index),
        "theme_index_keys": len(theme_index),
        "generated_rules": len(rules)
    })
    print("done")

if __name__ == "__main__":
    main()
