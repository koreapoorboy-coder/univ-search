/* FINAL WORKING FILE */

(function(){

function init(){
  document.addEventListener("click", function(e){

    const chip = e.target.closest(".puzzle-chip");
    if(!chip) return;

    const group = chip.parentNode;
    group.querySelectorAll(".puzzle-chip").forEach(c=>c.classList.remove("active"));
    chip.classList.add("active");

    generate();
  });
}

function generate(){

  const mode = document.querySelector('[data-type="mode"] .active')?.dataset.value;
  const target = document.querySelector('[data-type="target"] .active')?.dataset.value;
  const view = document.querySelector('[data-type="view"] .active')?.dataset.value;

  const keyword = document.getElementById("keyword")?.value || "";
  const career = document.getElementById("career")?.value || "";

  if(!mode || !target || !view || !keyword) return;

  let title = "";

  if(mode==="case"){
    title = `${keyword}을 ${target} 사례에서 ${view} 중심으로 분석하기`;
  }else if(mode==="compare"){
    title = `${target}를 ${view} 관점에서 비교하여 ${keyword} 이해하기`;
  }else if(mode==="apply"){
    title = `${keyword}이 ${target}에서 어떻게 활용되는지 ${view} 중심으로 탐구하기`;
  }else{
    title = `${keyword}을 ${target} 사례로 ${view} 관점에서 분석하고 ${career}와 연결하기`;
  }

  const result = document.getElementById("final-topic");
  if(result) result.innerText = title;

  const payload = {
    exploration_mode: mode,
    core_keyword: keyword,
    target_case: target,
    analysis_view: view,
    linked_career: career
  };

  const output = document.getElementById("json-output");
  if(output){
    output.value = "[MINI_INPUT]\n" + JSON.stringify(payload, null, 2);
  }
}

window.addEventListener("DOMContentLoaded", init);

})();
