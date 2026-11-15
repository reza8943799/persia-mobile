(function(){
function parse(c){var m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;var p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
function lum(c){function f(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);}
function ratio(a,b){var l1=lum(a),l2=lum(b);if(l1<l2){var t=l1;l1=l2;l2=t;}return (l1+0.05)/(l2+0.05);}
function blend(top,bot){var a=top.a;return{r:top.r*a+bot.r*(1-a),g:top.g*a+bot.g*(1-a),b:top.b*a+bot.b*(1-a),a:1};}
function bgOptions(el){ // returns list of possible opaque backgrounds (gradient stops -> multiple)
  var layers=[];var n=el;
  while(n&&n.nodeType===1){var cs=getComputedStyle(n);var bg=parse(cs.backgroundColor);var img=cs.backgroundImage;
    if(img&&img!=='none'){var stops=(img.match(/rgba?\([^)]+\)/g)||[]).map(parse).filter(Boolean);if(stops.length){layers.push({multi:stops});if(stops.every(function(s){return s.a>=0.95}))break;}}
    if(bg&&bg.a>0){layers.push({one:bg});if(bg.a>=0.99)break;}
    n=n.parentElement;}
  var opts=[{r:255,g:255,b:255,a:1}];
  for(var i=layers.length-1;i>=0;i--){var L=layers[i];var next=[];
    if(L.one){opts.forEach(function(o){next.push(blend(L.one,o))});}
    else{L.multi.forEach(function(s){opts.forEach(function(o){next.push(blend(s,o))})});}
    opts=next.slice(0,12);}
  return opts;}
function visible(el){var r=el.getBoundingClientRect();if(r.width<2||r.height<2)return false;var n=el;var op=1;
  while(n&&n.nodeType===1){var cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden')return false;op*=parseFloat(cs.opacity);n=n.parentElement;}return op>0.05;}
function sig(el){var p=[];var n=el;for(var i=0;i<3&&n&&n.nodeType===1&&n!==document.body;i++){var t=n.tagName.toLowerCase();var c=(n.className&&typeof n.className==='string')?n.className.trim().split(/\s+/).filter(function(x){return !/^\d/.test(x)})[0]:'';p.unshift(t+(c?'.'+c:'')+(n.id&&i===0?'#'+n.id:''));n=n.parentElement;}return p.join(' > ');}
window.__audit=function(root){
  var out={};var els=(root||document.body).querySelectorAll('*');var total=0;
  for(var i=0;i<els.length;i++){var el=els[i];
    var own='';for(var j=0;j<el.childNodes.length;j++){if(el.childNodes[j].nodeType===3)own+=el.childNodes[j].nodeValue;}
    own=own.replace(/\s+/g,' ').trim();
    var isInput=(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT');
    if(el.tagName==='OPTION'||el.tagName==='SCRIPT'||el.tagName==='STYLE')continue; if(own&&!/[A-Za-z0-9\u0600-\u06FF]/.test(own))continue; if(!own&&!isInput)continue; if(!own&&isInput&&!(el.value||el.placeholder))continue;
    if(!visible(el))continue; total++;
    var cs=getComputedStyle(el);var fg=parse(cs.color);if(!fg)continue;var tf=parse(cs.webkitTextFillColor||'');if(tf&&tf.a===0)continue;
    var op=1,n=el;while(n&&n.nodeType===1){op*=parseFloat(getComputedStyle(n).opacity);n=n.parentElement;}
    fg.a=fg.a*op;
    var worst=99,wbg=null;var opts=bgOptions(el);
    opts.forEach(function(b){var f=blend(fg,b);var r=ratio(f,b);if(r<worst){worst=r;wbg=b;}});
    var size=parseFloat(cs.fontSize);var bold=parseInt(cs.fontWeight)>=700;var large=size>=24||(size>=18.66&&bold);
    var need=large?3:4.5;
    if(worst<need){var k=cs.color+'|'+'rgb('+Math.round(wbg.r)+','+Math.round(wbg.g)+','+Math.round(wbg.b)+')';var o=out[k]||(out[k]={n:0,worst:99,sample:'',fg:'',bg:'',tag:'',inl:'',cls:'',sig:''});o.n++;
      if(worst<o.worst){o.tag=el.tagName.toLowerCase();o.cls=(typeof el.className==='string'?el.className:'').slice(0,40);o.inl=(el.getAttribute('style')||'').slice(0,90);o.sig=sig(el);o.worst=worst;o.sample=(own||el.value||el.placeholder||'').slice(0,28);o.fg=cs.color;o.bg='rgb('+Math.round(wbg.r)+','+Math.round(wbg.g)+','+Math.round(wbg.b)+')';}}
  }
  return {total:total,groups:out};};
})();
