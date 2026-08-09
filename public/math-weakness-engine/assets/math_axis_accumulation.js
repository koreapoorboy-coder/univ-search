/* Math Axis Accumulation Store v1 (wiring 3-A, local / Option A)
 * observed_axes 를 student_code 로 누적한다. 각 레코드가 그대로 DB(B: KV/D1) 행이 되도록 설계.
 * 축만 저장하면 "C3 3회"까지만 알고 원본 복원 불가 → attempts(원본 태그)·axis_map_version 을 함께 남긴다.
 * 경계 재검토로 축 배정이 바뀌면 저장된 축은 옛 기준; 태그가 남아 있으면 재계산 가능.
 * 브라우저 종속(A) → export/import 로 소멸/이전 대비.
 */
(function (global) {
  const RECORDS_KEY = 'scstudy_records';
  const SCHEMA_VERSION = 1;
  let _axisMapVersion = null;

  function _load() { try { return JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]'); } catch (e) { return []; } }
  function _persist(list) { try { localStorage.setItem(RECORDS_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
  function _uuid() { try { return crypto.randomUUID(); } catch (e) { return 'rec_' + (global.performance ? Math.floor(performance.now()) : '') + '_' + Math.random().toString(36).slice(2, 10); } }
  function _nowISO() { try { return new Date().toISOString(); } catch (e) { return ''; } }

  // 축맵 버전: 어느 기준으로 축이 배정됐는지. 엔진은 map 만 들고 version 을 버려서 파일에서 직접 읽는다.
  async function axisMapVersion(base) {
    if (_axisMapVersion) return _axisMapVersion;
    try {
      const prefix = base ? String(base).replace(/\/$/, '') + '/' : '';
      const j = await fetch(prefix + 'data/axis_map/fine_tag_to_axis.v1.json').then(r => r.json());
      _axisMapVersion = j.version || 'unknown';
    } catch (e) { _axisMapVersion = 'unknown'; }
    return _axisMapVersion;
  }

  function _normAttempt(a) {
    return {
      question_no: (a && (a.question_no ?? a.no ?? a.number)) ?? '',
      problem_type_id: (a && a.problem_type_id) || '',
      unit_id: (a && a.unit_id) || '',
      response_status: (a && a.response_status) || (a && a.is_correct === true ? 'CORRECT_COMPLETE' : (a && a.is_correct === false ? 'WRONG_COMPLETE' : '')),
      observed_error_tags: (a && Array.isArray(a.observed_error_tags)) ? a.observed_error_tags.slice() : []
    };
  }

  // 레코드 = DB 행. 검수 확정 스키마 + id/schema_version(B 이관 대비).
  async function buildRecord({ studentCode, scope, attempts, observedAxes, dateISO }) {
    if (!studentCode) return null;
    const s = scope || {};
    const scopeUnits = Array.isArray(s.candidate_units)
      ? s.candidate_units.map(u => (u && (u.unit_id || u))).filter(Boolean)
      : [];
    const amv = await axisMapVersion(s.engine_data_base);
    return {
      id: _uuid(),
      schema_version: SCHEMA_VERSION,
      student_code: studentCode,
      date: dateISO || _nowISO(),
      exam_label: s.label || '',
      scope_units: scopeUnits,
      observed_axes: Array.isArray(observedAxes) ? observedAxes : [],
      attempts: Array.isArray(attempts) ? attempts.map(_normAttempt) : [],
      axis_map_version: amv
    };
  }

  function save(record) {
    if (!record || !record.student_code) return false;
    const list = _load(); list.push(record); return _persist(list);
  }
  function all() { return _load(); }
  function listByStudent(code) {
    return _load().filter(r => r.student_code === code).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }
  function students() {
    const m = {};
    _load().forEach(r => { if (r && r.student_code) m[r.student_code] = (m[r.student_code] || 0) + 1; });
    return Object.keys(m).sort().map(code => ({ student_code: code, exam_count: m[code] }));
  }
  // 여러 시험의 축을 합산: "이 학생 C3 반복" 이 여기서 나온다.
  function aggregateAxes(records) {
    const m = {};
    (records || []).forEach(r => (r.observed_axes || []).forEach(a => {
      if (!a || !a.axis) return;
      if (!m[a.axis]) m[a.axis] = { axis: a.axis, total: 0, wrong: 0, exams: 0 };
      m[a.axis].total += a.total || 0;
      m[a.axis].wrong += a.wrong || 0;
      m[a.axis].exams += 1;
    }));
    return Object.values(m).sort((a, b) => b.wrong - a.wrong || b.total - a.total);
  }
  function deleteStudent(code) {
    const kept = _load().filter(r => r.student_code !== code);
    _persist(kept); return kept.length;
  }

  function exportAll() {
    return JSON.stringify({ format: 'scstudy-records', schema_version: SCHEMA_VERSION, exported_at: _nowISO(), records: _load() }, null, 2);
  }
  function importJson(text, opts) {
    const merge = !opts || opts.merge !== false;
    let parsed; try { parsed = JSON.parse(text); } catch (e) { return { ok: false, error: 'JSON 파싱 실패' }; }
    const incoming = Array.isArray(parsed) ? parsed : (parsed && parsed.records) || null;
    if (!Array.isArray(incoming)) return { ok: false, error: 'records 배열을 찾을 수 없음' };
    const base = merge ? _load() : [];
    const seen = new Set(base.map(r => r && r.id).filter(Boolean));
    let added = 0;
    incoming.forEach(r => {
      if (!r || typeof r !== 'object') return;
      if (!r.id) r.id = _uuid();
      if (seen.has(r.id)) return;
      seen.add(r.id); base.push(r); added++;
    });
    _persist(base);
    return { ok: true, added, total: base.length };
  }

  global.MathAxisStore = {
    RECORDS_KEY, SCHEMA_VERSION,
    buildRecord, save, all, listByStudent, students, aggregateAxes, deleteStudent,
    exportAll, importJson, axisMapVersion
  };
})(window);
