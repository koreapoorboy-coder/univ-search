function renderPatternBox(item = {}) {
  if (!item || !item.current_position) return "";

  return `
    <div style="border:1px solid #e1e5ee;border-radius:16px;padding:18px;background:#f7fbff">
      
      <div style="font-weight:900;font-size:20px;margin-bottom:12px">
        현재 위치 진단
      </div>

      <div style="margin-bottom:10px;font-size:15px">
        ${item.current_position}
      </div>

      <div style="margin-bottom:14px;padding:10px;border-radius:10px;background:#ffffff;border:1px solid #eef1f6">
        <b>한 줄 해석</b><br/>
        ${item.coaching_message || ""}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        
        <div style="padding:10px;border-radius:10px;background:#ffffff;border:1px solid #e6f0ff">
          <div style="font-weight:800;margin-bottom:6px">강점 신호</div>
          <ul style="margin:0;padding-left:18px">
            ${(item.strength_view || []).map(x => `<li>${x}</li>`).join("")}
          </ul>
        </div>

        <div style="padding:10px;border-radius:10px;background:#fff7f7;border:1px solid #ffe5e5">
          <div style="font-weight:800;margin-bottom:6px">보완 포인트</div>
          <ul style="margin:0;padding-left:18px">
            ${(item.weakness_view || []).map(x => `<li>${x}</li>`).join("")}
          </ul>
        </div>

      </div>

    </div>
  `;
}
