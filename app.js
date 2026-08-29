// ============================================================
// Supabase 설정
// README.md의 안내에 따라 Supabase 프로젝트를 만든 뒤,
// 아래 두 값을 본인 프로젝트의 값으로 바꿔 주세요.
// (anon key는 공개되어도 괜찮도록 설계된 키입니다)
// ============================================================
const SUPABASE_URL = "여기에_SUPABASE_URL_붙여넣기";
const SUPABASE_ANON_KEY = "여기에_SUPABASE_ANON_KEY_붙여넣기";

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

let supabase = null;

// ------------------------------------------------------------
// 저장소: Supabase가 설정되어 있으면 Supabase,
// 아니면 임시로 브라우저 localStorage를 사용합니다.
// ------------------------------------------------------------
const store = {
  async fetchAll() {
    if (isConfigured) {
      const { data, error } = await supabase
        .from("messages")
        .select("id, name, message, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
    return JSON.parse(localStorage.getItem("guestbook") || "[]");
  },

  async add(name, message) {
    if (isConfigured) {
      const { error } = await supabase.from("messages").insert({ name, message });
      if (error) throw error;
      return;
    }
    const list = JSON.parse(localStorage.getItem("guestbook") || "[]");
    list.unshift({
      id: Date.now(),
      name,
      message,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem("guestbook", JSON.stringify(list));
  },
};

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function renderMessages(messages) {
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
    messagesList.appendChild(card);
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

  submitBtn.disabled = true;
  setStatus("마음을 전달하는 중이에요... 💌", "");

  try {
    await store.add(name, message);
    form.reset();
    charCurrent.textContent = "0";
    setStatus("축하 메시지가 전달되었어요! 감사합니다 🎉", "success");
    await loadMessages();
    setTimeout(() => setStatus("", ""), 4000);
  } catch (err) {
    console.error("메시지 저장 실패:", err);
    setStatus("메시지를 남기지 못했어요. 잠시 후 다시 시도해 주세요 🙏", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

async function init() {
  if (isConfigured) {
    const { createClient } = await import(
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
    );
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 다른 사람이 메시지를 남기면 실시간으로 목록을 갱신
    supabase
      .channel("guestbook-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
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
