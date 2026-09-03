# 🎂 정대현 교수님 생신 축하 방명록

교수님의 생신을 축하하는 메시지를 남길 수 있는 온라인 방명록입니다.

- 정적 사이트 (HTML / CSS / JavaScript)
- 메시지 저장: [Supabase](https://supabase.com) (무료)
- 배포: [Vercel](https://vercel.com)

---

## 1️⃣ Supabase 설정 (약 5분)

1. https://supabase.com 접속 → **Start your project** → GitHub 계정으로 가입/로그인
2. **New project** 클릭
   - Name: `happy-birthday` (아무 이름이나 OK)
   - Database Password: 아무 비밀번호나 설정 (기억 안 해도 됨)
   - Region: `Northeast Asia (Seoul)` 선택
3. 프로젝트가 생성되면 왼쪽 메뉴에서 **SQL Editor** 클릭 → 아래 SQL을 붙여넣고 **Run**:

```sql
create table messages (
  id bigint generated always as identity primary key,
  name text not null,
  message text not null,
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "누구나 읽기 가능" on messages
  for select using (true);

create policy "누구나 작성 가능" on messages
  for insert with check (
    char_length(name) between 1 and 20
    and char_length(message) between 1 and 500
  );

-- 실시간 갱신용 (다른 사람 메시지가 바로 보이게)
alter publication supabase_realtime add table messages;
```

4. 왼쪽 메뉴 **Project Settings (톱니바퀴) → API** 에서 두 값을 복사:
   - **Project URL** (예: `https://xxxx.supabase.co`)
   - **anon / public 키** (긴 문자열)
5. 이 저장소의 `app.js` 파일 맨 위에 붙여넣기:

```js
const SUPABASE_URL = "https://xxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...(복사한 키)";
```

> 💡 anon 키는 공개되어도 괜찮도록 설계된 키입니다. 위 SQL의 보안 정책(RLS) 때문에 방문자는 메시지 읽기/쓰기만 가능하고 수정·삭제는 할 수 없습니다.

### 🔧 이미 테이블을 만든 경우 (추가 SQL)

관리자 삭제 기능과 "교수님만 보이기" 기능을 위해 **SQL Editor**에서 아래를 한 번 실행해 주세요:

```sql
-- "교수님만 보이기" 공개 범위 컬럼
alter table messages add column if not exists is_private boolean not null default false;

-- 로그인한 관리자만 메시지를 삭제할 수 있게 허용
create policy "관리자만 삭제 가능" on messages
  for delete to authenticated using (true);
```

### 👤 관리자 계정 만들기 (부적절한 댓글 삭제용)

1. Supabase 대시보드 왼쪽 메뉴 **Authentication → Users → Add user → Create new user**
2. 본인이 쓸 이메일과 비밀번호를 입력하고 **Auto Confirm User** 체크 후 생성
3. 사이트 맨 아래 푸터의 흐릿한 **"관리자"** 글자를 클릭 → 방금 만든 이메일/비밀번호로 로그인
4. 로그인하면 각 메시지에 ✕ 삭제 버튼이 나타납니다

### 🔑 교수님 로그인

- 푸터의 **"🔑 교수님 로그인"** 버튼 → 아이디 `정대현`, 비밀번호 `0905`
- 로그인하면 "🔒 교수님만 보이기"로 남겨진 메시지도 함께 보입니다
- 아이디/비밀번호는 `app.js`의 `PROFESSOR_HASH` 값으로 저장되어 있어요 (파일 안 주석에 바꾸는 방법 있음)

> ⚠️ "교수님만 보이기"는 화면에서 숨기는 기능이라, 개발 도구를 다룰 줄 아는 사람은 데이터를 직접 조회할 수 있습니다. 아주 민감한 내용은 남기지 않는 것을 권장해요.

## 2️⃣ Vercel 배포 (약 3분)

1. https://vercel.com 접속 → GitHub 계정으로 로그인
2. **Add New → Project** 클릭
3. `min577/Happy-Birthday` 저장소 **Import**
4. 설정은 그대로 두고 **Deploy** 클릭
5. 완료되면 `https://happy-birthday-xxxx.vercel.app` 주소가 생깁니다. 이 링크를 사람들에게 공유하면 끝! 🎉

이후 GitHub에 새로 push 할 때마다 Vercel이 자동으로 다시 배포합니다.

## 파일 구성

| 파일 | 설명 |
|---|---|
| `index.html` | 페이지 구조 |
| `style.css` | 디자인 (따뜻한 파스텔 톤) |
| `app.js` | 방명록 로직 + Supabase 연결 설정 |
