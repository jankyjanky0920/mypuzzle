/* Storage protection for a single browser origin; does not transmit practice data. */
(function(root){
'use strict';
function create(getStorage,key,validate){
 const backupKey=key+'-backup',recoveryKey=key+'-unreadable';let blocked=false;
 const storage=()=>typeof getStorage==='function'?getStorage():getStorage;
 function parse(raw){if(raw===null)return null;try{const data=JSON.parse(raw);return validate(data)?data:null;}catch{return null;}}
 function load(){try{const s=storage(),primary=s.getItem(key),data=parse(primary);if(data)return {data,source:'primary',blocked:false};const backup=s.getItem(backupKey),previous=parse(backup);if(previous)return {data:previous,source:'backup',blocked:false};blocked=primary!==null||backup!==null;return {data:null,source:blocked?'unreadable':'empty',blocked};}catch(error){blocked=true;return {data:null,source:'unavailable',blocked:true,error};}}
 function save(data){if(!validate(data))throw Error('保存する練習データの形式が正しくありません。');if(blocked)throw Error('以前の保存データを保護しています。バックアップを読み込むか、設定から明示的にリセットしてください。');const s=storage(),raw=JSON.stringify(data),old=s.getItem(key);if(old===raw)return {saved:true,backup:true};
 // An unreadable primary must be preserved before a recovered session can replace it.
 if(old!==null&&!parse(old))s.setItem(recoveryKey,old);
 // setItem is atomic: if the new primary exceeds quota, the old primary remains intact.
 s.setItem(key,raw);let backup=true;if(old!==null&&parse(old)){try{s.setItem(backupKey,old);}catch{backup=false;}}
 return {saved:true,backup};}
 function replace(data){if(!validate(data))throw Error('有効な練習データではありません。');const s=storage();s.setItem(key,JSON.stringify(data));blocked=false;try{s.setItem(backupKey,JSON.stringify(data));}catch{}return {saved:true};}
 function reset(data){if(!validate(data))throw Error('有効な練習データではありません。');const s=storage();s.setItem(key,JSON.stringify(data));s.removeItem(backupKey);s.removeItem(recoveryKey);blocked=false;return {saved:true};}
 return {load,save,replace,reset,keys:{primary:key,backup:backupKey,recovery:recoveryKey}};
}
root.PracticeStorage={create};if(typeof module!=='undefined')module.exports=root.PracticeStorage;
})(typeof globalThis!=='undefined'?globalThis:this);
