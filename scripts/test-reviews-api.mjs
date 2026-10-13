import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('google-apps-script/reviews-api.gs', 'utf8');
let rows = [];
let locked = false;
const sheet = {
  getDataRange: () => ({ getDisplayValues: () => rows.map(r => r.map(String)) }),
  getLastRow: () => rows.length,
  getRange: (r, c, h, w) => ({
    getDisplayValues: () => rows.slice(r-1,r-1+h).map(row => row.slice(c-1,c-1+w).map(String)),
    setValues: values => values.forEach((row,i) => { rows[r-1+i] = [...row]; }),
  }),
  appendRow: row => rows.push([...row]),
  deleteRow: row => rows.splice(row-1,1),
};
const context = vm.createContext({
  SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush: () => {} },
  LockService: { getScriptLock: () => ({ waitLock: () => { assert.equal(locked,false); locked=true; }, releaseLock: () => { locked=false; } }) },
  Utilities: { getUuid: () => 'generated-id' },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
});
vm.runInContext(source,context);
rows = [vm.runInContext('[...REVIEW_HEADERS]',context)];
const post = body => context.doPost({ postData: { contents: JSON.stringify(body) } });
const list = () => context.doGet({parameter:{action:'list'}});
assert.equal(context.doGet({parameter:{action:'health'}}).version,2);
let result=post({action:'create',review:{id:'test',author:'Tester',content:'Review',rating:2,reply:'Wrong',status:'sent'}});
assert.equal(result.ok,true);
assert.equal(list().reviews.length,1);
assert.equal(post({action:'create',review:{id:'test'}}).ok,true);
assert.equal(list().reviews.length,1,'retry is idempotent');
result=post({action:'update',id:'test',changes:{source:'Bolt',author:'Edited',date:'2026-10-13',url:'https://example.com',content:'Edited text',rating:5,reply:'',internalNote:'Note',assignee:'Manager',status:'needs_reply',respondedAt:''}});
assert.equal(result.ok,true);
for (const [key,value] of Object.entries({source:'Bolt',author:'Edited',content:'Edited text',reply:'',rating:5,internalNote:'Note',assignee:'Manager',respondedAt:''})) assert.equal(list().reviews[0][key],value,key);
assert.equal(post({action:'update',id:'test',changes:{updatedAt:'old',content:'lost update'}}).ok,false);
assert.equal(post({action:'update',id:'test',changes:{rating:7}}).ok,false);
post({action:'bulkUpsert',reviews:[{id:'test',reply:'Overwrite'}]});
assert.equal(list().reviews[0].reply,'','import must preserve manager work');
// Legacy rows expose their URL as ID: they must remain editable and deletable.
rows[1][10]='';
result=post({action:'update',id:'https://example.com',changes:{content:'Legacy edited'}});
assert.equal(result.ok,true);
assert.equal(result.review.content,'Legacy edited');
assert.equal(post({action:'delete',id:'https://example.com'}).deleted,true);
assert.equal(list().reviews.length,0);
assert.equal(post({action:'delete',id:'https://example.com'}).deleted,true);
assert.equal(locked,false);
console.log('Reviews backend: CRUD, clear reply, legacy IDs, retries, conflicts and import preservation passed');
