// ---- "Find my own money" mode ----
Object.assign(CUSTODIANS,{emp:{name:"Former employer plan"},dol:{name:"DOL Retirement Savings Lost and Found"},pbgc:{name:"PBGC unclaimed pensions"},other:{name:"Other source"}});
const LOSS_NAV=$("nav.steps").innerHTML;
const SELF_NAV=["s-about|About you","s-ucp|Unclaimed property","s-ret|Retirement","s-other|Other places","s-bene|Beneficiary checkup","track|Tracker"].map((x,i)=>{const [t,l]=x.split("|");return `<button data-tab="${t}"><span>${i+1}</span>${l}</button>`}).join("");
const HERO={loss:["Find and claim what your loved one left behind.","A calm, guided path through retirement, HSA, life insurance and crypto accounts, one custodian at a time."],
 self:["Find money that's already yours.","Old 401(k)s, forgotten pensions, uncashed checks and stray accounts, plus a checkup so your own family never has to search."]};
let emp=LS.get("hl_emp",{}),bene=LS.get("hl_bene",[]);
const BENE_LINKS={fidelity:["Fidelity","https://www.fidelity.com/customer-service/how-to-update-account-beneficiaries","Some workplace accounts need spouse consent to name someone else."],
 vanguard:["Vanguard","https://support.vanguard.com/account-settings/beneficiaries",""],
 schwab:["Schwab","https://www.schwab.com/estate-planning/faqs","Log in, then update beneficiaries under your account settings."],
 empower:["Empower","https://www.empower.com/","Log in, open the account, then choose Beneficiaries. Your employer's plan may handle it differently."],
 healthequity:["HealthEquity (HSA)","https://www.healthequity.com/help-center/articles/7910780-adding-an-hsa-beneficiary","Non-spouse beneficiaries in some states need an extra signed form."],
 coinbase:["Coinbase","https://help.coinbase.com/",""],
 other:["Other","",""]};
function setMode(m){MODE=m;LS.set("hl_mode",m);ctx=LS.get(CTXK(),{});document.body.dataset.mode=m;
 document.querySelectorAll("[data-mode]").forEach(b=>{b.classList.toggle("on",b.dataset.mode===m);b.setAttribute("aria-checked",b.dataset.mode===m)});
 $(".hero h1").textContent=HERO[m][0];$(".hero h1+p").textContent=HERO[m][1];
 $("nav.steps").innerHTML=m==="self"?SELF_NAV:LOSS_NAV;
 const panel=$("#ucpPanel");(m==="self"?$("#s-ucpHost"):$("#results")).after(panel);
 if(m==="self")fillAbout();else fillLoss();renderUCP();show(m==="self"?"s-about":"search")}
document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
function fillAbout(){const f=$("#selfForm");if(!f||!ctx.last)return;f.first.value=ctx.first||"";f.last.value=ctx.last||"";
 f.aliases.value=(ctx.aliases||[]).map(a=>a.first+" "+a.last).join("\n");f.city.value=ctx.city||"";f.employers.value=(ctx.employers||[]).join("\n");
 [...f.states.options].forEach(o=>o.selected=[ctx.state,...(ctx.otherStates||[])].includes(o.value));f.states.refreshPicker?.()}
function fillLoss(){const f=$("#searchForm");if(!f||!ctx.last)return;for(const k of ["first","last","dob","dod","city","me","rel","role"])if(f[k]&&ctx[k]!=null&&!f[k].value)f[k].value=ctx[k];
 if(STATE_SITES[ctx.state]||ctx.state==="Other")f.state.value=ctx.state;[...f.otherStates.options].forEach(o=>o.selected=(ctx.otherStates||[]).includes(o.value));f.otherStates.refreshPicker?.()}
$("#selfForm").onsubmit=e=>{e.preventDefault();const f=e.target;const states=[...f.states.selectedOptions].map(o=>o.value);
 const aliases=f.aliases.value.split(/\n|;/).map(s=>s.trim()).filter(Boolean).map(s=>{const p=s.split(/\s+/);return p.length>1?{first:p.slice(0,-1).join(" "),last:p.at(-1)}:{first:f.first.value.trim(),last:p[0]}});
 ctx={first:f.first.value.trim(),last:f.last.value.trim(),aliases,state:states[0]||"Other",otherStates:states.slice(1),city:f.city.value.trim(),
  employers:f.employers.value.split("\n").map(s=>s.trim()).filter(Boolean),searchAll:ctx.searchAll};save();renderUCP();show("s-ucp")};
function track(id,c,type,src,url,notes){if(!found.some(x=>x.id===id)){found.push({id,c,type,bal:"Unknown until confirmed",src,url});tracker[id]??={status:"Not started",notes,follow:""};save()}}
const EMP_STEPS=["Found an old pay stub or W-2 (box 12 code D means a 401(k))","Checked DOL Lost and Found for this employer's plan","Got the plan name and administrator from HR or the plan's Form 5500","Sent the request letter to the plan administrator","Got a statement and decided: roll over, leave, or cash out"];
function letter(e){const me=`${ctx.first} ${ctx.last}`,other=(ctx.aliases||[]).map(a=>a.first+" "+a.last).join(", ");
 return `[Date]\n\nPlan Administrator\n${e} retirement plan\n[Administrator address from DOL Lost and Found, HR or Form 5500]\n\nRe: Request for account information, former employee\n\nTo the Plan Administrator:\n\nI worked for ${e} and may still have a balance in its retirement plan. Please tell me whether you hold an account or pension benefit in my name and, if so, send a current statement, the plan's summary plan description, and the forms to roll over or distribute my balance.\n\nName: ${me}${other?`\nOther names used while employed: ${other}`:""}\nDates of employment: [start] to [end]\nLast address on file: [address]${ctx.city?` (${ctx.city})`:""}\nSSN: I will give my full number by phone or a secure form once you confirm you administer this plan.\n\nPlease reply to [your email or address]. Thank you.\n\nSincerely,\n${me}`}
function renderRet(){const out=$("#empOut");const E=ctx.employers||[];
 out.innerHTML=E.length?E.map((e,i)=>{const s=emp[e]||[];return `<div class="ca-box"><div class="ca-head"><h4 style="margin:0">${esc(e)}</h4><span class="tag">${s.filter(Boolean).length}/${EMP_STEPS.length} done</span></div>
  ${EMP_STEPS.map((t,j)=>`<label class="clue"><input type="checkbox" data-emp="${i}" data-j="${j}" ${s[j]?"checked":""}> ${t}</label>`).join("")}
  <details><summary>Request letter to the plan administrator</summary><textarea rows="16" readonly>${esc(letter(e))}</textarea>
  <button class="small" data-copy="${i}">Copy letter</button></details>
  <button class="small" data-trk="${i}">${found.some(f=>f.id==="emp|"+e)?"In tracker":"Add to tracker"}</button></div>`}).join("")
  :`<p class="note">Add past employers on the <a href="#" data-go="s-about">About you</a> step to get a checklist and letter for each.</p>`;
 out.querySelectorAll("[data-emp]").forEach(c=>c.onchange=()=>{const e=E[c.dataset.emp];(emp[e]??=[])[c.dataset.j]=c.checked;LS.set("hl_emp",emp);renderRet()});
 out.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{const t=letter(E[b.dataset.copy]);try{await navigator.clipboard.writeText(t);b.textContent="Copied"}catch{prompt("Copy:",t)}});
 out.querySelectorAll("[data-trk]").forEach(b=>b.onclick=()=>{const e=E[b.dataset.trk];track("emp|"+e,"emp",e+" retirement plan","Past employer","","Request letter to plan administrator");b.textContent="In tracker"});
 out.querySelectorAll("[data-go]").forEach(a=>a.onclick=ev=>{ev.preventDefault();show(a.dataset.go)})}
document.querySelectorAll("[data-trackx]").forEach(b=>b.onclick=()=>{const [id,c,type,url]=b.dataset.trackx.split("~");track(id,c,type,"Self search",url,"");b.textContent="In tracker";b.disabled=true});
function renderBene(){const rows=$("#beneRows");
 rows.innerHTML=bene.length?bene.map((r,i)=>{const L=BENE_LINKS[r.c]||BENE_LINKS.other;const stale=r.rev&&r.rev<new Date(Date.now()-3*365*864e5).toISOString().slice(0,10);
  return `<tr><td><select data-b="${i}" data-k="c">${Object.entries(BENE_LINKS).map(([k,v])=>`<option value="${k}" ${k===r.c?"selected":""}>${v[0]}</option>`).join("")}</select></td>
  <td><input data-b="${i}" data-k="t" value="${esc(r.t||"")}" placeholder="e.g. 401(k), IRA, HSA"></td>
  <td>${r.c==="coinbase"?`<span class="no">No option</span>`:`<select data-b="${i}" data-k="n">${["Unsure","Yes","No"].map(v=>`<option ${v===r.n?"selected":""}>${v}</option>`).join("")}</select>`}</td>
  <td><input type="date" data-b="${i}" data-k="rev" value="${r.rev||""}">${stale?`<br><small class="no">Over 3 years ago</small>`:""}</td>
  <td>${r.c==="coinbase"?`<small>Coinbase accounts have no beneficiary option. Plan for crypto with a will or trust, or self-custody with multisig or Shamir backup so a trusted person can recover it.</small>`:L[1]?`<a href="${L[1]}" target="_blank" rel="noopener">Update ↗</a>${L[2]?`<br><small class="note">${L[2]}</small>`:""}`:`<small class="note">Check the provider's site after you log in.</small>`}</td>
  <td><button class="link" data-del="${i}" aria-label="Remove row">Remove</button></td></tr>`}).join(""):`<tr><td colspan="6" class="note">No accounts yet. Add each account you own.</td></tr>`;
 const need=bene.filter(r=>r.c!=="coinbase"&&r.n!=="Yes").length;$("#beneSum").textContent=bene.length?`${need} of ${bene.length} account${bene.length>1?"s":""} need${need===1?"s":""} attention.`:"";
 rows.querySelectorAll("[data-b]").forEach(x=>x.onchange=()=>{bene[x.dataset.b][x.dataset.k]=x.value;LS.set("hl_bene",bene);renderBene()});
 rows.querySelectorAll("[data-del]").forEach(x=>x.onclick=()=>{bene.splice(x.dataset.del,1);LS.set("hl_bene",bene);renderBene()})}
$("#beneAdd").onclick=()=>{bene.push({c:"fidelity",t:"",n:"Unsure",rev:""});LS.set("hl_bene",bene);renderBene()};
window.selfShow=t=>{if(t==="s-ret")renderRet();if(t==="s-bene")renderBene();if(t==="s-ucp"&&!ctx.last)$("#ucpPanel").innerHTML=`<div class="card"><p class="note">Fill in <b>About you</b> first so we can search your names.</p></div>`};
setMode(MODE);
