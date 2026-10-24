function e(e){let t=[[`TYPE`,`REPO`,`NUM`,`AGE`,`TITLE`],...[...e].sort((e,t)=>e.updatedAt.localeCompare(t.updatedAt)).map(e=>[e.type.toUpperCase().padEnd(4),e.repo.padEnd(40),`#${e.number}`.padEnd(8),e.age.padEnd(5),a(e.title,60)])],n=`
`;for(let e of t)n+=e.join(`  `)+`
`;return n+=`\nTotal: ${e.length} items (oldest first)\n`,n}function t(e){let t=[...e].sort((e,t)=>e.updatedAt.localeCompare(t.updatedAt)),n=`| Type | Repo | # | Age | Title |
`;n+=`|------|------|---|-----|-------|
`;for(let e of t)n+=`| ${e.type.toUpperCase()} | ${e.repo} | ${e.number} | ${e.age} | ${a(e.title,60)} |\n`;return n+=`\nTotal: ${e.length} items\n`,n}function n(e){return JSON.stringify(e,null,2)}function r(e){let t={};for(let n of e)t[n.repo]=(t[n.repo]||0)+1;let n=[...e].sort((e,t)=>e.updatedAt.localeCompare(t.updatedAt));return{total:e.length,prs:e.filter(e=>e.type===`pr`).length,issues:e.filter(e=>e.type===`issue`).length,byRepo:t,oldestUpdated:n[0]?.updatedAt??``,newestUpdated:n[n.length-1]?.updatedAt??``}}function i(e,t=`table`){let n=r(e);if(t===`json`)return JSON.stringify(n,null,2);let i=Object.entries(n.byRepo).sort(([,e],[,t])=>t-e);if(t===`md`){let e=`| Repo | Count |
|------|-------|
`;for(let[t,n]of i)e+=`| ${t} | ${n} |\n`;return e+=`\nTotal: ${n.total} (PRs ${n.prs}, issues ${n.issues})\n`,e}let a=`
📊 GitHub Debt Summary
`;if(a+=`=========================

`,a+=`Total items:    ${n.total}\n`,a+=`PRs to review:  ${n.prs}\n`,a+=`Issues to fix:  ${n.issues}\n\n`,i.length>0){a+=`By repository:
`;for(let[e,t]of i)a+=`  ${e.padEnd(45)} ${t}\n`}let o=[...e].sort((e,t)=>e.updatedAt.localeCompare(t.updatedAt));if(o.length>0){let e=o[0],t=o[o.length-1];a+=`\nOldest item: ${e.repo}#${e.number} (updated ${e.updatedAt})\n`,a+=`Newest item: ${t.repo}#${t.number} (updated ${t.updatedAt})\n`}return a+=`
`,a}function a(e,t){return e.length<=t?e:e.slice(0,t-3)+`...`}export{e as i,t as n,i as r,n as t};