import { supabase } from './supabaseClient.js';

/**
 * 에러 메시지 한글화 및 상세 콘솔 로깅
 */
function handleAuthError(error, defaultMsg) {
  if (!error) return;
  console.error('Supabase Auth Raw Error:', error);
  const msg = error.message || error.toString() || '';

  if (msg.includes('Failed to fetch') || msg.includes('fetch failed') || msg.includes('NetworkError') || error.name === 'TypeError') {
    throw new Error(`Supabase 서버 연결에 실패했습니다. (원인: ${msg}) 브라우저 콘솔 및 서버 주소를 확인해주세요.`);
  }
  if (msg.includes('User already registered') || msg.includes('already exists')) {
    throw new Error('이미 등록된 이메일 주소입니다. 로그인해 주세요.');
  }
  if (msg.includes('Invalid login credentials')) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }
  throw new Error(msg || defaultMsg);
}

/**
 * Supabase Auth: 신규 회원가입
 * @param {Object} params
 * @param {string} params.email - 사용자 이메일
 * @param {string} params.password - 사용자 비밀번호
 * @param {string} params.name - 사용자 이름 또는 업체명
 */
export async function signUpUser({ email, password, name }) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
        },
      },
    });

    if (error) {
      handleAuthError(error, '회원가입 처리 중 오류가 발생했습니다.');
    }

    return data;
  } catch (err) {
    handleAuthError(err, '회원가입 처리 중 오류가 발생했습니다.');
  }
}

/**
 * Supabase Auth: 로그인
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 */
export async function signInUser({ email, password }) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      handleAuthError(error, '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    }

    return data;
  } catch (err) {
    handleAuthError(err, '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
  }
}

/**
 * Supabase Auth: 로그아웃
 */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign out error:', error.message);
  }
}

/**
 * 현재 세션 조회
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Get session error:', error.message);
      return null;
    }
    return data.session;
  } catch (e) {
    console.error('Get session catch error:', e);
    return null;
  }
}

/**
 * 현재 사용자 객체 반환
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  
  const user = session.user;
  return {
    id: user.id,
    email: user.email,
    displayName: user.user_metadata?.display_name || user.email.split('@')[0],
  };
}

/**
 * 인증 상태 변경 감지 리스너
 * @param {function(event, session): void} callback 
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
