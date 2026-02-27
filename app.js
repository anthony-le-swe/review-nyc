const STORAGE_KEY = "excheck_reviews";
const AUTH_STORAGE_KEY = "excheck_auth_reports";

const sampleData = [
  {
    id: crypto.randomUUID(),
    name: "N.Q. Anh",
    location: "Hà Nội",
    startYear: 2020,
    endYear: 2022,
    sentiment: "neutral",
    score: 3,
    proof: "Ảnh check-in có timestamp + đoạn chat xác nhận kỷ niệm 1 năm.",
    proofUrl: "https://example.com/proof/anh",
    review: "Giao tiếp ban đầu ổn nhưng dần ít chia sẻ. Không có xung đột lớn.",
    negativeEvidence: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "T.M. Khoa",
    location: "Đà Nẵng",
    startYear: 2019,
    endYear: 2021,
    sentiment: "positive",
    score: 4,
    proof: "Ảnh du lịch chung + lịch sử chuyển khoản đặt phòng khách sạn.",
    proofUrl: "https://example.com/proof/khoa",
    review: "Tôn trọng ranh giới, cư xử tử tế. Chia tay văn minh.",
    negativeEvidence: "",
    createdAt: new Date().toISOString(),
  },
];

const sampleAuthReports = [
  {
    id: crypto.randomUUID(),
    platform: "facebook",
    displayName: "M.Khang",
    profileUrl: "https://facebook.com/khang.profile",
    normalizedProfileUrl: "https://facebook.com/khang.profile",
    verdict: "real",
    confidence: 4,
    reason: "Có tương tác lâu năm với bạn bè thật, ảnh cá nhân nhất quán theo thời gian.",
    evidenceUrl: "https://example.com/evidence/khang",
    upvotes: 3,
    downvotes: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    platform: "instagram",
    displayName: "linh.28",
    profileUrl: "https://instagram.com/linh.28",
    normalizedProfileUrl: "https://instagram.com/linh.28",
    verdict: "fake",
    confidence: 4,
    reason: "Ảnh đại diện trùng nguồn mạng, follower bất thường và chỉ nhắn tin xin tiền.",
    evidenceUrl: "https://example.com/evidence/linh28",
    upvotes: 5,
    downvotes: 1,
    createdAt: new Date().toISOString(),
  },
];

const form = document.querySelector("#reviewForm");
const formMessage = document.querySelector("#formMessage");
const sentimentSelect = document.querySelector("#sentimentSelect");
const negativeEvidenceWrap = document.querySelector("#negativeEvidenceWrap");
const searchInput = document.querySelector("#searchInput");
const filterSentiment = document.querySelector("#filterSentiment");
const reviewList = document.querySelector("#reviewList");
const stats = document.querySelector("#stats");
const reviewItemTemplate = document.querySelector("#reviewItemTemplate");

const authForm = document.querySelector("#authForm");
const authMessage = document.querySelector("#authMessage");
const authSearchInput = document.querySelector("#authSearchInput");
const authFilterVerdict = document.querySelector("#authFilterVerdict");
const authSummary = document.querySelector("#authSummary");
const authReportList = document.querySelector("#authReportList");
const authItemTemplate = document.querySelector("#authItemTemplate");

let reviews = loadData(STORAGE_KEY, sampleData);
let authReports = loadData(AUTH_STORAGE_KEY, sampleAuthReports);

function loadData(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReviews() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

function saveAuthReports() {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authReports));
}

function sentimentLabel(sentiment) {
  return {
    positive: "Tích cực",
    neutral: "Trung lập",
    negative: "Tiêu cực",
  }[sentiment];
}

function verdictLabel(verdict) {
  return {
    real: "Nick real",
    fake: "Nick fake",
    unclear: "Chưa rõ",
  }[verdict];
}

function platformLabel(platform) {
  return platform === "facebook" ? "Facebook" : "Instagram";
}

function sentimentClass(sentiment) {
  return `pill--${sentiment}`;
}

function normalizeProfileUrl(rawUrl) {
  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.replace("www.", "").toLowerCase();
    const path = url.pathname.replace(/\/$/, "");

    return `${url.protocol}//${host}${path}`.toLowerCase();
  } catch {
    return "";
  }
}

function renderStats(currentList) {
  const total = currentList.length;
  const positive = currentList.filter((item) => item.sentiment === "positive").length;
  const neutral = currentList.filter((item) => item.sentiment === "neutral").length;
  const negative = currentList.filter((item) => item.sentiment === "negative").length;

  stats.innerHTML = `
    <span>Tổng: <strong>${total}</strong></span>
    <span>Tích cực: <strong>${positive}</strong></span>
    <span>Trung lập: <strong>${neutral}</strong></span>
    <span>Tiêu cực: <strong>${negative}</strong></span>
  `;
}

function renderList() {
  const q = searchInput.value.trim().toLowerCase();
  const sentimentFilter = filterSentiment.value;

  const filtered = reviews
    .filter((item) => {
      const matchKeyword =
        item.name.toLowerCase().includes(q) || item.location.toLowerCase().includes(q);
      const matchSentiment = sentimentFilter === "all" || item.sentiment === sentimentFilter;
      return matchKeyword && matchSentiment;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  reviewList.innerHTML = "";
  if (!filtered.length) {
    reviewList.innerHTML = "<li>Chưa có kết quả phù hợp.</li>";
    renderStats(filtered);
    return;
  }

  for (const item of filtered) {
    const node = reviewItemTemplate.content.cloneNode(true);
    node.querySelector(".review-name").textContent = item.name;

    const sentimentEl = node.querySelector(".review-sentiment");
    sentimentEl.textContent = sentimentLabel(item.sentiment);
    sentimentEl.classList.add(sentimentClass(item.sentiment));

    node.querySelector(
      ".review-meta"
    ).textContent = `${item.location} • Quen từ ${item.startYear} đến ${item.endYear}`;
    node.querySelector(".review-score").textContent = `Điểm tổng quan: ${item.score}/5`;
    node.querySelector(".review-body").textContent = item.review;
    node.querySelector(".review-proof").textContent = item.proof;

    const proofUrlEl = node.querySelector(".review-proof-url");
    proofUrlEl.href = item.proofUrl;

    const negativeEvidenceEl = node.querySelector(".review-negative");
    if (item.sentiment === "negative" && item.negativeEvidence) {
      negativeEvidenceEl.textContent = `Bằng chứng bổ sung: ${item.negativeEvidence}`;
      negativeEvidenceEl.classList.remove("hidden");
    }

    reviewList.appendChild(node);
  }

  renderStats(filtered);
}

function renderAuthSummary(currentList) {
  if (!authSearchInput.value.trim()) {
    authSummary.classList.add("empty");
    authSummary.textContent = "Chưa nhập link để tra cứu.";
    return;
  }

  if (!currentList.length) {
    authSummary.classList.remove("empty");
    authSummary.textContent = "Chưa có báo cáo cho link này.";
    return;
  }

  const real = currentList.filter((item) => item.verdict === "real").length;
  const fake = currentList.filter((item) => item.verdict === "fake").length;
  const unclear = currentList.filter((item) => item.verdict === "unclear").length;
  const total = currentList.length;

  const dominant = [
    { label: "Nick real", count: real },
    { label: "Nick fake", count: fake },
    { label: "Chưa rõ", count: unclear },
  ].sort((a, b) => b.count - a.count)[0];

  authSummary.classList.remove("empty");
  authSummary.innerHTML = `
    <strong>Kết quả tổng hợp:</strong> ${dominant.label} (${dominant.count}/${total} báo cáo) <br>
    Real: <strong>${real}</strong> • Fake: <strong>${fake}</strong> • Chưa rõ: <strong>${unclear}</strong>
  `;
}

function renderAuthReports() {
  const query = normalizeProfileUrl(authSearchInput.value);
  const verdictFilter = authFilterVerdict.value;

  let filtered = authReports;
  if (query) {
    filtered = filtered.filter((item) => item.normalizedProfileUrl === query);
  }

  if (verdictFilter !== "all") {
    filtered = filtered.filter((item) => item.verdict === verdictFilter);
  }

  filtered = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  authReportList.innerHTML = "";
  if (!filtered.length) {
    authReportList.innerHTML = "<li>Không có báo cáo phù hợp.</li>";
    renderAuthSummary(filtered);
    return;
  }

  for (const item of filtered) {
    const node = authItemTemplate.content.cloneNode(true);

    node.querySelector(".auth-platform").textContent = `${platformLabel(item.platform)} • ${item.profileUrl}`;

    const verdictEl = node.querySelector(".auth-verdict");
    verdictEl.textContent = verdictLabel(item.verdict);
    verdictEl.classList.add(sentimentClass(item.verdict));

    node.querySelector(".auth-display-name").textContent = item.displayName
      ? `Tên hiển thị: ${item.displayName}`
      : "Tên hiển thị: chưa cung cấp";

    node.querySelector(
      ".auth-confidence"
    ).textContent = `Độ tin cậy người gửi: ${item.confidence}/5 • ${new Date(
      item.createdAt
    ).toLocaleDateString("vi-VN")}`;

    node.querySelector(".auth-reason").textContent = item.reason;
    node.querySelector(".auth-votes").textContent = `Upvote: ${item.upvotes} • Downvote: ${item.downvotes}`;

    const evidenceEl = node.querySelector(".auth-evidence");
    evidenceEl.href = item.evidenceUrl;

    node.querySelector(".auth-upvote").addEventListener("click", () => {
      item.upvotes += 1;
      saveAuthReports();
      renderAuthReports();
    });

    node.querySelector(".auth-downvote").addEventListener("click", () => {
      item.downvotes += 1;
      saveAuthReports();
      renderAuthReports();
    });

    authReportList.appendChild(node);
  }

  renderAuthSummary(filtered);
}

function showMessage(element, text, type = "ok") {
  element.textContent = text;
  element.style.color = type === "ok" ? "var(--success)" : "var(--danger)";
}

sentimentSelect.addEventListener("change", (e) => {
  const isNegative = e.target.value === "negative";
  negativeEvidenceWrap.classList.toggle("hidden", !isNegative);
  negativeEvidenceWrap.querySelector("textarea").required = isNegative;
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(form);

  const startYear = Number(data.get("startYear"));
  const endYear = Number(data.get("endYear"));

  if (endYear < startYear) {
    showMessage(formMessage, "Năm kết thúc phải lớn hơn hoặc bằng năm bắt đầu.", "error");
    return;
  }

  const sentiment = data.get("sentiment");
  if (sentiment === "negative" && !String(data.get("negativeEvidence")).trim()) {
    showMessage(formMessage, "Review tiêu cực bắt buộc có bằng chứng bổ sung.", "error");
    return;
  }

  const record = {
    id: crypto.randomUUID(),
    name: String(data.get("name")).trim(),
    location: String(data.get("location")).trim(),
    startYear,
    endYear,
    sentiment,
    score: Number(data.get("score")),
    proof: String(data.get("proof")).trim(),
    proofUrl: String(data.get("proofUrl")).trim(),
    review: String(data.get("review")).trim(),
    negativeEvidence: String(data.get("negativeEvidence") || "").trim(),
    createdAt: new Date().toISOString(),
  };

  reviews.push(record);
  saveReviews();
  renderList();

  form.reset();
  negativeEvidenceWrap.classList.add("hidden");
  negativeEvidenceWrap.querySelector("textarea").required = false;

  showMessage(formMessage, "Đăng review thành công! Cảm ơn bạn đã đóng góp có trách nhiệm.");
});

authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(authForm);

  const profileUrl = String(data.get("profileUrl")).trim();
  const normalizedProfileUrl = normalizeProfileUrl(profileUrl);
  if (!normalizedProfileUrl) {
    showMessage(authMessage, "Link profile không hợp lệ.", "error");
    return;
  }

  const report = {
    id: crypto.randomUUID(),
    platform: String(data.get("platform")),
    displayName: String(data.get("displayName") || "").trim(),
    profileUrl,
    normalizedProfileUrl,
    verdict: String(data.get("verdict")),
    confidence: Number(data.get("confidence")),
    reason: String(data.get("reason")).trim(),
    evidenceUrl: String(data.get("evidenceUrl")).trim(),
    upvotes: 0,
    downvotes: 0,
    createdAt: new Date().toISOString(),
  };

  authReports.push(report);
  saveAuthReports();

  authForm.reset();
  authSearchInput.value = report.profileUrl;
  authFilterVerdict.value = "all";
  renderAuthReports();

  showMessage(authMessage, "Đã gửi báo cáo Auth thành công.");
});

searchInput.addEventListener("input", renderList);
filterSentiment.addEventListener("change", renderList);

authSearchInput.addEventListener("input", renderAuthReports);
authFilterVerdict.addEventListener("change", renderAuthReports);

renderList();
renderAuthReports();
