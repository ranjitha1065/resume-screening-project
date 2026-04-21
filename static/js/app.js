// =============================================
// SUPABASE CONFIGURATION
// =============================================
const SUPABASE_URL  = 'https://jsevjlihlnkpkbvhvmnw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzZXZqbGlobG5rcGtidmh2bW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTA1MDksImV4cCI6MjA5MjMyNjUwOX0.69mCTQk_r6iduxkpAY7ivX-vCnNXyM7jbPD0qocIa6Y';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// =============================================
// DOM REFERENCES
// =============================================
const authOverlay   = document.getElementById('auth-overlay');
const mainApp       = document.getElementById('main-app');
const authError     = document.getElementById('auth-error');
const userEmailEl   = document.getElementById('user-email-display');

const dropZone      = document.getElementById('drop-zone');
const fileInput     = document.getElementById('file-input');
const resultsPanel  = document.getElementById('results-panel');
const loadingState  = document.getElementById('loading-state');
const successState  = document.getElementById('success-state');

let currentUser = null;
let realtimeChannel = null;
let roleChartInstance = null;
let skillChartInstance = null;

// =============================================
// AUTH — STATE LISTENER
// =============================================
sb.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
        currentUser = session.user;
        authOverlay.classList.add('hidden');
        mainApp.classList.remove('hidden');
        userEmailEl.textContent = currentUser.email;
        subscribeToRealtime();
    } else {
        currentUser = null;
        authOverlay.classList.remove('hidden');
        mainApp.classList.add('hidden');
        if (realtimeChannel) sb.removeChannel(realtimeChannel);
    }
});

// =============================================
// AUTH — SWITCH TABS
// =============================================
function switchAuthTab(tab) {
    document.getElementById('form-login').classList.add('hidden');
    document.getElementById('form-signup').classList.add('hidden');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-signup').classList.remove('active');
    authError.classList.add('hidden');

    if (tab === 'login') {
        document.getElementById('form-login').classList.remove('hidden');
        document.getElementById('tab-login').classList.add('active');
    } else {
        document.getElementById('form-signup').classList.remove('hidden');
        document.getElementById('tab-signup').classList.add('active');
    }
}

// =============================================
// AUTH — LOGIN
// =============================================
async function handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');

    btn.disabled = true;
    btn.innerHTML = '<span>Signing in...</span>';

    const { error } = await sb.auth.signInWithPassword({ email, password });

    btn.disabled = false;
    btn.innerHTML = '<span>Sign In</span><i class="fa-solid fa-arrow-right"></i>';

    if (error) {
        authError.textContent = error.message;
        authError.classList.remove('hidden');
    }
}

// =============================================
// AUTH — SIGNUP
// =============================================
async function handleSignup(e) {
    e.preventDefault();
    const email    = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const btn      = document.getElementById('signup-btn');

    btn.disabled = true;
    btn.innerHTML = '<span>Creating account...</span>';

    const { error } = await sb.auth.signUp({ email, password });

    btn.disabled = false;
    btn.innerHTML = '<span>Create Account</span><i class="fa-solid fa-user-plus"></i>';

    if (error) {
        authError.textContent = error.message;
        authError.classList.remove('hidden');
    } else {
        authError.style.color = '#27ae60';
        authError.textContent = 'Account created! Check your email to verify, then sign in.';
        authError.classList.remove('hidden');
    }
}

// =============================================
// AUTH — LOGOUT
// =============================================
async function handleLogout() {
    await sb.auth.signOut();
}

// =============================================
// NAVIGATION
// =============================================
function switchView(view, navEl) {
    document.querySelectorAll('.workspace').forEach(w => w.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`view-${view}`).classList.remove('hidden');
    navEl.classList.add('active');

    if (view === 'history') loadHistory();
    if (view === 'analytics') loadAnalytics();
}

// =============================================
// DRAG & DROP
// =============================================
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => {
    if (e.target.files.length) handleFileUpload(e.target.files[0]);
});

// =============================================
// FILE UPLOAD
// =============================================
async function handleFileUpload(file) {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
        showToast('Only PDF or DOCX files are supported.', 'error'); return;
    }

    resultsPanel.style.display = 'block';
    loadingState.style.display = 'block';
    successState.style.display = 'none';

    const formData = new FormData();
    formData.append('resume', file);

    try {
        const resp = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await resp.json();
        loadingState.style.display = 'none';

        if (data.error) { showToast(data.error, 'error'); resultsPanel.style.display = 'none'; return; }

        displayResults(data);
        await saveToSupabase(data);

    } catch (err) {
        loadingState.style.display = 'none';
        showToast('Server error. Make sure Flask is running.', 'error');
    }
}

// =============================================
// DISPLAY RESULTS
// =============================================
function displayResults(data) {
    successState.style.display = 'block';

    document.getElementById('predicted-role').textContent   = data.predicted_role;
    document.getElementById('confidence-score').textContent = `${data.confidence}% Match Confidence`;
    document.getElementById('filename-display').textContent = `📄 ${data.filename}`;

    const fill = document.getElementById('confidence-fill');
    fill.style.width = '0%';
    setTimeout(() => { fill.style.width = `${data.confidence}%`; }, 100);

    if      (data.confidence > 80) fill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
    else if (data.confidence > 50) fill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
    else                           fill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';

    const cloud = document.getElementById('skills-cloud');
    cloud.innerHTML = '';
    if (data.skills && data.skills.length) {
        document.getElementById('no-skills').style.display = 'none';
        data.skills.forEach((skill, i) => {
            const span = document.createElement('span');
            span.className = 'skill-tag';
            span.textContent = skill;
            span.style.animationDelay = `${i * 0.05}s`;
            cloud.appendChild(span);
        });
    } else {
        document.getElementById('no-skills').style.display = 'block';
    }
}

// =============================================
// SAVE TO SUPABASE
// =============================================
async function saveToSupabase(data) {
    if (!currentUser) return;
    const { error } = await sb.from('resumes').insert({
        user_id       : currentUser.id,
        filename      : data.filename,
        predicted_role: data.predicted_role,
        confidence    : data.confidence,
        skills        : data.skills
    });
    if (error) console.error('Supabase save error:', error.message);
    else showToast('Result saved to cloud!', 'success');
}

// =============================================
// LOAD HISTORY
// =============================================
async function loadHistory() {
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#b07fa0;">Loading...</td></tr>';

    const { data, error } = await sb
        .from('resumes')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">${error.message}</td></tr>`;
        return;
    }

    renderHistory(data);
}

function renderHistory(rows) {
    const tbody = document.getElementById('history-body');
    tbody.innerHTML = '';

    if (!rows || !rows.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#b07fa0;">No history yet. Upload a resume to get started.</td></tr>';
        return;
    }

    rows.forEach(row => {
        const skills = Array.isArray(row.skills) ? row.skills : [];
        const tags   = skills.slice(0, 3).map(s => `<span class="skill-tag" style="padding:0.2rem 0.6rem;font-size:0.75rem;">${s}</span>`).join('');
        const more   = skills.length > 3 ? `<span style="font-size:0.75rem;color:#b07fa0;"> +${skills.length - 3}</span>` : '';
        const time   = new Date(row.created_at).toLocaleString('en-IN', { hour12:true, dateStyle:'short', timeStyle:'short' });

        const tr = document.createElement('tr');
        tr.style.animation = 'slideUp 0.3s ease both';
        tr.innerHTML = `
            <td><i class="fa-solid fa-file" style="color:var(--accent);margin-right:0.4rem;"></i>${row.filename}</td>
            <td style="font-weight:600;color:var(--accent);">${row.predicted_role}</td>
            <td>${row.confidence}%</td>
            <td style="display:flex;flex-wrap:wrap;gap:0.3rem;align-items:center;">${tags}${more}</td>
            <td style="color:var(--text-muted);font-size:0.82rem;">${time}</td>
        `;
        tbody.appendChild(tr);
    });
}

// =============================================
// REALTIME SUBSCRIPTION
// =============================================
function subscribeToRealtime() {
    if (realtimeChannel) sb.removeChannel(realtimeChannel);

    realtimeChannel = sb
        .channel('public:resumes')
        .on('postgres_changes', {
            event : 'INSERT',
            schema: 'public',
            table : 'resumes',
            filter: `user_id=eq.${currentUser.id}`
        }, payload => {
            // If history view is visible, prepend the new row instantly
            const historyView = document.getElementById('view-history');
            if (!historyView.classList.contains('hidden')) {
                prependHistoryRow(payload.new);
            }
        })
        .subscribe();
}

function prependHistoryRow(row) {
    const tbody  = document.getElementById('history-body');
    const noData = tbody.querySelector('td[colspan]');
    if (noData) tbody.innerHTML = '';

    const skills = Array.isArray(row.skills) ? row.skills : [];
    const tags   = skills.slice(0, 3).map(s => `<span class="skill-tag" style="padding:0.2rem 0.6rem;font-size:0.75rem;">${s}</span>`).join('');
    const more   = skills.length > 3 ? `<span style="font-size:0.75rem;color:#b07fa0;"> +${skills.length - 3}</span>` : '';
    const time   = new Date(row.created_at).toLocaleString('en-IN', { hour12:true, dateStyle:'short', timeStyle:'short' });

    const tr = document.createElement('tr');
    tr.style.animation = 'slideUp 0.4s ease both';
    tr.style.background = 'rgba(233,30,140,0.04)';
    tr.innerHTML = `
        <td><i class="fa-solid fa-file" style="color:var(--accent);margin-right:0.4rem;"></i>${row.filename}</td>
        <td style="font-weight:600;color:var(--accent);">${row.predicted_role}</td>
        <td>${row.confidence}%</td>
        <td style="display:flex;flex-wrap:wrap;gap:0.3rem;align-items:center;">${tags}${more}</td>
        <td style="color:var(--text-muted);font-size:0.82rem;">${time}</td>
    `;
    tbody.insertBefore(tr, tbody.firstChild);
}

// =============================================
// ANALYTICS
// =============================================
async function loadAnalytics() {
    const { data, error } = await sb
        .from('resumes')
        .select('*')
        .eq('user_id', currentUser.id);

    if (error || !data) return;

    // Stats
    document.getElementById('stat-total').textContent = data.length;
    const avgConf = data.length ? (data.reduce((s, r) => s + (r.confidence || 0), 0) / data.length).toFixed(1) : 0;
    document.getElementById('stat-avg').textContent = `${avgConf}%`;

    const allSkills = new Set(data.flatMap(r => Array.isArray(r.skills) ? r.skills : []));
    document.getElementById('stat-skills').textContent = allSkills.size;

    // Role Chart
    const roleCounts = {};
    data.forEach(r => { roleCounts[r.predicted_role] = (roleCounts[r.predicted_role] || 0) + 1; });
    renderRoleChart(roleCounts);

    // Skill Chart
    const skillCounts = {};
    data.forEach(r => {
        (Array.isArray(r.skills) ? r.skills : []).forEach(s => {
            skillCounts[s] = (skillCounts[s] || 0) + 1;
        });
    });
    const topSkills = Object.entries(skillCounts).sort((a,b) => b[1]-a[1]).slice(0, 8);
    renderSkillChart(topSkills);
}

function renderRoleChart(roleCounts) {
    const ctx = document.getElementById('roleChart').getContext('2d');
    if (roleChartInstance) roleChartInstance.destroy();

    const palette = ['#e91e8c','#ff6eb4','#f48fb1','#f8bbd0','#fce4ec','#c2185b','#ad1457','#880e4f'];

    roleChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels  : Object.keys(roleCounts),
            datasets: [{ data: Object.values(roleCounts), backgroundColor: palette, borderWidth: 0 }]
        },
        options: {
            animation: { duration: 800, easing: 'easeInOutQuart' },
            plugins: { legend: { position: 'bottom', labels: { color: '#6b3a5e', padding: 16 } } }
        }
    });
}

function renderSkillChart(topSkills) {
    const ctx = document.getElementById('skillChart').getContext('2d');
    if (skillChartInstance) skillChartInstance.destroy();

    skillChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels  : topSkills.map(s => s[0]),
            datasets: [{
                label          : 'Occurrences',
                data           : topSkills.map(s => s[1]),
                backgroundColor: 'rgba(233,30,140,0.3)',
                borderColor    : 'rgba(233,30,140,0.8)',
                borderWidth    : 1.5,
                borderRadius   : 6
            }]
        },
        options: {
            animation: { duration: 900, easing: 'easeInOutQuart' },
            plugins : { legend: { display: false } },
            scales  : {
                x: { ticks: { color: '#6b3a5e' }, grid: { display: false } },
                y: { ticks: { color: '#6b3a5e' }, beginAtZero: true, grid: { color: 'rgba(233,30,140,0.06)' } }
            }
        }
    });
}

// =============================================
// TOAST
// =============================================
function showToast(msg, type = 'error') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className   = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 4000);
}
