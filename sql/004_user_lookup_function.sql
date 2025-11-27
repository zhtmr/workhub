-- Sprint 7: 이메일로 사용자 ID 조회 함수
-- 팀 멤버 초대 시 이메일로 사용자를 찾기 위해 필요

-- 이메일로 user_id 조회하는 함수
CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM auth.users WHERE email = user_email LIMIT 1
$$;

-- 함수에 대한 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_user_id_by_email(TEXT) TO authenticated;
