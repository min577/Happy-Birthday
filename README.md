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
