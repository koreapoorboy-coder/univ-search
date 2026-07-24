(function(global){
  "use strict";
  const MAP = { "미적분1":"미적분Ⅰ", "물리":"물리학" };
  const key = s => String(s==null?"":s).replace(/\s+/g,"").trim();
  const N = {};
  Object.keys(MAP).forEach(k => { N[key(k)] = MAP[k]; });
  global.__SUBJECT_ALIAS__ = {
    toCanonicalSubject(ui){
      const raw = String(ui==null?"":ui).trim();
      return raw ? (N[key(raw)] || raw) : "";
    }
  };
})(window);
