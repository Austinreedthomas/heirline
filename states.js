// Fill every state selector with all 50 states + DC + PR (alphabetical), and turn multi-selects into type-to-filter chip pickers.
(function(){const list=Object.entries(STATE_SITES).sort((a,b)=>a[1].name.localeCompare(b[1].name));
 const opts=list.map(([k,s])=>`<option value="${k}">${s.name} (${k})</option>`).join("");
 document.querySelectorAll('select[name=state],select[name=otherStates],select[name=states]').forEach(sel=>{const keep=sel.value;
  sel.innerHTML=(sel.multiple?"":`<option value="" disabled>Choose a state</option>`)+opts+(sel.multiple?"":`<option value="Other">Other / outside the U.S.</option>`);
  if(!sel.multiple)sel.value=STATE_SITES[keep]?keep:"FL";else picker(sel)});
 function picker(sel){sel.classList.add("sp-native");sel.tabIndex=-1;sel.setAttribute("aria-hidden","true");
  const w=document.createElement("div");w.className="sp";w.innerHTML=`<div class="sp-chips"></div><input class="sp-in" type="text" role="combobox" aria-expanded="false" aria-autocomplete="list" placeholder="Type a state name or code…" autocomplete="off"><ul class="sp-list" role="listbox" hidden></ul>`;
  sel.after(w);const chips=w.querySelector(".sp-chips"),inp=w.querySelector(".sp-in"),ul=w.querySelector(".sp-list");let hi=0;
  const draw=()=>{chips.innerHTML=[...sel.selectedOptions].map(o=>`<span class="sp-chip">${o.value}<button type="button" data-x="${o.value}" aria-label="Remove ${o.textContent}">×</button></span>`).join("")};
  const items=()=>{const q=inp.value.trim().toLowerCase();return [...sel.options].filter(o=>!o.selected&&(!q||o.textContent.toLowerCase().includes(q)||o.value.toLowerCase()===q)).sort((a,b)=>(b.value.toLowerCase()===q)-(a.value.toLowerCase()===q))};
  const open=()=>{const it=items();hi=Math.min(hi,Math.max(it.length-1,0));ul.innerHTML=it.length?it.map((o,i)=>`<li role="option" data-v="${o.value}" class="${i===hi?"hi":""}">${o.textContent}</li>`).join(""):`<li class="sp-none">No match</li>`;ul.hidden=false;inp.setAttribute("aria-expanded","true")};
  const close=()=>{ul.hidden=true;inp.setAttribute("aria-expanded","false")};
  const pick=v=>{const o=[...sel.options].find(o=>o.value===v);if(o){o.selected=true;sel.dispatchEvent(new Event("change"))}inp.value="";hi=0;draw();close();inp.focus()};
  inp.oninput=()=>{hi=0;open()};inp.onfocus=open;inp.onclick=open;inp.onblur=()=>setTimeout(close,150);
  inp.onkeydown=e=>{const it=items();if(e.key==="ArrowDown"){hi=Math.min(hi+1,it.length-1);open();e.preventDefault()}else if(e.key==="ArrowUp"){hi=Math.max(hi-1,0);open();e.preventDefault()}
   else if(e.key==="Enter"){e.preventDefault();if(it[hi])pick(it[hi].value)}else if(e.key==="Backspace"&&!inp.value){const s=[...sel.selectedOptions].pop();if(s){s.selected=false;draw();sel.dispatchEvent(new Event("change"))}}else if(e.key==="Escape")close()};
  ul.onmousedown=e=>{const li=e.target.closest("li[data-v]");if(li){e.preventDefault();pick(li.dataset.v)}};
  chips.onclick=e=>{const v=e.target.dataset.x;if(v){[...sel.options].find(o=>o.value===v).selected=false;draw();sel.dispatchEvent(new Event("change"))}};
  sel.refreshPicker=draw;draw()}
})();
