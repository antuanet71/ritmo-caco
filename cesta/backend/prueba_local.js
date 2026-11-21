// Prueba Code.gs en el ordenador con una hoja simulada: node backend/prueba_local.js
const fs=require('fs');
function Sheet(name){this.name=name;this.d=[];}
Sheet.prototype={getName(){return this.name},
 cell(r,c){return (this.d[r-1]||[])[c-1]??''},
 put(r,c,v){while(this.d.length<r)this.d.push([]);this.d[r-1][c-1]=v},
 getLastRow(){let n=0;this.d.forEach((r,i)=>{if(r.some(x=>x!==''&&x!==undefined))n=i+1});return n},
 getLastColumn(){return Math.max(0,...this.d.map(r=>r.length))},
 getRange(r,c,nr,nc){const sh=this;if(typeof r==='string'){return rng(sh,2,2,1,1)}return rng(sh,r,c,nr||1,nc||1)},
 getDataRange(){return rng(this,1,1,this.getLastRow(),this.getLastColumn())},
 setFrozenRows(){},deleteRow(r){this.d.splice(r-1,1)},appendRow(a){const r=this.getLastRow()+1;a.forEach((v,i)=>this.put(r,i+1,v))}};
function rng(sh,r,c,nr,nc){return{setNumberFormat(){return this},setFontWeight(){return this},setDataValidation(){return this},
 setValues(v){v.forEach((row,i)=>row.forEach((x,j)=>sh.put(r+i,c+j,x)));return this},setValue(x){sh.put(r,c,x);return this},
 getValues(){const o=[];for(let i=0;i<nr;i++){const row=[];for(let j=0;j<nc;j++)row.push(sh.cell(r+i,c+j));o.push(row)}return o},
 clearContent(){for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)sh.put(r+i,c+j,'');return this}}}
const ss={sheets:[new Sheet('Hoja 1')],getSheetByName(n){return this.sheets.find(s=>s.name===n)||null},insertSheet(n){const s=new Sheet(n);this.sheets.push(s);return s},
 getSheets(){return this.sheets.slice()},deleteSheet(s){this.sheets=this.sheets.filter(x=>x!==s)},getName(){return 'Cesta · Casa Toño'},getUrl(){return 'u'},getOwner(){return{getEmail(){return 'o@gmail.com'}}}};
global.SpreadsheetApp={getActiveSpreadsheet:()=>ss,getActive:()=>({toast(){}}),newDataValidation(){const b={requireValueInRange(){return b},setAllowInvalid(){return b},build(){return{}}};return b}};
global.Utilities={getUuid:()=>Math.random().toString(16).slice(2)+'0000-0000',formatDate:(d)=>d.toISOString().slice(0,16).replace('T',' '),parseDate:(s)=>new Date(s.replace(' ','T'))};
global.Session={getScriptTimeZone:()=>'UTC',getActiveUser:()=>({getEmail:()=>'o@gmail.com'})};
global.LockService={getDocumentLock:()=>({waitLock(){},releaseLock(){}})};
global.HtmlService={};
eval(fs.readFileSync(require('path').join(__dirname,'Code.gs'),'utf8')+';global.api=api;global.ensureTabs=ensureTabs;');
ensureTabs(ss);ss.getSheetByName('Config').appendRow(['o@gmail.com','Toño']);
let r=api('load',{});
const P=()=>ss.getSheetByName('Productos').d;
console.log(P()[0].join(','),'|',P()[1].join(','));
// old-format sheet migration
const pr=ss.getSheetByName('Productos');pr.d[0][2]='categoriaId';pr.d[0][3]='superId';pr.d[1][2]='c1';pr.d[1][3]='s2';
pr.appendRow(['','Champú','higiene','lidl','','']);
r=api('load',{});console.log(P()[0].join(','),'|',P()[1].join(','),'|',P()[P().length-1].join(','));
console.log(r.state.productos[0].categoriaId,r.state.productos[0].superId, r.state.productos.at(-1));
r=api('ops',{ops:[{op:'moveCategory',id:'c2',dir:-1},{op:'upsertSuper',id:'s2',nombre:'LIDL Astorga',color:'#000',logo:'lidl'},{op:'setItem',productoId:'p001',cantidad:2,personaId:'',superId:'s2'},{op:'buy',productoId:'p001',value:true}]});
console.log(P()[1].join(','),'|',ss.getSheetByName('Historial').d.map(x=>x.join(',')).join(' / '));

console.log(ss.getSheetByName('Categorias').d.map(x=>x.slice(1,4).join(':')).join(' / '));
try{global.Session.getActiveUser=()=>({getEmail:()=>'x@gmail.com'});api('load',{})}catch(e){console.log('bloqueado:',e.message.slice(0,60))}
