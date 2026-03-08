const SUPABASE_URL = window.EXCHECK_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.EXCHECK_SUPABASE_ANON_KEY || "";

const sampleClaims = [
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

const claimForm = document.querySelector("#claimForm");
const confirmForm = document.querySelector("#confirmForm");
const checkForm = document.querySelector("#checkForm");
const flagForm = document.querySelector("#flagForm");

const claimMessage = document.querySelector("#claimMessage");
const confirmMessage = document.querySelector("#confirmMessage");
const checkMessage = document.querySelector("#checkMessage");
const flagMessage = document.querySelector("#flagMessage");
const checkSummary = document.querySelector("#checkSummary");

const relationshipList = document.querySelector("#relationshipList");
const flagList = document.querySelector("#flagList");
const relationshipItemTemplate = document.querySelector("#relationshipItemTemplate");
const flagItemTemplate = document.querySelector("#flagItemTemplate");
const backendStatus = document.querySelector("#backendStatus");

const canUseSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
const supabaseClient = canUseSupabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let claims = [...sampleClaims];
let flags = [...sampleFlags];

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

function mapClaimRow(row) {
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

async function fetchFlags() {
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

  confirmForm.reset();
  showMessage(confirmMessage, "Đã xác nhận thành công. Claim chuyển sang Verified.");
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

showBackendStatus();
renderCheck("");
