(() => {
  "use strict";

  const COUNT = 8;
  const GUESSES_PER_SECOND = 1e10;

  const CHARSETS = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{};:,.<>/?~|",
  };
  const AMBIGUOUS = "0Oo1lI|";

  // 強度プリセット: 使用する文字種・推奨の最小長・説明文
  const LEVELS = {
    low: {
      name: "低", lower: true, upper: false, digits: true, symbols: false, ambiguous: true, minLength: 8,
      desc: "小文字と数字のみの簡易的なパスワードです。一時的な利用や重要度の低いサービス向けで、大切なアカウントには不向きです。",
    },
    medium: {
      name: "中", lower: true, upper: true, digits: true, symbols: false, ambiguous: true, minLength: 12,
      desc: "大文字・小文字・数字を組み合わせたパスワードです。記号が使えないサービスにおすすめです。",
    },
    high: {
      name: "高（おすすめ）", lower: true, upper: true, digits: true, symbols: true, ambiguous: false, minLength: 16,
      desc: "大文字・小文字・数字・記号をすべて使った強力なパスワードです。メール・SNS・ネットショップなど一般的なサービスに最適です。",
    },
    max: {
      name: "最高", lower: true, upper: true, digits: true, symbols: true, ambiguous: false, minLength: 32,
      desc: "32文字以上の非常に強力なパスワードです。ネットバンキングや管理者アカウント、Wi-Fiなど特に重要な用途に。",
    },
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    results: $("results"),
    length: $("length"),
    lengthNumber: $("length-number"),
    lengthValue: $("length-value"),
    strengthBox: $("strength-box"),
    strengthLevel: $("strength-level"),
    strengthBadge: $("strength-badge"),
    strengthDesc: $("strength-desc"),
    meterFill: $("meter-fill"),
    statChars: $("stat-chars"),
    statBits: $("stat-bits"),
    statTime: $("stat-time"),
    generate: $("generate"),
    year: $("year"),
    lower: $("opt-lower"),
    upper: $("opt-upper"),
    digits: $("opt-digits"),
    symbols: $("opt-symbols"),
    ambiguous: $("opt-ambiguous"),
  };

  let currentLevel = "high";

  // 0 <= n < max の暗号論的に安全な乱数（剰余バイアスを避けるため棄却法を使う）
  function randomInt(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    do {
      crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return buf[0] % max;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function selectedSets() {
    const strip = (s) => el.ambiguous.checked ? [...s].filter((c) => !AMBIGUOUS.includes(c)).join("") : s;
    return ["lower", "upper", "digits", "symbols"]
      .filter((key) => el[key].checked)
      .map((key) => strip(CHARSETS[key]));
  }

  function generate(length, sets) {
    const pool = sets.join("");
    // 選択した各文字種を最低1文字ずつ含める
    const chars = sets.map((s) => s[randomInt(s.length)]);
    while (chars.length < length) chars.push(pool[randomInt(pool.length)]);
    return shuffle(chars).join("");
  }

  function strengthOf(bits) {
    if (bits < 40) return { label: "弱い", color: "#b8435a", pct: 15 };
    if (bits < 60) return { label: "普通", color: "#a5621a", pct: 40 };
    if (bits < 80) return { label: "強い", color: "#23845f", pct: 65 };
    if (bits < 128) return { label: "とても強い", color: "#1f7bb0", pct: 85 };
    return { label: "非常に強い", color: "#5468d4", pct: 100 };
  }

  // 平均で鍵空間の半分を探索すると仮定した解読時間
  function crackTime(bits) {
    const sec = Math.pow(2, bits - 1) / GUESSES_PER_SECOND;
    const year = 365 * 24 * 3600;
    if (sec < 1) return "一瞬";
    if (sec < 60) return `約${Math.round(sec)}秒`;
    if (sec < 3600) return `約${Math.round(sec / 60)}分`;
    if (sec < 86400) return `約${Math.round(sec / 3600)}時間`;
    if (sec < year) return `約${Math.round(sec / 86400)}日`;
    const y = sec / year;
    if (y < 1e4) return `約${Math.round(y).toLocaleString()}年`;
    if (y < 1e8) return `約${Math.round(y / 1e4).toLocaleString()}万年`;
    if (y < 1e12) return `約${Math.round(y / 1e8).toLocaleString()}億年`;
    return "1兆年以上";
  }

  function clampLength(v) {
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return 16;
    return Math.min(128, Math.max(4, n));
  }

  function setLength(v) {
    const n = clampLength(v);
    el.length.value = n;
    el.lengthNumber.value = n;
    el.lengthValue.textContent = n;
    document.querySelectorAll("[data-length]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(Number(btn.dataset.length) === n));
    });
  }

  function renderResults(passwords) {
    el.results.replaceChildren(...passwords.map((pw) => {
      const li = document.createElement("li");
      const code = document.createElement("code");
      code.textContent = pw;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "コピー";
      btn.setAttribute("aria-label", `パスワード ${pw} をコピー`);
      btn.addEventListener("click", () => copy(pw, btn));
      li.append(code, btn);
      return li;
    }));
  }

  function renderStrength(sets, length) {
    const level = LEVELS[currentLevel];
    el.strengthLevel.textContent = level ? `強度：${level.name}` : "強度：カスタム";
    el.strengthDesc.textContent = level
      ? level.desc
      : "詳細設定で選んだ文字の種類と長さから強度を判定しています。";

    if (sets.length === 0) {
      el.strengthBadge.textContent = "未選択";
      el.strengthBox.style.setProperty("--level-color", "#b8435a");
      el.meterFill.style.width = "0";
      el.statChars.textContent = "—";
      el.statBits.textContent = "—";
      el.statTime.textContent = "—";
      return;
    }

    const poolSize = new Set(sets.join("")).size;
    const bits = Math.round(length * Math.log2(poolSize));
    const s = strengthOf(bits);
    el.strengthBadge.textContent = s.label;
    el.strengthBox.style.setProperty("--level-color", s.color);
    el.meterFill.style.width = s.pct + "%";
    el.statChars.textContent = `${poolSize}種類`;
    el.statBits.textContent = `約${bits}ビット`;
    el.statTime.textContent = crackTime(bits);
  }

  function render() {
    const sets = selectedSets();
    const length = Math.max(clampLength(el.length.value), sets.length);
    renderStrength(sets, length);

    if (sets.length === 0) {
      el.results.innerHTML = '<li class="empty">文字の種類を1つ以上選択してください</li>';
      return;
    }
    renderResults(Array.from({ length: COUNT }, () => generate(length, sets)));
  }

  async function copy(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    btn.textContent = "コピー済み";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "コピー";
      btn.classList.remove("copied");
    }, 1500);
  }

  function applyLevel(name) {
    const level = LEVELS[name];
    currentLevel = name;
    for (const key of ["lower", "upper", "digits", "symbols", "ambiguous"]) {
      el[key].checked = level[key];
    }
    if (clampLength(el.length.value) < level.minLength) setLength(level.minLength);
  }

  function clearLevel() {
    currentLevel = null;
    document.querySelectorAll('input[name="level"]').forEach((r) => { r.checked = false; });
  }

  el.length.addEventListener("input", () => { setLength(el.length.value); render(); });
  el.lengthNumber.addEventListener("change", () => { setLength(el.lengthNumber.value); render(); });
  document.querySelectorAll("[data-length]").forEach((btn) => {
    btn.addEventListener("click", () => { setLength(btn.dataset.length); render(); });
  });

  document.querySelectorAll('input[name="level"]').forEach((radio) => {
    radio.addEventListener("change", () => { applyLevel(radio.value); render(); });
  });

  ["lower", "upper", "digits", "symbols", "ambiguous"].forEach((key) => {
    el[key].addEventListener("change", () => { clearLevel(); render(); });
  });

  el.generate.addEventListener("click", render);
  el.year.textContent = new Date().getFullYear();

  setLength(el.length.value);
  applyLevel("high");
  render();
})();
