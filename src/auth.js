import { supabase } from './supabaseClient.js';

/**
 * Supabase Auth: 신규 회원가입
 * @param {Object} params
 * @param {string} params.email - 사용자 이메일
 * @param {string} params.password - 사용자 비밀번호
 * @param {string} params.name - 사용자 이름 또는 업체명
 */
export async function signUpUser({ email, password, name }) {
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
    throw new Error(error.message || '회원가입 처리 중 오류가 발생했습니다.');
  }

  return data;
}

/**
 * Supabase Auth: 로그인
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 */
export async function signInUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
  }

  return data;
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
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Get session error:', error.message);
    return null;
  }
  return data.session;
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
