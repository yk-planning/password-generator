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

  // 強度プリセット: 使用する文字種と推奨の最小長
  const LEVELS = {
    low:    { lower: true, upper: false, digits: true, symbols: false, ambiguous: true,  minLength: 8 },
    medium: { lower: true, upper: true,  digits: true, symbols: false, ambiguous: true,  minLength: 12 },
    high:   { lower: true, upper: true,  digits: true, symbols: true,  ambiguous: false, minLength: 16 },
    max:    { lower: true, upper: true,  digits: true, symbols: true,  ambiguous: false, minLength: 32 },
  };

  // 画面に出す文言（<html lang> で切り替える）
  const TEXT = {
    ja: {
      levels: {
        low: { name: "低", desc: "小文字と数字のみの簡易的なパスワードです。一時的な利用や重要度の低いサービス向けで、大切なアカウントには不向きです。" },
        medium: { name: "中", desc: "大文字・小文字・数字を組み合わせたパスワードです。記号が使えないサービスにおすすめです。" },
        high: { name: "高（おすすめ）", desc: "大文字・小文字・数字・記号をすべて使った強力なパスワードです。メール・SNS・ネットショップなど一般的なサービスに最適です。" },
        max: { name: "最高", desc: "32文字以上の非常に強力なパスワードです。ネットバンキングや管理者アカウント、Wi-Fiなど特に重要な用途に。" },
      },
      strength: ["弱い", "普通", "強い", "とても強い", "非常に強い"],
      levelTitle: (name) => `強度：${name}`,
      custom: "カスタム",
      customDesc: "詳細設定で選んだ文字の種類と長さから強度を判定しています。",
      none: "未選択",
      chars: (n) => `${n}種類`,
      bits: (n) => `約${n}ビット`,
      empty: "文字の種類を1つ以上選択してください",
      copy: "コピー",
      copied: "コピー済み",
      copyLabel: (pw) => `パスワード ${pw} をコピー`,
      time: {
        instant: "一瞬",
        sec: (n) => `約${n}秒`, min: (n) => `約${n}分`, hour: (n) => `約${n}時間`, day: (n) => `約${n}日`,
        years: [[1, 1e4, "約{n}年"], [1e4, 1e8, "約{n}万年"], [1e8, 1e12, "約{n}億年"]],
        beyond: "1兆年以上",
      },
    },
    en: {
      levels: {
        low: { name: "Low", desc: "Lowercase letters and numbers only. Fine for temporary or low-importance accounts, but not for anything that matters." },
        medium: { name: "Medium", desc: "A mix of uppercase, lowercase and numbers. Ideal for services that don't allow symbols." },
        high: { name: "High (recommended)", desc: "Uses uppercase, lowercase, numbers and symbols. The best choice for email, social media, online shopping and most other services." },
        max: { name: "Maximum", desc: "A very strong password of 32+ characters. For online banking, admin accounts, Wi-Fi keys and other critical uses." },
      },
      strength: ["Weak", "Fair", "Strong", "Very strong", "Extremely strong"],
      levelTitle: (name) => `Strength: ${name}`,
      custom: "Custom",
      customDesc: "Strength is calculated from the character types and length you selected in Advanced settings.",
      none: "None selected",
      chars: (n) => `${n} characters`,
      bits: (n) => `~${n} bits`,
      empty: "Please select at least one character type.",
      copy: "Copy",
      copied: "Copied",
      copyLabel: (pw) => `Copy password ${pw}`,
      time: {
        instant: "Instantly",
        sec: (n) => `~${n} seconds`, min: (n) => `~${n} minutes`, hour: (n) => `~${n} hours`, day: (n) => `~${n} days`,
        years: [[1, 1e6, "~{n} years"], [1e6, 1e9, "~{n} million years"], [1e9, 1e12, "~{n} billion years"]],
        beyond: "Over 1 trillion years",
      },
    },
  };
  const lang = document.documentElement.lang.startsWith("en") ? "en" : "ja";
  const T = TEXT[lang];

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
    if (bits < 40) return { label: T.strength[0], color: "#b8435a", pct: 15 };
    if (bits < 60) return { label: T.strength[1], color: "#a5621a", pct: 40 };
    if (bits < 80) return { label: T.strength[2], color: "#23845f", pct: 65 };
    if (bits < 128) return { label: T.strength[3], color: "#1f7bb0", pct: 85 };
    return { label: T.strength[4], color: "#5468d4", pct: 100 };
  }

  // 平均で鍵空間の半分を探索すると仮定した解読時間
  function crackTime(bits) {
    const sec = Math.pow(2, bits - 1) / GUESSES_PER_SECOND;
    const year = 365 * 24 * 3600;
    const t = T.time;
    if (sec < 1) return t.instant;
    if (sec < 60) return t.sec(Math.round(sec));
    if (sec < 3600) return t.min(Math.round(sec / 60));
    if (sec < 86400) return t.hour(Math.round(sec / 3600));
    if (sec < year) return t.day(Math.round(sec / 86400));
    const y = sec / year;
    for (const [unit, below, format] of t.years) {
      if (y < below) return format.replace("{n}", Math.round(y / unit).toLocaleString("en-US"));
    }
    return t.beyond;
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
      btn.textContent = T.copy;
      btn.setAttribute("aria-label", T.copyLabel(pw));
      btn.addEventListener("click", () => copy(pw, btn));
      li.append(code, btn);
      return li;
    }));
  }

  function renderStrength(sets, length) {
    const level = T.levels[currentLevel];
    el.strengthLevel.textContent = T.levelTitle(level ? level.name : T.custom);
    el.strengthDesc.textContent = level ? level.desc : T.customDesc;

    if (sets.length === 0) {
      el.strengthBadge.textContent = T.none;
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
    el.statChars.textContent = T.chars(poolSize);
    el.statBits.textContent = T.bits(bits);
    el.statTime.textContent = crackTime(bits);
  }

  function render() {
    const sets = selectedSets();
    const length = Math.max(clampLength(el.length.value), sets.length);
    renderStrength(sets, length);

    if (sets.length === 0) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = T.empty;
      el.results.replaceChildren(li);
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
    btn.textContent = T.copied;
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = T.copy;
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
