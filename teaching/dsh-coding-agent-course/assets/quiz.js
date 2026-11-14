(() => {
const key='dsh-39163dd-lesson-0002-v1';
const form=document.querySelector('form');if(!form)return;
let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
for(const el of form.elements){if(!el.name||saved[el.name]===undefined)continue;if(el.type==='radio')el.checked=el.value===saved[el.name];else el.value=saved[el.name]}
const snapshot=()=>Object.fromEntries(new FormData(form).entries());
form.addEventListener('input',()=>{try{localStorage.setItem(key,JSON.stringify(snapshot()))}catch{document.querySelector('#storage').textContent='浏览器未允许保存草稿，请导出作答。'}});
document.querySelector('#check').onclick=()=>{
const d=snapshot();const expected={q1:'1',q2:'2'};
const feedback={q1:'公开控制接口在 core/agent；AgentRegistry 委派 factory。',q2:'默认执行驱动在 core/agent-loop；step 调用模型流和 tools.execute。'};
const lines=Object.keys(expected).map(k=>!d[k]?k+'：尚未选择。':k+'：'+(d[k]===expected[k]?'判断正确。':'请重新定位源码。')+feedback[k]);
document.querySelector('#result').textContent=lines.join('\n')+'\n选择题反馈仅用于练习；是否掌握还需检查你的解释与源码证据。';};
document.querySelector('#export').onclick=()=>{const d=snapshot();const text='# DSH 0002 · 学习者作答\n\n版本：39163dd30f703a79079e2d2446545cff3c453738\n\n'+Object.entries(d).map(([k,v])=>'## '+k+'\n\n'+v).join('\n\n')+'\n\n状态：待 Agent 核对；尚未自动写回仓库。\n';const u=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='dsh-0002-answers.md';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
})();