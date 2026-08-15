# 닮음(M2_SIMILARITY_PYTHAGORAS) 해석층 실태 조사 v1 (2026-08-14)

> 검수 병행 트랙: 사용자 GPT 문항 제작 대기 중 닮음 해석층 선제 준비(문항 등록 시 진단 제대로 나오게).
> 기준 = M2_GEOM 완성 상태와 대조해 어느 항목이 비는지로 작업 범위 결정. [실측].

## 조사 5건 결과 [실측]
| 항목 | M2_GEOM (완성) | 닮음 M2_SIMPY | 상태 |
|---|---|---|---|
| **2. problem_types 카탈로그** | 140 | **87** (id `M2_SIMPY_PT`) | ✅ 있음 |
| **3. fine_error_tags overlay** | 27/140 | **87/87** | ✅ **완전**(전 유형 관측반영·재태깅 완료) |
| **1. edges/rules/remediation** | 실내용 | **빈 placeholder**(311/392/299B·배열 0) | ✗ 미저작 |
| **4. instruction_map 엔트리** | 140 | **0 (부재)** | ✗ **엔트리 신설 선행** |
| — 처방 | 140종 | **0** | ✗ 미저작 |
| **5. no_template_units** | 제거됨(게이트 해제) | **포함**(12단원 중) | 처방 후 제거 대상 |
- edges/rules/remediation `_note`: "관측축 진단은 fine_error_tags overlay로 동작" — **unit 로드·관측축 진단은 됨**(overlay 87/87). edges/rules/remediation·처방은 없음.

## 진단 = M1과 다름, M2_GEOM과도 다름
- **M1 기하**: overlay 0(재태깅 미착수) → 재태깅부터.
- **닮음**: **overlay 완비(87/87, 재태깅 완료)**. 미비 = **해석층/처방층**.
- **M2_GEOM과 결정적 차이**(검수 지적): M2_GEOM은 instruction_map **140 엔트리가 이미 있어** 처방 = 8필드 **교체**로 끝남. **닮음은 instruction_map 엔트리 0 → 엔트리 자체를 신설**해야 함(교체 아님).

## 작업 범위 (닮음 처방 트랙)
1. **instruction_map 엔트리 87개 신설**(`M2_SIMPY_PT001~087`) — 처방 8필드(problem_nature·required_thinking·must_write_steps·common_wrong_actions·error_checkpoints·student_command·teacher_note·parent_message). ★M2_GEOM은 교체였으나 닮음은 **신설** → 스키마/필드 규격은 M2_GEOM 정본 그대로.
2. part 병합: 신규 엔트리를 instruction_map part에 서지컬 병합(M2_GEOM part04 기법·`merge_part04.ps1`/`verify_merge.ps1` 재사용).
3. no_template_units에서 M2_SIMILARITY_PYTHAGORAS **제거**(게이트 해제, M2_GEOM c0b7b673 방식) — 처방 완료 후.
4. (선택·후순위) edges/rules/remediation 실내용 — 관측축 진단은 overlay로 이미 동작하므로 **처방보다 후순위**. backtrack/remediation 강화 시.
- ★재료 있음: overlay 87/87의 fine_error_tags = 처방 저작의 관측 근거(M2_GEOM은 27/140였는데 닮음은 전건 → 오히려 처방 저작에 유리).

## 판정 요청
- 닮음 해석층 = **재태깅 완료 / 처방·해석층 전무**. 작업 = **처방 87종 저작 + instruction_map 엔트리 신설**(M2_GEOM 140 기법, 단 교체→신설).
- ★순서: M1 재태깅(사용자 GPT)과 병행 가능(닮음 처방은 Code탭 저작 = 사용자 부담 없음, overlay 재료 이미 있음). 문항 등록·M1 재태깅이 사용자 작업인 동안 Code탭이 닮음 처방 저작 진행 가능.
