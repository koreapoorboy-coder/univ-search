import { IMMUTABLE_SUBJECT_INVENTORY_BASE64 } from "./immutable_subject_inventory_bytes_v1.mjs";

export const CONSTANTS = Object.freeze({
  candidateVersion: "PHASE6_LIVE_INPUT_CANDIDATE_SIMPLE_V3",
  envelopeVersion: "PHASE6_LIVE_INPUT_AUTHORITY_ENVELOPE_SIMPLE_V3",
  inventoryVersion: "subject-option-inventory-v2_f4e4cc72ab5bfb3a9ce317b187949e12d2f2a8b0a721ce459d887a575a1fe094",
  inventorySha256: "b7c7950bf7d466957a56572169d3bd5ada0868d6f64e6e2f9f759e5c71935840",
  rowsSha256: "f4e4cc72ab5bfb3a9ce317b187949e12d2f2a8b0a721ce459d887a575a1fe094",
  inventoryRows: 50,
  sourceContractSha256: "88da314c0a4827563321b351ebca1c7b3bb08089b5fd4b758ba9a71d4da8cbd1",
  bindingContractSha256: "41ac4de971a3b712c6092d178713984eaffa4f9f805c2616cc9db9ee9afaa8ef",
  schoolNormalizationSha256: "8d700205ba617b073408bc93444c6f211fd49a07f50c4869ab09f81228d0b34c",
  schoolContextSha256: "72ce486e8cadfb03c778f118976680fbe067598264333750bbd82141e884ac96",
  academicYearSha256: "c29e0b26fbc93fbc23aa9424f9fe5b8d9ac82bba9fbea8c9375ac5104e9267e8",
  subjectKeyContractSha256: "1eddfcdf4d7436593c2b376ca74ce269a6974a25529f0cbb6597d5ab7ef499ef",
  aliasSourceSha256: "94caa2bfb448e629aa501f152f3b3d7665278d8762df49733c6d9fe3e38a74d8"
});

const verifiedCapabilities = new WeakSet();
const ALLOWED_TOP = new Set(["candidate_version", "raw_authority", "selected_option_metadata", "client_transport_metadata"]);
const ALLOWED_RAW = new Set(["school", "grade", "subject_group", "subject", "task_description"]);
const ALLOWED_SELECTED = new Set(["subject_value", "subject_group", "inventory_version"]);
const ALLOWED_TRANSPORT = new Set(["authority_class", "client_capture_digest", "client_observed_at"]);
const GRADES = Object.freeze({ "고1": 1, "고2": 2, "고3": 3 });
const SUBJECT_ALIAS = Object.freeze({ "미적분1": "미적분Ⅰ", "물리": "물리학", "물리(물리학Ⅰ)": "물리학", "화학(화학Ⅰ)": "화학" });

function fail(code){ const error = new Error(code); error.code = code; throw error; }
function plainObject(value){ return value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function exactKeys(value, allowed, code){
  if(!plainObject(value)) fail(code);
  for(const key of Object.keys(value)) if(!allowed.has(key)) fail("FORBIDDEN_CLIENT_FIELD");
  if(Object.keys(value).length !== allowed.size) fail(code);
}
function nonBlank(value, code){ if(typeof value !== "string" || !value.trim()) fail(code); }
function assertIJsonString(value){
  for(let i=0;i<value.length;i++){
    const unit=value.charCodeAt(i);
    if(unit>=0xd800 && unit<=0xdbff){ const next=value.charCodeAt(++i); if(!(next>=0xdc00&&next<=0xdfff)) fail("JCS_LONE_SURROGATE"); }
    else if(unit>=0xdc00&&unit<=0xdfff) fail("JCS_LONE_SURROGATE");
  }
}
export function parseStrictIJson(rawText){
  const source=String(rawText);
  let cursor=0;
  const whitespace=()=>{ while(cursor<source.length && /[\u0009\u000a\u000d\u0020]/.test(source[cursor])) cursor++; };
  const parseString=()=>{
    if(source[cursor]!=="\"") fail("INVALID_JSON");
    const start=cursor++;
    let escaped=false;
    while(cursor<source.length){
      const code=source.charCodeAt(cursor);
      if(!escaped && code===0x22){ cursor++; const value=JSON.parse(source.slice(start,cursor)); assertIJsonString(value); return value; }
      if(!escaped && code<0x20) fail("INVALID_JSON");
      if(!escaped && code===0x5c){ escaped=true; cursor++; continue; }
      if(escaped){
        const ch=source[cursor];
        if(ch==="u"){
          const hex=source.slice(cursor+1,cursor+5);
          if(!/^[0-9a-fA-F]{4}$/.test(hex)) fail("INVALID_JSON");
          cursor+=5; escaped=false; continue;
        }
        if(!'\"\\/bfnrt'.includes(ch)) fail("INVALID_JSON");
        escaped=false;
      }
      cursor++;
    }
    fail("INVALID_JSON");
  };
  const parseNumber=()=>{
    const match=source.slice(cursor).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if(!match) fail("INVALID_JSON");
    cursor+=match[0].length;
    const value=Number(match[0]);
    if(!Number.isFinite(value)) fail("JCS_NON_FINITE_NUMBER");
    return value;
  };
  const parseValue=()=>{
    whitespace();
    const ch=source[cursor];
    if(ch==='"') return parseString();
    if(ch==='{'){
      cursor++; whitespace(); const object={}; const keys=new Set();
      if(source[cursor]==='}'){cursor++;return object;}
      while(true){
        whitespace(); const key=parseString();
        if(keys.has(key)) fail("DUPLICATE_JSON_PROPERTY");
        keys.add(key); whitespace(); if(source[cursor++]!==':') fail("INVALID_JSON");
        object[key]=parseValue(); whitespace();
        if(source[cursor]==='}'){cursor++;return object;}
        if(source[cursor++]!==',') fail("INVALID_JSON");
      }
    }
    if(ch==='['){
      cursor++; whitespace(); const array=[];
      if(source[cursor]===']'){cursor++;return array;}
      while(true){ array.push(parseValue()); whitespace(); if(source[cursor]===']'){cursor++;return array;} if(source[cursor++]!==',') fail("INVALID_JSON"); }
    }
    if(source.startsWith("true",cursor)){cursor+=4;return true;}
    if(source.startsWith("false",cursor)){cursor+=5;return false;}
    if(source.startsWith("null",cursor)){cursor+=4;return null;}
    return parseNumber();
  };
  const value=parseValue(); whitespace(); if(cursor!==source.length) fail("INVALID_JSON"); return value;
}
export function canonicalizeJcs(value){
  if(value === null || typeof value === "boolean") return JSON.stringify(value);
  if(typeof value === "string"){ assertIJsonString(value); return JSON.stringify(value); }
  if(typeof value === "number"){ if(!Number.isFinite(value)) fail("JCS_NON_FINITE_NUMBER"); return JSON.stringify(value); }
  if(Array.isArray(value)) return `[${value.map(canonicalizeJcs).join(",")}]`;
  if(plainObject(value)){
    const keys=Object.keys(value).sort((a,b)=>a<b?-1:a>b?1:0);
    return `{${keys.map(k=>{ assertIJsonString(k); return `${JSON.stringify(k)}:${canonicalizeJcs(value[k])}`; }).join(",")}}`;
  }
  fail("JCS_NON_IJSON_VALUE");
}
export async function sha256Hex(value){
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b=>b.toString(16).padStart(2,"0")).join("");
}
function freezeDeep(value){
  if(value && typeof value === "object" && !Object.isFrozen(value)){
    Object.freeze(value); for(const child of Object.values(value)) freezeDeep(child);
  }
  return value;
}
function decodeBase64Bytes(base64){
  const binary=atob(base64);
  return Uint8Array.from(binary,character=>character.charCodeAt(0));
}
const TRUSTED_INVENTORY_BYTES=decodeBase64Bytes(IMMUTABLE_SUBJECT_INVENTORY_BASE64);

export async function verifyInventoryArtifact(rawArtifactBytes=TRUSTED_INVENTORY_BYTES, expected=CONSTANTS){
  if(!(rawArtifactBytes instanceof Uint8Array)) fail("ARTIFACT_RAW_BYTES_REQUIRED");
  if(await sha256Hex(rawArtifactBytes) !== expected.inventorySha256) fail("ARTIFACT_SHA_MISMATCH");
  let artifact;
  try{ artifact=parseStrictIJson(new TextDecoder("utf-8",{fatal:true}).decode(rawArtifactBytes)); }
  catch(error){ if(error?.code) throw error; fail("ARTIFACT_INVALID_UTF8_OR_JSON"); }
  if(!plainObject(artifact)) fail("ARTIFACT_INVALID");
  if(artifact.inventory_version !== expected.inventoryVersion) fail("ARTIFACT_INVENTORY_VERSION_MISMATCH");
  if(artifact.row_count !== expected.inventoryRows || !Array.isArray(artifact.rows) || artifact.rows.length !== expected.inventoryRows) fail("ARTIFACT_ROW_COUNT_MISMATCH");
  if(await sha256Hex(JSON.stringify(artifact.rows)) !== expected.rowsSha256 || artifact.canonical_authority_rows_sha256 !== expected.rowsSha256) fail("ARTIFACT_ROWS_SHA_MISMATCH");
  const seen = new Set();
  for(const row of artifact.rows){
    if(!plainObject(row) || typeof row.subject_value !== "string" || typeof row.subject_group !== "string") fail("ARTIFACT_ROW_INVALID");
    if(seen.has(row.subject_value)) fail("AMBIGUOUS_SUBJECT_OPTION");
    seen.add(row.subject_value);
  }
  const capability=Object.freeze({ rows: artifact.rows, inventoryVersion: artifact.inventory_version });
  verifiedCapabilities.add(capability);
  return capability;
}

function validateCandidate(candidate){
  exactKeys(candidate, ALLOWED_TOP, "CANDIDATE_SCHEMA_INVALID");
  exactKeys(candidate.raw_authority, ALLOWED_RAW, "RAW_AUTHORITY_SCHEMA_INVALID");
  exactKeys(candidate.selected_option_metadata, ALLOWED_SELECTED, "SELECTED_OPTION_SCHEMA_INVALID");
  exactKeys(candidate.client_transport_metadata, ALLOWED_TRANSPORT, "TRANSPORT_SCHEMA_INVALID");
  if(candidate.candidate_version !== CONSTANTS.candidateVersion) fail("CANDIDATE_VERSION_MISMATCH");
  const raw=candidate.raw_authority, selected=candidate.selected_option_metadata, transport=candidate.client_transport_metadata;
  nonBlank(raw.school,"BLANK_SCHOOL"); nonBlank(raw.subject,"BLANK_SUBJECT"); nonBlank(raw.subject_group,"BLANK_SUBJECT_GROUP"); nonBlank(raw.task_description,"BLANK_TASK_DESCRIPTION");
  if(!(raw.grade in GRADES)) fail("GRADE_INVALID");
  nonBlank(selected.subject_value,"BLANK_SELECTED_SUBJECT"); nonBlank(selected.subject_group,"BLANK_SELECTED_SUBJECT_GROUP");
  if(selected.inventory_version !== CONSTANTS.inventoryVersion) fail("INVENTORY_VERSION_MISMATCH");
  if(transport.authority_class !== "UNTRUSTED_TRANSPORT_METADATA") fail("TRANSPORT_AUTHORITY_INVALID");
  if(transport.client_capture_digest !== null && !/^[0-9a-f]{64}$/.test(transport.client_capture_digest)) fail("CLIENT_DIGEST_INVALID");
  if(transport.client_observed_at !== null && Number.isNaN(Date.parse(transport.client_observed_at))) fail("CLIENT_TIME_INVALID");
}

function resolveSubjectBinding(candidate, capability){
  if(!verifiedCapabilities.has(capability)) fail("UNVERIFIED_INVENTORY_CAPABILITY");
  const raw=candidate.raw_authority, selected=candidate.selected_option_metadata;
  if(raw.subject !== selected.subject_value) fail("RAW_METADATA_SUBJECT_MISMATCH");
  if(raw.subject_group !== selected.subject_group) fail("RAW_METADATA_GROUP_MISMATCH");
  const matches=capability.rows.filter(row=>row.subject_value===raw.subject);
  if(!matches.length) fail("UNKNOWN_SUBJECT_OPTION");
  if(matches.length!==1) fail("AMBIGUOUS_SUBJECT_OPTION");
  const row=matches[0];
  if(row.subject_group!==selected.subject_group || row.subject_group!==raw.subject_group) fail("INVENTORY_GROUP_MISMATCH");
  const subjectKey=SUBJECT_ALIAS[row.subject_value] || row.subject_value;
  return freezeDeep({ row, subjectKey });
}

function normalizeSchool(raw){ const result=raw.trim().replace(/\s+/gu," "); if(!result) fail("BLANK_SCHOOL"); return result; }
function academicYear(capturedAt){
  const parts=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(capturedAt)).filter(p=>p.type!=="literal").map(p=>[p.type,Number(p.value)]));
  return parts.month < 3 ? parts.year - 1 : parts.year;
}
function provenance(authorityClass, sourceKind, sourceLocator, normalizationContract, sourceContractSha256, sourceArtifactSha256){
  const p={authority_class:authorityClass,source_kind:sourceKind,source_locator:sourceLocator,normalization_contract:normalizationContract,source_contract_sha256:sourceContractSha256};
  if(sourceArtifactSha256) p.source_artifact_sha256=sourceArtifactSha256;
  return p;
}

export async function acceptLiveInputCandidate(candidate, options={}){
  validateCandidate(candidate);
  const capability=await verifyInventoryArtifact(options.inventoryArtifactBytes || TRUSTED_INVENTORY_BYTES, CONSTANTS);
  const binding=resolveSubjectBinding(candidate, capability);
  const capturedAt=String(options.capturedAt || new Date().toISOString());
  if(Number.isNaN(Date.parse(capturedAt))) fail("TRUSTED_CAPTURE_TIME_INVALID");
  const requestTraceId=String(options.requestTraceId || crypto.randomUUID());
  if(!requestTraceId) fail("REQUEST_TRACE_ID_INVALID");
  const raw=candidate.raw_authority;
  const school=normalizeSchool(raw.school);
  const taskSha=await sha256Hex(raw.task_description);
  const schoolKey=`school_context_v1_${await sha256Hex(`mini-school-context-v1\u0000${school}`)}`;
  const sourceSha=CONSTANTS.sourceContractSha256;
  const envelope={
    envelope_version:CONSTANTS.envelopeVersion,
    execution_mode:"LIVE_INPUT",
    school_context_semantics:"APPLICATION_LOCAL_GROUPING_ONLY",
    gateway_capture:{captured_at:capturedAt,request_trace_id:requestTraceId,issuer_role:"TRUSTED_GATEWAY"},
    raw_authority:{school:raw.school,grade:raw.grade,subject_group:raw.subject_group,subject:raw.subject,task_description:raw.task_description},
    normalized_authority:{school,grade:GRADES[raw.grade],subject_group:binding.row.subject_group,subject_key:binding.subjectKey,task_description:raw.task_description,task_description_source_sha256:taskSha,academic_year:academicYear(capturedAt),application_local_school_context_key:schoolKey},
    field_provenance:{
      raw_authority:{
        school:provenance("LIVE_STUDENT_INPUT","SEALED_CLIENT_CANDIDATE","candidate.raw_authority.school","PHASE6_SIMPLE_SCHOOL_CONTEXT_NORMALIZATION_CONTRACT_V1",CONSTANTS.schoolNormalizationSha256),
        grade:provenance("LIVE_STUDENT_INPUT","SEALED_CLIENT_CANDIDATE","candidate.raw_authority.grade","RAW_PRESERVED",sourceSha),
        subject_group:provenance("LIVE_STUDENT_INPUT","SEALED_CLIENT_CANDIDATE","candidate.raw_authority.subject_group","RAW_PRESERVED",CONSTANTS.bindingContractSha256),
        subject:provenance("LIVE_STUDENT_INPUT","SEALED_CLIENT_CANDIDATE","candidate.raw_authority.subject","RAW_PRESERVED",CONSTANTS.bindingContractSha256),
        task_description:provenance("LIVE_STUDENT_INPUT","SEALED_CLIENT_CANDIDATE","candidate.raw_authority.task_description","RAW_PRESERVED",sourceSha)
      },
      normalized_authority:{
        school:provenance("DETERMINISTIC_SYSTEM_METADATA","TRUSTED_GATEWAY_DERIVATION","raw_authority.school","PHASE6_SIMPLE_SCHOOL_CONTEXT_NORMALIZATION_CONTRACT_V1",CONSTANTS.schoolNormalizationSha256),
        grade:provenance("DETERMINISTIC_SYSTEM_METADATA","TRUSTED_GATEWAY_DERIVATION","raw_authority.grade","GRADE_DISPLAY_TO_CANONICAL_V1",sourceSha),
        subject_group:provenance("DETERMINISTIC_SYSTEM_METADATA","TRUSTED_GATEWAY_DERIVATION","trusted_subject_option_binding.subject_group","EXACT_SELECTED_OPTION_METADATA_V1",CONSTANTS.bindingContractSha256),
        subject_key:provenance("DETERMINISTIC_SYSTEM_METADATA","TRUSTED_GATEWAY_DERIVATION","trusted_subject_option_binding.subject_key","ACCEPTED_SUBJECT_KEY_CONTRACT",CONSTANTS.subjectKeyContractSha256,CONSTANTS.inventorySha256),
        task_description:provenance("DETERMINISTIC_SYSTEM_METADATA","TRUSTED_GATEWAY_DERIVATION","raw_authority.task_description","RAW_TASK_DESCRIPTION_PRESERVATION_V1",sourceSha),
        task_description_source_sha256:provenance("DETERMINISTIC_SYSTEM_METADATA","TRUSTED_GATEWAY_DERIVATION","raw_authority.task_description","SHA256_RAW_TASK_DESCRIPTION_UTF8_V1",sourceSha),
        academic_year:provenance("DETERMINISTIC_SYSTEM_METADATA","TRUSTED_GATEWAY_DERIVATION","gateway_capture.captured_at","ACCEPTED_ACADEMIC_YEAR_CONTRACT",CONSTANTS.academicYearSha256,CONSTANTS.academicYearSha256),
        application_local_school_context_key:provenance("DETERMINISTIC_SYSTEM_METADATA","TRUSTED_GATEWAY_DERIVATION","normalized_authority.school","PHASE6_APPLICATION_LOCAL_SCHOOL_CONTEXT_CONTRACT_V1",CONSTANTS.schoolContextSha256)
      }
    },
    trusted_subject_option_binding:{inventory_version:CONSTANTS.inventoryVersion,inventory_artifact_sha256:CONSTANTS.inventorySha256,canonical_authority_rows_sha256:CONSTANTS.rowsSha256,resolved_option_locator:`rows[subject_value=${JSON.stringify(binding.row.subject_value)}]`,subject_option_value:binding.row.subject_value,subject_group:binding.row.subject_group,subject_key:binding.subjectKey,subject_key_contract_sha256:CONSTANTS.subjectKeyContractSha256,alias_source_sha256:CONSTANTS.aliasSourceSha256}
  };
  freezeDeep(envelope);
  const canonicalEnvelope=canonicalizeJcs(envelope);
  const seal=freezeDeep({seal_version:"PHASE6_TRUSTED_EXTERNAL_SEAL_V2",issuer_role:"TRUSTED_GATEWAY",issuer_contract_version:"PHASE6_TRUSTED_GATEWAY_ISSUER_V1",canonicalization:"RFC8785_JCS",payload_sha256:await sha256Hex(canonicalEnvelope),issued_at:capturedAt,request_trace_id:requestTraceId});
  return freezeDeep({ok:true,envelope,seal,phase1_lineage:{authority_root:"TRUSTED_LIVE_INPUT_ENVELOPE",envelope_payload_sha256:seal.payload_sha256,request_trace_id:requestTraceId},canonical_envelope:canonicalEnvelope});
}

export async function handleSimpleLiveIntakeRequest(request, options={}){
  if(!request || request.method !== "POST") return new Response(JSON.stringify({ok:false,error:"METHOD_NOT_ALLOWED"}),{status:405,headers:{"content-type":"application/json; charset=utf-8"}});
  try{
    const candidate=parseStrictIJson(await request.text());
    const result=await acceptLiveInputCandidate(candidate,options);
    return new Response(JSON.stringify(result),{status:200,headers:{"content-type":"application/json; charset=utf-8"}});
  }catch(error){
    return new Response(JSON.stringify({ok:false,error:error.code||error.message||"LIVE_INTAKE_REJECTED"}),{status:400,headers:{"content-type":"application/json; charset=utf-8"}});
  }
}
