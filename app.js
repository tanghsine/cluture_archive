'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DIMS={works:['作品与见闻','我遇见了什么',['书','电影','电视剧','音乐','播客','文章','视频','艺术','展览','游戏','其他']],minds:['人物与思想','谁影响了我',['人物','思想','观点','句子','台词']],aesth:['审美与感受','什么打动了我',['碎片','视觉','照片','画面','地点','空间','故事','经历','审美']],long:['向往与灵感','它让我想到什么',['向往','灵感','想法']]};
const T2D={};for(const d in DIMS)DIMS[d][2].forEach(t=>T2D[t]=d);
const FL=[['fav','⭐','收藏'],['moved','❤️','打动我'],['impact','🔥','影响很大'],['again','↻','值得再看']];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8),today=()=>new Date().toISOString().slice(0,10);
const greet=()=>{const h=new Date().getHours();return h<6?'夜深了，适合慢慢回看。':h<12?'上午好，记下今天的触动吧。':h<18?'下午好，灵感常在不经意处。':'晚上好，回望一下今天的收获。'};
// ---- IndexedDB ----
const DB=new Promise((ok,no)=>{const q=indexedDB.open('culture-archive',1);q.onupgradeneeded=()=>{q.result.createObjectStore('entries',{keyPath:'id'});q.result.createObjectStore('images',{keyPath:'id'})};q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)});
const tx=(s,m,f)=>DB.then(d=>new Promise((ok,no)=>{const t=d.transaction(s,m),q=f(t.objectStore(s));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error)}));
const put=(s,v)=>tx(s,'readwrite',o=>o.put(v)),del=(s,k)=>tx(s,'readwrite',o=>o.delete(k)),getImg=id=>tx('images','readonly',o=>o.get(id));
let E=[];const load=async()=>E=await tx('entries','readonly',o=>o.getAll());
const byId=id=>E.find(e=>e.id===id),when=e=>e.date||e.created.slice(0,10);
const sorted=a=>[...a].sort((x,y)=>when(y).localeCompare(when(x))||y.created.localeCompare(x.created));
// ---- 聚合 ----
const people=()=>{const m={};E.forEach(e=>(e.creators||[]).forEach(n=>(m[n]??=new Set()).add(e.id)));E.filter(e=>e.type==='人物').forEach(e=>(m[e.title]??=new Set()).add(e.id));return Object.entries(m).map(([n,s])=>[n,[...s]]).sort((a,b)=>b[1].length-a[1].length)};
const tagMap=()=>{const m={};E.forEach(e=>(e.tags||[]).forEach(t=>(m[t]??=[]).push(e.id)));return Object.entries(m).sort((a,b)=>b[1].length-a[1].length)};
// ---- 图片 ----
const shrink=f=>new Promise(r=>{const i=new Image,u=URL.createObjectURL(f);i.onload=()=>{const k=Math.min(1,1600/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);c.toBlob(b=>r(b||f),'image/jpeg',.85);URL.revokeObjectURL(u)};i.onerror=()=>r(f);i.src=u});
const urls={},imgTag=(id,c='')=>`<img data-i="${id}" class="${c}" alt="">`;
async function hydrate(){for(const im of document.querySelectorAll('img[data-i]')){const id=im.dataset.i;if(!urls[id]){const r=await getImg(id);if(r)urls[id]=URL.createObjectURL(r.blob)}if(urls[id])im.src=urls[id]}}
// ---- 视图片段 ----
const flags=e=>FL.filter(f=>e[f[0]]).map(f=>f[1]).join('');
const card=e=>`<a class="card" href="#/e/${e.id}">${e.images?.[0]?imgTag(e.images[0]):''}<div><div class="t">${esc(e.title)} <span class="sub">${flags(e)}</span></div><div class="row sub"><span class="chip type">${esc(e.type)}</span>${(e.creators||[]).map(esc).join('、')} ${when(e)}</div><p>${esc(e.content||e.feel||e.why||'')}</p></div></a>`;
const list=a=>a.length?a.map(card).join(''):'<div class="empty">还没有内容。<br>遇到触动你的东西时，点右下角 ＋ 留下第一条吧。</div>';
const chips=(a,h)=>a.map(([n,ids])=>`<a class="chip" href="${h(n)}">${esc(n)} ${ids.length}</a>`).join(' ');
// ---- 页面 ----
const V={};
V.home=()=>{const n=d=>E.filter(e=>T2D[e.type]===d).length,rnd=E.length?E[Math.floor(Math.random()*E.length)]:null;
return `<h1>文心集</h1><div class="sub">${greet()}</div>
<div class="sub">记录那些曾经进入过我的世界的东西。已留下 ${E.length} 条。</div>
<div class="row" style="margin-top:14px"><button class="b" onclick="location.hash='#/edit/new?frag=1'">灵感碎片</button><button class="b o" onclick="location.hash='#/edit/new'">完整档案</button></div>
<div class="dims">${Object.entries(DIMS).map(([k,v])=>`<a class="dim" href="#/list?dim=${k}"><i>${n(k)}</i><b>${v[0]}</b><span>${v[1]}</span></a>`).join('')}</div>
<h2>最近记录</h2>${list(sorted(E).slice(0,5))}
<h2>最近打动我的</h2>${list(sorted(E.filter(e=>e.moved)).slice(0,4))}
<h2>我反复回看的</h2>${list(sorted(E.filter(e=>e.again)).slice(0,4))}
<h2>随机回望 <button class="chip" onclick="route()">换一条</button></h2>${rnd?card(rnd):'<div class="empty">还没有可回望的记录，留下第一条后再来看看。</div>'}`};
V.list=p=>{const dim=p.get('dim')||'',fl=p.get('flag')||'',tag=p.get('tag')||'',q=p.get('q')||'';
const hd=`<h1>${tag?'#'+esc(tag):'全部档案'}</h1><input id="q" type="search" placeholder="搜索标题、人物、内容、标签…" value="${esc(q)}">
<div class="row" style="margin:12px 0"><a class="chip ${!dim&&!fl?'on':''}" href="#/list">全部</a>${Object.entries(DIMS).map(([k,v])=>`<a class="chip ${dim===k?'on':''}" href="#/list?dim=${k}">${v[0]}</a>`).join('')}${FL.map(f=>`<a class="chip ${fl===f[0]?'on':''}" href="#/list?flag=${f[0]}">${f[1]}${f[2]}</a>`).join('')}</div><div id="res"></div>`;
setTimeout(()=>{const run=()=>{const s=$('#q').value.trim().toLowerCase();let a=E.filter(e=>(!dim||T2D[e.type]===dim)&&(!fl||e[fl])&&(!tag||(e.tags||[]).includes(tag))&&(!s||[e.title,e.type,e.content,e.feel,e.why,e.link,...(e.creators||[]),...(e.tags||[])].join('\n').toLowerCase().includes(s)));
let x='';if(s){const ps=people().filter(([n])=>n.toLowerCase().includes(s)),ts=tagMap().filter(([n])=>n.toLowerCase().includes(s));if(ps.length)x+=`<div class="sub">人物</div><div class="row">${chips(ps,n=>'#/p/'+encodeURIComponent(n))}</div>`;if(ts.length)x+=`<div class="sub" style="margin-top:8px">标签</div><div class="row">${chips(ts,n=>'#/list?tag='+encodeURIComponent(n))}</div>`}
$('#res').innerHTML=x+list(sorted(a));hydrate()};$('#q').oninput=run;run()});return hd};
V.people=()=>{const a=people();return `<h1>人物与创作者</h1><div class="sub">根据你的记录自动聚合，无需单独建档。</div>${a.length?a.map(([n,ids])=>`<a class="card" href="#/p/${encodeURIComponent(n)}"><div><div class="t">${esc(n)}</div><div class="sub">${ids.length} 条相关记录</div></div></a>`).join(''):'<div class="empty">在档案的“人物 / 创作者”里填写名字，这里就会出现。</div>'}`};
V.p=([n])=>{n=decodeURIComponent(n);const a=E.filter(e=>(e.creators||[]).includes(n)||(e.type==='人物'&&e.title===n)),intro=a.find(e=>e.type==='人物'&&e.title===n),w=a.filter(e=>T2D[e.type]==='works'),o=a.filter(e=>T2D[e.type]!=='works'&&e!==intro);
return `<a class="sub" href="#/people">‹ 人物</a><h1>${esc(n)}</h1>${intro?`<div class="txt">${esc(intro.content)}</div><a class="chip" href="#/e/${intro.id}">编辑人物档案</a>`:`<a class="chip" href="#/edit/new?type=人物&title=${encodeURIComponent(n)}">＋ 添加人物简介</a>`}
<h2>作品（${w.length}）</h2>${list(sorted(w))}<h2>我的记录、摘录与感受（${o.length}）</h2>${list(sorted(o))}`};
V.tags=()=>{const a=tagMap();return `<h1>标签</h1>${a.length?`<div class="row" style="margin-top:14px">${chips(a,n=>'#/list?tag='+encodeURIComponent(n))}</div>`:'<div class="empty">给档案加标签后，这里会形成跨类型的主题集合。</div>'}`};
V.e=([id])=>{const e=byId(id);if(!e)return '<div class="empty">找不到这条档案</div>';
return `<a class="sub" href="javascript:history.back()">‹ 返回</a><h1>${esc(e.title)}</h1>
<div class="row sub"><span class="chip type">${esc(e.type)}</span>${when(e)} ${(e.creators||[]).map(n=>`<a class="chip" href="#/p/${encodeURIComponent(n)}">${esc(n)}</a>`).join('')}</div>
<div class="fl">${FL.map(f=>`<button class="chip ${e[f[0]]?'on':''}" onclick="tog('${e.id}','${f[0]}')">${f[1]} ${f[2]}</button>`).join('')}</div>
${e.images?.length?`<div class="imgs">${e.images.map(i=>imgTag(i)).join('')}</div>`:''}
${e.content?`<div class="${['句子','台词','观点','思想'].includes(e.type)?'quote':'txt'}">${esc(e.content)}</div>`:''}
${e.why?`<h2>为什么留下</h2><div class="txt">${esc(e.why)}</div>`:''}${e.feel?`<h2>我的感受</h2><div class="txt">${esc(e.feel)}</div>`:''}
${e.link?`<h2>链接</h2><a href="${esc(e.link)}" target="_blank" rel="noopener" style="color:var(--ac);word-break:break-all">${esc(e.link)}</a>`:''}
<div class="row" style="margin-top:14px">${(e.tags||[]).map(t=>`<a class="chip" href="#/list?tag=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>
<div class="row" style="margin-top:30px"><button class="b" onclick="location.hash='#/edit/${e.id}'">编辑</button><button class="b d" onclick="rm('${e.id}')">删除</button></div>`};
let pend={keep:[],add:[]};
V.edit=([id],p)=>{const n=id==='new',e=n?{type:p.get('type')||(p.get('frag')?'碎片':'书'),title:p.get('title')||'',date:today(),images:[],creators:[],tags:[]}:byId(id);if(!e)return '<div class="empty">找不到</div>';
pend={keep:[...(e.images||[])],add:[]};const frag=p.get('frag');
setTimeout(()=>{drawImgs();$('#f-img').onchange=async ev=>{for(const f of ev.target.files)pend.add.push({id:uid(),blob:await shrink(f)});ev.target.value='';drawImgs()};$('#f-save').onclick=()=>save(n?null:e)});
const v=k=>esc(e[k]||'');
return `<a class="sub" href="javascript:history.back()">‹ 取消</a><h1>${n?(frag?'灵感碎片':'新档案'):'编辑'}</h1>
<label>类型</label><select id="f-type">${Object.values(DIMS).map(d=>`<optgroup label="${d[0]}">${d[2].map(t=>`<option ${t===e.type?'selected':''}>${t}</option>`).join('')}</optgroup>`).join('')}</select>
<label>标题</label><input id="f-title" value="${v('title')}" placeholder="可留空，将取内容开头">
<label>内容 / 摘录 / 想法</label><textarea id="f-content">${v('content')}</textarea>
<label>为什么留下</label><textarea id="f-why" style="min-height:70px">${v('why')}</textarea>
<label>图片</label><div class="imgs" id="f-imgs"></div><input id="f-img" type="file" accept="image/*" multiple>
<label>标签（空格或逗号分隔）</label><input id="f-tags" value="${esc((e.tags||[]).join(' '))}" placeholder="时间 重逢 人间">
<details ${frag?'':'open'}><summary>更多：人物、感受、日期、链接、标记</summary>
<label>人物 / 创作者（作者、导演等，逗号分隔）</label><input id="f-cr" list="pl" value="${esc((e.creators||[]).join('，'))}"><datalist id="pl">${people().map(x=>`<option value="${esc(x[0])}">`).join('')}</datalist>
<label>我的感受</label><textarea id="f-feel" style="min-height:80px">${v('feel')}</textarea>
<label>日期</label><input id="f-date" type="date" value="${v('date')}"><label>链接</label><input id="f-link" type="url" value="${v('link')}">
<div class="fl">${FL.map(f=>`<label style="display:inline;margin:0"><input type="checkbox" id="f-${f[0]}" style="width:auto" ${e[f[0]]?'checked':''}> ${f[1]}${f[2]}</label>`).join(' ')}</div></details>
<div style="margin-top:24px"><button class="b" id="f-save">保存</button></div>`};
V.more=()=>`<h1>更多</h1><div class="sub">数据只存在这台设备的浏览器里，不会上传。换设备或清理浏览器前，请先导出备份。</div>
<h2>备份</h2><div class="row"><button class="b" onclick="exp()">导出 JSON</button><button class="b o" onclick="$('#imp').click()">导入 JSON</button></div><input id="imp" type="file" accept=".json,application/json" hidden onchange="imp(this.files[0])">
<h2>统计</h2><div class="stats">${Object.entries(DIMS).map(([k,v])=>`<span>${v[0]}<b>${E.filter(e=>T2D[e.type]===k).length}</b></span>`).join('')}<span>人物<b>${people().length}</b></span><span>标签<b>${tagMap().length}</b></span></div>`;
// ---- 动作 ----
function drawImgs(){const h=$('#f-imgs');if(!h)return;h.innerHTML=pend.keep.map(i=>`<div>${imgTag(i)}<button class="x" onclick="pend.keep=pend.keep.filter(x=>x!='${i}');drawImgs()">×</button></div>`).join('')+pend.add.map((a,j)=>`<div><img src="${urls[a.id]??=URL.createObjectURL(a.blob)}"><button class="x" onclick="pend.add.splice(${j},1);drawImgs()">×</button></div>`).join('');hydrate()}
const split=s=>s.split(/[\s,，、#]+/).map(x=>x.trim()).filter(Boolean);
async function save(old){const g=k=>$('#f-'+k).value.trim(),content=g('content'),title=g('title')||content.slice(0,20);
if(!title&&!pend.keep.length&&!pend.add.length)return alert('请至少填写标题、内容或添加一张图片');
const now=new Date().toISOString(),e={...(old||{id:uid(),created:now}),type:g('type'),title:title||'（图片）',content,why:g('why'),feel:g('feel'),date:g('date')||today(),link:g('link'),tags:[...new Set(split(g('tags')))],creators:[...new Set(g('cr').split(/[,，、/]+/).map(x=>x.trim()).filter(Boolean))],updated:now};
FL.forEach(f=>e[f[0]]=$('#f-'+f[0]).checked);
for(const a of pend.add)await put('images',{id:a.id,blob:a.blob});
for(const i of(old?.images||[]))if(!pend.keep.includes(i))await del('images',i);
e.images=[...pend.keep,...pend.add.map(a=>a.id)];await put('entries',e);await load();location.hash='#/e/'+e.id}
async function tog(id,k){const e=byId(id);e[k]=!e[k];e.updated=new Date().toISOString();await put('entries',e);route()}
async function rm(id){if(!confirm('确定删除这条档案？此操作不可撤销。'))return;const e=byId(id);for(const i of e.images||[])await del('images',i);await del('entries',id);await load();location.hash='#/'}
const b64=b=>new Promise(r=>{const f=new FileReader;f.onload=()=>r(f.result);f.readAsDataURL(b)});
async function exp(){const imgs=[];for(const e of E)for(const i of e.images||[]){const r=await getImg(i);if(r)imgs.push({id:i,data:await b64(r.blob)})}
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({app:'culture-archive',version:1,exported:new Date().toISOString(),entries:E,images:imgs})],{type:'application/json'}));a.download=`culture-archive-${today()}.json`;a.click()}
async function imp(f){if(!f)return;try{const d=JSON.parse(await f.text());if(!Array.isArray(d.entries))throw 0;
if(!confirm(`将导入 ${d.entries.length} 条档案；相同 ID 的记录会被覆盖。继续？`))return;
for(const i of d.images||[])await put('images',{id:i.id,blob:await(await fetch(i.data)).blob()});for(const e of d.entries)await put('entries',e);await load();alert('导入完成');route()}catch{alert('导入失败：不是有效的档案备份文件')}}
// ---- 路由 ----
function route(){const[h,qs]=(location.hash.slice(1)||'/').split('?'),s=h.split('/').filter(Boolean),p=new URLSearchParams(qs||''),k=s[0]||'home',fn=V[k]||V.home;
$('#app').innerHTML=fn(s.slice(1),p);$('#fab').style.display=k==='edit'?'none':'';
document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.k===({home:'',list:'list',e:'list',people:'people',p:'people',tags:'tags',more:'more'}[k]??'')));
if(k!=='edit')window.scrollTo(0,0);hydrate()}
document.addEventListener('click',e=>{if(e.target.closest('.imgs img')&&!e.target.closest('#f-imgs')){const l=document.createElement('div');l.id='lb';l.innerHTML=`<img src="${e.target.src}">`;l.onclick=()=>l.remove();document.body.append(l)}});
addEventListener('hashchange',route);
load().then(route);
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
