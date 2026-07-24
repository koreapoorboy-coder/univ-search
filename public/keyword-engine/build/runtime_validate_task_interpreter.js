const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bridge = JSON.parse(fs.readFileSync(path.join(root, 'data/assessment/bridge/assessment_keyword_bridge.v1.json'), 'utf8'));
const cross = JSON.parse(fs.readFileSync(path.join(root, 'data/assessment/bridge/assessment_seed_cross_axis.v2.json'), 'utf8'));
const storage = new Map();
const remoteEvents = [];

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  Date,
  Math,
  JSON,
  Promise,
  CustomEvent: function(name, init){ this.type=name; this.detail=init?.detail; },
  localStorage: {
    getItem(key){ return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value){ storage.set(key, String(value)); }
  },
  fetch: async (url, options={}) => {
    const u = String(url);
    if(u.includes('assessment_keyword_bridge.v1.json')) return { ok:true, json:async()=>bridge };
    if(u.includes('assessment_seed_cross_axis.v2.json')) return { ok:true, json:async()=>cross };
    if(u.endsWith('/collect')){
      remoteEvents.push(JSON.parse(options.body || '{}'));
      return { ok:true, json:async()=>({ok:true}) };
    }
    throw new Error(`unexpected fetch ${u}`);
  },
  dispatchEvent(){ return true; }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/assessment_keyword_bridge_helper.js'), 'utf8'), sandbox, {filename:'assessment_keyword_bridge_helper.js'});

(async()=>{
  await sandbox.AssessmentKeywordBridge.ready();

  const argument = sandbox.AssessmentKeywordBridge.inferTaskRule({
    subject:'공통국어1', taskType:'탐구보고서', taskName:'공통국어1 탐구보고서',
    taskDescription:'쟁점에 대한 찬반 토론 후 근거를 들어 논설문을 작성한다.'
  });
  if(argument.rule?.rule_id !== 'argumentation_002') throw new Error(`argumentation selection failed: ${argument.rule?.rule_id}`);
  if(argument.matchCount < 4) throw new Error(`argumentation match count too low: ${argument.matchCount}`);

  const fallbackContext = await sandbox.AssessmentKeywordBridge.resolve({
    subjectGroup:'과학', subject:'화학', taskType:'탐구보고서', taskName:'화학 탐구보고서',
    taskDescription:'정해진 양식에 맞추어 내용을 정리하여 제출한다.', keyword:'배터리', career:'화학공학과', grade:'2'
  });
  if(!fallbackContext.interpreter?.fallbackActive) throw new Error('fallback was not activated');
  if(!String(fallbackContext.student_output?.interpreter_notice || '').includes('일반형')) throw new Error('fallback notice missing');

  const termBlocked = await sandbox.AssessmentKeywordBridge.resolve({
    subjectGroup:'예술·체육', subject:'체육', taskType:'탐구보고서', taskName:'탁구 랠리하기',
    taskDescription:'탁구 랠리를 수행한다.', keyword:'운동', career:'체육학과', grade:'1'
  });
  if(termBlocked.reportTarget !== false || termBlocked.interpreter?.blockedTerm !== '랠리') throw new Error(`performance term block failed: ${JSON.stringify(termBlocked.interpreter)}`);

  const flagBlocked = await sandbox.AssessmentKeywordBridge.resolve({
    subjectGroup:'외국어', subject:'과학기술 시사영어', taskType:'탐구보고서', taskName:'Participation',
    taskDescription:'과학기술 시사영어 수행평가 영역: Participation', keyword:'과학기술', career:'화학공학과', grade:'3'
  });
  if(flagBlocked.reportTarget !== false || flagBlocked.interpreter?.blockedReason !== 'record_flag_false') throw new Error(`record flag block failed: ${flagBlocked.interpreter?.blockedReason}`);

  const localLogs = sandbox.AssessmentKeywordBridge.readTaskInterpreterLogs();
  const out = {
    version: sandbox.AssessmentKeywordBridge.version,
    ruleCount: bridge.task_interpreter_rules.length,
    argumentation: {ruleId:argument.rule.rule_id, matchCount:argument.matchCount, matchedTerms:argument.matchedTerms},
    fallback: {active:fallbackContext.interpreter.fallbackActive, notice:fallbackContext.student_output.interpreter_notice, mode:fallbackContext.assessment_route.recommendedReportMode},
    performanceTermBlock: {reportTarget:termBlocked.reportTarget, reason:termBlocked.interpreter.blockedReason, term:termBlocked.interpreter.blockedTerm},
    recordFlagBlock: {reportTarget:flagBlocked.reportTarget, reason:flagBlocked.interpreter.blockedReason},
    localLogCount: localLogs.length,
    remoteLogCount: remoteEvents.length
  };
  console.log(JSON.stringify(out,null,2));
})().catch(error=>{ console.error(error); process.exit(1); });
