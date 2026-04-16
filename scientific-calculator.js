//  CALCULATOR ENGINE

/* ------ STATE ------ */
const S = {
  cur:      '0',      // display string
  expr:     '',       // expression label
  mem:      0,
  op:       null,     // pending operator
  prev:     null,     // value before op
  waitNext: false,    // expecting new operand
  hasDot:   false,
  angle:    'deg',    // 'deg' | 'rad'
  on:       true,
  histOpen: false,
};
let histArr = [];

/* ---- FORMAT NUMBER ---- */
function fmt(n) {
  if(isNaN(n) || !isFinite(n)) return 'Error';
  const abs = Math.abs(n);
  if(abs !== 0 && (abs < 1e-10 || abs > 1e15)) return n.toPrecision(12).replace(/\.?0+$/, '');
  return String(parseFloat(n.toPrecision(15)));
}

/* ----- REFRESH DISPLAY ----- */
function refresh() {
  const rEl = document.getElementById('dResult');
  const eEl = document.getElementById('dInput');

  rEl.textContent = S.cur;
  rEl.className = 'disp-result' +
    (S.cur === '0'     ? ' is-zero'  : '') +
    (S.cur === 'Error' ? ' is-error' : '');

  eEl.textContent = S.expr || '—';
}

/* ----- FLASH ----- */
function flash() {
  const r = document.getElementById('dResult');
  r.classList.remove('flash');
  void r.offsetWidth;
  r.classList.add('flash');
}

/* ---- POWER ---- */
function setPower(on) {
  S.on = on;
  const grid = document.getElementById('btnGrid') || document.querySelector('.btn-grid');
  document.querySelectorAll('.btn').forEach(b => { b.disabled = !on; });
  document.querySelectorAll('.mem-btn').forEach(b => { b.disabled = !on; });
  if(!on) { S.cur='0'; S.expr=''; S.op=null; S.prev=null; S.waitNext=false; S.hasDot=false; refresh(); }
}

/* ---- ANGLE ---- */
function setAngle(m) {
  S.angle = m;
  document.getElementById('bDeg').className = m==='deg' ? 'ang-btn active' : 'ang-btn inactive';
  document.getElementById('bRad').className = m==='rad' ? 'ang-btn active' : 'ang-btn inactive';
}
function toR(d) { return d * Math.PI / 180; }

/* ---- DIGIT ---- */
function digit(d) {
  if(!S.on) return;
  if(S.waitNext) {
    S.cur = d==='0' ? '0' : d;
    S.hasDot = false; S.waitNext = false;
  } else if(S.cur === '0' || S.cur === 'Error') {
    S.cur = d;
  } else {
    if(S.cur.replace('-','').length < 18) S.cur += d;
  }
  refresh();
}

/* ---- DOT ---- */
function dot() {
  if(!S.on) return;
  if(S.waitNext || S.cur === 'Error') { S.cur='0.'; S.hasDot=true; S.waitNext=false; refresh(); return; }
  if(!S.cur.includes('.')) { S.cur+='.'; S.hasDot=true; }
  refresh();
}

/* ---- TOGGLE SIGN ---- */
function toggleSign() {
  if(!S.on || S.cur==='Error') return;
  const n = parseFloat(S.cur);
  if(!isNaN(n)) { S.cur = fmt(-n); refresh(); }
}

/* ---- OPERATOR ---- */
function pressOp(op) {
  if(!S.on) return;
  const cur = parseFloat(S.cur);
  if(isNaN(cur)) return;

  if(S.op && !S.waitNext) {
    const r = compute(S.prev, cur, S.op);
    S.cur = fmt(r); S.prev = r;
  } else {
    S.prev = cur;
  }

  S.op = op; S.waitNext = true; S.hasDot = false;
  const OL = {'+':'+','-':'−','*':'×','/':'÷','^':'^'};
  S.expr = `${fmt(S.prev)} ${OL[op]||op}`;
  refresh();
}

/* ---- COMPUTE ---- */
function compute(a, b, op) {
  switch(op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b===0 ? NaN : a/b;
    case '^': return Math.pow(a, b);
    default:  return b;
  }
}

/* ---- EQUALS ---- */
function calc() {
  if(!S.on) return;
  const cur = parseFloat(S.cur);
  if(isNaN(cur)) return;

  let result = cur, expr = '';
  const OL = {'+':'+','-':'−','*':'×','/':'÷','^':'^'};

  if(S.op && S.prev !== null) {
    const b = S.waitNext ? S.prev : cur; // if waitNext, user re-pressed = without new num
    expr = `${fmt(S.prev)} ${OL[S.op]||S.op} ${fmt(S.waitNext ? S.prev : cur)}`;
    result = compute(S.prev, S.waitNext ? S.prev : cur, S.op);
  } else {
    expr = fmt(cur);
  }

  const rs = isNaN(result)||!isFinite(result) ? 'Error' : fmt(result);
  if(expr && expr !== rs) pushHist(expr, rs);

  S.expr     = expr + ' =';
  S.cur      = rs;
  S.op       = null;
  S.prev     = null;
  S.waitNext = true;
  S.hasDot   = false;

  refresh(); flash();
}

/* ---- CLEAR / BACK ---- */
function clearAll() {
  S.cur='0'; S.expr=''; S.op=null; S.prev=null; S.waitNext=false; S.hasDot=false;
  refresh();
}

function backspace() {
  if(!S.on || S.cur==='Error') { clearAll(); return; }
  if(S.cur.length<=1 || (S.cur.length===2 && S.cur[0]==='-')) {
    S.cur='0'; S.hasDot=false;
  } else {
    if(S.cur.slice(-1)==='.') S.hasDot=false;
    S.cur = S.cur.slice(0,-1);
    if(S.cur==='-') S.cur='0';
  }
  refresh();
}

/* ---- UNARY FUNCTIONS ---- */
function unary(fn) {
  if(!S.on) return;
  const x = parseFloat(S.cur);
  if(isNaN(x)) return;

  let r = 0, label = '';
  const ang = S.angle==='deg' ? toR(x) : x;
  const sym = S.angle==='deg' ? '°' : 'r';

  switch(fn) {
    case 'sqrt':  r=Math.sqrt(x);              label=`√(${x})`; break;
    case 'exp':   r=Math.exp(x);               label=`e^(${x})`; break;
    case 'sin':   r=Math.sin(ang);             label=`sin(${x}${sym})`; break;
    case 'cos':   r=Math.cos(ang);             label=`cos(${x}${sym})`; break;
    case 'tan':
      if(S.angle==='deg' && x%180===90) { r=Infinity; }
      else r=Math.tan(ang);               label=`tan(${x}${sym})`; break;
    case 'sinh':  r=Math.sinh(x);              label=`sinh(${x})`; break;
    case 'cosh':  r=Math.cosh(x);              label=`cosh(${x})`; break;
    case 'tanh':  r=Math.tanh(x);              label=`tanh(${x})`; break;
    case 'log':   r=Math.log10(x);             label=`log(${x})`; break;
    case 'ln':    r=Math.log(x);               label=`ln(${x})`; break;
    case 'recip': r=x===0?NaN:1/x;             label=`1/(${x})`; break;
    case 'pct':   r=x/100;                     label=`${x}%`; break;
    case 'sq':    r=x*x;                       label=`${x}²`; break;
    case 'cube':  r=x*x*x;                     label=`${x}³`; break;
    case 'fact':  r=factorial(x);              label=`${x}!`; break;
    default: return;
  }

  if(!isFinite(r)) r=NaN;
  const rs = isNaN(r) ? 'Error' : fmt(r);
  pushHist(label, rs);
  S.expr=label+' ='; S.cur=rs; S.waitNext=true; S.hasDot=false;
  refresh(); flash();
}

function factorial(n) {
  if(n<0 || !Number.isInteger(n)) return NaN;
  if(n>170) return Infinity;
  let r=1; for(let i=2;i<=n;i++) r*=i; return r;
}

/* ---- MEMORY ---- */
function mClear()  { S.mem=0; updMR(); }
function mRecall() { S.cur=fmt(S.mem); S.waitNext=false; S.hasDot=S.cur.includes('.'); refresh(); }
function mPlus()   { S.mem+=parseFloat(S.cur)||0; updMR(); }
function mMinus()  { S.mem-=parseFloat(S.cur)||0; updMR(); }
function updMR() { document.getElementById('btnMR').classList.toggle('m-active', S.mem!==0); }

/* ---- HISTORY ---- */
function pushHist(expr, result) {
  histArr.unshift({expr,result});
  if(histArr.length>20) histArr.pop();
  renderHist();
}

function renderHist() {
  const body  = document.getElementById('hBody');
  const empty = document.getElementById('hEmpty');
  body.querySelectorAll('.hist-item').forEach(e=>e.remove());
  if(!histArr.length) { empty.style.display='block'; return; }
  empty.style.display='none';
  histArr.forEach(h => {
    const d=document.createElement('div');
    d.className='hist-item';
    d.innerHTML=`<span class="hi-e">${h.expr}</span><span class="hi-r">= ${h.result}</span>`;
    d.onclick=()=>{ S.cur=h.result; S.waitNext=true; refresh(); };
    body.appendChild(d);
  });
}

function toggleHist() {
  S.histOpen = !S.histOpen;
  document.getElementById('hBody').style.display = S.histOpen ? 'block' : 'none';
  document.getElementById('hArrow').style.transform = S.histOpen ? 'rotate(180deg)' : '';
}

/* ---- KEYBOARD ---- */
document.addEventListener('keydown', e => {
  if(!S.on || e.ctrlKey || e.altKey || e.metaKey) return;
  const k = e.key;
  if(k>='0'&&k<='9')     { digit(k); e.preventDefault(); }
  else if(k==='.')       { dot(); e.preventDefault(); }
  else if(k==='+')       { pressOp('+'); e.preventDefault(); }
  else if(k==='-')       { pressOp('-'); e.preventDefault(); }
  else if(k==='*')       { pressOp('*'); e.preventDefault(); }
  else if(k==='/')       { pressOp('/'); e.preventDefault(); }
  else if(k==='^')       { pressOp('^'); e.preventDefault(); }
  else if(k==='Enter'||k==='=') { calc(); e.preventDefault(); }
  else if(k==='Escape')  { clearAll(); e.preventDefault(); }
  else if(k==='Backspace') { backspace(); e.preventDefault(); }
  else if(k==='%')       { unary('pct'); e.preventDefault(); }
});

/* ---- RIPPLE ---- */
document.querySelectorAll('.btn').forEach(b => {
  b.addEventListener('pointerdown', e => {
    const r=document.createElement('span');
    r.className='rip';
    const rc=b.getBoundingClientRect();
    r.style.left=(e.clientX-rc.left-10)+'px';
    r.style.top=(e.clientY-rc.top-10)+'px';
    b.appendChild(r);
    setTimeout(()=>r.remove(),380);
  });
});

/* ---- INIT ---- */
refresh();
