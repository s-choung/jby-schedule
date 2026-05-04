import { supabase } from './supabase-client.js';

let currentUser = null;
let onAuthChange = null;

const EMAIL_SUFFIX = '@jby-schedule.app';

export function getUser() {
  return currentUser;
}

export function setAuthChangeCallback(cb) {
  onAuthChange = cb;
}

export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user ?? null;

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    if (onAuthChange) onAuthChange(currentUser);
  });

  return currentUser;
}

export async function signUp(username, password) {
  const email = username.toLowerCase() + EMAIL_SUFFIX;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: username.toLowerCase() } },
  });
  if (error) throw error;
  return data.user;
}

export async function signIn(username, password) {
  const email = username.toLowerCase() + EMAIL_SUFFIX;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function resetPassword(username, answer, newPassword) {
  const { data, error } = await supabase.rpc('reset_password', {
    p_username: username.toLowerCase(),
    p_answer: answer,
    p_new_password: newPassword,
  });
  if (error) throw error;
  if (!data) throw new Error('ID 또는 답변이 올바르지 않습니다.');
  return true;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  currentUser = null;
}

export function renderAuthModal(container) {
  container.innerHTML = `
    <div class="auth-overlay">
      <div class="auth-modal">
        <h2 id="authTitle">로그인</h2>
        <form id="authForm">
          <label class="auth-field">
            <span>아이디</span>
            <input id="authUsername" type="text" placeholder="아이디 입력" required autocomplete="username" />
          </label>
          <label class="auth-field">
            <span>비밀번호</span>
            <input id="authPassword" type="password" placeholder="6자 이상" minlength="6" required />
          </label>
          <label class="auth-field auth-confirm-field" style="display:none">
            <span>비밀번호 확인</span>
            <input id="authPasswordConfirm" type="password" placeholder="비밀번호 재입력" minlength="6" />
          </label>
          <div class="auth-recovery" style="display:none">
            <label class="auth-field">
              <span>정석현의 생일은? (MMDD)</span>
              <input id="authAnswer" type="text" placeholder="0000" maxlength="4" pattern="[0-9]{4}" />
            </label>
            <label class="auth-field">
              <span>새 비밀번호</span>
              <input id="authNewPassword" type="password" placeholder="새 비밀번호 (6자 이상)" minlength="6" />
            </label>
          </div>
          <p id="authError" class="auth-error"></p>
          <div class="auth-buttons">
            <button type="submit" class="primary-btn" id="authSubmitBtn">로그인</button>
          </div>
          <p class="auth-toggle">
            <span id="authToggleText">계정이 없으신가요?</span>
            <button type="button" id="authToggleBtn" class="ghost-btn">회원가입</button>
            <span class="auth-sep">|</span>
            <button type="button" id="authRecoveryBtn" class="ghost-btn">비밀번호 찾기</button>
          </p>
        </form>
      </div>
    </div>
  `;

  let mode = 'login'; // 'login' | 'signup' | 'recovery'
  const form = container.querySelector('#authForm');
  const title = container.querySelector('#authTitle');
  const usernameInput = container.querySelector('#authUsername');
  const passwordInput = container.querySelector('#authPassword');
  const confirmInput = container.querySelector('#authPasswordConfirm');
  const confirmField = container.querySelector('.auth-confirm-field');
  const recoverySection = container.querySelector('.auth-recovery');
  const answerInput = container.querySelector('#authAnswer');
  const newPasswordInput = container.querySelector('#authNewPassword');
  const errorEl = container.querySelector('#authError');
  const submitBtn = container.querySelector('#authSubmitBtn');
  const toggleBtn = container.querySelector('#authToggleBtn');
  const toggleText = container.querySelector('#authToggleText');
  const recoveryBtn = container.querySelector('#authRecoveryBtn');

  function setMode(m) {
    mode = m;
    errorEl.textContent = '';
    errorEl.style.color = '';
    confirmField.style.display = mode === 'signup' ? '' : 'none';
    recoverySection.style.display = mode === 'recovery' ? '' : 'none';
    passwordInput.parentElement.style.display = mode === 'recovery' ? 'none' : '';

    if (mode === 'login') {
      title.textContent = '로그인';
      submitBtn.textContent = '로그인';
      toggleText.textContent = '계정이 없으신가요?';
      toggleBtn.textContent = '회원가입';
      recoveryBtn.style.display = '';
    } else if (mode === 'signup') {
      title.textContent = '회원가입';
      submitBtn.textContent = '가입하기';
      toggleText.textContent = '이미 계정이 있으신가요?';
      toggleBtn.textContent = '로그인';
      recoveryBtn.style.display = '';
    } else {
      title.textContent = '비밀번호 찾기';
      submitBtn.textContent = '비밀번호 재설정';
      toggleText.textContent = '';
      toggleBtn.textContent = '로그인으로 돌아가기';
      recoveryBtn.style.display = 'none';
    }
  }

  toggleBtn.addEventListener('click', () => {
    if (mode === 'recovery') setMode('login');
    else setMode(mode === 'login' ? 'signup' : 'login');
  });

  recoveryBtn.addEventListener('click', () => setMode('recovery'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    errorEl.style.color = '';
    submitBtn.disabled = true;

    const username = usernameInput.value.trim();

    try {
      if (mode === 'login') {
        await signIn(username, passwordInput.value);
      } else if (mode === 'signup') {
        if (passwordInput.value !== confirmInput.value) {
          throw new Error('비밀번호가 일치하지 않습니다.');
        }
        await signUp(username, passwordInput.value);
        errorEl.style.color = '#22c55e';
        errorEl.textContent = '가입 완료! 자동 로그인됩니다.';
      } else {
        await resetPassword(username, answerInput.value, newPasswordInput.value);
        errorEl.style.color = '#22c55e';
        errorEl.textContent = '비밀번호가 변경되었습니다. 로그인해주세요.';
        setTimeout(() => setMode('login'), 1500);
      }
    } catch (err) {
      errorEl.style.color = '';
      errorEl.textContent = err.message;
    }

    submitBtn.disabled = false;
  });
}

export function removeAuthModal(container) {
  container.innerHTML = '';
}
