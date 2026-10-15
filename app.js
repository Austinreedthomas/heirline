const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
let found=LS.get("hl_found",[]), ctx=LS.get("hl_ctx",{}), tracker=LS.get("hl_tracker",{});
const save=()=>{LS.set("hl_found",found);LS.set("hl_ctx",ctx);LS.set("hl_tracker",tracker)};

document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>show(b.dataset.tab));
function show(t){const order=["search","scan","plan","track"],k=order.indexOf(t);document.querySelectorAll("nav button").forEach((b,i)=>b.classList.toggle("done",i<k));document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===t));
 document.querySelectorAll(".tab").forEach(s=>s.classList.toggle("active",s.id===t));
 if(t==="plan")renderPlan(); if(t==="track")renderTracker(); window.scrollTo(0,0)}

function addAccount(a){const id=a.c+"|"+a.type.toLowerCase(); const t=a.type.toLowerCase();
 const dup=f=>f.id===id||(f.c===a.c&&a.src==="document"&&(t==="ira"&&/ira/i.test(f.type)||f.type.toLowerCase().includes(t)||t.includes(f.type.toLowerCase())));
 const ex=found.find(dup); if(ex){if(a.hint&&!ex.hint){ex.hint=a.hint;save()}return false} found.push({...a,id}); save(); return true}

let ucp=LS.get("hl_ucp",{});
const UCP_LABEL={"":"Not checked yet",checked:"Checked","none":"Nothing found",found:"Found property"};
function renderUCP(){const el=$("#ucpPanel"); if(!ctx.last){el.innerHTML="";return}
 const states=[...new Set([ctx.state,...(ctx.otherStates||[])])].filter(s=>STATE_SITES[s]);
 const name=`${ctx.last}, ${ctx.first}`;
 const row=(key,S)=>{const st=ucp[key]||"";return `<div class="ucp-row"><div class="ucp-info"><b>${S.site}</b><span>${key==="MM"?S.name:S.name+" · official state site"}</span></div>
  <div class="ucp-act"><a class="btn" href="${S.url}" target="_blank" rel="noopener">Search ↗</a>
  <select data-ucp="${key}" aria-label="Result for ${S.site}">${Object.entries(UCP_LABEL).map(([v,l])=>`<option value="${v}" ${v===st?"selected":""}>${l}</option>`).join("")}</select></div></div>`};
 el.innerHTML=`<div class="card ucp"><div class="ucp-head"><h3>Unclaimed property</h3><span class="tag gold">${states.length+1} place${states.length?"s":""} to check</span></div>
 <p class="note">States hold forgotten balances, uncashed checks and old accounts. Search the name <b>${esc(name)}</b> <button type="button" class="link" id="copyName">Copy name</button>
 The official sites don't accept a pre-filled name in the link (they use a bot check), so each button opens the search page and you paste the name.</p>
 ${row("MM",MISSING_MONEY)}${states.map(s=>row(s,STATE_SITES[s])).join("")}
 ${ctx.state==="Other"?`<p class="note">State not listed? Use <a href="https://unclaimed.org/search-property/" target="_blank" rel="noopener">NAUPA's directory of every state's site</a>.</p>`:""}
 <p class="note">Marking a result "Found property" adds it to your claim plan and tracker.</p></div>`;
 $("#copyName").onclick=async e=>{try{await navigator.clipboard.writeText(name);e.target.textContent="Copied"}catch{prompt("Copy:",name)}};
 el.querySelectorAll("[data-ucp]").forEach(s=>s.onchange=()=>{const k=s.dataset.ucp;ucp[k]=s.value;LS.set("hl_ucp",ucp);
  const S=k==="MM"?MISSING_MONEY:STATE_SITES[k];const id="ucp|"+k;
  if(s.value==="found"){if(!found.some(f=>f.id===id)){found.push({id,c:"ucp",type:"Unclaimed property · "+S.name,bal:"Shown on state site",src:"unclaimed-property search",url:S.url});
   tracker[id]??={status:"Not started",notes:"Found via "+S.site,follow:""};save()}}
  else{const i=found.findIndex(f=>f.id===id);if(i>=0&&!(tracker[id]&&tracker[id].status!=="Not started")){found.splice(i,1);delete tracker[id];save()}}})}
renderUCP();

$("#searchForm").onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
 const ssn4=(f.ssn||"").replace(/\D/g,"").slice(-4); e.target.ssn.value=""; // never kept
 ctx={first:f.first.trim(),last:f.last.trim(),dob:f.dob,dod:f.dod,state:f.state,otherStates:[...e.target.otherStates.selectedOptions].map(o=>o.value),me:f.me.trim(),rel:f.rel,role:f.role}; save(); renderUCP();
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
function scanText(name,text){const hits=[];
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
 $("#scanOut").innerHTML=results.map(r=>`<div class="card"><b>${esc(r.name)}</b>${r.image?' <span class="tag">image: filename only, no OCR yet</span>':""}<br>${r.hits.length?r.hits.map(h=>{if(addAccount({c:h.c,type:h.type,bal:"Unknown (from document)",src:"document",hint:h.hint}))added++;
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
 $("#clearAll").onclick=()=>{if(confirm("Clear all accounts and tracker?")){found=[];tracker={};ucp={};LS.set("hl_ucp",ucp);save();renderUCP();renderPlan()}};
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
