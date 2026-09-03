// ============================================================
// Supabase 설정
// README.md의 안내에 따라 Supabase 프로젝트를 만든 뒤,
// 아래 두 값을 본인 프로젝트의 값으로 바꿔 주세요.
// (anon key는 공개되어도 괜찮도록 설계된 키입니다)
// ============================================================
const SUPABASE_URL = "https://aawjtrfezuioggawaxnk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-I1ljYnuNYupO4ZXf1SIPQ_Lajl7wEC";

const isConfigured =
  SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 20;

const form = document.getElementById("message-form");
const nameInput = document.getElementById("name-input");
const messageInput = document.getElementById("message-input");
const submitBtn = document.getElementById("submit-btn");
const formStatus = document.getElementById("form-status");
const messagesList = document.getElementById("messages-list");
const messageCount = document.getElementById("message-count");
const charCurrent = document.getElementById("char-current");
const adminLink = document.getElementById("admin-link");
const adminModal = document.getElementById("admin-modal");
const adminForm = document.getElementById("admin-form");
const adminEmail = document.getElementById("admin-email");
const adminPassword = document.getElementById("admin-password");
const adminError = document.getElementById("admin-error");
const adminCancel = document.getElementById("admin-cancel");
const adminSubmit = document.getElementById("admin-submit");
const professorLink = document.getElementById("professor-link");
const professorModal = document.getElementById("professor-modal");
const professorForm = document.getElementById("professor-form");
const professorId = document.getElementById("professor-id");
const professorPassword = document.getElementById("professor-password");
const professorError = document.getElementById("professor-error");
const professorCancel = document.getElementById("professor-cancel");
const professorSubmit = document.getElementById("professor-submit");

let supabase = null;
let isAdmin = false;
let isProfessor = localStorage.getItem("professorMode") === "1";
let cachedMessages = [];

// 교수님 로그인 정보는 소스에 그대로 노출되지 않도록 해시로만 저장합니다.
// (아이디/비밀번호를 바꾸려면 브라우저 콘솔에서 아래를 실행해 나온 값으로 교체:
//  crypto.subtle.digest("SHA-256", new TextEncoder().encode("아이디|비밀번호"))
//    .then(h => console.log([...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join(""))) )
const PROFESSOR_HASH =
  "877eb1848c583d9d7db757750480d7ebde5b98ec878a88bf62d491a0ee01239d";

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ------------------------------------------------------------
// 저장소: Supabase가 설정되어 있으면 Supabase,
// 아니면 임시로 브라우저 localStorage를 사용합니다.
// ------------------------------------------------------------
const store = {
  async fetchAll() {
    // 교수님/관리자 모드가 아니면 "모두에게 보이기" 메시지만 가져옵니다.
    const showPrivate = isProfessor || isAdmin;
    if (isConfigured) {
      let query = supabase
        .from("messages")
        .select("id, name, message, is_private, created_at")
        .order("created_at", { ascending: false });
      if (!showPrivate) query = query.eq("is_private", false);
      let { data, error } = await query;
      // is_private 컬럼이 아직 없으면(README의 추가 SQL 실행 전) 기존 방식으로 동작
      if (error && error.code === "42703") {
        ({ data, error } = await supabase
          .from("messages")
          .select("id, name, message, created_at")
          .order("created_at", { ascending: false }));
      }
      if (error) throw error;
      return data;
    }
    const list = JSON.parse(localStorage.getItem("guestbook") || "[]");
    return showPrivate ? list : list.filter((m) => !m.is_private);
  },

  async add(name, message, isPrivate) {
    if (isConfigured) {
      let { error } = await supabase
        .from("messages")
        .insert({ name, message, is_private: isPrivate });
      // is_private 컬럼이 아직 없으면 공개 메시지만 기존 방식으로 저장
      // (비공개 메시지가 실수로 공개되지 않도록, 비공개 선택 시에는 실패 처리)
      if (error && (error.code === "PGRST204" || error.code === "42703") && !isPrivate) {
        ({ error } = await supabase.from("messages").insert({ name, message }));
      }
      if (error) throw error;
      return;
    }
    const list = JSON.parse(localStorage.getItem("guestbook") || "[]");
    list.unshift({
      id: Date.now(),
      name,
      message,
      is_private: isPrivate,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem("guestbook", JSON.stringify(list));
  },

  async remove(id) {
    if (isConfigured) {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw error;
      return;
    }
    const list = JSON.parse(localStorage.getItem("guestbook") || "[]");
    localStorage.setItem(
      "guestbook",
      JSON.stringify(list.filter((m) => m.id !== id))
    );
  },
};

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function renderMessages(messages) {
  cachedMessages = messages;
  messagesList.innerHTML = "";
  messageCount.textContent = messages.length > 0 ? String(messages.length) : "";

  if (messages.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-text";
    empty.textContent = "아직 메시지가 없어요. 첫 번째 축하 메시지를 남겨 주세요! 🌷";
    messagesList.appendChild(empty);
    return;
  }

  for (const msg of messages) {
    const card = document.createElement("article");
    card.className = "message-card";

    if (msg.is_private) {
      card.classList.add("private-card");
      const badge = document.createElement("span");
      badge.className = "private-badge";
      badge.textContent = "🔒 교수님만 보는 메시지";
      card.appendChild(badge);
    }

    const text = document.createElement("p");
    text.className = "message-text";
    text.textContent = msg.message;

    const meta = document.createElement("div");
    meta.className = "message-meta";

    const name = document.createElement("span");
    name.className = "message-name";
    name.textContent = msg.name;

    const date = document.createElement("span");
    date.className = "message-date";
    date.textContent = formatDate(msg.created_at);

    meta.append(name, date);
    card.append(text, meta);

    if (isAdmin) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "msg-delete";
      del.textContent = "✕";
      del.title = "이 메시지 삭제";
      del.addEventListener("click", () => deleteMessage(msg));
      card.appendChild(del);
    }

    messagesList.appendChild(card);
  }
}

async function deleteMessage(msg) {
  const ok = confirm(
    `"${msg.name}"님의 메시지를 삭제할까요?\n\n${msg.message.slice(0, 60)}${
      msg.message.length > 60 ? "..." : ""
    }`
  );
  if (!ok) return;

  try {
    await store.remove(msg.id);
    await loadMessages();
  } catch (err) {
    console.error("메시지 삭제 실패:", err);
    alert("삭제하지 못했어요. 관리자 로그인이 유효한지 확인해 주세요.");
  }
}

async function loadMessages() {
  try {
    const messages = await store.fetchAll();
    renderMessages(messages);
  } catch (err) {
    console.error("메시지 불러오기 실패:", err);
    messagesList.innerHTML =
      '<p class="empty-text">메시지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요 🙏</p>';
  }
}

function setStatus(text, type) {
  formStatus.textContent = text;
  formStatus.className = `form-status ${type || ""}`;
}

messageInput.addEventListener("input", () => {
  charCurrent.textContent = String(messageInput.value.length);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();
  if (!name || !message) {
    setStatus("이름과 메시지를 모두 적어 주세요!", "error");
    return;
  }

  const isPrivate =
    form.querySelector('input[name="visibility"]:checked')?.value === "private";

  submitBtn.disabled = true;
  setStatus("마음을 전달하는 중이에요... 💌", "");

  try {
    await store.add(name, message, isPrivate);
    form.reset();
    charCurrent.textContent = "0";
    setStatus(
      isPrivate
        ? "교수님께만 보이는 메시지로 전달되었어요! 🔒💝"
        : "축하 메시지가 전달되었어요! 감사합니다 🎉",
      "success"
    );
    await loadMessages();
    setTimeout(() => setStatus("", ""), 4000);
  } catch (err) {
    console.error("메시지 저장 실패:", err);
    setStatus("메시지를 남기지 못했어요. 잠시 후 다시 시도해 주세요 🙏", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ------------------------------------------------------------
// 관리자 모드
// 푸터의 잘 안 보이는 "관리자" 링크로 로그인하면
// 각 메시지에 삭제 버튼이 나타납니다.
// ------------------------------------------------------------
function setAdminMode(on) {
  isAdmin = on;
  document.body.classList.toggle("admin-mode", on);
  adminLink.textContent = on ? "관리자 모드 종료" : "관리자";
}

function openAdminModal() {
  adminError.textContent = "";
  adminForm.reset();
  adminModal.hidden = false;
  adminEmail.focus();
}

function closeAdminModal() {
  adminModal.hidden = true;
}

adminLink.addEventListener("click", async () => {
  if (isAdmin) {
    if (isConfigured) await supabase.auth.signOut();
    setAdminMode(false);
    await loadMessages();
    return;
  }
  if (isConfigured) {
    openAdminModal();
  } else {
    // Supabase 미설정(localStorage) 모드에서는 본인 브라우저 데이터만 지우므로 바로 켭니다.
    setAdminMode(true);
    await loadMessages();
  }
});

adminCancel.addEventListener("click", closeAdminModal);
adminModal.addEventListener("click", (e) => {
  if (e.target === adminModal) closeAdminModal();
});

adminForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  adminSubmit.disabled = true;
  adminError.textContent = "";

  const { error } = await supabase.auth.signInWithPassword({
    email: adminEmail.value.trim(),
    password: adminPassword.value,
  });

  adminSubmit.disabled = false;

  if (error) {
    adminError.textContent = "이메일 또는 비밀번호가 올바르지 않아요.";
    return;
  }

  closeAdminModal();
  setAdminMode(true);
  await loadMessages();
});

// ------------------------------------------------------------
// 교수님 모드
// 교수님이 로그인하면 "교수님만 보이기" 메시지도 함께 보입니다.
// ------------------------------------------------------------
function setProfessorMode(on) {
  isProfessor = on;
  document.body.classList.toggle("professor-mode", on);
  professorLink.textContent = on ? "👋 교수님 로그아웃" : "🔑 교수님 로그인";
  if (on) localStorage.setItem("professorMode", "1");
  else localStorage.removeItem("professorMode");
}

professorLink.addEventListener("click", async () => {
  if (isProfessor) {
    setProfessorMode(false);
    await loadMessages();
    return;
  }
  professorError.textContent = "";
  professorForm.reset();
  professorModal.hidden = false;
  professorId.focus();
});

professorCancel.addEventListener("click", () => {
  professorModal.hidden = true;
});
professorModal.addEventListener("click", (e) => {
  if (e.target === professorModal) professorModal.hidden = true;
});

professorForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  professorSubmit.disabled = true;
  professorError.textContent = "";

  const hash = await sha256Hex(
    `${professorId.value.trim()}|${professorPassword.value}`
  );

  professorSubmit.disabled = false;

  if (hash !== PROFESSOR_HASH) {
    professorError.textContent = "아이디 또는 비밀번호가 올바르지 않아요.";
    return;
  }

  professorModal.hidden = true;
  setProfessorMode(true);
  await loadMessages();
});

async function init() {
  // 이전에 교수님으로 로그인했다면 유지
  if (isProfessor) setProfessorMode(true);

  if (isConfigured) {
    const { createClient } = await import(
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
    );
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 이전에 관리자로 로그인했다면 세션을 복원
    const { data } = await supabase.auth.getSession();
    if (data.session) setAdminMode(true);

    // 메시지가 등록/삭제되면 실시간으로 목록을 갱신
    supabase
      .channel("guestbook-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => loadMessages()
      )
      .subscribe();
  } else {
    console.warn(
      "Supabase가 아직 설정되지 않아 브라우저에만 저장됩니다. app.js 상단의 SUPABASE_URL / SUPABASE_ANON_KEY를 채워 주세요."
    );
  }

  await loadMessages();
}

init();
