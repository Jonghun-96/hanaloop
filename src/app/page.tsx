"use client";
// src/app/page.tsx — 메인 대시보드
//
// 경영자와 실무자 모두를 위한 PCF 전과정 시각화 화면
// - KPI 카드: 총 배출량, Scope별 합계
// - 라인 차트: 월별 배출량 추이
// - 파이 차트: 활동유형별 비중
// - Scope별 바 차트

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import type { PCFSummary } from "@/lib/pcf";

const COLORS = {
  electricity: "#3b82f6",
  material: "#a78bfa",
  transport: "#f97316",
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<PCFSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pcf")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setSummary(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const pieData = summary
    ? [
        { name: "전기", value: summary.byType.electricity, color: COLORS.electricity },
        { name: "원소재", value: summary.byType.material, color: COLORS.material },
        { name: "운송", value: summary.byType.transport, color: COLORS.transport },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="layout">
      <Sidebar active="dashboard" />
      <main className="main">
        <div className="page-header">
          <h2>PCF 대시보드</h2>
          <p>제품: 컴퓨터 화면 CT-045 · GHG Protocol 기준 전과정 탄소발자국</p>
        </div>

        {loading && <div className="loading">데이터 불러오는 중...</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {summary && (
          <>
            {/* KPI 카드 */}
            <div className="kpi-grid">
              <div className="kpi-card accent">
                <div className="kpi-label">총 배출량</div>
                <div className="kpi-value">{summary.totalTCO2e.toFixed(2)}</div>
                <div className="kpi-unit">tCO₂e</div>
                <div className="kpi-sub">{summary.totalKgCO2e.toLocaleString()} kgCO₂e · {summary.activityCount}건 활동</div>
              </div>
              <div className="kpi-card scope2">
                <div className="kpi-label">Scope 2 (전기)</div>
                <div className="kpi-value mono">{summary.byScope.scope2.toFixed(1)}</div>
                <div className="kpi-unit">kgCO₂e</div>
                <div className="kpi-sub">구매 전력 간접 배출</div>
              </div>
              <div className="kpi-card mat">
                <div className="kpi-label">Scope 3 (원소재)</div>
                <div className="kpi-value mono">{summary.byType.material.toFixed(1)}</div>
                <div className="kpi-unit">kgCO₂e</div>
                <div className="kpi-sub">플라스틱 upstream 배출</div>
              </div>
              <div className="kpi-card trn">
                <div className="kpi-label">Scope 3 (운송)</div>
                <div className="kpi-value mono">{summary.byType.transport.toFixed(1)}</div>
                <div className="kpi-unit">kgCO₂e</div>
                <div className="kpi-sub">물류 upstream 배출</div>
              </div>
            </div>

            {/* 차트 */}
            <div className="chart-grid">
              {/* 월별 추이 */}
              <div className="card">
                <div className="card-title">월별 배출량 추이 (kgCO₂e)</div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={summary.byMonth} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
                    <XAxis dataKey="label" tick={{ fill: "#4a5568", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#4a5568", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#111418", border: "1px solid #1e2530", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#e8edf2" }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="electricity" name="전기" stroke={COLORS.electricity} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="material" name="원소재" stroke={COLORS.material} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="transport" name="운송" stroke={COLORS.transport} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 유형별 파이 */}
              <div className="card">
                <div className="card-title">활동유형별 비중</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`${v.toFixed(1)} kgCO₂e`]}
                      contentStyle={{ background: "#111418", border: "1px solid #1e2530", borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* 범례 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {pieData.map((d) => {
                    const pct = ((d.value / summary.totalKgCO2e) * 100).toFixed(1);
                    return (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                        <span style={{ color: "var(--text-secondary)", flex: 1 }}>{d.name}</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scope별 막대 */}
            <div className="card">
              <div className="card-title">GHG Scope별 배출량 (kgCO₂e)</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={summary.byMonth}
                  margin={{ top: 5, right: 5, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
                  <XAxis dataKey="label" tick={{ fill: "#4a5568", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#4a5568", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#111418", border: "1px solid #1e2530", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="electricity" name="전기 (Scope 2)" fill={COLORS.electricity} stackId="a" radius={[0,0,0,0]} />
                  <Bar dataKey="material" name="원소재 (Scope 3)" fill={COLORS.material} stackId="a" />
                  <Bar dataKey="transport" name="운송 (Scope 3)" fill={COLORS.transport} stackId="a" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── 사이드바 컴포넌트 ─────────────────────────────────────────────
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
          <Link
            key={item.key}
            href={item.href}
            className={`nav-item ${active === item.key ? "active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
