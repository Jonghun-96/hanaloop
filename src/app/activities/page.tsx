"use client";
// src/app/activities/page.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Activity, EmissionFactor } from "@prisma/client";
import { ACTIVITY_TYPE_LABELS } from "@/lib/pcf";
import { ActivityType } from "@prisma/client";

type ActivityWithEF = Activity & {
  emissionFactor: Pick<EmissionFactor, "factor" | "description" | "source"> | null;
};

const TYPE_OPTIONS = [
  { value: ActivityType.ELECTRICITY, label: "전기" },
  { value: ActivityType.MATERIAL, label: "원소재" },
  { value: ActivityType.TRANSPORT, label: "운송" },
];

const UNIT_OPTIONS: Record<ActivityType, string[]> = {
  ELECTRICITY: ["kWh", "MWh"],
  MATERIAL: ["kg", "t"],
  TRANSPORT: ["ton-km"],
};

const TYPE_DESC_HINTS: Record<ActivityType, string[]> = {
  ELECTRICITY: ["한국전력"],
  MATERIAL: ["플라스틱 1", "플라스틱 2"],
  TRANSPORT: ["트럭"],
};

// 유형별 힌트 칩 색상
const HINT_COLORS: Record<ActivityType, { bg: string; border: string; color: string; activeBg: string }> = {
  ELECTRICITY: { bg: "#3b82f608", border: "#3b82f630", color: "#3b82f6", activeBg: "#3b82f620" },
  MATERIAL:    { bg: "#a78bfa08", border: "#a78bfa30", color: "#a78bfa", activeBg: "#a78bfa20" },
  TRANSPORT:   { bg: "#f9731608", border: "#f9731630", color: "#f97316", activeBg: "#f9731620" },
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityWithEF[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<{
    date: string;
    activityType: ActivityType;
    description: string;
    amount: string;
    unit: string;
  }>({
    date: "",
    activityType: "ELECTRICITY",
    description: "",
    amount: "",
    unit: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => { loadActivities(); }, []);

  async function loadActivities() {
    setLoading(true);
    const res = await fetch("/api/activities");
    const json = await res.json();
    setActivities(json.data ?? []);
    setLoading(false);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.date) errors.date = "날짜를 선택하세요";
    if (!form.description.trim()) errors.description = "설명을 입력하세요 (예: 한국전력, 플라스틱 1)";
    if (!form.amount.trim()) errors.amount = "량을 입력하세요";
    else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) errors.amount = "0보다 큰 숫자를 입력하세요";
    if (!form.unit) errors.unit = "단위를 선택하세요";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitMsg(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitMsg({ type: "error", text: json.error ?? "저장 실패" });
      } else {
        setSubmitMsg({ type: "success", text: "활동 데이터가 저장되었습니다" });
        setForm({ date: "", activityType: ActivityType.ELECTRICITY, description: "", amount: "", unit: "kWh" });
        setFormErrors({});
        loadActivities();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 활동 데이터를 삭제하시겠습니까?")) return;
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    loadActivities();
  }

  function handleTypeChange(type: ActivityType) {
    setForm((prev) => ({ ...prev, activityType: type, unit: UNIT_OPTIONS[type]?.[0] ?? "" }));
  }

  const typeLabel = (t: ActivityType) => ACTIVITY_TYPE_LABELS[t] ?? t;
  const scopeLabel = (s: string) => s === "SCOPE_2" ? "Scope 2" : s === "SCOPE_3" ? "Scope 3" : "Scope 1";
  const chipColors = HINT_COLORS[form.activityType];

  return (
    <div className="layout">
      <Sidebar active="activities" />
      <main className="main">
        <div className="page-header">
          <h2>활동 데이터 관리</h2>
          <p>전기·원소재·운송 활동 데이터를 입력하면 kgCO₂e가 자동 계산됩니다</p>
        </div>

        {/* 입력 폼 */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">신규 활동 데이터 입력</div>

          {submitMsg && (
            <div className={`alert alert-${submitMsg.type}`}>{submitMsg.text}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <div className="form-field">
                <label>날짜 *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className={formErrors.date ? "error" : ""}
                />
                {formErrors.date && <span className="error-msg">{formErrors.date}</span>}
              </div>

              <div className="form-field">
                <label>활동 유형 *</label>
                <select
                  value={form.activityType}
                  onChange={(e) => handleTypeChange(e.target.value as ActivityType)}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>설명 *</label>
                <input
                  type="text"
                  placeholder={TYPE_DESC_HINTS[form.activityType][0]}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className={formErrors.description ? "error" : ""}
                />
                {/* 커스텀 힌트 칩 */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {TYPE_DESC_HINTS[form.activityType].map((hint) => (
                    <button
                      key={hint}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, description: hint }))}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        border: `1px solid ${chipColors.border}`,
                        background: form.description === hint ? chipColors.activeBg : chipColors.bg,
                        color: chipColors.color,
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        outline: "none",
                      }}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
                {formErrors.description && <span className="error-msg">{formErrors.description}</span>}
              </div>

              <div className="form-field">
                <label>량 *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="예: 110"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  className={formErrors.amount ? "error" : ""}
                />
                {formErrors.amount && <span className="error-msg">{formErrors.amount}</span>}
              </div>

              <div className="form-field">
                <label>단위 *</label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                  className={formErrors.unit ? "error" : ""}
                >
                  {UNIT_OPTIONS[form.activityType].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setForm({ date: "", activityType: ActivityType.ELECTRICITY, description: "", amount: "", unit: "kWh" });
                  setFormErrors({});
                  setSubmitMsg(null);
                }}
              >
                초기화
              </button>
            </div>
          </form>
        </div>

        {/* 목록 */}
        <div className="card">
          <div className="card-title">활동 데이터 목록 ({activities.length}건)</div>
          {loading ? (
            <div className="loading">불러오는 중...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>유형</th>
                    <th>설명</th>
                    <th>량</th>
                    <th>단위</th>
                    <th>GHG Scope</th>
                    <th>kgCO₂e</th>
                    <th>배출계수</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => (
                    <tr key={a.id}>
                      <td className="mono">{new Date(a.date).toLocaleDateString("ko-KR")}</td>
                      <td>
                        <span className={`badge badge-${a.activityType === "ELECTRICITY" ? "elec" : a.activityType === "MATERIAL" ? "mat" : "trn"}`}>
                          {typeLabel(a.activityType)}
                        </span>
                      </td>
                      <td>{a.description}</td>
                      <td className="mono">{a.amount.toLocaleString()}</td>
                      <td style={{ color: "var(--text-muted)" }}>{a.unit}</td>
                      <td>
                        <span className={`badge badge-${a.ghgScope === "SCOPE_2" ? "s2" : "s3"}`}>
                          {scopeLabel(a.ghgScope)}
                        </span>
                      </td>
                      <td className="mono" style={{ color: "var(--accent)" }}>
                        {a.co2e != null ? a.co2e.toFixed(2) : "—"}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {a.emissionFactor?.factor ?? "—"} kgCO₂e/{a.unit}
                      </td>
                      <td>
                        <button
                          className="btn btn-danger"
                          style={{ padding: "4px 10px", fontSize: 11 }}
                          onClick={() => handleDelete(a.id)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Sidebar({ active }: { active: string }) {
  const items = [
    { href: "/", label: "대시보드", key: "dashboard" },
    { href: "/activities", label: "활동 데이터", key: "activities" },
    { href: "/import", label: "Excel 임포트", key: "import" },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>PCF Platform</h1>
        <p>CT-045 · 탄소발자국 관리</p>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <Link key={item.key} href={item.href} className={`nav-item ${active === item.key ? "active" : ""}`}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
