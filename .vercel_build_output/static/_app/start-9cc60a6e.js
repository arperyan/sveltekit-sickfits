var t=Object.defineProperty,e=Object.prototype.hasOwnProperty,r=Object.getOwnPropertySymbols,n=Object.prototype.propertyIsEnumerable,s=(e,r,n)=>r in e?t(e,r,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[r]=n,o=(t,o)=>{for(var a in o||(o={}))e.call(o,a)&&s(t,a,o[a]);if(r)for(var a of r(o))n.call(o,a)&&s(t,a,o[a]);return t};import{S as a,i,s as c,e as u,t as l,c as h,a as p,b as f,d,f as m,g as y,h as g,j as v,k as $,l as k,n as b,m as w,o as x,p as _,q,r as E,u as O,v as S,w as R,x as P,y as D,z as j,A,B as L,C as T,D as I,E as M,F as N}from"./chunks/index-4f58c89d.js";import{B as C,s as U,f as V,H as F,p as G,m as z,t as B,o as H,a as K,K as Q,b as W,c as Y,N as J,d as X,e as Z,g as tt,h as et,D as rt,i as nt,j as st,k as ot,l as at,y as it,v as ct,n as ut,q as lt,w as ht}from"./chunks/urql-svelte-bf759fa7.js";function pt(t){let e,r,n=t[1].stack+"";return{c(){e=u("pre"),r=l(n)},l(t){e=h(t,"PRE",{});var s=p(e);r=f(s,n),s.forEach(d)},m(t,n){m(t,e,n),y(e,r)},p(t,e){2&e&&n!==(n=t[1].stack+"")&&g(r,n)},d(t){t&&d(e)}}}function ft(t){let e,r,n,s,o,a,i,c=t[1].message+"",w=t[1].stack&&pt(t);return{c(){e=u("h1"),r=l(t[0]),n=v(),s=u("p"),o=l(c),a=v(),w&&w.c(),i=$()},l(u){e=h(u,"H1",{});var l=p(e);r=f(l,t[0]),l.forEach(d),n=k(u),s=h(u,"P",{});var m=p(s);o=f(m,c),m.forEach(d),a=k(u),w&&w.l(u),i=$()},m(t,c){m(t,e,c),y(e,r),m(t,n,c),m(t,s,c),y(s,o),m(t,a,c),w&&w.m(t,c),m(t,i,c)},p(t,[e]){1&e&&g(r,t[0]),2&e&&c!==(c=t[1].message+"")&&g(o,c),t[1].stack?w?w.p(t,e):(w=pt(t),w.c(),w.m(i.parentNode,i)):w&&(w.d(1),w=null)},i:b,o:b,d(t){t&&d(e),t&&d(n),t&&d(s),t&&d(a),w&&w.d(t),t&&d(i)}}}function dt(t,e,r){let{status:n}=e,{error:s}=e;return t.$$set=t=>{"status"in t&&r(0,n=t.status),"error"in t&&r(1,s=t.error)},[n,s]}class mt extends a{constructor(t){super(),i(this,t,dt,ft,c,{status:0,error:1})}}function yt(t){let e,r,n;const s=[t[4]||{}];var o=t[2][1];function a(t){let e={};for(let r=0;r<s.length;r+=1)e=w(e,s[r]);return{props:e}}return o&&(e=new o(a())),{c(){e&&_(e.$$.fragment),r=$()},l(t){e&&q(e.$$.fragment,t),r=$()},m(t,s){e&&E(e,t,s),m(t,r,s),n=!0},p(t,n){const i=16&n?O(s,[S(t[4]||{})]):{};if(o!==(o=t[2][1])){if(e){T();const t=e;P(t.$$.fragment,1,0,(()=>{D(t,1)})),I()}o?(e=new o(a()),_(e.$$.fragment),R(e.$$.fragment,1),E(e,r.parentNode,r)):e=null}else o&&e.$set(i)},i(t){n||(e&&R(e.$$.fragment,t),n=!0)},o(t){e&&P(e.$$.fragment,t),n=!1},d(t){t&&d(r),e&&D(e,t)}}}function gt(t){let e,r;return e=new mt({props:{status:t[0],error:t[1]}}),{c(){_(e.$$.fragment)},l(t){q(e.$$.fragment,t)},m(t,n){E(e,t,n),r=!0},p(t,r){const n={};1&r&&(n.status=t[0]),2&r&&(n.error=t[1]),e.$set(n)},i(t){r||(R(e.$$.fragment,t),r=!0)},o(t){P(e.$$.fragment,t),r=!1},d(t){D(e,t)}}}function vt(t){let e,r,n,s;const o=[gt,yt],a=[];function i(t,e){return t[1]?0:1}return e=i(t),r=a[e]=o[e](t),{c(){r.c(),n=$()},l(t){r.l(t),n=$()},m(t,r){a[e].m(t,r),m(t,n,r),s=!0},p(t,s){let c=e;e=i(t),e===c?a[e].p(t,s):(T(),P(a[c],1,1,(()=>{a[c]=null})),I(),r=a[e],r?r.p(t,s):(r=a[e]=o[e](t),r.c()),R(r,1),r.m(n.parentNode,n))},i(t){s||(R(r),s=!0)},o(t){P(r),s=!1},d(t){a[e].d(t),t&&d(n)}}}function $t(t){let e,r=t[6]&&kt(t);return{c(){e=u("div"),r&&r.c(),this.h()},l(t){e=h(t,"DIV",{id:!0,"aria-live":!0,"aria-atomic":!0,class:!0});var n=p(e);r&&r.l(n),n.forEach(d),this.h()},h(){x(e,"id","svelte-announcer"),x(e,"aria-live","assertive"),x(e,"aria-atomic","true"),x(e,"class","svelte-1y31lbn")},m(t,n){m(t,e,n),r&&r.m(e,null)},p(t,n){t[6]?r?r.p(t,n):(r=kt(t),r.c(),r.m(e,null)):r&&(r.d(1),r=null)},d(t){t&&d(e),r&&r.d()}}}function kt(t){let e,r;return{c(){e=l("Navigated to "),r=l(t[7])},l(n){e=f(n,"Navigated to "),r=f(n,t[7])},m(t,n){m(t,e,n),m(t,r,n)},p(t,e){128&e&&g(r,t[7])},d(t){t&&d(e),t&&d(r)}}}function bt(t){let e,r,n,s;const o=[t[3]||{}];let a={$$slots:{default:[vt]},$$scope:{ctx:t}};for(let c=0;c<o.length;c+=1)a=w(a,o[c]);e=new t[8]({props:a});let i=t[5]&&$t(t);return{c(){_(e.$$.fragment),r=v(),i&&i.c(),n=$()},l(t){q(e.$$.fragment,t),r=k(t),i&&i.l(t),n=$()},m(t,o){E(e,t,o),m(t,r,o),i&&i.m(t,o),m(t,n,o),s=!0},p(t,[r]){const s=8&r?O(o,[S(t[3]||{})]):{};2071&r&&(s.$$scope={dirty:r,ctx:t}),e.$set(s),t[5]?i?i.p(t,r):(i=$t(t),i.c(),i.m(n.parentNode,n)):i&&(i.d(1),i=null)},i(t){s||(R(e.$$.fragment,t),s=!0)},o(t){P(e.$$.fragment,t),s=!1},d(t){D(e,t),t&&d(r),i&&i.d(t),t&&d(n)}}}function wt(t,e,r){let{status:n}=e,{error:s}=e,{stores:o}=e,{page:a}=e,{components:i}=e,{props_0:c=null}=e,{props_1:u=null}=e;const l=i[0];j("__svelte__",o),A(o.page.notify);let h=!1,p=!1,f=null;return L((()=>{const t=o.page.subscribe((()=>{h&&(r(6,p=!0),r(7,f=document.title))}));return r(5,h=!0),t})),t.$$set=t=>{"status"in t&&r(0,n=t.status),"error"in t&&r(1,s=t.error),"stores"in t&&r(9,o=t.stores),"page"in t&&r(10,a=t.page),"components"in t&&r(2,i=t.components),"props_0"in t&&r(3,c=t.props_0),"props_1"in t&&r(4,u=t.props_1)},t.$$.update=()=>{1536&t.$$.dirty&&o.page.set(a)},[n,s,i,c,u,h,p,f,l,o,a]}class xt extends a{constructor(t){super(),i(this,t,wt,bt,c,{status:0,error:1,stores:9,page:10,components:2,props_0:3,props_1:4})}}let _t;const qt={},Et=function(t,e){if(!e)return t();if(void 0===_t){const t=document.createElement("link").relList;_t=t&&t.supports&&t.supports("modulepreload")?"modulepreload":"preload"}return Promise.all(e.map((t=>{if(t in qt)return;qt[t]=!0;const e=t.endsWith(".css"),r=e?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${t}"]${r}`))return;const n=document.createElement("link");return n.rel=e?"stylesheet":_t,e||(n.as="script",n.crossOrigin=""),n.href=t,document.head.appendChild(n),e?new Promise(((t,e)=>{n.addEventListener("load",t),n.addEventListener("error",e)})):void 0}))).then((()=>t()))};function Ot(t){let e,r,n,s,o,a,i,c,g,$,w,_;return{c(){e=u("ul"),r=u("a"),n=l("Products"),s=v(),o=u("a"),a=l("Sell"),i=v(),c=u("a"),g=l("Orders"),$=v(),w=u("a"),_=l("Account"),this.h()},l(t){e=h(t,"UL",{class:!0});var u=p(e);r=h(u,"A",{href:!0,class:!0});var l=p(r);n=f(l,"Products"),l.forEach(d),s=k(u),o=h(u,"A",{href:!0,class:!0});var m=p(o);a=f(m,"Sell"),m.forEach(d),i=k(u),c=h(u,"A",{href:!0,class:!0});var y=p(c);g=f(y,"Orders"),y.forEach(d),$=k(u),w=h(u,"A",{href:!0,class:!0});var v=p(w);_=f(v,"Account"),v.forEach(d),u.forEach(d),this.h()},h(){x(r,"href","/products"),x(r,"class","svelte-158kai9"),x(o,"href","/sell"),x(o,"class","svelte-158kai9"),x(c,"href","/order"),x(c,"class","svelte-158kai9"),x(w,"href","/account"),x(w,"class","svelte-158kai9"),x(e,"class","svelte-158kai9")},m(t,u){m(t,e,u),y(e,r),y(r,n),y(e,s),y(e,o),y(o,a),y(e,i),y(e,c),y(c,g),y(e,$),y(e,w),y(w,_)},p:b,i:b,o:b,d(t){t&&d(e)}}}class St extends a{constructor(t){super(),i(this,t,null,Ot,c,{})}}function Rt(t){let e,r;return{c(){e=u("div"),r=l("Search")},l(t){e=h(t,"DIV",{});var n=p(e);r=f(n,"Search"),n.forEach(d)},m(t,n){m(t,e,n),y(e,r)},p:b,i:b,o:b,d(t){t&&d(e)}}}class Pt extends a{constructor(t){super(),i(this,t,null,Rt,c,{})}}function Dt(t){let e,r,n,s,o,a,i,c,g,$;return i=new St({}),g=new Pt({}),{c(){e=u("header"),r=u("div"),n=u("h1"),s=u("div"),o=l("Sick fits"),a=v(),_(i.$$.fragment),c=v(),_(g.$$.fragment),this.h()},l(t){e=h(t,"HEADER",{});var u=p(e);r=h(u,"DIV",{class:!0});var l=p(r);n=h(l,"H1",{class:!0});var m=p(n);s=h(m,"DIV",{href:!0});var y=p(s);o=f(y,"Sick fits"),y.forEach(d),m.forEach(d),a=k(l),q(i.$$.fragment,l),l.forEach(d),c=k(u),q(g.$$.fragment,u),u.forEach(d),this.h()},h(){x(s,"href","/"),x(n,"class","logo svelte-1ncpizr"),x(r,"class","bar svelte-1ncpizr")},m(t,u){m(t,e,u),y(e,r),y(r,n),y(n,s),y(s,o),y(r,a),E(i,r,null),y(e,c),E(g,e,null),$=!0},p:b,i(t){$||(R(i.$$.fragment,t),R(g.$$.fragment,t),$=!0)},o(t){P(i.$$.fragment,t),P(g.$$.fragment,t),$=!1},d(t){t&&d(e),D(i),D(g)}}}class jt extends a{constructor(t){super(),i(this,t,null,Dt,c,{})}}var At,Lt;function Tt(t,e){if(Array.isArray(t))for(var r=0;r<t.length;r++)Tt(t[r],e);else if("object"==typeof t&&null!==t)for(r in t)"__typename"===r&&"string"==typeof t[r]?e[t[r]]=0:Tt(t[r],e);return e}function It(t){return t.kind===ut.FIELD&&"__typename"===t.name.value&&!t.alias}function Mt(t){if(t.selectionSet&&!t.selectionSet.selections.some(It))return C({},t,{selectionSet:C({},t.selectionSet,{selections:t.selectionSet.selections.concat([{kind:ut.FIELD,name:{kind:ut.NAME,value:"__typename"}}])})})}function Nt(t){return t&&"object"==typeof t?Object.keys(t).reduce((function(e,r){var n=t[r];return"__typename"===r?Object.defineProperty(e,"__typename",{enumerable:!1,value:n}):Array.isArray(n)?e[r]=n.map(Nt):e[r]=n&&"object"==typeof n&&"__typename"in n?Nt(n):n,e}),{}):t}function Ct(t){return t.toPromise=function(){return X(B(1)(t))},t}function Ut(t,e,r){return r||(r=e.context),{key:e.key,query:e.query,variables:e.variables,kind:t,context:r}}function Vt(t,e){return Ut(t.kind,t,C({},t.context,{meta:C({},t.context.meta,e)}))}function Ft(){}function Gt(t){return"mutation"!==(t=t.kind)&&"query"!==t}function zt(t){var e=Ut(t.kind,t);return e.query=function(t){t=it(t);var e=At.get(t.__key);return e||((e=ct(t,{Field:Mt,InlineFragment:Mt})).__key=t.__key,At.set(t.__key,e)),e}(t.query),e}function Bt(t){return"query"!==t.kind||"cache-only"!==t.context.requestPolicy}function Ht(t){return Vt(t,{cacheOutcome:"miss"})}function Kt(t){return Gt(t)}function Qt(t,e){return t.reexecuteOperation(Ut(e.kind,e,C({},e.context,{requestPolicy:"network-only"})))}function Wt(t){return"query"===t.kind||"mutation"===t.kind}function Yt(t){return"query"!==t.kind&&"mutation"!==t.kind}function Jt(){return!1}function Xt(t){function e(t){t.kind}return t.dispatchDebug,function(t){return V(Jt)(F(e)(t))}}function Zt(t){var e,r,n,s,o=this;this.activeOperations=Object.create(null),this.queue=[],this.createOperationContext=function(t){return t||(t={}),C({},{url:o.url,fetchOptions:o.fetchOptions,fetch:o.fetch,preferGetMethod:o.preferGetMethod},t,{suspense:t.suspense||!1!==t.suspense&&o.suspense,requestPolicy:t.requestPolicy||o.requestPolicy})},this.createRequestOperation=function(t,e,r){return Ut(t,e,o.createOperationContext(r))},this.executeQuery=function(t,e){return t=o.createRequestOperation("query",t,e),o.executeRequestOperation(t)},this.executeSubscription=function(t,e){return t=o.createRequestOperation("subscription",t,e),o.executeRequestOperation(t)},this.executeMutation=function(t,e){return t=o.createRequestOperation("mutation",t,e),o.executeRequestOperation(t)},e=Ft,this.url=t.url,this.fetchOptions=t.fetchOptions,this.fetch=t.fetch,this.suspense=!!t.suspense,this.requestPolicy=t.requestPolicy||"cache-first",this.preferGetMethod=!!t.preferGetMethod,this.maskTypename=!!t.maskTypename,r=tt(),n=r.next,this.operations$=r.source,s=!1,this.dispatchOperation=function(t){for(s=!0,t&&n(t);t=o.queue.shift();)n(t);s=!1},this.reexecuteOperation=function(t){("mutation"===t.kind||0<(o.activeOperations[t.key]||0))&&(o.queue.push(t),s||Promise.resolve().then(o.dispatchOperation))},t=function(t){return function(e){var r=e.client;return e.dispatchDebug,t.reduceRight((function(t,e){return e({client:r,forward:t,dispatchDebug:function(t){}})}),e.forward)}}(void 0!==t.exchanges?t.exchanges:Lt),this.results$=U(t({client:this,dispatchDebug:e,forward:Xt({dispatchDebug:e})})(this.operations$)),G(this.results$)}function te(t){return t.data=Nt(t.data),t}At=new Map,Xt({dispatchDebug:Ft}),Lt=[function(t){function e(t){s.delete(t.operation.key)}function r(t){var e=t.key,r=t.kind;return"teardown"===r?(s.delete(e),!0):"query"!==r&&"subscription"!==r||(r=s.has(e),s.add(e),!r)}var n=t.forward,s=(t.dispatchDebug,new Set);return function(t){return t=V(r)(t),F(e)(n(t))}},function(t){function e(t){var e=t.context.requestPolicy;return"query"===t.kind&&"network-only"!==e&&("cache-only"===e||c.has(t.key))}function r(t){var e=c.get(t.key);return e=C({},e,{operation:Vt(t,{cacheOutcome:e?"hit":"miss"})}),"cache-and-network"===t.context.requestPolicy&&(e.stale=!0,Qt(i,t)),e}function n(t){return!Gt(t)&&e(t)}function s(t){function e(t){n.add(t)}var r,n,s,o=t.operation;if(o)if(r=Object.keys(Tt(t.data,{})).concat(o.context.additionalTypenames||[]),"mutation"===t.operation.kind){for(n=new Set,t=0;t<r.length;t++)(s=u[s=r[t]]||(u[s]=new Set)).forEach(e),s.clear();n.forEach((function(t){c.has(t)&&(o=c.get(t).operation,c.delete(t),Qt(i,o))}))}else if("query"===o.kind&&t.data)for(c.set(o.key,t),t=0;t<r.length;t++)(u[s=r[t]]||(u[s]=new Set)).add(o.key)}function o(t){return!Gt(t)&&!e(t)}var a=t.forward,i=t.client;t.dispatchDebug;var c=new Map,u=Object.create(null);return function(t){var e=U(t);return t=z(r)(V(n)(e)),e=F(s)(a(V(Bt)(z(Ht)(Z([z(zt)(V(o)(e)),V(Kt)(e)]))))),Z([t,e])}},function(t){var e=t.forward;return t.dispatchDebug,function(t){var r,n=U(t);return t=rt((function(t){var e=t.key,r=V((function(t){return"teardown"===t.kind&&t.key===e}))(n),s=nt(t),o=st(t,s),a=ot(t,s);return F((function(t){t.data||t.error}))(W(r)(at(t,o,a)))}))(V(Wt)(n)),r=e(V(Yt)(n)),Z([t,r])}}],Zt.prototype.onOperationStart=function(t){var e=t.key;this.activeOperations[e]=(this.activeOperations[e]||0)+1,this.dispatchOperation(t)},Zt.prototype.onOperationEnd=function(t){var e=t.key,r=this.activeOperations[e]||0;if(0>=(this.activeOperations[e]=0>=r?0:r-1)){for(e=this.queue.length-1;0<=e;e--)this.queue[e].key===t.key&&this.queue.splice(e,1);this.dispatchOperation(Ut("teardown",t,t.context))}},Zt.prototype.executeRequestOperation=function(t){var e,r,n=this,s=V((function(e){return e.operation.key===t.key}))(this.results$);return this.maskTypename&&(s=z(te)(s)),"mutation"===t.kind?B(1)(H((function(){return n.dispatchOperation(t)}))(s)):(e=V((function(e){return"teardown"===e.kind&&e.key===t.key}))(this.operations$),r=V((function(e){return e.kind===t.kind&&e.key===t.key&&"cache-only"!==e.context.requestPolicy}))(this.operations$),K((function(){n.onOperationEnd(t)}))(H((function(){n.onOperationStart(t)}))(Q((function(t){return t.stale?et(t):Z([et(t),z((function(){return C({},t,{stale:!0})}))(B(1)(r))])}))(W(e)(s)))))},Zt.prototype.query=function(t,e,r){return r&&"boolean"==typeof r.suspense||(r=C({},r,{suspense:!1})),Ct(this.executeQuery(Y(t,e),r))},Zt.prototype.readQuery=function(t,e,r){var n=null;return J((function(t){n=t}))(this.executeQuery(Y(t,e),r)).unsubscribe(),n},Zt.prototype.subscription=function(t,e,r){return this.executeSubscription(Y(t,e),r)},Zt.prototype.mutation=function(t,e,r){return Ct(this.executeMutation(Y(t,e),r))};function ee(t){let e,r,n,s,o;r=new jt({});const a=t[1].default,i=M(a,t,t[0],null);return{c(){e=u("main"),_(r.$$.fragment),n=v(),s=u("div"),i&&i.c(),this.h()},l(t){e=h(t,"MAIN",{});var o=p(e);q(r.$$.fragment,o),n=k(o),s=h(o,"DIV",{class:!0});var a=p(s);i&&i.l(a),a.forEach(d),o.forEach(d),this.h()},h(){x(s,"class","container svelte-hpu3rp")},m(t,a){m(t,e,a),E(r,e,null),y(e,n),y(e,s),i&&i.m(s,null),o=!0},p(t,[e]){i&&i.p&&1&e&&N(i,a,t,t[0],e,null,null)},i(t){o||(R(r.$$.fragment,t),R(i,t),o=!0)},o(t){P(r.$$.fragment,t),P(i,t),o=!1},d(t){t&&d(e),D(r),i&&i.d(t)}}}function re(t,e,r){let{$$slots:n={},$$scope:s}=e;const o=new Zt({url:"http://localhost:3000/api/graphql"});return lt(o),t.$$set=t=>{"$$scope"in t&&r(0,s=t.$$scope)},[s,n]}var ne=Object.freeze({__proto__:null,[Symbol.toStringTag]:"Module",default:class extends a{constructor(t){super(),i(this,t,re,ee,c,{})}}});const se=[()=>Et((()=>import("./pages/index.svelte-1e199d95.js")),["/_app/pages/index.svelte-1e199d95.js","/_app/chunks/index-4f58c89d.js"]),()=>Et((()=>import("./pages/products/index.svelte-6f00a8a6.js")),["/_app/pages/products/index.svelte-6f00a8a6.js","/_app/assets/pages/products/index.svelte-46809281.css","/_app/chunks/index-4f58c89d.js","/_app/chunks/urql-svelte-bf759fa7.js"])],oe=()=>({}),ae=[{type:"page",pattern:/^\/$/,params:oe,parts:[se[0]]},{type:"page",pattern:/^\/products\/?$/,params:oe,parts:[se[1]]}];function ie(t){for(;t&&"A"!==t.nodeName.toUpperCase();)t=t.parentNode;return t}function ce(){return{x:pageXOffset,y:pageYOffset}}class ue{constructor({base:t,routes:e}){this.base=t,this.routes=e,this.history=window.history||{pushState:()=>{},replaceState:()=>{},scrollRestoration:"auto"}}init(t){let e;this.renderer=t,t.router=this,"scrollRestoration"in this.history&&(this.history.scrollRestoration="manual"),addEventListener("beforeunload",(()=>{this.history.scrollRestoration="auto"})),addEventListener("load",(()=>{this.history.scrollRestoration="manual"})),addEventListener("scroll",(()=>{clearTimeout(e),e=setTimeout((()=>{const t=o(o({},history.state||{}),{"sveltekit:scroll":ce()});history.replaceState(t,document.title,window.location.href)}),50)})),addEventListener("click",(t=>{if(1!==function(t){return null===t.which?t.button:t.which}(t))return;if(t.metaKey||t.ctrlKey||t.shiftKey||t.altKey)return;if(t.defaultPrevented)return;const e=ie(t.target);if(!e)return;if(!e.href)return;const r="object"==typeof e.href&&"SVGAnimatedString"===e.href.constructor.name,n=String(r?e.href.baseVal:e.href);if(n===location.href)return void(location.hash||t.preventDefault());if(e.hasAttribute("download")||"external"===e.getAttribute("rel"))return;if(r?e.target.baseVal:e.target)return;const s=new URL(n);if(s.pathname===location.pathname&&s.search===location.search)return;const o=this.parse(s);if(o){const r=e.hasAttribute("sveltekit:noscroll");this.history.pushState({},"",s.href),this._navigate(o,r?ce():null,[],s.hash),t.preventDefault()}})),addEventListener("popstate",(t=>{if(t.state){const e=new URL(location.href),r=this.parse(e);r?this._navigate(r,t.state["sveltekit:scroll"],[]):location.href=location.href}})),document.body.setAttribute("tabindex","-1"),this.history.replaceState({},"",location.href)}parse(t){if(t.origin!==location.origin)return null;if(!t.pathname.startsWith(this.base))return null;const e=t.pathname.slice(this.base.length)||"/",r=this.routes.filter((t=>t.pattern.test(e)));return r.length>0?{routes:r,path:e,query:new URLSearchParams(t.search)}:void 0}async goto(t,{noscroll:e=!1,replaceState:r=!1}={},n){const s=new URL(t,function(t){let e=t.baseURI;if(!e){const r=t.getElementsByTagName("base");e=r.length?r[0].href:t.URL}return e}(document)),o=this.parse(s);return o?(this.history[r?"replaceState":"pushState"]({},"",t),this._navigate(o,e?ce():null,n,s.hash)):(location.href=t,new Promise((()=>{})))}async _navigate(t,e,r,n){this.renderer.notify({path:t.path,query:t.query}),location.pathname.endsWith("/")&&"/"!==location.pathname&&history.replaceState({},"",`${location.pathname.slice(0,-1)}${location.search}`),await this.renderer.update(t,r),document.body.focus();const s=n&&document.getElementById(n.slice(1));e?scrollTo(e.x,e.y):s?scrollTo(0,s.getBoundingClientRect().top+scrollY):scrollTo(0,0)}}function le(t){if(t.error){const e="string"==typeof t.error?new Error(t.error):t.error,r=t.status;return e instanceof Error?!r||r<400||r>599?(console.warn('"error" returned from load() without a valid status code — defaulting to 500'),{status:500,error:e}):{status:r,error:e}:{status:500,error:new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof e}"`)}}if(t.redirect){if(!t.status||3!==Math.floor(t.status/100))return{status:500,error:new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')};if("string"!=typeof t.redirect)return{status:500,error:new Error('"redirect" property returned from load() must be a string')}}return t}function he(t){const e=ht(t);let r=!0;return{notify:function(){r=!0,e.update((t=>t))},set:function(t){r=!1,e.set(t)},subscribe:function(t){let n;return e.subscribe((e=>{(void 0===n||r&&e!==n)&&t(n=e)}))}}}class pe{constructor({Root:t,layout:e,target:r,session:n,host:s}){this.Root=t,this.layout=e,this.host=s,this.router=null,this.target=r,this.started=!1,this.current={page:null,query:null,session_changed:!1,nodes:[],contexts:[]},this.caches=new Map,this.prefetching={href:null,promise:null},this.stores={page:he({}),navigating:ht(null),session:ht(n)},this.$session=null,this.root=null;const o=t=>{const e=ie(t.target);e&&e.hasAttribute("sveltekit:prefetch")&&this.prefetch(new URL(e.href))};let a;addEventListener("touchstart",o),addEventListener("mousemove",(t=>{clearTimeout(a),a=setTimeout((()=>{o(t)}),20)}));let i=!1;this.stores.session.subscribe((async t=>{if(this.$session=t,!i)return;this.current.session_changed=!0;const e=this.router.parse(new URL(location.href));this.update(e,[])})),i=!0}async start(t,e,r){const n={stores:this.stores,error:r,status:e,page:t.page};if(r)n.components=[this.layout.default];else{const e=await this._hydrate(t);if(e.redirect)throw new Error("TODO client-side redirects");Object.assign(n,e.props),this.current=e.state}this.root=new this.Root({target:this.target,props:n,hydrate:!0}),this.started=!0}notify({path:t,query:e}){dispatchEvent(new CustomEvent("sveltekit:navigation-start")),this.stores.navigating.set({from:{path:this.current.page.path,query:this.current.page.query},to:{path:t,query:e}})}async update(t,e){const r=this.token={},n=await this._get_navigation_result(t);if(r===this.token){if(n.reload)location.reload();else if(n.redirect){if(!(e.length>10||e.includes(this.current.page.path)))return void this.router.goto(n.redirect,{replaceState:!0},[...e,this.current.page.path]);this.root.$set({status:500,error:new Error("Redirect loop")})}else this.current=n.state,this.root.$set(n.props),this.stores.navigating.set(null),await 0;dispatchEvent(new CustomEvent("sveltekit:navigation-end"))}}async prefetch(t){const e=this.router.parse(t);if(e)return t.href!==this.prefetching.href&&(this.prefetching={href:t.href,promise:this._get_navigation_result(e)}),this.prefetching.promise;throw new Error(`Could not prefetch ${t.href}`)}async _get_navigation_result(t){for(let e=0;e<t.routes.length;e+=1){const r=t.routes[e];if("endpoint"===r.type)return{reload:!0};let n=e+1;for(;n<t.routes.length;){const e=t.routes[n];if(e.pattern.toString()!==r.pattern.toString())break;"page"===e.type&&e.parts.forEach((t=>t())),n+=1}const s=r.parts.map((t=>t())),o={host:this.host,path:t.path,params:r.params(r.pattern.exec(t.path)),query:t.query},a=await this._hydrate({nodes:s,page:o});if(a)return a}return{state:{page:null,query:null,session_changed:!1,contexts:[],nodes:[]},props:{status:404,error:new Error(`Not found: ${t.path}`)}}}async _hydrate({nodes:t,page:s}){const a={status:200,error:null,components:[]},i=(t,s)=>{if(!this.started){const s=document.querySelector(`script[type="svelte-data"][url="${t}"]`);if(s){const t=JSON.parse(s.textContent),{body:o}=t,a=((t,s)=>{var o={};for(var a in t)e.call(t,a)&&s.indexOf(a)<0&&(o[a]=t[a]);if(null!=t&&r)for(var a of r(t))s.indexOf(a)<0&&n.call(t,a)&&(o[a]=t[a]);return o})(t,["body"]);return Promise.resolve(new Response(o,a))}}return fetch(t,s)},c=s.query.toString(),u={page:s,query:c,session_changed:!1,nodes:[],contexts:[]},l=[this.layout,...t],h=[];let p,f;const d={params:Object.keys(s.params).filter((t=>!this.current.page||this.current.page.params[t]!==s.params[t])),query:c!==this.current.query,session:this.current.session_changed,context:!1};try{for(let t=0;t<l.length;t+=1){const e=this.current.nodes[t],r=this.current.contexts[t],{default:n,preload:m,load:y}=await l[t];if(a.components[t]=n,m)throw new Error("preload has been deprecated in favour of load. Please consult the documentation: https://kit.svelte.dev/docs#load");if(!e||n!==e.component||d.params.some((t=>e.uses.params.has(t)))||d.query&&e.uses.query||d.session&&e.uses.session||d.context&&e.uses.context){const e=s.path+c,r=this.caches.get(n),l=r&&r.get(e);let m,g;if(!l||d.context&&l.node.uses.context){m={component:n,uses:{params:new Set,query:!1,session:!1,context:!1}};const t={};for(const r in s.params)Object.defineProperty(t,r,{get:()=>(m.uses.params.add(r),s.params[r]),enumerable:!0});const e=this.$session;if(y&&(g=await y.call(null,{page:{host:s.host,path:s.path,params:t,get query(){return m.uses.query=!0,s.query}},get session(){return m.uses.session=!0,e},get context(){return m.uses.context=!0,o({},p)},fetch:i}),!g))return}else({node:m,loaded:g}=l);if(g){if(g=le(g),g.error)return a.error=g.error,a.status=g.status||500,u.nodes=[],{redirect:f,props:a,state:u};if(g.redirect){f=g.redirect;break}if(g.context&&(d.context=!0,p=o(o({},p),g.context)),g.maxage){this.caches.has(n)||this.caches.set(n,new Map);const t=this.caches.get(n),r={node:m,loaded:g};t.set(e,r);let s=!1;const o=setTimeout((()=>{a()}),1e3*g.maxage),a=()=>{t.get(e)===r&&t.delete(e),i(),clearTimeout(o)},i=this.stores.session.subscribe((()=>{s&&a()}));s=!0}h[t]=g.props}u.nodes[t]=m,u.contexts[t]=p}else u.nodes[t]=e,u.contexts[t]=p=r}(await Promise.all(h)).forEach(((t,e)=>{t&&(a[`props_${e}`]=t)})),this.current.page&&s.path===this.current.page.path&&!d.query||(a.page=s)}catch(m){a.error=m,a.status=500,u.nodes=[]}return{redirect:f,props:a,state:u}}}async function fe({paths:t,target:e,session:r,error:n,status:s,nodes:o,page:a}){const i=new ue({base:t.base,routes:ae}),c=new pe({Root:xt,layout:ne,target:e,session:r,host:a.host});i.init(c),await c.start({nodes:o,page:a},s,n),dispatchEvent(new CustomEvent("sveltekit:start"))}export{fe as start};
