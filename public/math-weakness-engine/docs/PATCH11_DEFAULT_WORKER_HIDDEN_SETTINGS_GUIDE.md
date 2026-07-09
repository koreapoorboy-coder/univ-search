# Patch 11 · Default Worker URL and Hidden Connection Settings

## 목적
학생용 수학 하이브리드 진단 화면에서 Cloudflare Worker URL 입력/저장/확인 영역을 숨기고, 기본 Worker URL을 자동으로 적용한다.

## 학생 화면
학생에게 보이는 핵심 입력은 다음만 남긴다.

- 학생 이름
- 학년
- 시험지 / 오답 / 풀이 / 개념정리 / 필기 파일 업로드
- 진단 시작

## 교사용 연결 설정
Worker 연결 영역은 `관리자 연결 설정 열기` 접힘 메뉴 안으로 이동했다. 연결 오류가 있을 때만 교사가 열어서 확인한다.

기본 Worker URL:

```text
https://math-diagnosis-worker.koreapoorboy.workers.dev
```

## 변경 사항
- 기본 Worker URL을 `hybrid.html` 안에 상수로 고정
- 새 브라우저에서도 URL 저장 없이 기본 Worker 사용
- URL 저장 / Worker 확인 / 설정 확인 / 기본 URL 복원 버튼을 관리자 접힘 메뉴로 이동
- 학생 진단 시작 시 기본 Worker가 자동 적용되도록 연결 로직 수정
- `manifest.json`에 patch11 상태와 기본 Worker URL 기록

## 확인 순서
1. GitHub Pages에 패치 적용
2. `hybrid.html` 접속
3. 강제 새로고침
4. 학생 화면에 Worker URL 입력칸이 바로 보이지 않는지 확인
5. 학생 이름, 학년, 파일만 입력 후 진단 시작 테스트
6. 필요 시 `관리자 연결 설정 열기`에서 Worker 확인
