import{f as t,j as e,C as o,b as d,F as x,A as h,r as l,m,N as f,d as j,W as g,H as u,S as y,T as b,a as v,c as p,B as N,e as w,R as k}from"./index-CYenQ9JV.js";/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=t("ArrowLeftRight",[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=t("Circle",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=t("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=t("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);/**
 * @license lucide-react v0.441.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P=t("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);function B(){return e.jsxs("div",{className:"h-9 bg-primary-nav flex items-center justify-between px-4 border-b border-gray-700",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"w-5 h-5 rounded bg-up flex items-center justify-center",children:e.jsx("span",{className:"text-[10px] font-bold text-white",children:"C"})}),e.jsx("span",{className:"text-sm font-semibold text-white",children:"财瞳金融终端"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("button",{className:"w-3 h-3 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors",children:e.jsx(P,{size:8,className:"text-red-900"})}),e.jsx("button",{className:"w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center hover:bg-yellow-600 transition-colors",children:e.jsx(A,{size:8,className:"text-yellow-900"})}),e.jsx("button",{className:"w-3 h-3 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors",children:e.jsx(C,{size:8,className:"text-green-900",fill:"currentColor"})})]})]})}const R=[{id:"市场",icon:o},{id:"自选",icon:d},{id:"热度",icon:x},{id:"信号",icon:h},{id:"智询",icon:M},{id:"策略",icon:S}];function z({active:a,onSelect:c}){return e.jsx("div",{className:"w-14 bg-primary-nav flex flex-col items-center pt-0 gap-1 border-r border-gray-700",children:R.map(({id:s,icon:r})=>e.jsxs("button",{onClick:()=>c(s),className:`w-12 h-12 rounded flex flex-col items-center justify-center gap-1 transition-colors ${a===s?"bg-gray-700 text-white":"text-secondary hover:text-white hover:bg-gray-800"}`,children:[e.jsx(r,{size:18}),e.jsx("span",{className:"text-[10px]",children:s})]},s))})}function L(){const[a,c]=l.useState(m[0]),[s,r]=l.useState("市场"),n=i=>{c(i)};return e.jsxs("div",{className:"h-screen w-screen flex flex-col bg-primary-bg overflow-hidden",children:[e.jsx(B,{}),e.jsxs("div",{className:"flex-1 flex overflow-hidden",children:[e.jsx(z,{active:s,onSelect:r}),s==="市场"?e.jsxs("div",{className:"flex flex-col flex-1 overflow-hidden",children:[e.jsx(f,{}),e.jsx(j,{onSelectStock:n,selectedCode:a.证券代码})]}):s==="自选"?e.jsx(g,{}):s==="热度"?e.jsx(u,{}):s==="信号"?e.jsx(y,{}):s==="策略"?e.jsx(b,{}):s==="智询"?e.jsx(v,{}):e.jsxs("div",{className:"flex-1 flex items-center justify-center text-secondary text-sm",children:[s,"模块开发中..."]}),s==="市场"&&e.jsx(p,{stock:a})]}),e.jsx(N,{})]})}w.createRoot(document.getElementById("root")).render(e.jsx(k.StrictMode,{children:e.jsx(L,{})}));
