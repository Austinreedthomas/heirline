const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
let MODE=LS.get("hl_mode","loss");const CTXK=()=>MODE==="self"?"hl_ctx_self":"hl_ctx";
let found=LS.get("hl_found",[]), ctx=LS.get(CTXK(),{}), tracker=LS.get("hl_tracker",{});
const save=()=>{LS.set("hl_found",found);LS.set(CTXK(),ctx);LS.set("hl_tracker",tracker)};
const UK=k=>(MODE==="self"?"self:":"")+k;

document.querySelector("nav.steps").onclick=e=>{const b=e.target.closest("button[data-tab]");if(b)show(b.dataset.tab)};
function show(t){const order=[...document.querySelectorAll("nav.steps button")].map(b=>b.dataset.tab),k=order.indexOf(t);document.querySelectorAll("nav button").forEach((b,i)=>b.classList.toggle("done",i<k));document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===t));
 document.querySelectorAll(".tab").forEach(s=>s.classList.toggle("active",s.id===t));
 if(t==="plan")renderPlan(); if(t==="life")renderLife(); if(window.selfShow)selfShow(t); if(t==="track")renderTracker(); window.scrollTo(0,0)}

function addAccount(a){const id=a.c+"|"+a.type.toLowerCase(); const t=a.type.toLowerCase();
 const dup=f=>f.id===id||(f.c===a.c&&a.src==="document"&&(t==="ira"&&/ira/i.test(f.type)||f.type.toLowerCase().includes(t)||t.includes(f.type.toLowerCase())));
 const ex=found.find(dup); if(ex){if(a.hint&&!ex.hint){ex.hint=a.hint;save()}return false} found.push({...a,id}); save(); return true}

let ucp=LS.get("hl_ucp",{});
const UCP_LABEL={"":"Not checked yet",checked:"Checked","none":"Nothing found",found:"Found property"};
function renderUCP(){const el=$("#ucpPanel"); if(!ctx.last){el.innerHTML="";return}
 const states=[...new Set([ctx.state,...(ctx.otherStates||[])])].filter(s=>STATE_SITES[s]);
 const allNames=[{first:ctx.first,last:ctx.last},...(ctx.aliases||[])].filter(n=>n.last);const name=allNames.map(n=>`${n.last}, ${n.first}`).join("; ");
 const row=(key,S)=>{const st=ucp[UK(key)]||"";return `<div class="ucp-row"><div class="ucp-info"><b>${S.site}</b><span>${key==="MM"?S.name:S.name+" · official state site"}</span></div>
  <div class="ucp-act"><a class="btn" href="${S.url}" target="_blank" rel="noopener">Search ↗</a>
  <select data-ucp="${key}" aria-label="Result for ${S.site}">${Object.entries(UCP_LABEL).map(([v,l])=>`<option value="${v}" ${v===st?"selected":""}>${l}</option>`).join("")}</select></div></div>`};
 el.innerHTML=`<div class="card ucp"><div class="ucp-head"><h3>Unclaimed property</h3><span class="tag gold">${states.length+1} place${states.length?"s":""} to check</span></div>
 <p class="note">States hold forgotten balances, uncashed checks and old accounts. Search the name <b>${esc(name)}</b> <button type="button" class="link" id="copyName">Copy name</button>
 The official sites don't accept a pre-filled name in the link (they use a bot check), so each button opens the search page and you paste the name.</p>
 ${row("MM",MISSING_MONEY)}${states.map(s=>row(s,STATE_SITES[s])).join("")}
 <div class="auto-toggle"><label class="sw"><input type="checkbox" id="searchAll" ${ctx.searchAll!==false?"checked":""}> Search all covered states</label><span class="note" id="coverNote">Automatic search uses states that publish open data.</span></div>
 <div id="autoMatches"></div>
 ${ctx.state==="Other"?`<p class="note">State not listed? Use <a href="https://unclaimed.org/search-property/" target="_blank" rel="noopener">NAUPA's directory of every state's site</a>.</p>`:""}
 <p class="note">Marking a result "Found property" adds it to your claim plan and tracker.</p></div>`;
 $("#copyName").onclick=async e=>{try{await navigator.clipboard.writeText(name);e.target.textContent="Copied"}catch{prompt("Copy:",name)}};
 $("#searchAll").onchange=e=>{ctx.searchAll=e.target.checked;save();searchAuto(states)};searchAuto(states);
 el.querySelectorAll("[data-ucp]").forEach(s=>s.onchange=()=>{const k=s.dataset.ucp;ucp[UK(k)]=s.value;LS.set("hl_ucp",ucp);
  const S=k==="MM"?MISSING_MONEY:STATE_SITES[k];const id="ucp|"+UK(k);
  if(s.value==="found"){if(!found.some(f=>f.id===id)){found.push({id,c:"ucp",type:"Unclaimed property · "+S.name,bal:"Shown on state site",src:"unclaimed-property search",url:S.url});
   tracker[id]??={status:"Not started",notes:"Found via "+S.site,follow:""};save()}}
  else{const i=found.findIndex(f=>f.id===id);if(i>=0&&!(tracker[id]&&tracker[id].status!=="Not started")){found.splice(i,1);delete tracker[id];save()}}})}
// ---- Automatic state search (sharded index built by scripts/build_ca_index.py) ----
let COVERED=null;const metaC={},shardC={};const nm=s=>(s||"").toUpperCase().replace(/[^A-Z]/g,"");const fmt=n=>"$"+Math.round(n).toLocaleString("en-US");
async function covered(){return COVERED??=await (await fetch("data/states.json")).json()}
async function shardFor(st,last){const m=metaC[st]??=await (await fetch(`data/${st.toLowerCase()}/meta.json`)).json();
 const k=nm(last);let key=k.slice(0,2);if(m.shards[key]==="split")key=k.slice(0,3);if(!m.shards[key])return [m,null];
 return [m,shardC[st+key]??=await (await fetch(`data/${st.toLowerCase()}/${key}.json`)).json()]}
function matchRows(sh,first=ctx.first,last=ctx.last){const L=nm(last),F=nm(first),city=(ctx.city||"").toUpperCase().trim();const rows=[];if(!sh)return rows;
 for(const r of sh.r){if(nm(r[0])!==L)continue;const fr=nm((r[1]||"").split(" ")[0]);let m=null;
  if(F&&fr===F)m="exact";else if(F&&fr[0]===F[0]&&(fr.length===1||F.startsWith(fr)||fr.startsWith(F)))m="close";if(!m)continue;
  if(city&&r[2]!==city)continue;rows.push({m,last:r[0],rest:r[1],city:r[2],zip:r[3],type:sh.t[r[4]],amt:r[5],holder:sh.h[r[6]],id:r[7],paid:r[8]})}
 return rows.sort((a,b)=>(a.m>b.m?-1:a.m<b.m?1:0)||b.amt-a.amt)}
async function searchAuto(rel){const box=$("#autoMatches");if(!box)return;
 try{const cov=await covered();const all=$("#searchAll")?.checked!==false;const list=Object.keys(cov).filter(s=>all||rel.includes(s));
  $("#coverNote").textContent=`Open-data states: ${Object.keys(cov).map(s=>cov[s].name).join(", ")}. Other states need a manual search below.`;
  if(!list.length){box.innerHTML=`<p class="note">None of the selected states publish open data yet. Turn on "Search all covered states" or use the manual searches below.</p>`;return}
  box.innerHTML=list.map(s=>`<div class="ca-box" id="auto-${s}"><p class="note">Searching ${cov[s].name}'s public records…</p></div>`).join("");
  let total=0;
  for(const st of list){const el=$("#auto-"+st);let m,rows=[];for(const n of [{first:ctx.first,last:ctx.last},...(ctx.aliases||[])].filter(n=>n.last)){const [mm,sh]=await shardFor(st,n.last);m=mm;const seen=new Set(rows.map(r=>r.id));matchRows(sh,n.first,n.last).forEach(r=>{if(!seen.has(r.id))rows.push(r)})}rows.sort((a,b)=>(a.m>b.m?-1:a.m<b.m?1:0)||b.amt-a.amt);total+=rows.length;const shown=rows.slice(0,50);
   el.innerHTML=`<div class="ca-head"><h4 style="margin:0">${m.name} · automatic search${rel.includes(st)?"":` <span class="tag">not a state ${MODE==="self"?"you":"they"} lived in</span>`}</h4><span class="note">Data as of ${m.asOf} · records of ${fmt(m.minAmount)}+ only · ${m.records.toLocaleString()} records</span></div>
   ${rows.length?`<p class="note">${rows.length} possible match${rows.length>1?"es":""} for <b>${esc(ctx.last)}, ${esc(ctx.first)}${(ctx.aliases||[]).length?" (and other names)":""}</b>${ctx.city?" in "+esc(ctx.city.toUpperCase()):""}${rows.length>50?" (showing top 50)":""}. Confirm the address matches before claiming.</p>
   <div class="tbl"><table><tr><th>Match</th><th>Owner on record</th><th>City</th><th>Amount</th><th>Holder</th><th>Property ID</th><th></th></tr>
   ${shown.map(r=>{const id=st.toLowerCase()+"|"+r.id,on=found.some(f=>f.id===id);return `<tr><td><span class="tag ${r.m==="exact"?"gold":""}">${r.m}</span></td><td>${esc(r.last+" "+r.rest)}</td><td>${esc(r.city)} ${esc(r.zip)}</td><td>${fmt(r.amt)}${r.paid?' <small class="no">claim paid before</small>':""}</td><td>${esc(r.holder)}<br><small class="note">${esc(r.type)}</small></td><td>${esc(r.id)}</td>
    <td><button class="small" data-auto="${st}" data-rec='${esc(JSON.stringify(r))}' ${on?"disabled":""}>${on?"In tracker":"Add to tracker"}</button></td></tr>`}).join("")}</table></div>
   <p class="note">To claim, open <a href="${m.claimUrl}" target="_blank" rel="noopener">${m.name}'s official claim site ↗</a>, search the name, and pick the record with the matching Property ID.</p>`
   :`<p class="note">No ${m.name} records of ${fmt(m.minAmount)}+ for ${esc(ctx.last)}, ${esc(ctx.first)}. Smaller amounts aren't in this index, so still search the official site.</p>`}`;
   el.querySelectorAll("[data-auto]").forEach(b=>b.onclick=()=>{const r=JSON.parse(b.dataset.rec);const id=st.toLowerCase()+"|"+r.id;
    if(!found.some(f=>f.id===id)){found.push({id,c:"ucp",type:`${st} unclaimed property · ${r.holder}`,bal:fmt(r.amt)+" (as of "+m.asOf+")",src:m.name+" public records",hint:"Property ID "+r.id,url:m.claimUrl});
     tracker[id]??={status:"Not started",notes:`${st} Property ID ${r.id}, ${r.type}, ${r.city}`,follow:""};save()}b.textContent="In tracker";b.disabled=true})}
 }catch(e){box.innerHTML=`<p class="note">Automatic state search needs the hosted site (it couldn't load the data here${location.protocol==="file:"?": open the GitHub Pages version":""}).</p>`}}
$("#searchForm").onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
 const ssn4=(f.ssn||"").replace(/\D/g,"").slice(-4); e.target.ssn.value=""; // never kept
 ctx={first:f.first.trim(),last:f.last.trim(),dob:f.dob,dod:f.dod,state:f.state,otherStates:[...e.target.otherStates.selectedOptions].map(o=>o.value),city:(f.city||"").trim(),searchAll:ctx.searchAll,me:f.me.trim(),rel:f.rel,role:f.role}; save(); renderUCP();
 const n=s=>s.toLowerCase().trim();
 const matches=PEOPLE.filter(p=>n(p.last)===n(f.last)&&n(p.first)===n(f.first)&&(!f.dob||p.dob===f.dob)&&(!ssn4||p.ssn4===ssn4));
 const out=$("#results");
 if(!matches.length){out.innerHTML=`<div class="card"><b>No match in the sample network.</b><p class="note">Check spelling, DOB and SSN last 4. In a real product, no match could also mean the custodian isn't a partner yet. Try document scanning next.</p></div>`;return}
 const p=matches[0]; const me=n(f.me||"");
 out.innerHTML=`<div class="card"><h3>Found ${p.accounts.length} account(s) for ${esc(p.first)} ${esc(p.last)}</h3>
 <p class="note">DOB ${p.dob} · died ${p.dod} · ${p.state}</p>
 <table><tr><th>Custodian</th><th>Type</th><th>Approx. balance</th><th>You're a named beneficiary?</th></tr>
 ${p.accounts.map(a=>{const isBen=me&&a.bens.some(b=>n(b)===me);
  const why=a.c==="coinbase"?"No beneficiary option: claim through the estate":isBen?"Yes":a.bens.length?"No (others named)":"None named: goes to estate/default";
  return `<tr><td>${CUSTODIANS[a.c].name}</td><td>${esc(a.type)}</td><td>${a.bal}</td><td class="${isBen?"yes":"no"}">${why}</td></tr>`}).join("")}</table>
 <button class="primary" id="addAll">Add to claim plan</button></div>`;
 $("#addAll").onclick=()=>{p.accounts.forEach(a=>addAccount({c:a.c,type:a.type,bal:a.bal,src:"network",isBen:!!(me&&a.bens.some(b=>n(b)===me))}));show("plan")};
};

// ---- Document scan ----
const RULES=[{c:"fidelity",re:/fidelity|netbenefits/i},{c:"vanguard",re:/vanguard/i},{c:"schwab",re:/schwab/i},{c:"empower",re:/empower|great-west/i},{c:"healthequity",re:/healthequity|health\s*equity/i},{c:"coinbase",re:/coinbase/i}];
function guessType(t){if(/5498-SA|health savings|\bHSA\b/i.test(t))return"HSA";if(/roth ira/i.test(t))return"Roth IRA";if(/401\(?k\)?/i.test(t))return"401(k)";
 if(/coinbase|BTC|ETH|USDC/i.test(t))return"Crypto exchange account";if(/\bIRA\b|5498|1099-R/i.test(t))return"IRA";return"Account (type unknown)"}
const INSURERS=/\b(MetLife|Metropolitan Life|Prudential|New York Life|Northwestern Mutual|MassMutual|Massachusetts Mutual|Lincoln Financial|Lincoln National|Transamerica|Pacific Life|Protective Life|Nationwide|John Hancock|Globe Life|Mutual of Omaha|State Farm|Penn Mutual|Guardian Life|Principal Life|Securian|Brighthouse|Corebridge|American General|Primerica|Allstate|Banner Life|Genworth|Ameritas|Western & Southern|Sammons|Thrivent|USAA Life|Aflac|Unum|OneAmerica)\b/i;
const LIFE_WORDS=/life insurance|term life|whole life|universal life|premium (notice|due|paid)|death benefit|policy (number|no\.?)/i;
function scanText(name,text){const hits=[];
 const ins=(text.match(INSURERS)||[])[1];if(ins||LIFE_WORDS.test(text)&&!RULES.some(r=>r.re.test(text))){const pol=(text.match(/policy\s*(?:number|no\.?|#)\s*[:#]?\s*([A-Z0-9-]*\d[A-Z0-9-]*)/i)||[])[1];
  hits.push({c:"lifeins",type:"Life insurance"+(ins?" · "+ins:" (insurer unknown)"),hint:[/premium/i.test(text)&&"premium notice",pol&&"policy ending "+pol.slice(-4)].filter(Boolean).join(", ")})}
 for(const r of RULES)if(r.re.test(text)){const type=guessType(text);const acct=(text.match(/account\s*(?:number|id)\s*[:#]?\s*([A-Z0-9-]*\d[A-Z0-9-]*)/i)||[])[1];
  const form=(text.match(/FORM\s+(1099-R|5498-SA|5498)/i)||[])[1];
  hits.push({c:r.c,type,hint:[form&&"Form "+form,acct&&"acct ending "+acct.slice(-4)].filter(Boolean).join(", ")})}
 return {name,hits}}
async function readFile(f){
 if(f.type==="application/pdf"||/\.pdf$/i.test(f.name)){if(!window.pdfjsLib)return f.name;
  pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;let t="";
  for(let i=1;i<=pdf.numPages;i++){const c=await (await pdf.getPage(i)).getTextContent();t+=c.items.map(x=>x.str).join(" ")+"\n"}return t}
 if(f.type.startsWith("image/"))return f.name; // no OCR in prototype: filename only
 return await f.text()}
function showScan(results){let added=0;
 $("#scanOut").innerHTML=results.map(r=>`<div class="card"><b>${esc(r.name)}</b>${r.image?' <span class="tag">image: filename only, no OCR yet</span>':""}<br>${r.hits.length?r.hits.map(h=>{if(addAccount({c:h.c,type:h.type,bal:h.c==="lifeins"?"Death benefit unknown":"Unknown (from document)",src:"document",hint:h.hint}))added++;
  return `<span class="tag">${CUSTODIANS[h.c].name}</span> ${esc(h.type)} ${h.hint?"· "+esc(h.hint):""}`}).join("<br>"):"<span class='no'>No custodian found</span>"}</div>`).join("")+
  `<p><b>${added} new account(s) added to your claim plan</b> (${results.reduce((n,r)=>n+r.hits.length,0)-added} matched accounts already in it). <button class="primary" onclick="show('plan')">View claim plan</button></p>`}
$("#files").onchange=async e=>{const res=[];for(const f of e.target.files){try{res.push({...scanText(f.name,await readFile(f)),image:f.type.startsWith("image/")})}catch(err){res.push({name:f.name+" (could not read: "+err.message+")",hits:[]})}}showScan(res)};
$("#sampleDocs").onclick=async()=>{const res=[];for(const n of SAMPLE_DOCS){const t=SAMPLE_TEXTS[n];res.push(scanText(n,t))}showScan(res)};

// ---- Claim plan ----
function letter(a){const C=CUSTODIANS[a.c],d=ctx;const today=new Date().toLocaleDateString();
 return `${today}

${C.name}
Re: Notice of death and beneficiary claim
Deceased: ${d.first||"[First]"} ${d.last||"[Last]"}   Date of birth: ${d.dob||"[DOB]"}   Date of death: ${d.dod||"[DOD]"}
Account: ${a.type}${a.hint?" ("+a.hint+")":""}

To whom it may concern,

I am writing to notify you of the death of ${d.first||"[name]"} ${d.last||""} and to begin the ${a.c==="coinbase"?"estate transfer":"beneficiary claim"} process for the account above. I am the deceased's ${(d.rel||"[relationship]").toLowerCase()} and ${d.role==="executor"?"the executor of the estate":d.role==="spouse"?"surviving spouse":"a named beneficiary"}.

Enclosed:
${C.docs.map(x=>" - "+x).join("\n")}

Please tell me of any further documents you need, and send correspondence to me at the address below.

Sincerely,
${d.me||"[Your name]"}
[Address]  [Phone]  [Email]
`}
function renderPlan(){const out=$("#planOut");
 if(!found.length){out.innerHTML=`<div class="card">No accounts yet. Run a search or scan documents first.</div>`;return}
 const custs=[...new Set(found.map(a=>a.c==="ucp"?a.id:a.c))];
 out.innerHTML=`<div class="card"><h2>Claim plan</h2><p>${found.length} account(s) at ${custs.length} custodian(s).</p>
 <p><b>Order ${custs.length+1} certified death certificates</b> (one per custodian + one spare).</p><button id="clearAll">Clear all accounts</button></div>`+
 found.map((a,i)=>{const C=CUSTODIANS[a.c];return `<div class="card"><h3>${C.name} · ${esc(a.type)}</h3>
 <p class="note">Balance: ${esc(a.bal)} · Source: ${a.src}${a.hint?" · "+esc(a.hint):""}</p>
 <b>Steps</b><ol>${C.steps.map(s=>`<li>${s}</li>`).join("")}</ol>
 <b>Document checklist</b><ul>${C.docs.map((d,j)=>`<li><label style="flex-direction:row;gap:6px"><input type="checkbox" data-doc="${a.id}|${j}" ${tracker[a.id]?.docs?.[j]?"checked":""}> ${d}</label></li>`).join("")}</ul>
 <p><a href="${a.url||C.url}" target="_blank" rel="noopener">Official ${a.c==="ucp"?"state search":C.name} page ↗</a></p>
 <details><summary>Cover letter</summary><pre id="L${i}">${esc(letter(a))}</pre>
 <button data-copy="${i}">Copy</button><button data-dl="${i}">Download .txt</button></details>
 <button data-rm="${i}">Remove</button></div>`}).join("");
 out.querySelectorAll("[data-doc]").forEach(cb=>cb.onchange=()=>{const [id,j]=cb.dataset.doc.split("|");const t=tracker[id]??={status:"Not started",notes:"",follow:""};(t.docs??={})[j]=cb.checked;save()});
 out.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{const t=$("#L"+b.dataset.copy).textContent;try{await navigator.clipboard.writeText(t);b.textContent="Copied!"}catch{prompt("Copy:",t)}});
 out.querySelectorAll("[data-dl]").forEach(b=>b.onclick=()=>{const a=found[b.dataset.dl];const blob=new Blob([letter(a)],{type:"text/plain"});const u=URL.createObjectURL(blob);
  const l=document.createElement("a");l.href=u;l.download=`Heirline_${a.c}_cover_letter.txt`;l.click();URL.revokeObjectURL(u)});
 out.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{found.splice(+b.dataset.rm,1);save();renderPlan()});
 $("#clearAll").onclick=()=>{if(confirm("Clear all accounts and tracker?")){found=[];tracker={};ucp={};lifeChk={};LS.set("hl_ucp",ucp);LS.set("hl_life",lifeChk);save();renderUCP();renderLife();renderPlan()}};
}

// ---- Tracker ----
const STATUSES=["Not started","Submitted","Docs requested","Paid"];
function renderTracker(){const out=$("#trackOut");
 if(!found.length){out.innerHTML=`<div class="card">No claims yet.</div>`;return}
 const counts=STATUSES.map(s=>found.filter(a=>(tracker[a.id]?.status||"Not started")===s).length);
 out.innerHTML=`<div class="card"><h2>Claim tracker</h2><p>${STATUSES.map((s,i)=>`<span class="tag">${s}: ${counts[i]}</span>`).join(" ")}</p><p class="note">Saved in this browser (localStorage).</p></div>`+
 found.map(a=>{const t=tracker[a.id]||{};const overdue=t.follow&&t.status!=="Paid"&&t.follow<new Date().toISOString().slice(0,10);
 return `<div class="card"><h3>${CUSTODIANS[a.c].name} · ${esc(a.type)}</h3><div class="grid">
 <label>Status<select data-f="status" data-id="${a.id}">${STATUSES.map(s=>`<option ${s===(t.status||"Not started")?"selected":""}>${s}</option>`).join("")}</select></label>
 <label>Follow-up date${overdue?' <span class="no">(overdue)</span>':""}<input type="date" data-f="follow" data-id="${a.id}" value="${t.follow||""}"></label></div>
 <label>Notes<textarea rows="2" data-f="notes" data-id="${a.id}">${esc(t.notes||"")}</textarea></label></div>`}).join("");
 out.querySelectorAll("[data-f]").forEach(el=>el.onchange=()=>{const t=tracker[el.dataset.id]??={};t[el.dataset.f]=el.value;save();if(el.dataset.f!=="notes")renderTracker()});
}
renderUCP();
// ---- Life insurance step ----
let lifeChk=LS.get("hl_life",{});
function addLifeTrack(id,label,notes,days){if(!found.some(f=>f.id===id)){found.push({id,c:"lifeins",type:label,bal:"Unknown until an insurer responds",src:"life insurance search",url:id==="life|mib"?"https://mib.com/pls.html":"https://eapps.naic.org/life-policy-locator/"});}
 const fu=new Date(Date.now()+days*864e5).toISOString().slice(0,10);tracker[id]={...(tracker[id]||{}),status:"Submitted",notes,follow:tracker[id]?.follow||fu};save();renderLife()}
function renderLife(){const el=$("#lifeClues");if(!el)return;
 el.innerHTML=LIFE_CLUES.map((c,i)=>`<label class="clue"><input type="checkbox" data-clue="${i}" ${lifeChk[i]?"checked":""}> ${c}</label>`).join("");
 el.querySelectorAll("[data-clue]").forEach(cb=>cb.onchange=()=>{lifeChk[cb.dataset.clue]=cb.checked;LS.set("hl_life",lifeChk)});
 const n=tracker["life|naic"];$("#naicNote").textContent=n?`In your tracker · follow up by ${n.follow}`:"";$("#naicDone").disabled=!!n;$("#naicDone").textContent=n?"NAIC request in tracker":"Mark NAIC request submitted";
 const m=tracker["life|mib"];$("#mibDone").disabled=!!m;$("#mibDone").textContent=m?"MIB request in tracker":"Mark MIB request sent"}
$("#naicDone").onclick=()=>addLifeTrack("life|naic","NAIC request submitted","NAIC Life Insurance Policy Locator request. Insurers contact you directly only if a policy is found; allow up to 90 business days.",126);
$("#mibDone").onclick=()=>addLifeTrack("life|mib","MIB Policy Locator request sent","MIB mails a report within 21 business days of receiving a complete application.",30);
renderLife();
