// ── NAVBAR SCROLL EFFECT ──
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  nav.classList.toggle('scrolled', window.scrollY > 40);
  updateActiveLink();
});

// ── ACTIVE NAV LINK ON SCROLL ──
function updateActiveLink() {
  const sections = ['home', 'about', 'services', 'contact'];
  const scrollY = window.scrollY + 100;

  sections.forEach(id => {
    const section = document.getElementById(id);
    const link = document.querySelector(`.nav-link[href="#${id}"]`);
    if (!section || !link) return;

    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;

    if (scrollY >= top && scrollY < bottom) {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }
  });
}

// ── SMOOTH SCROLL FOR NAV LINKS ──
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ── REVEAL ON SCROLL (Intersection Observer) ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, i * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── MOBILE HAMBURGER ──
function toggleMenu() {
  const menu = document.getElementById('mobile-menu');
  const btn  = document.getElementById('hamburger');
  menu.classList.toggle('open');
  btn.classList.toggle('open');
}

function closeMobileMenu() {
  document.getElementById('mobile-menu').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
}

// ── MODAL OPEN / CLOSE ──
function openModal() {
  document.getElementById('modal').classList.add('open');
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ── TAB SWITCHER ──
function switchTab(tab) {
  document.getElementById('login-section').classList.toggle('active', tab === 'login');
  document.getElementById('signup-section').classList.toggle('active', tab === 'signup');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
}

// ── PASSWORD TOGGLE ──
function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon  = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'ti ti-eye';
    icon.style.color = 'rgba(255,255,255,0.8)';
  } else {
    input.type = 'password';
    icon.className = 'ti ti-lock';
    icon.style.color = 'rgba(255,255,255,0.5)';
  }
}

// ── ROLE SELECTOR ──
const ROLE_LABELS = {
  'citizen':      'Citizen',
  'authority':    'Authority',
  'field-worker': 'Field Worker'
};

let selectedRole = null;

function selectRole(btn) {
  btn.closest('.role-grid')
     .querySelectorAll('.role-btn')
     .forEach(b => {
       b.classList.remove('selected');
       b.setAttribute('aria-checked', 'false');
     });
  btn.classList.add('selected');
  btn.setAttribute('aria-checked', 'true');
  selectedRole = btn.dataset.role;
}

// ── LOGIN & REGISTRATION (real accounts, stored in Supabase) ──
const SESSION_KEY  = 'civicai_user';      // small cache of who is logged in (name, role) for the app
const REMEMBER_KEY = 'civicai_remember';  // "Remember me": pre-fills your email + role next time
const PERSIST_FLAG = 'civicai_persist';   // read by supabase-init.js: keep the login after the browser closes?

// Login-page role  ->  role stored in the database / used inside the app
const APP_ROLE = {
  'citizen':      'citizen',
  'authority':    'admin',
  'field-worker': 'worker'
};
// ...and back again (for messages)
const LOGIN_ROLE_OF = { citizen: 'citizen', admin: 'authority', worker: 'field-worker' };

function db() {
  if (!window.civicSupabase) {
    alert('The website is not connected to its database yet.\n\nOpen config.js and paste your Supabase URL and key (see SETUP.md).');
    return null;
  }
  return window.civicSupabase;
}

function friendlyError(err) {
  const m = String((err && err.message) || err || '');
  if (/already registered|already been registered/i.test(m)) return 'An account with this email already exists. Please login.';
  if (/invalid login credentials/i.test(m)) return 'Incorrect email or password. Please try again.';
  if (/email not confirmed/i.test(m)) return 'Please confirm your email first (check your inbox), then login.';
  if (/rate limit|too many/i.test(m)) return 'Too many attempts. Please wait a few minutes and try again.';
  if (/password.*(at least|short)/i.test(m)) return 'Password must be at least 6 characters.';
  if (/failed to fetch|network/i.test(m)) return 'Could not reach the server. Check your internet connection.';
  return m || 'Something went wrong. Please try again.';
}

function setBusy(form, busy) {
  const btn = form && form.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = busy;
  btn.style.opacity = busy ? '0.7' : '';
}

// Where to keep the little "who am I" cache: same place as the real login
function cacheStore(remember) { return remember ? localStorage : sessionStorage; }

// ── LOGIN HANDLER ──
async function handleLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const form = document.getElementById('login-form');
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) {
    alert('Please fill in all fields.');
    return;
  }
  if (!selectedRole) {
    alert('Please choose how you want to login: Citizen, Authority or Field Worker.');
    return;
  }
  const client = db();
  if (!client) return;

  const remember = document.getElementById('remember-me').checked;
  setBusy(form, true);
  try {
    // Must be set BEFORE signing in so the login is saved in the right place
    localStorage.setItem(PERSIST_FLAG, remember ? '1' : '0');

    const { data, error } = await client.auth.signInWithPassword({ email: email, password: pass });
    if (error) { alert(friendlyError(error)); return; }

    const { data: prof, error: profErr } = await client
      .from('profiles').select('full_name, phone, role, pending_role').eq('id', data.user.id).single();
    if (profErr || !prof) {
      await client.auth.signOut();
      alert('Could not load your account details. Please try again.');
      return;
    }

    const wanted = APP_ROLE[selectedRole];
    if (prof.role !== wanted) {
      await client.auth.signOut();
      if (prof.pending_role === wanted) {
        alert('Your ' + ROLE_LABELS[selectedRole] + ' access is still waiting for admin approval.\n\nUntil then you can login as Citizen.');
      } else {
        const actual = LOGIN_ROLE_OF[prof.role];
        alert('This account is registered as ' + ROLE_LABELS[actual] + '. Please select "' + ROLE_LABELS[actual] + '" to login.');
      }
      return;
    }

    // Success: remember who is logged in, then open the app
    const user = { id: data.user.id, name: prof.full_name, email: email, phone: prof.phone, role: wanted };
    cacheStore(remember).setItem(SESSION_KEY, JSON.stringify(user));
    cacheStore(!remember).removeItem(SESSION_KEY);
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: email, role: selectedRole }));
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    window.location.href = 'app.html';
  } catch (err) {
    alert(friendlyError(err));
  } finally {
    setBusy(form, false);
  }
}

// ── SIGNUP HANDLER ──
async function handleSignup(e) {
  if (e && e.preventDefault) e.preventDefault();
  const form = document.getElementById('signup-form');
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const phone = document.getElementById('reg-phone').value.trim();
  const role  = document.getElementById('reg-role').value;
  const pass  = document.getElementById('reg-pass').value;
  if (!name || !email || !phone || !role || !pass) {
    alert('Please fill in all fields.');
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  if (phone.replace(/\D/g, '').length < 10) {
    alert('Please enter a valid mobile number.');
    return;
  }
  if (pass.length < 6) {
    alert('Password must be at least 6 characters.');
    return;
  }
  const client = db();
  if (!client) return;

  setBusy(form, true);
  try {
    const { data, error } = await client.auth.signUp({
      email: email,
      password: pass,
      // Only a REQUEST: the database starts everyone as a Citizen and an admin approves the rest
      options: { data: { full_name: name, phone: phone, requested_role: APP_ROLE[role] } }
    });
    if (error) {
      alert(friendlyError(error));
      if (/already/i.test(String(error.message))) {
        switchTab('login');
        document.getElementById('login-email').value = email;
      }
      return;
    }
    // Supabase hides "email already exists" by returning a user with no identities
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      alert('An account with this email already exists. Please login.');
      switchTab('login');
      document.getElementById('login-email').value = email;
      return;
    }
    if (data.session) await client.auth.signOut();   // they log in explicitly next

    let msg = 'Account created! Welcome to Civic Pulse, ' + name + '!';
    if (!data.session) msg += '\n\nWe sent a confirmation email. Please confirm it before logging in.';
    else msg += ' Please login to continue.';
    if (role !== 'citizen') {
      msg += '\n\nYour ' + ROLE_LABELS[role] + ' access must be approved by an admin. Until then you can login as Citizen.';
    }
    alert(msg);
    ['reg-name', 'reg-email', 'reg-phone', 'reg-pass'].forEach(function (id) { document.getElementById(id).value = ''; });
    document.getElementById('reg-role').value = '';
    switchTab('login');
    document.getElementById('login-email').value = email;
    document.getElementById('login-pass').value = '';
  } catch (err) {
    alert(friendlyError(err));
  } finally {
    setBusy(form, false);
  }
}

// ── CONTACT FORM ──
function handleContact(e) {
  e.preventDefault();
  alert('Message sent! We will get back to you soon.');
  e.target.reset();
}

// ── REMEMBER ME: pre-fill the login form + show "Open App" when already signed in ──
(function restoreLogin() {
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY));
    if (saved && saved.email) {
      document.getElementById('login-email').value = saved.email;
      document.getElementById('remember-me').checked = true;
      const btn = document.querySelector('.role-btn[data-role="' + saved.role + '"]');
      if (btn) selectRole(btn);
    }
  } catch (e) { /* ignore */ }

  // Already logged in? Then the Login buttons become "Open App".
  if (!window.civicSupabase) return;
  window.civicSupabase.auth.getSession().then(function (res) {
    if (!(res && res.data && res.data.session)) return;
    const openApp = function (ev) { ev.preventDefault(); window.location.href = 'app.html'; };
    document.querySelectorAll('.nav-login-btn, .mobile-login-btn').forEach(function (a) {
      a.textContent = 'Open App';
      a.onclick = openApp;
    });
  }).catch(function () { /* ignore */ });
})();
