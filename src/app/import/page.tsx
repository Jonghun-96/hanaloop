"use client";
// src/app/import/page.tsx — Excel 임포트 UI (보너스)

import { useState } from "react";
import Link from "next/link";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    if (!file) {
      setError("파일을 선택하세요");
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "임포트 실패");
      } else {
        setResult(json);
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="layout">
      <Sidebar active="import" />
      <main className="main">
        <div className="page-header">
          <h2>Excel 임포트</h2>
          <p>과제용 데이터 시트(xlsx)를 그대로 업로드하면 activities 테이블에 저장됩니다</p>
        </div>

        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-title">파일 업로드</div>

          {/* 임포트 컬럼 안내 */}
          <div style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 12,
            color: "var(--text-secondary)"
          }}>
            <div style={{ fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>인식되는 컬럼명</div>
            <div style={{ fontFamily: "var(--font-mono)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              <span>일자(원본) <span style={{ color: "var(--text-muted)" }}>← 날짜</span></span>
              <span>활동 유형 <span style={{ color: "var(--text-muted)" }}>← 전기/원소재/운송</span></span>
              <span>설명 <span style={{ color: "var(--text-muted)" }}>← 한국전력, 플라스틱 1...</span></span>
              <span>량 <span style={{ color: "var(--text-muted)" }}>← 숫자</span></span>
              <span>단위 <span style={{ color: "var(--text-muted)" }}>← kWh, kg, ton-km</span></span>
            </div>
          </div>

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label>xlsx 파일 선택</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
                setError(null);
              }}
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {result && (
            <div className="alert alert-success">
              <div style={{ fontWeight: 500 }}>{result.message}</div>
              {result.errors.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <div style={{ color: "var(--warn)", marginBottom: 4 }}>경고:</div>
                  {result.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={loading || !file}
          >
            {loading ? "임포트 중..." : "임포트 시작"}
          </button>
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
