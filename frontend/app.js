/* ===== CONFIG ===== */
const CONFIG={BACKEND_URL:""}; /* leave empty when the backend serves this page; else e.g. "https://your-api.onrender.com" */
let BACK=null,GCID=""; /* BACK=null means demo mode (no backend found) */
const SEG=[{n:"Money",c:"#ff5a1f",a:45},{n:"Business",c:"#ffb800",a:135},{n:"Daily Life",c:"#e63946",a:225},{n:"Tech",c:"#2a9d8f",a:315}];
const CATEGORIES=["Money","Business","Daily Life","Tech","AI","SaaS","Fintech","E-commerce","Education","Healthcare","Agriculture","Food & Beverage","Logistics","Climate & Sustainability","Creator Economy","Social Impact"];
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function socialHref(kind,raw){
  const value=String(raw||"").trim();if(!value)return "";
  const hosts={instagram:["instagram.com","www.instagram.com"],linkedin:["linkedin.com","www.linkedin.com"],twitter:["twitter.com","www.twitter.com","x.com","www.x.com"]};
  let url;
  try{
    if(/^https?:\/\//i.test(value))url=new URL(value);
    else if(/^(www\.)?(instagram\.com|linkedin\.com|twitter\.com|x\.com)(\/|$)/i.test(value))url=new URL("https://"+value);
    else if(kind!=="linkedin"){
      const handle=value.replace(/^@/,"");if(!/^[A-Za-z0-9._]{1,30}$/.test(handle))return "";
      url=new URL(`https://${kind==="instagram"?"instagram.com":"x.com"}/${handle}`);
    }else return "";
    if(url.protocol!=="https:"||!hosts[kind].includes(url.hostname.toLowerCase())||url.username||url.password)return "";
    return url.href;
  }catch{return ""}
}
const SOCIAL_SVG={
  instagram:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><circle cx="12" cy="12" r="4"/><circle class="social-dot" cx="17.7" cy="6.7" r="1"/></svg>',
  linkedin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 8.7H2.1V22h3.1V8.7ZM3.65 2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6ZM22 14.4c0-4-2.1-5.9-4.9-5.9a4.2 4.2 0 0 0-3.8 2.1V8.7h-3.1V22h3.1v-6.6c0-1.7.3-3.4 2.5-3.4s2.2 2 2.2 3.5V22h3.1l.9-7.6Z"/></svg>',
  twitter:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.7 5.6 22H2.4l7.3-8.4L1.8 2h6.5l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z"/></svg>'
};
function socialIcon(kind,value){const href=socialHref(kind,value),label={instagram:"Instagram",linkedin:"LinkedIn",twitter:"Twitter / X"}[kind];
  return href?`<a class="social-link social-${kind}" href="${esc(href)}" target="_blank" rel="noopener noreferrer" aria-label="Open contributor ${label}">${SOCIAL_SVG[kind]}</a>`:
    `<span class="social-link social-inactive" aria-hidden="true">${SOCIAL_SVG[kind]}</span>`;
}
const toast=m=>{const t=$("toast");t.textContent=m;t.style.display="block";clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display="none",2800)};
$("sCat").innerHTML='<option value="">No category</option>'+CATEGORIES.map(s=>`<option>${esc(s)}</option>`).join("")+'<option value="__other">Other</option>';
$("sCat").addEventListener("change",()=>{
  const isOther=$("sCat").value==="__other";
  $("otherCategoryField").hidden=!isOther;
  $("sOtherCat").required=isOther;
  if(isOther)$("sOtherCat").focus();
  else $("sOtherCat").value="";
});
const R=(a,b)=>a+Math.random()*(b-a);

/* ===== background: bunting, floaters, confetti, parallax ===== */
(function(){
  const b=$("bunting"),cols=["#ff5722","#ffb800","#e63946","#2a9d8f"];
  function bunt(){const W=innerWidth,k=parseFloat(getComputedStyle(document.documentElement).fontSize)/18,sp=115*k,w=54*k,hh=48*k,y=14*k,n=Math.ceil(W/sp)+1;
    b.style.height=74*k+"px";b.setAttribute("viewBox",`0 0 ${W} ${74*k}`);
    let h=`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#d9a07a" stroke-width="2"/>`;
    for(let i=0;i<n;i++){const x=i*sp+8*k;h+=`<polygon points="${x},${y} ${x+w},${y} ${x+w/2},${y+hh}" fill="${cols[i%4]}" style="animation-delay:${-i*.35}s"/>`}
    b.innerHTML=h}
  bunt();addEventListener("resize",bunt);
  const F=[["Pehle socho!",29,13,"#ed7779",-4],["Shark Tank bulao",59,9,"#98765d",3],["Chai baithak",6,26,"#69ad9e",3],["Scope hai, bhai",41,26,"#c66cb2",4],["Bas ek idea door...",51,38,"#e78662",-5],["Mummy ko mat batana",44,62,"#e17d79",4],["Jugaad zindabad",31,69,"#bf70a6",3],["Funding kab aayegi?",6,77,"#e98c69",-5],["Kal se pakka",53,78,"#69ad9e",-4],["Gully se global",31,86,"#69ad9e",3]];
  $("fl").innerHTML=F.map((f,i)=>`<div class="px" data-d="${14+i*2}" style="left:${f[1]}%;top:${f[2]}%"><span class="fl" style="--tilt:${f[4]}deg;color:${f[3]};font-size:${innerWidth<820?1.25:1.45}rem;animation-delay:${-i*.7}s;animation-duration:${4+i%4*.65}s">${f[0]}</span></div>`).join("");
  let c="";for(let i=0;i<30;i++){const s=R(7,17),r=i%3?"":"border-radius:50%;";c+=`<div class="px" data-d="${R(18,46)}" style="left:${R(0,100)}%;top:${R(6,96)}%"><div class="cf" style="width:${s}px;height:${r?s:s/2.4}px;background:${["#e8545a","#2a9d8f","#ffb800","#ff7a3d","#f3a6c4"][i%5]};${r}transform:rotate(${R(0,180)}deg)"></div></div>`}
  $("cf").innerHTML=c;
  const els=[...document.querySelectorAll("#fx .px")];let tx=0,ty=0,x=0,y=0;
  addEventListener("pointermove",e=>{tx=e.clientX/innerWidth-.5;ty=e.clientY/innerHeight-.5});
  (function t(){x+=(tx-x)*.06;y+=(ty-y)*.06;els.forEach(e=>{const d=+e.dataset.d;e.style.transform=`translate(${-x*d*2}px,${-y*d*2}px)`});requestAnimationFrame(t)})();
})();

/* ===== wheel svg ===== */
(function(){
  const p=(r,a)=>[r*Math.sin(a*Math.PI/180),-r*Math.cos(a*Math.PI/180)];
  let s='<svg viewBox="-100 -100 200 200"><circle r="99" fill="#2b1206"/><circle r="95.5" fill="#fff"/>';
  SEG.forEach((g,i)=>{const a=i*90,[x1,y1]=p(92,a),[x2,y2]=p(92,a+90),[tx,ty]=p(60,g.a),rot=g.a===135?-45:g.a;
    s+=`<path d="M0 0L${x1} ${y1}A92 92 0 0 1 ${x2} ${y2}Z" fill="${g.c}"/><text x="${tx}" y="${ty}" transform="rotate(${rot} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-family="Figtree" font-weight="700" font-size="8.2" letter-spacing=".8">${g.n.toUpperCase()}</text>`});
  $("wheel").innerHTML=s+"</svg>";
})();

/* ===== data ===== */
const DEMO=[
 {id:1,name:"Rahul Sharma",problem:"Cross-border freelancers lose up to 7% on foreign exchange fees and intermediary bank charges every time they invoice international clients.",solution:"An automated peer-to-peer liquidity matching widget for instant cross-border settlements.",category:"Money",status:"Approved",up:144,down:13},
 {id:2,name:"",problem:"Kirana owners track udhaar in notebooks and forget who owes what.",solution:"A WhatsApp ledger with automatic gentle reminders.",category:"Business",status:"Approved",up:98,down:4},
 {id:3,name:"Ananya",problem:"Pani ke tanker ka time kisi ko pata nahi hota, poori colony wait karti rehti hai.",solution:"A live tanker tracker with SMS alerts for each lane.",category:"Daily Life",status:"Approved",up:61,down:3},
 {id:4,name:"Vikram",problem:"Village students cannot practise spoken English with a patient partner.",solution:"Voice-first AI buddy that works on 2G.",category:"Tech",status:"Approved",up:77,down:5},
 {id:5,name:"",problem:"Street vendors get no working capital without paperwork and pay 5% a day to moneylenders.",solution:"Micro-loans scored from daily UPI sales.",category:"Money",status:"Approved",up:120,down:9},
 {id:6,name:"Sana",problem:"Small shops cannot afford a delivery rider for a 2 km radius.",solution:"Shared neighbourhood riders paid per order.",category:"Business",status:"Approved",up:54,down:6}];
let ideas=[],songs=[],driveSongSignature="",mine={};try{mine=JSON.parse(localStorage.getItem("apna_mine"))||{}}catch{}
const dl=()=>{try{return JSON.parse(localStorage.getItem("apna_ideas"))||DEMO}catch{return DEMO}};
const ds=()=>{try{localStorage.setItem("apna_ideas",JSON.stringify(ideas))}catch{}};
async function api(a,d={}){
  if(BACK===null)return{demo:true};
  const H={"Content-Type":"application/json"};if(token)H.Authorization="Bearer "+token;
  const R={submit:["POST","/api/ideas",d],vote:["POST",`/api/ideas/${d.id}/vote`,{dir:d.dir,prev:d.prev}],login:["POST","/api/auth/google",d],
    adminList:["GET","/api/admin/ideas"],approve:["POST",`/api/admin/ideas/${d.id}/status`,{status:"Approved"}],reject:["POST",`/api/admin/ideas/${d.id}/status`,{status:"Rejected"}],
    delete:["DELETE",`/api/admin/ideas/${d.id}`],edit:["PATCH",`/api/admin/ideas/${d.id}`,d.fields],bulk:["POST","/api/admin/ideas/bulk",{items:d.items}],sync:["POST","/api/admin/sync"]}[a];
  try{const r=await fetch(BACK+R[1],{method:R[0],headers:H,body:R[2]?JSON.stringify(R[2]):undefined});
    const j=await r.json().catch(()=>({}));if(!r.ok)return{error:typeof j.detail==="string"?j.detail:"Error "+r.status};return j}
  catch{return{error:"Cannot reach the backend"}}
}
async function refresh(){
  if(BACK===null){ideas=dl();return}
  try{const j=await(await fetch(BACK+"/api/songs")).json();if(Array.isArray(j.songs)){const list=j.songs.filter(s=>s&&s.id&&s.name),signature=list.map(s=>s.id).join(",");if(signature!==driveSongSignature){driveSongSignature=signature;songs=list;buildTracks(!tracks[ti]?.id)}}}catch(e){console.warn(e)}
}
const pool=()=>ideas.filter(i=>i.status==="Approved");

/* ===== spin, ribbon cut, card ===== */
let rot=0,busy=false,cur=null;
const cvs=$("cv"),cx=cvs.getContext("2d");let bits=[];
function size(){cvs.width=innerWidth;cvs.height=innerHeight}size();addEventListener("resize",size);
function burst(n,fx,fy){const C=["#ff5a1f","#ffb800","#e63946","#2a9d8f","#fff","#f3a6c4"];for(let i=0;i<n;i++){const a=R(0,6.28),s=R(3,12);bits.push({x:innerWidth*fx,y:innerHeight*fy,vx:Math.cos(a)*s,vy:Math.sin(a)*s-5,s:R(6,12),r:R(0,6),c:C[i%6],l:100})}}
let lastFall=0;
(function L(ts=0){
  cx.clearRect(0,0,cvs.width,cvs.height);
  if(ts-lastFall>260){lastFall=ts;bits.push({x:R(0,cvs.width),y:-24,vx:R(-.55,.55),vy:R(.9,2.05),s:R(5,11),w:R(5,9),h:R(13,24),sway:R(0,2*Math.PI),r:R(0,6),c:["#ffb800","#e63946","#2a9d8f","#ff7a3d","#f08aa0"][Math.floor(R(0,5))],l:1200,fall:true})}
  bits=bits.filter(b=>b.l>0&&b.y<cvs.height+30);
  bits.forEach(b=>{b.x+=b.vx+(b.fall?Math.sin(b.l/24+b.sway)*.45:0);b.y+=b.vy;b.vy+=b.fall ? .012 : .3;b.vx*=b.fall ? .999 : .99;b.r+=b.fall ? .045 : .2;b.l--;cx.save();cx.translate(b.x,b.y);cx.rotate(b.r);cx.globalAlpha=b.fall ? .9 : Math.min(1,b.l/30);cx.fillStyle=b.c;cx.fillRect(b.fall?-b.w/2:-b.s/2,b.fall?-b.h/2:-b.s/4,b.fall?b.w:b.s,b.fall?b.h:b.s/2);cx.restore()});
  requestAnimationFrame(L)
})();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function pick(){
  if(BACK===null){const c=pool();return c.length?c[Math.floor(Math.random()*c.length)]:null}
  try{const r=await fetch(`${BACK}/api/spin`);return r.ok?await r.json():null}catch{return null}
}
function duckMusic(){
  musicDuckCount++;applyMusicLevel();let released=false;
  return ()=>{if(released)return;released=true;musicDuckCount=Math.max(0,musicDuckCount-1);applyMusicLevel()};
}
function applyMusicLevel(){
  const ducked=musicDuckCount>0;
  if(typeof au!=="undefined")au.volume=ducked ? .07 : 0.1;
}
function getAudioContext(){
  try{ac=ac||(window.AudioContext?new AudioContext():new webkitAudioContext());if(ac.state==="suspended")ac.resume().catch(()=>{});return ac}catch{return null}
}
function playSpinSfx(){
  const ctx=getAudioContext();if(!ctx)return;
  const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
  o.type="triangle";o.frequency.setValueAtTime(155,t);o.frequency.exponentialRampToValueAtTime(48,t+4.7);
  f.type="lowpass";f.frequency.setValueAtTime(900,t);f.frequency.exponentialRampToValueAtTime(180,t+4.7);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.055,t+.22);g.gain.exponentialRampToValueAtTime(.0001,t+4.7);
  o.connect(f).connect(g).connect(ctx.destination);o.start(t);o.stop(t+4.72);
  let at=t+.08,interval=.07;
  for(let n=0;n<22;n++){
    const tick=ctx.createOscillator(),tg=ctx.createGain();tick.type="square";tick.frequency.value=900+(n%3)*120;
    tg.gain.setValueAtTime(.0001,at);tg.gain.exponentialRampToValueAtTime(.018,at+.004);tg.gain.exponentialRampToValueAtTime(.0001,at+.025);
    tick.connect(tg).connect(ctx.destination);tick.start(at);tick.stop(at+.03);at+=interval;interval=Math.min(interval*1.105,.28);
  }
}
function playCutSfx(){
  const ctx=getAudioContext();if(!ctx)return;
  const t=ctx.currentTime,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.16),ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=buffer;
  filter.type="bandpass";filter.frequency.value=1500;filter.Q.value=.8;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.32,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+.15);
  src.connect(filter).connect(g).connect(ctx.destination);src.start(t);src.stop(t+.16);
}
async function spin(){
  if(busy)return;
  busy=true;
  const st=$("stage"),restoreMusic=duckMusic();
  try{
    const idea=await pick();
    if(!idea){toast("Abhi koi idea nahi hai. Pehla idea tum bhejo!");return}
    const g=SEG.find(s=>s.n.toLowerCase()===(idea.category||"").trim().toLowerCase())||SEG[Math.floor(R(0,4))];
    playSpinSfx();
    const want=(360-g.a+R(-30,30)+360)%360,delta=(want-(rot%360)+360)%360;
    rot+=360*6+delta;$("wheel").style.transform=`rotate(${rot}deg)`;
    await wait(4800);
    st.classList.add("rib");await wait(550);
    st.classList.add("snip");playCutSfx();await wait(1000);
    st.classList.add("cut");const r=st.getBoundingClientRect();burst(120,(r.left+r.width/2)/innerWidth,(r.top+r.height/2)/innerHeight);
    await wait(650);showCard(idea);
  }finally{
    st.classList.remove("rib","snip","cut");busy=false;restoreMusic();
  }
}
function showCard(i){
  cur=i;$("cCat").textContent=i.category||"";$("cCat").hidden=!i.category;$("cProb").textContent=i.problem;
  $("cFix").hidden=!i.solution;$("cSol").textContent=i.solution||"";
  $("cBy").innerHTML=`<span>by ${esc(i.name&&i.name.trim()?i.name:"Secret Contributor")}</span><span class="social-links">${socialIcon("instagram",i.instagram)}${socialIcon("linkedin",i.linkedin)}${socialIcon("twitter",i.twitter)}</span>`;
  $("uN").textContent=i.up;$("dN").textContent=i.down;
  $("up").classList.toggle("on",mine[i.id]==="up");$("dn").classList.toggle("on",mine[i.id]==="down");
  $("cardOv").classList.add("on");$("cx").focus();
}
const closeCard=()=>$("cardOv").classList.remove("on");
$("spin").onclick=spin;$("cx").onclick=closeCard;$("again").onclick=()=>{closeCard();spin()};
$("cardOv").addEventListener("click",e=>{if(e.target.id==="cardOv")closeCard()});
let voteBusy=false;
async function vote(d){if(!cur||mine[cur.id]===d||voteBusy)return;const item=cur,p=mine[item.id];voteBusy=true;
  try{if(BACK!==null){const j=await api("vote",{id:item.id,dir:d,prev:p});if(j.error){toast(j.error);return}item.up=j.up;item.down=j.down}
    else{if(p)item[p]=Math.max(0,item[p]-1);item[d]++}
    mine[item.id]=d;try{localStorage.setItem("apna_mine",JSON.stringify(mine))}catch{}showCard(item);if(BACK===null)ds()
  }finally{voteBusy=false}}
$("up").onclick=()=>vote("up");$("dn").onclick=()=>vote("down");

/* ===== submit ===== */
$("subForm").addEventListener("submit",e=>{e.preventDefault();$("sGo").click()});
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).classList.remove("on"));
$("subBtn").onclick=()=>{$("subOv").classList.add("on");$("sProb").focus()};
$("sGo").onclick=async()=>{
  const problem=$("sProb").value.trim();if(!problem){toast("Problem likhna zaroori hai");return}
  const selectedCategory=$("sCat").value;
  const category=selectedCategory==="__other"?$("sOtherCat").value.trim():selectedCategory;
  if(selectedCategory==="__other"&&!category){toast("Apni category likhna zaroori hai");$("sOtherCat").focus();return}
  const o={name:$("sName").value.trim(),problem,solution:$("sSol").value.trim(),category,
    instagram:$("sInstagram").value.trim(),linkedin:$("sLinkedin").value.trim(),twitter:$("sTwitter").value.trim()};
  $("sGo").disabled=true;
  try{if(BACK!==null){const j=await api("submit",o);if(j.error)throw 0}else{ideas.push({...o,id:Date.now(),status:"Pending",up:0,down:0});ds()}
    $("subOv").classList.remove("on");$("subForm").reset();$("sCat").dispatchEvent(new Event("change"));burst(150,.5,.5);toast("Idea mil gaya! Review ke baad wheel mein aayega.")}
  catch{toast("Submit nahi hua, dobara try karo")}
  $("sGo").disabled=false;
};

/* ===== music (Drive songs via backend) ===== */
let tracks=[],ti=0,playing=false,ac,au=new Audio(),musicDuckCount=0,warmAudio=null,warmIndex=-1;
au.volume=.28;au.preload="auto";
$("bars").innerHTML=Array.from({length:26},(_, i)=>`<i style="animation-duration:${R(.35,.9).toFixed(2)}s;animation-delay:${-R(0,.8).toFixed(2)}s;height:${30+Math.random()*70}%"></i>`).join("");
function clearWarm(){if(warmAudio){warmAudio.pause();warmAudio.removeAttribute("src");warmAudio.load()}warmAudio=null;warmIndex=-1}
function warmNext(){if(tracks.length<2||!tracks[(ti+1)%tracks.length]?.src)return;const ix=(ti+1)%tracks.length;if(warmAudio&&warmIndex===ix)return;clearWarm();warmIndex=ix;warmAudio=new Audio();warmAudio.preload="auto";warmAudio.src=tracks[ix].src;warmAudio.load()}
function buildTracks(randomStart=false){const was=playing,previousId=tracks[ti]?.id,nextTracks=songs.map(s=>({id:s.id,title:s.name.replace(/\.[^.]+$/,""),src:BACK+"/api/songs/"+s.id+"/stream"}));
  const currentIndex=previousId?nextTracks.findIndex(t=>t.id===previousId):-1;
  if(!randomStart&&currentIndex>=0){clearWarm();tracks=nextTracks;ti=currentIndex;setT();if(playing)warmNext();return}
  stopA();clearWarm();tracks=nextTracks;
  if(songs.length){let choices=tracks.map((_,i)=>i);try{const previous=sessionStorage.getItem("apna_last_drive_song");if(choices.length>1&&previous){const fresh=choices.filter(i=>tracks[i].id!==previous);if(fresh.length)choices=fresh}}catch{}ti=choices[Math.floor(Math.random()*choices.length)]??0;try{sessionStorage.setItem("apna_last_drive_song",tracks[ti].id)}catch{}}
  else ti=0;setT();if(was||randomStart)play()}
function setT(){$("tname").textContent=tracks[ti]?.title||"";$("pg").style.width="0"}
const ICON={p:'<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><rect x="5" y="4" width="5" height="16" rx="1.5"/><rect x="14" y="4" width="5" height="16" rx="1.5"/></svg>',a:'<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M7 4l13 8-13 8z"/></svg>'};
function ui(){$("player").classList.toggle("playing",playing);$("pp").innerHTML=playing?ICON.p:ICON.a}
function stopA(){au.pause();clearWarm();playing=false;ui()}
async function play(){
  const t=tracks[ti];if(!t?.src)return;au.pause();
  applyMusicLevel();const src=new URL(t.src,location.href).href;if(au.src!==src){au.src=t.src;au.load()}au.preload="auto";au.ontimeupdate=()=>$("pg").style.width=(au.currentTime/au.duration*100||0)+"%";au.onended=()=>go(1);au.onerror=()=>go(1);
  try{await au.play();playing=true;ui()}catch{playing=false;ui()}warmNext();
}
function go(n){if(!tracks.length)return;const next=(ti+n+tracks.length)%tracks.length;if(n>0&&warmAudio&&warmIndex===next){au.pause();au=warmAudio;warmAudio=null;warmIndex=-1;au.volume=musicDuckCount ? .07 : .28}else if(warmIndex!==-1&&warmIndex!==next)clearWarm();ti=next;setT();play()}
$("pp").onclick=()=>playing?stopA():play();$("next").onclick=()=>go(1);$("prev").onclick=()=>go(-1);
setT();ui();
/* autoplay on open; if the browser blocks it, start on the first touch/click/key */
(function(){
  let done=false,pending=false;const events=["pointerdown","keydown","touchstart"];
  const finish=()=>{if(done)return;done=true;events.forEach(e=>removeEventListener(e,g))};
  const start=async()=>{if(done||pending)return;if(playing){finish();return}pending=true;await play();pending=false;if(playing)finish()};
  const g=e=>{if(e.target.closest&&e.target.closest("#player"))return;start()};
  events.forEach(e=>addEventListener(e,g,{passive:true}));
  play().then(()=>{if(playing)finish()});setTimeout(()=>{if(playing)finish()},600)
})();
(()=>{const p=$("player");let d=null;p.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;const r=p.getBoundingClientRect();d={x:e.clientX-r.left,y:e.clientY-r.top};p.setPointerCapture(e.pointerId);p.style.cursor="grabbing"});
  p.addEventListener("pointermove",e=>{if(!d)return;p.style.right="auto";p.style.bottom="auto";p.style.transform="none";p.style.left=Math.max(0,Math.min(innerWidth-p.offsetWidth,e.clientX-d.x))+"px";p.style.top=Math.max(0,Math.min(innerHeight-p.offsetHeight,e.clientY-d.y))+"px"});
  p.addEventListener("pointerup",()=>{d=null;p.style.cursor="grab"})})();

/* ===== owner's room + admin ===== */
let token=null,email="",tab="Pending",all=[],syncAt=null;
function route(){
  const adm=location.hash==="#admin";
  $("home").style.display=adm?"none":"block";$("login").style.display=adm&&!email?"grid":"none";$("admin").style.display=adm&&email?"block":"none";
  if(adm&&email)loadAdmin();
}
addEventListener("hashchange",route);
$("lockBtn").onclick=()=>location.hash="#admin";$("backBtn").onclick=()=>{location.hash=""};
$("gBtn").onclick=()=>{
  if(BACK===null){email="demo@local";route();return}
  if(!GCID||!window.google){toast("Google sign-in is not set up on the backend yet");return}
  google.accounts.oauth2.initTokenClient({client_id:GCID,scope:"openid email",callback:async r=>{
    if(!r.access_token)return;const j=await api("login",{access_token:r.access_token});
    if(j.error){toast(j.error);return}token=j.token;email=j.email;route()}}).requestAccessToken();
};
$("logout").onclick=()=>{token=null;email="";location.hash="";route()};
async function loadAdmin(){
  const j=await api("adminList",{token});
  if(j.error){toast(j.error);email="";token=null;route();return false}
  if(j.demo){all=dl();ideas=all;$("aSheet").textContent="Demo mode (stored in this browser)";$("aSongs").textContent=tracks.length+" demo tracks";$("aNote").textContent="No backend connected yet. Start the backend (see README.md) to sync with your Google Sheet and Drive folder."}
  else{all=j.ideas;$("aSheet").textContent=j.sheetError?("Problem: "+j.sheetError):j.syncedAt?"Last synced "+new Date(j.syncedAt).toLocaleTimeString("en-GB"):"Google Sheet has not synced yet";$("aSongs").textContent=j.songCount+" songs found";$("aNote").textContent=j.sheetError?"Google Sheet sync failed. Check the configuration, then try Sync now.":j.syncedAt?"Connected to your backend. The Sheet syncs both ways every minute, and on every change.":"Backend connected. Use Sync now to check Google Sheets setup."}
  $("aMail").textContent=email;renderAdmin();return true;
}
let syncBusy=false;
$("sync").onclick=async()=>{if(syncBusy)return;if(BACK===null){toast("Google Sheets sync needs a connected backend");return}const b=$("sync"),label=b.textContent;syncBusy=true;b.disabled=true;b.textContent="Syncing…";
  try{const j=await api("sync");if(j.error){toast(j.error);return}if(await loadAdmin())toast("Synced")}
  finally{syncBusy=false;b.disabled=false;b.textContent=label}};
function renderAdmin(){
  const n=s=>s==="All"?all.length:all.filter(i=>i.status===s).length;
  $("tabs").innerHTML=["Pending","Approved","Rejected","All"].map(t=>`<button class="tb ${t===tab?"on":""}" data-t="${t}">${t}<i>${n(t)}</i></button>`).join("")+'<button class="pill sm" id="bk" style="margin-left:auto"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>Bulk import</button>';
  $("tabs").querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{tab=b.dataset.t;renderAdmin()});$("bk").onclick=()=>$("bulkOv").classList.add("on");
  const l=tab==="All"?all:all.filter(i=>i.status===tab);
  $("aList").innerHTML=l.length?l.map(i=>`<div class="li2" data-id="${esc(i.id)}">${i.category?`<span class="cat" style="font-size:.7rem;padding:6px 12px">${esc(i.category)}</span>`:""}<span class="st ${esc(i.status)}">${esc(i.status)}</span><h4>${esc(i.problem)}</h4><div>${esc(i.solution)}</div><div class="mt">by ${esc(i.name||"Secret Contributor")} · ↑${i.up} ↓${i.down}</div>
   <div class="ac">${i.status!=="Approved"?'<button style="background:#1c7a3d" data-a="approve">Approve</button>':""}${i.status!=="Rejected"?'<button style="background:#b3261e" data-a="reject">Reject</button>':""}<button style="background:var(--ink)" data-a="edit">Edit</button><button style="background:#8a6a55" data-a="delete">Delete</button></div></div>`).join(""):'<div class="empty">Nothing here right now.</div>';
}
async function mut(a,d){const j=await api(a,{token,...d});if(j.error){toast(j.error);return false}
  if(j.demo){let L=dl();if(a==="approve")L.forEach(i=>i.id==d.id&&(i.status="Approved"));if(a==="reject")L.forEach(i=>i.id==d.id&&(i.status="Rejected"));
    if(a==="delete")L=L.filter(i=>i.id!=d.id);if(a==="edit")L.forEach(i=>i.id==d.id&&Object.assign(i,d.fields));
    if(a==="bulk")d.items.forEach((x,k)=>L.push({category:"",name:"",solution:"",...x,id:Date.now()+k,status:"Approved",up:0,down:0}));ideas=L;ds()}
  return await loadAdmin()}
$("aList").onclick=e=>{const b=e.target.closest("[data-a]");if(!b)return;const id=b.closest(".li2").dataset.id,it=all.find(i=>i.id==id),a=b.dataset.a;
  if(a==="edit"){const p=prompt("Problem",it.problem);if(p===null)return;const s=prompt("Fix",it.solution);if(s===null)return;mut("edit",{id,fields:{problem:p,solution:s}})}
  else if(a==="delete"){if(confirm("Delete permanently?"))mut("delete",{id})}else mut(a,{id})};
function parse(t){t=t.trim();if(!t)return[];try{const j=JSON.parse(t);if(Array.isArray(j))return j.map(x=>typeof x==="string"?{problem:x}:x)}catch{}
  return t.split(/\r?\n/).filter(Boolean).map(l=>{if(!l.includes(","))return{problem:l.trim()};const m=(l.match(/("([^"]*)"|[^,]*)(,|$)/g)||[]).map(s=>s.replace(/,$/,"").replace(/^"|"$/g,"").trim());const category=m[3]||"";return{problem:m[0],solution:m[1]||"",name:m[2]||"",category:CATEGORIES.find(s=>s.toLowerCase()===category.toLowerCase())||category.slice(0,40)}}).filter(x=>x.problem)}
$("bGo").onclick=async()=>{const items=parse($("bulk").value);if(!items.length)return toast("Kuch paste karo");if(!await mut("bulk",{items}))return;$("bulk").value="";$("bulkOv").classList.remove("on");toast(items.length+" ideas imported")};

(async()=>{
  for(const b of (CONFIG.BACKEND_URL?[CONFIG.BACKEND_URL,""]:[""])){
    if(b===""&&location.protocol==="file:")continue;
    try{const r=await fetch(b+"/api/config");if(r.ok){const c=await r.json();BACK=b;GCID=c.googleClientId||"";break}}catch{}
  }
  await refresh();route();if(BACK!==null)setInterval(refresh,300000);
})();
