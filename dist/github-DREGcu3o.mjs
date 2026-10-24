import{spawn as e,spawnSync as t}from"node:child_process";const n=`query($q: String!, $last: Int!) {
  search(query: $q, type: ISSUE, last: $last) {
    nodes {
      ... on PullRequest {
        number
        title
        repository { nameWithOwner }
        url
        updatedAt
        createdAt
        author { login }
        state
        labels(first: 20) { nodes { name } }
      }
    }
  }
}`,r=`query($q: String!, $last: Int!) {
  search(query: $q, type: ISSUE, last: $last) {
    nodes {
      ... on Issue {
        number
        title
        repository { nameWithOwner }
        url
        updatedAt
        createdAt
        labels(first: 20) { nodes { name } }
      }
    }
  }
}`;function i(e){return(/* @__PURE__ */ new Date(Date.now()-e*24*60*60*1e3)).toISOString().split(`T`)[0]}function a(e,t){let n=[`api`,`graphql`,`-f`,`query=${e}`];for(let[e,r]of Object.entries(t))n.push(`-F`,`${e}=${r}`);return n}function o(e){let t=JSON.parse(e);if(t.errors?.length)throw Error(`GraphQL errors: ${JSON.stringify(t.errors)}`);if(!t.data)throw Error(`No data in GraphQL response`);return t.data}function s(e,n){let r=t(`gh`,a(e,n),{stdio:[`ignore`,`pipe`,`pipe`],encoding:`utf8`});if(r.status!==0)throw Error(`gh api graphql failed: ${r.stderr?.trim()??`unknown error`}`);return o(r.stdout??``)}function c(t,n){return new Promise((r,i)=>{let s=e(`gh`,a(t,n),{stdio:[`ignore`,`pipe`,`pipe`]}),c=``,l=``;s.stdout.on(`data`,e=>{c+=e.toString()}),s.stderr.on(`data`,e=>{l+=e.toString()}),s.on(`error`,i),s.on(`close`,e=>{if(e!==0)i(/* @__PURE__ */ Error(`gh api graphql failed: ${l.trim()||`unknown error`}`));else try{r(o(c))}catch(e){i(e)}})})}function l(e){return e.search.nodes.filter(e=>e!==null&&e.repository?.nameWithOwner!==void 0)}function u(e){return{repo:e.repository.nameWithOwner,number:e.number,title:e.title,url:e.url,updatedAt:e.updatedAt,createdAt:e.createdAt,type:`pr`,state:e.state===`MERGED`?`merged`:e.state.toLowerCase(),author:e.author?.login,labels:e.labels.nodes.map(e=>e.name)}}function d(e){return{repo:e.repository.nameWithOwner,number:e.number,title:e.title,url:e.url,updatedAt:e.updatedAt,createdAt:e.createdAt,type:`issue`,state:`open`,labels:e.labels.nodes.map(e=>e.name)}}function f(e){let t=`review-requested:@me is:pull-request state:open`;return e.repo&&(t+=` repo:${e.repo}`),e.staleDays&&(t+=` updated:<${i(e.staleDays)}`),t}function p(e){let t=`assignee:@me is:issue state:open`;return e.repo&&(t+=` repo:${e.repo}`),e.staleDays&&(t+=` updated:<${i(e.staleDays)}`),t}function m(e={}){let{limit:t=30}=e;return l(s(n,{q:f(e),last:t})).map(u)}async function h(e={}){let{limit:t=30}=e;return l(await c(n,{q:f(e),last:t})).map(u)}function g(e={}){let{limit:t=30}=e;return l(s(r,{q:p(e),last:t})).map(d)}async function _(e={}){let{limit:t=30}=e;return l(await c(r,{q:p(e),last:t})).map(d)}function v(e={}){let t=e.limit??30,n=m({...e,limit:Math.ceil(t/2)}),r=g({...e,limit:Math.floor(t/2)});return[...n,...r]}async function y(e={}){let t=e.limit??30,[n,r]=await Promise.all([h({...e,limit:Math.ceil(t/2)}),_({...e,limit:Math.floor(t/2)})]);return[...n,...r]}async function b(e,t={}){return e===`prs`?h(t):e===`issues`?_(t):y(t)}function x(e){let t=new Date(e).getTime(),n=Math.floor((Date.now()-t)/864e5);return n<1?`today`:n<7?`${n}d`:n<30?`${Math.floor(n/7)}w`:`${Math.floor(n/30)}mo`}function S(e){return{...e,age:x(e.updatedAt)}}export{b as a,x as c,_ as i,S as l,y as n,m as o,g as r,h as s,v as t};