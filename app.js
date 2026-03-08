const SUPABASE_URL = window.EXCHECK_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.EXCHECK_SUPABASE_ANON_KEY || "";

const CLAIM_TTL_HOURS = 48;

const sampleData = [
  {
    id: crypto.randomUUID(),
    claimCode: "LP-DEMO12",
    claimerHandle: "@linh.tran",
    partnerHandle: "@minh.nguyen",
    relationshipKey: "@linh.tran|@minh.nguyen",
    status: "verified",
    proofUrl: "https://example.com/proof/couple",
    createdAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
  },
];

const sampleFlags = [
  {
    id: crypto.randomUUID(),
    targetHandle: "@minh.nguyen",
    category: "taken-claim",
    detail: "Đã xác thực trong mối quan hệ công khai trên nền tảng.",
    evidenceUrl: "https://example.com/flag/proof",
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

const claimConfirmForm = document.querySelector("#claimConfirmForm");
const claimConfirmMessage = document.querySelector("#claimConfirmMessage");

const authForm = document.querySelector("#authForm");
const authMessage = document.querySelector("#authMessage");
const authSearchInput = document.querySelector("#authSearchInput");
const authFilterVerdict = document.querySelector("#authFilterVerdict");
const authSummary = document.querySelector("#authSummary");
const authReportList = document.querySelector("#authReportList");
const authItemTemplate = document.querySelector("#authItemTemplate");
const backendStatus = document.querySelector("#backendStatus");

const canUseSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
const supabaseClient = canUseSupabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let reviews = [...sampleData];
let authReports = [...sampleAuthReports];
let localClaims = [];

function normalizeHandle(raw) {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

function pairKey(a, b) {
  return [normalizeHandle(a), normalizeHandle(b)].sort().join("|");
}

function createClaimCode() {
  return `LP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function showMessage(node, text, type = "success") {
  node.textContent = text;
  node.classList.remove("message--error", "message--success");
  node.classList.add(type === "error" ? "message--error" : "message--success");
}

function showBackendStatus() {
  backendStatus.textContent = supabaseClient
    ? "Đang chạy Supabase online"
    : "Đang chạy local demo (chưa cấu hình Supabase)";
}

function hashText(text) {
  const safeText = String(text || "").trim().toLowerCase();
  if (!safeText) return "";

  if (window.crypto?.subtle && window.TextEncoder) {
    return window.crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(safeText))
      .then((buffer) =>
        Array.from(new Uint8Array(buffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      );
  }

  return Promise.resolve(btoa(unescape(encodeURIComponent(safeText))).replace(/=/g, ""));
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function mapReviewRow(row) {
  return {
    id: row.id,
    claimCode: row.claim_code,
    claimerHandle: row.claimer_handle,
    partnerHandle: row.partner_handle,
    relationshipKey: row.relationship_key,
    status: row.status,
    proofUrl: row.proof_url,
    createdAt: row.created_at,
    verifiedAt: row.verified_at,
  };
}

function mapFlagRow(row) {
  return {
    id: row.id,
    targetHandle: row.target_handle,
    category: row.category,
    detail: row.detail,
    evidenceUrl: row.evidence_url,
    createdAt: row.created_at,
  };
}

async function fetchClaims() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from("relationship_claims")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showMessage(checkMessage, `Không tải được claims: ${error.message}`, "error");
    return;
  }
  claims = data.map(mapClaimRow);
}

async function expireStaleClaims() {
  const now = new Date().toISOString();

  if (!supabaseClient) {
    localClaims = localClaims.map((claim) => {
      if (claim.status === "pending" && new Date(claim.expires_at) <= new Date(now)) {
        return { ...claim, status: "expired" };
      }
      return claim;
    });
    return;
  }

  const { error } = await supabaseClient
    .from("relationship_claims")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lte("expires_at", now);

  if (error) {
    showMessage(formMessage, `Không thể cập nhật claim quá hạn: ${error.message}`, "error");
  }
}

async function createRelationshipClaim(record, claimerUserId, claimedPartnerContactHash) {
  const verificationCode = generateVerificationCode();
  const verificationTokenHash = await hashText(verificationCode);
  const expiresAt = new Date(Date.now() + CLAIM_TTL_HOURS * 60 * 60 * 1000).toISOString();

  const claimPayload = {
    claimer_user_id: claimerUserId,
    claimed_partner_contact_hash: claimedPartnerContactHash,
    status: "pending",
    verification_token_hash: verificationTokenHash,
    review_payload: record,
    expires_at: expiresAt,
  };

  if (!supabaseClient) {
    const localClaim = {
      id: crypto.randomUUID(),
      ...claimPayload,
      created_at: new Date().toISOString(),
    };
    localClaims.push(localClaim);
    return { claim: localClaim, verificationCode };
  }

  const { data, error } = await supabaseClient
    .from("relationship_claims")
    .insert(claimPayload)
    .select("id, claimer_user_id, claimed_partner_contact_hash, status, expires_at, created_at")
    .single();

  if (error) {
    throw new Error(`Tạo claim thất bại: ${error.message}`);
  }

  return { claim: data, verificationCode };
}

async function sendOneTimeVerificationToken(claim, verificationCode) {
  const channel = "email/SMS/DM";
  const target = claim.claimed_partner_contact_hash;
  console.info(`Simulate sending ${channel} token`, {
    claimId: claim.id,
    target,
    verificationCode,
  });

  return `${channel} token đã được gửi tới contact hash ${target}.`;
}

async function confirmRelationshipClaim(claimId, verificationCode) {
  await expireStaleClaims();
  const verificationTokenHash = await hashText(verificationCode);

  if (!supabaseClient) {
    const claim = localClaims.find((item) => item.id === claimId);
    if (!claim) throw new Error("Không tìm thấy claim.");
    if (claim.status !== "pending") throw new Error(`Claim đã ở trạng thái ${claim.status}.`);
    if (new Date(claim.expires_at) <= new Date()) {
      claim.status = "expired";
      throw new Error("Claim đã hết hạn.");
    }
    if (claim.verification_token_hash !== verificationTokenHash) {
      throw new Error("Mã xác nhận không đúng.");
    }

    claim.status = "confirmed";
    reviews.push({
      id: crypto.randomUUID(),
      ...mapReviewRow({ ...claim.review_payload, created_at: new Date().toISOString() }),
    });
    return;
  }

  const { data: claim, error: claimError } = await supabaseClient
    .from("relationship_claims")
    .select("id, status, expires_at, verification_token_hash, review_payload")
    .eq("id", claimId)
    .single();

  if (claimError || !claim) throw new Error("Không tìm thấy claim.");

  if (claim.status !== "pending") throw new Error(`Claim đã ở trạng thái ${claim.status}.`);

  if (new Date(claim.expires_at) <= new Date()) {
    await supabaseClient.from("relationship_claims").update({ status: "expired" }).eq("id", claim.id);
    throw new Error("Claim đã hết hạn.");
  }

  if (claim.verification_token_hash !== verificationTokenHash) {
    throw new Error("Mã xác nhận không đúng.");
  }

  const { error: updateError } = await supabaseClient
    .from("relationship_claims")
    .update({ status: "confirmed" })
    .eq("id", claim.id);

  if (updateError) throw new Error(`Không thể cập nhật claim: ${updateError.message}`);

  const { error: reviewError } = await supabaseClient.from("reviews").insert(claim.review_payload);
  if (reviewError) throw new Error(`Không thể tạo review công khai: ${reviewError.message}`);

  await fetchReviews();
}

async function fetchAuthReports() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from("community_flags")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showMessage(checkMessage, `Không tải được flags: ${error.message}`, "error");
    return;
  }
  flags = data.map(mapFlagRow);
}

function renderCheck(handleRaw) {
  const handle = normalizeHandle(handleRaw);
  relationshipList.innerHTML = "";
  flagList.innerHTML = "";

  if (!handle) {
    checkSummary.textContent = "Chưa có dữ liệu tra cứu.";
    checkSummary.classList.add("empty");
    return;
  }

  const relationshipMatches = claims.filter(
    (item) =>
      item.status === "verified" &&
      (normalizeHandle(item.claimerHandle) === handle || normalizeHandle(item.partnerHandle) === handle)
  );

  const flagMatches = flags.filter((item) => normalizeHandle(item.targetHandle) === handle);

  if (!relationshipMatches.length && !flagMatches.length) {
    checkSummary.classList.remove("empty");
    checkSummary.textContent =
      "Không có cờ đỏ hoặc cặp đôi verified công khai cho handle này. Không đồng nghĩa an toàn tuyệt đối.";
  } else {
    checkSummary.classList.remove("empty");
    checkSummary.textContent = `Tìm thấy ${relationshipMatches.length} cặp verified và ${flagMatches.length} community flags.`;
  }

  if (!relationshipMatches.length) {
    relationshipList.innerHTML = "<li class='item'>Không có cặp đôi verified.</li>";
  } else {
    relationshipMatches.forEach((item) => {
      const node = relationshipItemTemplate.content.cloneNode(true);
      node.querySelector(".pair").textContent = `${item.claimerHandle} ❤ ${item.partnerHandle}`;
      node.querySelector(".meta").textContent = `Verified: ${new Date(
        item.verifiedAt || item.createdAt
      ).toLocaleString("vi-VN")}`;
      const link = node.querySelector(".link");
      if (item.proofUrl) {
        link.href = item.proofUrl;
      } else {
        link.remove();
      }
      relationshipList.appendChild(node);
    });
  }

  if (!flagMatches.length) {
    flagList.innerHTML = "<li class='item'>Chưa có community flag.</li>";
  } else {
    flagMatches.forEach((item) => {
      const node = flagItemTemplate.content.cloneNode(true);
      node.querySelector(".cat").textContent = item.category;
      node.querySelector(".meta").textContent = item.detail;
      node.querySelector(".link").href = item.evidenceUrl;
      flagList.appendChild(node);
    });
  }
}

async function submitClaim(payload) {
  if (!supabaseClient) {
    claims.unshift(payload);
    return { error: null };
  }

  const { error } = await supabaseClient.from("relationship_claims").insert({
    claim_code: payload.claimCode,
    claimer_handle: payload.claimerHandle,
    partner_handle: payload.partnerHandle,
    relationship_key: payload.relationshipKey,
    status: payload.status,
    proof_url: payload.proofUrl,
  });
  return { error };
}

async function submitFlag(payload) {
  if (!supabaseClient) {
    flags.unshift(payload);
    return { error: null };
  }

  const { error } = await supabaseClient.from("community_flags").insert({
    target_handle: payload.targetHandle,
    category: payload.category,
    detail: payload.detail,
    evidence_url: payload.evidenceUrl,
  });
  return { error };
}

async function confirmClaim(claimCode, partnerHandle) {
  if (!supabaseClient) {
    const claim = claims.find((item) => item.claimCode === claimCode);
    if (!claim) return { error: { message: "Không tìm thấy claim" } };
    if (normalizeHandle(claim.partnerHandle) !== normalizeHandle(partnerHandle)) {
      return { error: { message: "Handle xác nhận không khớp với người được mời" } };
    }
    claim.status = "verified";
    claim.verifiedAt = new Date().toISOString();
    return { error: null };
  }

  const { data, error: findError } = await supabaseClient
    .from("relationship_claims")
    .select("id,partner_handle,status")
    .eq("claim_code", claimCode)
    .maybeSingle();

  if (findError || !data) {
    return { error: { message: "Không tìm thấy claim" } };
  }

  if (normalizeHandle(data.partner_handle) !== normalizeHandle(partnerHandle)) {
    return { error: { message: "Handle xác nhận không khớp với người được mời" } };
  }

  const { error } = await supabaseClient
    .from("relationship_claims")
    .update({ status: "verified", verified_at: new Date().toISOString() })
    .eq("id", data.id);
  return { error };
}

checkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(checkForm);
  const handle = fd.get("handle")?.toString() || "";
  if (!normalizeHandle(handle)) {
    showMessage(checkMessage, "Handle không hợp lệ", "error");
    return;
  }
  await fetchClaims();
  await fetchFlags();
  renderCheck(handle);
  showMessage(checkMessage, "Đã cập nhật kết quả tra cứu.");
});

claimForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(claimForm);
  const claimerHandle = normalizeHandle(fd.get("claimer")?.toString() || "");
  const partnerHandle = normalizeHandle(fd.get("partner")?.toString() || "");
  const proofUrl = fd.get("proofUrl")?.toString().trim() || "";

  if (!claimerHandle || !partnerHandle || claimerHandle === partnerHandle) {
    showMessage(claimMessage, "Hai handle phải hợp lệ và khác nhau.", "error");
    return;
  }

  const payload = {
    id: crypto.randomUUID(),
    claimCode: createClaimCode(),
    claimerHandle,
    partnerHandle,
    relationshipKey: pairKey(claimerHandle, partnerHandle),
    status: "pending",
    proofUrl,
    createdAt: new Date().toISOString(),
  };

  const { error } = await submitClaim(payload);
  if (error) {
    showMessage(claimMessage, `Không gửi được claim: ${error.message}`, "error");
    return;
  }

  claimForm.reset();
  showMessage(
    claimMessage,
    `Đã tạo claim. Gửi mã ${payload.claimCode} cho người yêu để họ xác nhận.`
  );
});

confirmForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(confirmForm);
  const claimCode = (fd.get("claimCode")?.toString() || "").trim().toUpperCase();
  const partnerHandle = fd.get("partnerHandle")?.toString() || "";

  if (!claimCode || !normalizeHandle(partnerHandle)) {
    showMessage(confirmMessage, "Thiếu mã claim hoặc handle.", "error");
    return;
  }

  const { error } = await confirmClaim(claimCode, partnerHandle);
  if (error) {
    showMessage(confirmMessage, `Xác nhận thất bại: ${error.message}`, "error");
    return;
  }

  const claimerUserId = String(data.get("claimerUserId")).trim();
  const claimedPartnerContactHash = String(data.get("claimedPartnerContactHash")).trim();
  if (!claimerUserId || !claimedPartnerContactHash) {
    showMessage(formMessage, "Cần nhập mã người gửi và contact hash đối phương.", "error");
    return;
  }

  const record = {
    name: String(data.get("name")).trim(),
    location: String(data.get("location")).trim(),
    start_year: startYear,
    end_year: endYear,
    sentiment,
    score: Number(data.get("score")),
    proof: String(data.get("proof")).trim(),
    proof_url: String(data.get("proofUrl")).trim(),
    review: String(data.get("review")).trim(),
    negative_evidence: String(data.get("negativeEvidence") || "").trim(),
  };

  try {
    await expireStaleClaims();
    const { claim, verificationCode } = await createRelationshipClaim(
      record,
      claimerUserId,
      claimedPartnerContactHash
    );
    const deliveryStatus = await sendOneTimeVerificationToken(claim, verificationCode);

    form.reset();
    negativeEvidenceWrap.classList.add("hidden");
    negativeEvidenceWrap.querySelector("textarea").required = false;

    showMessage(
      formMessage,
      `Đã tạo claim pending (${claim.id}). ${deliveryStatus} Mã demo: ${verificationCode}. Review chỉ hiển thị sau khi xác nhận.`
    );
  } catch (error) {
    showMessage(formMessage, error.message, "error");
  }
});

claimConfirmForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(claimConfirmForm);
  const claimId = String(data.get("claimId")).trim();
  const verificationCode = String(data.get("verificationCode")).trim();

  if (!claimId || !verificationCode) {
    showMessage(claimConfirmMessage, "Vui lòng nhập đủ claim ID và mã xác nhận.", "error");
    return;
  }

  try {
    await confirmRelationshipClaim(claimId, verificationCode);
    await fetchReviews();
    renderList();
    claimConfirmForm.reset();
    showMessage(claimConfirmMessage, "Xác nhận thành công. Review đã được đăng công khai.");
  } catch (error) {
    showMessage(claimConfirmMessage, error.message, "error");
  }
});

flagForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(flagForm);
  const payload = {
    id: crypto.randomUUID(),
    targetHandle: normalizeHandle(fd.get("target")?.toString() || ""),
    category: fd.get("category")?.toString() || "",
    detail: fd.get("detail")?.toString().trim() || "",
    evidenceUrl: fd.get("evidenceUrl")?.toString().trim() || "",
    createdAt: new Date().toISOString(),
  };

  if (!payload.targetHandle || !payload.category || !payload.detail || !payload.evidenceUrl) {
    showMessage(flagMessage, "Vui lòng nhập đủ thông tin flag.", "error");
    return;
  }

  const { error } = await submitFlag(payload);
  if (error) {
    showMessage(flagMessage, `Không gửi được flag: ${error.message}`, "error");
    return;
  }

  flagForm.reset();
  showMessage(flagMessage, "Đã gửi flag thành công.");
});

searchInput.addEventListener("input", renderList);
filterSentiment.addEventListener("change", renderList);

authSearchInput.addEventListener("input", renderAuthReports);
authFilterVerdict.addEventListener("change", renderAuthReports);

async function init() {
  showBackendStatus();
  await expireStaleClaims();
  await Promise.all([fetchReviews(), fetchAuthReports()]);
  renderList();
  renderAuthReports();
}

init();
