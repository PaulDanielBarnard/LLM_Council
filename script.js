/* ═══════════════════════════════════════════
   DATA
═══════════════════════════════════════════ */
const CLOUD_MODELS = [
  {id:'gpt-oss:120b-cloud',          name:'gpt-oss:120b',          desc:'OpenAI open-source 120B',      tags:['120b']},
  {id:'gpt-oss:20b-cloud',           name:'gpt-oss:20b',           desc:'OpenAI open-source 20B',       tags:['20b','fast']},
  {id:'deepseek-v3.2:cloud',         name:'deepseek-v3.2',         desc:'DeepSeek V3.2 reasoning',      tags:['~671b']},
  {id:'deepseek-v3.1:671b-cloud',    name:'deepseek-v3.1:671b',    desc:'DeepSeek V3.1 MoE',            tags:['671b']},
  {id:'qwen3-coder:480b-cloud',      name:'qwen3-coder:480b',      desc:'Qwen3 Coder 480B',             tags:['480b','code']},
  {id:'qwen3-coder-next:cloud',      name:'qwen3-coder-next',      desc:'Qwen3 Coder agentic',          tags:['code','tools']},
  {id:'qwen3.5:122b-cloud',          name:'qwen3.5:122b',          desc:'Qwen 3.5 multimodal 122B',     tags:['122b','vision']},
  {id:'qwen3.5:35b-cloud',           name:'qwen3.5:35b',           desc:'Qwen 3.5 35B',                 tags:['35b']},
  {id:'qwen3-next:80b-cloud',        name:'qwen3-next:80b',        desc:'Qwen3-Next efficient 80B',     tags:['80b','thinking']},
  {id:'qwen3-vl:235b-cloud',         name:'qwen3-vl:235b',         desc:'Qwen3 Vision-Language 235B',   tags:['235b','vision']},
  {id:'kimi-k2.5:cloud',             name:'kimi-k2.5',             desc:'Kimi K2.5 multimodal agentic', tags:['vision']},
  {id:'kimi-k2:1t-cloud',            name:'kimi-k2:1t',            desc:'Kimi K2 ~1 trillion params',   tags:['1T']},
  {id:'kimi-k2-thinking:cloud',      name:'kimi-k2-thinking',      desc:'Kimi K2 extended thinking',    tags:['thinking']},
  {id:'glm-5:cloud',                 name:'glm-5',                 desc:'GLM-5 744B MoE agentic',       tags:['744b']},
  {id:'glm-4.7:cloud',               name:'glm-4.7',               desc:'GLM-4.7 coding focus',         tags:['code']},
  {id:'glm-4.6:cloud',               name:'glm-4.6',               desc:'GLM-4.6 agentic & reasoning',  tags:['tools']},
  {id:'minimax-m2.5:cloud',          name:'minimax-m2.5',          desc:'MiniMax M2.5 productivity',    tags:['code']},
  {id:'minimax-m2:cloud',            name:'minimax-m2',            desc:'MiniMax M2 coding & agents',   tags:['code']},
  {id:'minimax-m2.1:cloud',          name:'minimax-m2.1',          desc:'MiniMax M2.1 multilingual',    tags:['multilingual']},
  {id:'gemini-3-flash-preview:cloud',name:'gemini-3-flash',        desc:'Gemini 3 Flash – speed',       tags:['fast']},
  {id:'devstral-2:123b-cloud',       name:'devstral-2:123b',       desc:'Mistral SWE agent 123B',       tags:['123b','code']},
  {id:'devstral-small-2:24b-cloud',  name:'devstral-small-2:24b',  desc:'Devstral 24B vision+tools',    tags:['24b','vision']},
  {id:'nemotron-3-nano:30b-cloud',   name:'nemotron-3-nano:30b',   desc:'NVIDIA Nemotron 30B',          tags:['30b','thinking']},
  {id:'rnj-1:8b-cloud',              name:'rnj-1:8b',              desc:'Essential AI RNJ-1 8B STEM',   tags:['8b','code']},
  {id:'cogito-2.1:671b-cloud',       name:'cogito-2.1:671b',       desc:'Cogito 2.1 671B (MIT)',        tags:['671b']},
  {id:'ministral-3:8b-cloud',        name:'ministral-3:8b',        desc:'Mistral edge model 8B',        tags:['8b','tools']},
];

const MEMBER_COLORS = ['#6fa8d6','#d4a95a','#8fbb7e','#c47abc','#5fcfcf','#e07070','#a0a0ff','#d6c47a'];

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
let memberCount = 0;
let currentMode = 'local';

/* ═══════════════════════════════════════════
   CONFIG IMPORT/EXPORT & LOCAL STORAGE
═══════════════════════════════════════════ */
const LS_KEYS = {
  API_KEY: 'ollama-council-apikey',
  LOCAL_URL: 'ollama-council-localurl',
};

function loadConnectionSettings() {
  const apiKey = localStorage.getItem(LS_KEYS.API_KEY);
  const localUrl = localStorage.getItem(LS_KEYS.LOCAL_URL);
  if (apiKey) {
    document.getElementById('api-key').value = apiKey;
  }
  if (localUrl) {
    document.getElementById('ollama-url').value = localUrl;
  }
}

function bindConnectionSaving() {
  document.getElementById('api-key').addEventListener('input', (e) => {
    localStorage.setItem(LS_KEYS.API_KEY, e.target.value);
  });
  document.getElementById('ollama-url').addEventListener('input', (e) => {
    localStorage.setItem(LS_KEYS.LOCAL_URL, e.target.value);
  });
}

function bindFileHandlers() {
    document.getElementById('import-file-input').addEventListener('change', handleFileSelected);
}

/* ═══════════════════════════════════════════
   ROUTING — all API calls go through the
   proxy server, which strips CORS entirely.
   /proxy/local → localhost:11434
   /proxy/cloud → ollama.com
═══════════════════════════════════════════ */
function apiBase() {
  return currentMode === 'cloud' ? '/proxy/cloud' : '/proxy/local';
}

function getHeaders() {
  const h = {'Content-Type': 'application/json'};
  if (currentMode === 'cloud') {
    const k = document.getElementById('api-key').value.trim();
    if (k) h['Authorization'] = 'Bearer ' + k;
  }
  return h;
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
function init() {
  renderModelBrowser();
  buildDatalist();
  [
    {name:'The Analyst',    model:'gpt-oss:120b-cloud',  role:'Logical analysis, facts & structured reasoning'},
    {name:'The Contrarian', model:'deepseek-v3.2:cloud', role:"Devil's advocate — challenge every assumption"},
    {name:'The Visionary',  model:'glm-5:cloud',         role:'Creative, lateral thinking & bold ideas'},
  ].forEach(addMember);
  loadConnectionSettings();
  bindToggles();
  bindConnectionSaving();
  bindFileHandlers();
  pingOllama();
}

/* ═══════════════════════════════════════════
   MODEL BROWSER
═══════════════════════════════════════════ */
function renderModelBrowser() {
  const grid = document.getElementById('model-grid');
  CLOUD_MODELS.forEach(m => {
    const chip = document.createElement('div');
    chip.className = 'cloud-model-chip';
    chip.title = `Add "${m.name}" as a council member`;
    chip.innerHTML = `
      <span class="chip-name">${m.name}</span>
      <span class="chip-desc">${m.desc}</span>
      <div class="chip-tags">${m.tags.map(t=>`<span class="chip-tag">${t}</span>`).join('')}</div>`;
    chip.addEventListener('click', () => {
      const pretty = m.name.split(':')[0].replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      addMember({model: m.id, name: pretty});
      chip.classList.add('flash');
      setTimeout(() => chip.classList.remove('flash'), 600);
    });
    grid.appendChild(chip);
  });
}

function buildDatalist() {
  const dl = document.getElementById('model-datalist');
  dl.innerHTML = CLOUD_MODELS.map(m =>
    `<option value="${m.id}">${m.name} — ${m.desc}</option>`
  ).join('');
}

/* ═══════════════════════════════════════════
   CONNECTION
═══════════════════════════════════════════ */
function setMode(mode) {
  currentMode = mode;
  document.getElementById('mode-local-btn').classList.toggle('active', mode === 'local');
  document.getElementById('mode-cloud-btn').classList.toggle('active', mode === 'cloud');
  document.getElementById('local-panel').classList.toggle('visible', mode === 'local');
  document.getElementById('cloud-panel').classList.toggle('visible', mode === 'cloud');
}

async function pingOllama() {
  const el = document.getElementById('ping-status');
  el.textContent = 'checking…'; el.style.color = 'var(--muted)';
  try {
    if (currentMode === 'cloud') {
      const key = document.getElementById('api-key').value.trim();
      if (!key) { el.textContent = '⚠ Enter your API key first'; el.style.color = 'var(--gold)'; return; }
      // Cloud: just verify the key is non-empty and reachable
      const r = await fetch('/proxy/cloud/api/version', {signal: AbortSignal.timeout(8000), headers: getHeaders()});
      if (r.status === 401) { el.textContent = '✗ Invalid API key (401)'; el.style.color = 'var(--red)'; return; }
      if (r.status === 404) { el.textContent = '✓ Cloud reachable (key set)'; el.style.color = 'var(--green)'; return; }
      el.textContent = r.ok ? '✓ Cloud connected' : `✗ HTTP ${r.status}`;
      el.style.color = r.ok ? 'var(--green)' : 'var(--red)';
    } else {
      const r = await fetch('/proxy/local/api/tags', {signal: AbortSignal.timeout(5000)});
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      const c = (d.models || []).length;
      el.textContent = `✓ Connected — ${c} model${c !== 1 ? 's' : ''} available`;
      el.style.color = 'var(--green)';
    }
  } catch (e) {
    el.textContent = '✗ ' + (e.message.substring(0, 60) || 'Could not connect');
    el.style.color = 'var(--red)';
  }
}

/* ═══════════════════════════════════════════
   MEMBERS
═══════════════════════════════════════════ */
function addMember(data = {}) {
  const idx   = memberCount++;
  const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];
  const row   = document.createElement('div');
  row.className = 'member-row';
  row.style.borderLeftColor = color;
  row.innerHTML = `
    <div class="name-col field"><label>Name</label>
      <input class="m-name"  type="text" value="${data.name  || 'Member ' + (idx+1)}" placeholder="Name">
    </div>
    <div class="field"><label>Model</label>
      <input class="m-model" type="text" value="${data.model || ''}" placeholder="gpt-oss:120b-cloud…" list="model-datalist">
    </div>
    <div class="field"><label>Role / Persona</label>
      <input class="m-role"  type="text" value="${data.role  || ''}" placeholder="e.g. Focus on risks…">
    </div>
    <div class="field"><label style="visibility:hidden">x</label>
      <button class="btn-icon" title="Remove" onclick="this.closest('.member-row').remove();updateSynthSelect()">✕</button>
    </div>`;
  document.getElementById('members-grid').appendChild(row);
  updateSynthSelect();
}

function getMembers() {
  return [...document.querySelectorAll('.member-row')].map((row, i) => ({
    name:  row.querySelector('.m-name').value.trim()  || `Member ${i+1}`,
    model: row.querySelector('.m-model').value.trim() || 'gpt-oss:20b-cloud',
    role:  row.querySelector('.m-role').value.trim(),
    color: MEMBER_COLORS[i % MEMBER_COLORS.length],
  }));
}

function updateSynthSelect() {
  const sel = document.getElementById('synthesize');
  [...sel.options].filter(o => o.dataset.member).forEach(o => o.remove());
  getMembers().forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = `member:${i}`; opt.textContent = `${m.name} synthesizes`; opt.dataset.member = '1';
    sel.appendChild(opt);
  });
}

/* ═══════════════════════════════════════════
   FEATURE TOGGLES
═══════════════════════════════════════════ */
function bindToggles() {
  document.getElementById('combiner-enabled').addEventListener('change', e => {
    document.getElementById('combiner-fields').classList.toggle('disabled', !e.target.checked);
  });
  document.getElementById('leader-enabled').addEventListener('change', e => {
    document.getElementById('leader-fields').classList.toggle('disabled', !e.target.checked);
  });
}

function getCombiner() {
  if (!document.getElementById('combiner-enabled').checked) return null;
  return {
    name:  document.getElementById('combiner-name').value.trim()  || 'The Distiller',
    model: document.getElementById('combiner-model').value.trim() || 'gpt-oss:120b-cloud',
    role:  document.getElementById('combiner-role').value.trim(),
  };
}

function getLeader() {
  if (!document.getElementById('leader-enabled').checked) return null;
  return {
    name:  document.getElementById('leader-name').value.trim()  || 'The Arbiter',
    model: document.getElementById('leader-model').value.trim() || 'gpt-oss:120b-cloud',
    role:  document.getElementById('leader-role').value.trim(),
  };
}

/* ═══════════════════════════════════════════
   OLLAMA STREAM
═══════════════════════════════════════════ */
async function streamChat(model, messages, onToken) {
  const r = await fetch(apiBase() + '/api/chat', {
    method:  'POST',
    headers: getHeaders(),
    body:    JSON.stringify({
      model,
      messages,
      stream:  true,
      options: {temperature: parseFloat(document.getElementById('temperature').value) || 0.7}
    })
  });
  if (!r.ok) {
    let body = '';
    try { body = await r.text(); } catch {}
    if (r.status === 401) throw new Error('401 Unauthorized — check your Ollama API key in the Connection panel.');
    if (r.status === 404) throw new Error('404 Not Found — model "' + model + '" may not exist. Check the model name.');
    throw new Error('HTTP ' + r.status + ': ' + body.substring(0, 200));
  }
  const reader = r.body.getReader(), dec = new TextDecoder();
  let full = '';
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split('\n').filter(Boolean)) {
      try { const o = JSON.parse(line); full += o.message?.content || ''; onToken(full); } catch {}
    }
  }
  return full;
}

/* ═══════════════════════════════════════════
   OUTPUT HELPERS
═══════════════════════════════════════════ */
function clearOutput() {
  document.getElementById('output').innerHTML = '';
  document.getElementById('output').style.display = 'none';
  document.getElementById('error-area').innerHTML = '';
  setStatus(null);
}

function setStatus(msg) {
  const el = document.getElementById('status');
  if (!msg) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  document.getElementById('status-text').textContent = msg;
}

function showError(msg) {
  document.getElementById('error-area').innerHTML = `<div class="error-msg">⚠ ${msg}</div>`;
}

function appendToOutput(el) {
  const out = document.getElementById('output');
  out.style.display = 'block';
  out.appendChild(el);
}

function addSectionSep(type, label) {
  const sep = document.createElement('div');
  sep.className = `section-sep sep-${type}`;
  sep.innerHTML = `<div class="section-sep-line"></div><span class="section-sep-label">${label}</span><div class="section-sep-line"></div>`;
  appendToOutput(sep);
}

function addRoundHeader(round, total) {
  if (total < 2) return;
  const h = document.createElement('div');
  h.className = 'round-header';
  h.textContent = `⸺  Round ${round} of ${total}  ⸺`;
  appendToOutput(h);
}

function createCard(opts) {
  const card = document.createElement('div');
  card.className = `response-card ${opts.cssClass || ''}`;
  card.innerHTML = `
    <div class="response-header">
      ${opts.crown    ? `<span class="verdict-crown">${opts.crown}</span>` : ''}
      ${opts.dotColor ? `<span class="member-dot" style="background:${opts.dotColor};color:${opts.dotColor};"></span>` : ''}
      <span class="member-name-label" ${opts.nameColor?`style="color:${opts.nameColor}"`:''}>${opts.name}</span>
      ${opts.role ? `<span class="role-badge" ${opts.roleColor?`style="color:${opts.roleColor}"`:''}>&mdash; ${opts.role}</span>` : ''}
      <span class="model-badge" ${opts.modelStyle?`style="${opts.modelStyle}"`:''}>${opts.model}</span>
      ${opts.badgeText ? `<span class="type-badge ${opts.badgeClass||''}">${opts.badgeText}</span>` : ''}
    </div>
    <div class="response-body streaming"></div>`;
  appendToOutput(card);
  return card.querySelector('.response-body');
}

/* ═══════════════════════════════════════════
   MAIN RUN
═══════════════════════════════════════════ */
async function runCouncil() {
  const prompt = document.getElementById('prompt').value.trim();
  if (!prompt) { showError('Please enter a question for the council.'); return; }

  const members = getMembers();
  if (!members.length) { showError('Add at least one council member.'); return; }

  if (currentMode === 'cloud' && !document.getElementById('api-key').value.trim()) {
    showError('Enter your Ollama API key for cloud mode.'); return;
  }

  clearOutput();
  const runBtn = document.getElementById('run-btn');
  runBtn.disabled = true;

  const rounds   = parseInt(document.getElementById('rounds').value) || 1;
  const synthVal = document.getElementById('synthesize').value;
  const combiner = getCombiner();
  const leader   = getLeader();
  const allNames = members.map(m => m.name);
  const allResponses = [];

  const memberSysPrompt = m => [
    m.role ? `You are ${m.name}. Your role: ${m.role}.` : `You are ${m.name}, a council member.`,
    allNames.filter(n => n !== m.name).length
      ? `Other council members present: ${allNames.filter(n => n !== m.name).join(', ')}.` : '',
    'Respond thoughtfully and concisely (2–4 paragraphs). Be direct, stay in character, and make your position clear.',
  ].filter(Boolean).join(' ');

  try {
    /* ── PHASE 1: COUNCIL DELIBERATION ── */
    for (let round = 1; round <= rounds; round++) {
      addRoundHeader(round, rounds);
      for (const m of members) {
        setStatus(`${m.name} is deliberating… (round ${round}/${rounds})`);
        const msgs = [{role:'system', content: memberSysPrompt(m)}];
        if (round === 1) {
          msgs.push({role:'user', content:`The question before the council:\n\n${prompt}`});
        } else {
          const priorText = allResponses
            .filter(r => r.round === round - 1)
            .map(r => `${r.member.name}:\n${r.text}`)
            .join('\n\n---\n\n');
          msgs.push({role:'user', content:`The question:\n${prompt}\n\nPrevious round:\n\n${priorText}\n\nNow give your refined position, acknowledging any arguments that shifted your view.`});
        }
        const bodyEl = createCard({dotColor: m.color, name: m.name, role: m.role, model: m.model});
        let text = '';
        try {
          text = await streamChat(m.model, msgs, t => { bodyEl.textContent = t; });
        } catch(e) {
          bodyEl.textContent = `[Error: ${e.message}]`;
          bodyEl.style.color = 'var(--red)';
        }
        bodyEl.classList.remove('streaming');
        allResponses.push({member: m, round, text});
      }
    }

    /* ── PHASE 2: BEST-PARTS COMBINER ── */
    let combinedText = '';
    if (combiner) {
      addSectionSep('combiner', '② Best-Parts Combiner');
      setStatus(`${combiner.name} is distilling the best from each perspective…`);

      const record = allResponses
        .filter(r => r.round === rounds)
        .map(r => `── ${r.member.name}${r.member.role ? ' (' + r.member.role + ')' : ''} ──\n${r.text}`)
        .join('\n\n');

      const sys = [
        `You are ${combiner.name}, an expert synthesizer and editor.`,
        combiner.role ? combiner.role + '.' : '',
        `Your task: read every council member's response and extract the single most valuable, unique insight or argument from each person.`,
        `Then weave these extracted strengths into ONE superior, cohesive response that is better than any individual answer.`,
        `Format your output as:`,
        `1. A brief one-paragraph intro.`,
        `2. The unified best-answer (thorough, well-structured, excellent — this is the main body).`,
        `3. A "Key Contributions" section listing what you distilled from each member (e.g. "From The Analyst: …").`,
        `Do not merely summarize. Combine the strongest parts into the best possible answer.`,
      ].filter(Boolean).join(' ');

      const bodyEl = createCard({
        cssClass:    'combiner-card',
        name:        combiner.name,
        role:        combiner.role || 'Best-Parts Combiner',
        roleColor:   '#408080',
        model:       combiner.model,
        modelStyle:  'border-color:#1a5055;color:#408080;',
        badgeClass:  'combine',
        badgeText:   'BEST PARTS',
      });

      try {
        combinedText = await streamChat(combiner.model, [
          {role:'system', content: sys},
          {role:'user',   content:`The question:\n\n${prompt}\n\n${'─'.repeat(50)}\nCOUNCIL RESPONSES:\n\n${record}\n${'─'.repeat(50)}\n\nNow produce the combined best-answer.`}
        ], t => { bodyEl.textContent = t; });
      } catch(e) {
        bodyEl.textContent = `[Error: ${e.message}]`;
        bodyEl.style.color = 'var(--red)';
      }
      bodyEl.classList.remove('streaming');
    }

    /* ── PHASE 3: SYNTHESIS ── */
    let synthText = '';
    if (synthVal) {
      addSectionSep('synthesis', '③ Synthesis');
      setStatus('Synthesizing the deliberation…');

      let sm;
      if      (synthVal === 'auto')            sm = members[Math.floor(Math.random() * members.length)];
      else if (synthVal.startsWith('member:')) sm = members[parseInt(synthVal.split(':')[1])] || members[0];

      if (sm) {
        const allText = allResponses
          .map(r => `${r.member.name}${r.member.role ? ' (' + r.member.role + ')' : ''} [Round ${r.round}]:\n${r.text}`)
          .join('\n\n---\n\n');

        const bodyEl = createCard({
          cssClass:   'synthesis-card',
          dotColor:   sm.color,
          name:       sm.name,
          role:       sm.role || 'Synthesizer',
          model:      sm.model,
          badgeClass: 'synth',
          badgeText:  'SYNTHESIS',
        });

        try {
          synthText = await streamChat(sm.model, [
            {role:'system', content:`You are ${sm.name}, synthesizing the council's deliberation. Identify key agreements, important tensions, and offer a balanced overall conclusion.`},
            {role:'user',   content:`Original question: ${prompt}\n\nCouncil deliberation:\n\n${allText}\n\nProvide a clear synthesis.`}
          ], t => { bodyEl.textContent = t; });
        } catch(e) {
          bodyEl.textContent = `[Error: ${e.message}]`;
          bodyEl.style.color = 'var(--red)';
        }
        bodyEl.classList.remove('streaming');
      }
    }

    /* ── PHASE 4: LEADER'S FINAL VERDICT ── */
    if (leader) {
      addSectionSep('verdict', '④ Final Verdict');
      setStatus(`${leader.name} is issuing the final verdict…`);

      const deliberationRecord = allResponses
        .map(r => `${r.member.name}${r.member.role ? ' (' + r.member.role + ')' : ''} [Round ${r.round}]:\n${r.text}`)
        .join('\n\n═══\n\n');

      const context = [
        `QUESTION BEFORE THE COUNCIL:\n${prompt}`,
        `${'═'.repeat(50)}`,
        `FULL DELIBERATION RECORD:\n\n${deliberationRecord}`,
        combinedText ? `${'═'.repeat(50)}\nBEST-PARTS COMBINED ANSWER (by ${combiner?.name || 'The Distiller'}):\n\n${combinedText}` : '',
        synthText    ? `${'═'.repeat(50)}\nSYNTHESIS:\n\n${synthText}` : '',
        `${'═'.repeat(50)}`,
        `Now issue your final verdict.`,
      ].filter(Boolean).join('\n\n');

      const leaderSys = [
        `You are ${leader.name}, the supreme leader and final arbiter of this council.`,
        leader.role ? `Your leadership style: ${leader.role}.` : '',
        `You have read every argument, the combined best-answer, and the synthesis. Issue a FINAL VERDICT structured exactly as:`,
        `RULING: [One authoritative sentence — your clear decision or recommendation.]`,
        `REASONING: [2–3 paragraphs: what arguments swayed you, what evidence you weighed, why this is the right call.]`,
        `DISSENT ACKNOWLEDGED: [One paragraph noting any strong opposing views you considered but chose to override, and why.]`,
        `THE PATH FORWARD: [Concrete next steps or implementation guidance.]`,
        `Be authoritative, clear, and final. The council defers to you.`,
      ].filter(Boolean).join(' ');

      const bodyEl = createCard({
        cssClass:    'verdict-card',
        crown:       '♛',
        name:        leader.name,
        nameColor:   '#d0a0f0',
        role:        leader.role,
        roleColor:   '#8050a0',
        model:       leader.model,
        modelStyle:  'border-color:var(--purple-dim);color:#8060a0;',
        badgeClass:  'verdict',
        badgeText:   'FINAL VERDICT',
      });

      try {
        await streamChat(leader.model, [
          {role:'system', content: leaderSys},
          {role:'user',   content: context}
        ], t => { bodyEl.textContent = t; });
      } catch(e) {
        bodyEl.textContent = `[Error: ${e.message}]`;
        bodyEl.style.color = 'var(--red)';
      }
      bodyEl.classList.remove('streaming');
    }

    setStatus(null);

  } catch(e) {
    setStatus(null);
    showError(e.message || 'Unknown error. Check your connection and API key.');
  }

  runBtn.disabled = false;
}

/* ═══════════════════════════════════════════
   BOOT
═══════════════════════════════════════════ */
init();

/* ═══════════════════════════════════════════
   CONFIGURATION FILE HANDLING
═══════════════════════════════════════════ */

function getConfigurationObject() {
    return {
        members: getMembers().map(m => ({ name: m.name, model: m.model, role: m.role })),
        combiner: getCombiner(),
        leader: getLeader(),
        settings: {
            rounds: document.getElementById('rounds').value,
            temperature: document.getElementById('temperature').value,
            synthesis: document.getElementById('synthesize').value,
        },
        connection: {
            mode: currentMode,
            apiKey: document.getElementById('api-key').value,
            localUrl: document.getElementById('ollama-url').value,
        }
    };
}

function exportConfig() {
  const config = getConfigurationObject();
  const jsonString = JSON.stringify(config, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `council-config-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importConfig() {
  document.getElementById('import-file-input').click();
}

function handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target.result);
      applyConfiguration(config);
    } catch (err) {
      showError(`Failed to load configuration: ${err.message}`);
    }
    // Reset file input value to allow loading the same file again
    event.target.value = '';
  };
  reader.readAsText(file);
}

function applyConfiguration(config) {
  if (!config) return;
  clearOutput();

  // Clear existing members
  const grid = document.getElementById('members-grid');
  grid.innerHTML = '';
  memberCount = 0; // Reset counter

  // Load members
  if (config.members && Array.isArray(config.members)) {
    config.members.forEach(addMember);
  }

  // Load combiner
  const combinerEnabled = document.getElementById('combiner-enabled');
  if (config.combiner) {
    combinerEnabled.checked = true;
    document.getElementById('combiner-name').value = config.combiner.name || '';
    document.getElementById('combiner-model').value = config.combiner.model || '';
    document.getElementById('combiner-role').value = config.combiner.role || '';
  } else {
    combinerEnabled.checked = false;
  }
  combinerEnabled.dispatchEvent(new Event('change'));

  // Load leader
  const leaderEnabled = document.getElementById('leader-enabled');
  if (config.leader) {
    leaderEnabled.checked = true;
    document.getElementById('leader-name').value = config.leader.name || '';
    document.getElementById('leader-model').value = config.leader.model || '';
    document.getElementById('leader-role').value = config.leader.role || '';
  } else {
    leaderEnabled.checked = false;
  }
  leaderEnabled.dispatchEvent(new Event('change'));

  // Load settings
  if (config.settings) {
    document.getElementById('rounds').value = config.settings.rounds || '1';
    document.getElementById('temperature').value = config.settings.temperature || '0.7';
    document.getElementById('synthesize').value = config.settings.synthesis || '';
  }

  // Load connection and save to local storage
  if (config.connection) {
    setMode(config.connection.mode || 'local');
    document.getElementById('api-key').value = config.connection.apiKey || '';
    document.getElementById('ollama-url').value = config.connection.localUrl || 'http://localhost:11434';
    localStorage.setItem(LS_KEYS.API_KEY, config.connection.apiKey || '');
    localStorage.setItem(LS_KEYS.LOCAL_URL, config.connection.localUrl || 'http://localhost:11434');
    pingOllama();
  }

  const statusArea = document.getElementById('error-area');
  statusArea.innerHTML = `<div class="error-msg" style="border-color:var(--green);background:rgba(74,153,112,.1);color:#7fcc9b;">✓ Configuration loaded successfully.</div>`;
  setTimeout(() => { statusArea.innerHTML = ''; }, 4000);
}