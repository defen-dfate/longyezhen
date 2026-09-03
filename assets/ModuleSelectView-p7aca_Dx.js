import{g as f,h as n,j as e,i,t as l,x as h,l as C,z as _,y as k,m as g,F as M,k as B,A as S,p as b,q as z,o as a,n as N}from"./vendor-BOp0zghE.js";import{_ as c}from"./AppIcon.vue_vue_type_script_setup_true_lang-ClAEFKRN.js";import{a as V,_ as j}from"./index-D9jDFdzE.js";import{G as L}from"./modules-BmyaG7Bb.js";const R={class:"select"},T={class:"top"},A={class:"brand"},O={class:"logo"},U={class:"ava"},$={class:"uname truncate"},F={class:"body"},G={class:"grid"},H=["onClick"],q=["innerHTML"],D={class:"name"},E={class:"desc"},I={class:"go"},P=f({__name:"ModuleSelectView",setup(W){const u=z(),d=V(),s=S(!1),p={resume:"#5b8bff",gis:"#e0863a",tools:"#22b07d",admin:"#a855c9"},w={resume:`<svg viewBox="0 0 120 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="12" y="14" width="96" height="44" rx="9" stroke="currentColor" stroke-width="3"/>
    <circle cx="34" cy="33" r="10" stroke="currentColor" stroke-width="3"/>
    <path d="M24 47c2-7 14-7 16 0" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>
    <line x1="54" y1="28" x2="92" y2="28" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <line x1="54" y1="40" x2="92" y2="40" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".45"/>
    <line x1="54" y1="50" x2="78" y2="50" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".45"/>
  </svg>`,gis:`<svg viewBox="0 0 120 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="60" cy="30" r="5" fill="currentColor"/>
    <circle cx="60" cy="30" r="13" stroke="currentColor" stroke-width="2.4" opacity=".45"/>
    <circle cx="60" cy="30" r="22" stroke="currentColor" stroke-width="2.4" opacity=".22"/>
    <path d="M6 60h26l4-12 5 22 5-30 4 20h40" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
  </svg>`,tools:`<svg viewBox="0 0 120 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="16" y="12" width="48" height="36" rx="8" stroke="currentColor" stroke-width="3"/>
    <circle cx="30" cy="24" r="4" fill="currentColor" opacity=".6"/>
    <path d="M24 42l10-11 7 7 11-13" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M86 18v30m0 0l-8-9m8 9l8-9" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,admin:`<svg viewBox="0 0 120 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="12" y="12" width="96" height="48" rx="9" stroke="currentColor" stroke-width="3"/>
    <line x1="12" y1="27" x2="108" y2="27" stroke="currentColor" stroke-width="1.8" opacity=".4"/>
    <rect x="24" y="38" width="14" height="14" rx="2.5" fill="currentColor" opacity=".55"/>
    <rect x="44" y="32" width="14" height="20" rx="2.5" fill="currentColor"/>
    <rect x="64" y="44" width="14" height="8" rx="2.5" fill="currentColor" opacity=".4"/>
    <path d="M82 50l8-11 7 6 9-15" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`},m=L.map(t=>({key:t.key,name:t.name,desc:t.desc,path:t.path,art:w[t.key],color:p[t.key]})),y=b(()=>(d.displayName||"U").slice(0,1).toUpperCase());function v(t){u.push(t)}async function x(){s.value=!1,await d.logout(),u.replace({name:"login"})}return(t,o)=>(a(),n("div",R,[e("header",T,[e("div",A,[e("div",O,[i(c,{name:"layers",size:18})]),o[2]||(o[2]=e("strong",null,"WorkBench",-1))]),e("div",{class:"user",onClick:o[1]||(o[1]=r=>s.value=!s.value)},[e("span",U,l(y.value),1),e("span",$,l(h(d).displayName),1),i(c,{name:"chevron",size:12,class:C(["arrow",{open:s.value}])},null,8,["class"]),s.value?(a(),n("div",{key:0,class:"menu card",onClick:o[0]||(o[0]=_(()=>{},["stop"]))},[e("button",{class:"mi danger",onClick:x},[i(c,{name:"logout",size:14}),o[3]||(o[3]=k(" 退出登录 ",-1))])])):g("",!0)])]),e("main",F,[o[5]||(o[5]=e("div",{class:"head"},[e("h1",null,"选择一个模块"),e("p",null,"登录成功，请选择要进入的工作区")],-1)),e("div",G,[(a(!0),n(M,null,B(h(m),r=>(a(),n("button",{key:r.key,class:"card",style:N({"--accent":r.color}),onClick:J=>v(r.path)},[e("div",{class:"art",innerHTML:r.art},null,8,q),e("div",D,l(r.name),1),e("div",E,l(r.desc),1),e("div",I,[o[4]||(o[4]=k(" 进入 ",-1)),i(c,{name:"chevron",size:14,class:"rt"})])],12,H))),128))])])]))}}),Z=j(P,[["__scopeId","data-v-05630eda"]]);export{Z as default};
