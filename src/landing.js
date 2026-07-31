import { signInUser, signUpUser } from './auth.js';

export function initLandingPage() {
  const authModal = document.getElementById('auth-modal');
  const openAuthBtns = document.querySelectorAll('.js-open-auth');
  const closeAuthBtn = document.getElementById('close-auth-modal');
  const authTabs = document.querySelectorAll('.auth-tab-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const authErrorMsg = document.getElementById('auth-error-msg');
  const authSuccessMsg = document.getElementById('auth-success-msg');

  // 모달 열기
  openAuthBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = btn.getAttribute('data-tab') || 'login';
      switchTab(targetTab);
      openModal();
    });
  });

  // 모달 닫기
  if (closeAuthBtn) {
    closeAuthBtn.addEventListener('click', closeModal);
  }

  // 모달 외부 클릭 시 닫기
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        closeModal();
      }
    });
  }

  // 탭 전환
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.getAttribute('data-mode');
      switchTab(mode);
    });
  });

  function openModal() {
    clearMessages();
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    authModal.classList.remove('active');
    document.body.style.overflow = '';
    clearMessages();
  }

  function switchTab(mode) {
    clearMessages();
    authTabs.forEach(t => {
      if (t.getAttribute('data-mode') === mode) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    if (mode === 'login') {
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    } else {
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    }
  }

  function clearMessages() {
    if (authErrorMsg) {
      authErrorMsg.textContent = '';
      authErrorMsg.style.display = 'none';
    }
    if (authSuccessMsg) {
      authSuccessMsg.textContent = '';
      authSuccessMsg.style.display = 'none';
    }
  }

  function showError(msg) {
    if (authErrorMsg) {
      authErrorMsg.textContent = msg;
      authErrorMsg.style.display = 'block';
    }
    if (authSuccessMsg) {
      authSuccessMsg.style.display = 'none';
    }
  }

  function showSuccess(msg) {
    if (authSuccessMsg) {
      authSuccessMsg.textContent = msg;
      authSuccessMsg.style.display = 'block';
    }
    if (authErrorMsg) {
      authErrorMsg.style.display = 'none';
    }
  }

  // 로그인 폼 제출
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessages();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = '로그인 중...';

        await signInUser({ email, password });
        showSuccess('로그인되었습니다! 견적서로 이동합니다...');
        setTimeout(() => {
          closeModal();
        }, 1000);
      } catch (err) {
        showError(err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  // 회원가입 폼 제출
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessages();
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const passwordConfirm = document.getElementById('reg-password-confirm').value;

      if (password !== passwordConfirm) {
        showError('비밀번호가 일치하지 않습니다.');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = '가입 처리 중...';

        const data = await signUpUser({ email, password, name });
        
        // Supabase에서 이메일 승인이 켜진 경우 session이 바로 생기지 않을 수 있으므로 안내
        if (data.session) {
          showSuccess('회원가입 및 로그인에 성공했습니다! 이동 중...');
          setTimeout(() => {
            closeModal();
          }, 1000);
        } else {
          showSuccess('회원가입이 완료되었습니다! 입력하신 이메일 승인 후 로그인하시거나 바로 로그인해 주세요.');
          setTimeout(() => {
            switchTab('login');
          }, 2000);
        }
      } catch (err) {
        showError(err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
}
