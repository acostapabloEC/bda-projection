import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, ReferenceArea
} from "recharts";
import { DATA_URL } from "./data.js";

const PASSWORD = "john2026";

// Monthly direct cost per rep (avg of last 3 months from data)
const REP_MONTHLY_COST = {
  "Ashley Mieldon":4293.33,"Linda Cancelli":4293.33,"Megan Flaherty":5040.00,
  "Shannon Barranger":4480.00,"William Shannon":4293.33,"Michael Buscio":4293.33,
  "Ivan Garville":4293.33,"John Blackwell":4262.22,"Kyle Perkins":4200.00,
  "Spring Washington":4200.00,"Kevin Bradel":5040.00,
  "Aaron Acosta":4200.00,"Bonetta Crews":4200.00,
  "Dakota Stevens":4200.00,"John Storz":4200.00,"Jason Andrus":4200.00,"Brett Olson":4200.00,
};

const REP_TENURE = {
  "Ashley Mieldon":44,"Linda Cancelli":24,"Megan Flaherty":47,"Shannon Barranger":44,
  "William Shannon":20,"Michael Buscio":13,"Ivan Garville":9,"John Blackwell":9,
  "Kyle Perkins":7,"Spring Washington":5,"Kevin Bradel":1,
  "Aaron Acosta":1,"Bonetta Crews":1,
  "Dakota Stevens":24,"John Storz":43,"Jason Andrus":32,"Brett Olson":1,
};

const BDA_COLORS = ["#2196F3","#4CAF50","#FF9800","#E91E63","#9C27B0","#00BCD4","#FF5722","#8BC34A","#FFC107","#607D8B","#F44336","#3F51B5","#009688","#CDDC39","#FF4081","#00E5FF","#76FF03","#FF6D00","#D500F9","#00B0FF","#64FFDA","#EEFF41","#FF6E40","#40C4FF","#EA80FC","#A7FFEB","#FFD740","#FF6D00","#69F0AE","#B0BEC5","#EF9A9A","#CE93D8","#80CBC4","#A5D6A7","#FFE082","#90CAF9"];
const SBC_COLORS  = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4"];

// BDA commission rate by tenure
// Under 12 months = 5%, 12+ months = 10% (grandfathered reps also at 10%)
const BDA_COMM_RATE = {
  "Ashley Mieldon":0.10,"Linda Cancelli":0.10,"Megan Flaherty":0.10,"Shannon Barranger":0.10,
  "William Shannon":0.10,"Michael Buscio":0.10,"Ivan Garville":0.05,"John Blackwell":0.05,
  "Kyle Perkins":0.05,"Spring Washington":0.05,"Kevin Bradel":0.05,
  "Aaron Acosta":0.05,"Bonetta Crews":0.05,
  "Dakota Stevens":0.10,"John Storz":0.10,"Jason Andrus":0.10,"Brett Olson":0.05,
};

const lastName = name => name.split(" ").slice(-1)[0];
const fmt$  = v => v == null ? "â€”" : `$${v >= 0 ? "" : "-"}${Math.abs(v).toLocaleString("en-US",{maximumFractionDigits:0})}`;
const fmtPC = v => v == null ? "â€”" : v.toFixed(2) + "x";

// Generate future month labels e.g. "Mar-26", "Apr-26" ...
function futureMonths(fromDateLabel, count) {
  const [mon, yr] = fromDateLabel.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let mi = months.indexOf(mon);
  let yr4 = 2000 + parseInt(yr);
  const result = [];
  for (let i = 1; i <= count; i++) {
    mi++;
    if (mi > 11) { mi = 0; yr4++; }
    result.push(`${months[mi]}-${String(yr4).slice(2)}`);
  }
  return result;
}

const CustomTooltip = ({ active, payload, label, rprLookup }) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].filter(p => p.value != null).sort((a,b) => b.value - a.value);
  return (
    <div style={{ background:"#0f1f3d", border:"1px solid #1e3a6e", borderRadius:6, padding:"10px 14px", fontSize:12 }}>
      <div style={{ color:"#aaa", marginBottom:6, fontWeight:600 }}>{label}</div>
      {sorted.map(p => {
        const isProj = p.dataKey.endsWith("â˜…");
        const repName = isProj ? p.dataKey.slice(0,-1) : p.dataKey;
        const rpr = rprLookup?.[label]?.[repName];
        return (
          <div key={p.dataKey} style={{ marginBottom:4 }}>
            <div style={{ color:p.color, display:"flex", justifyContent:"space-between", gap:20 }}>
              <span>{repName}{isProj ? " (proj)" : ""}</span>
              <span style={{ fontWeight:700 }}>{fmtPC(p.value)}</span>
            </div>
            {rpr != null && (
              <div style={{ color:"#607D8B", display:"flex", justifyContent:"space-between", gap:20, fontSize:11, marginTop:1 }}>
                <span style={{ paddingLeft:8 }}>RPr</span>
                <span>{fmt$(rpr)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

function PasswordGate({ children }) {
  const [input, setInput]       = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError]       = useState(false);
  const attempt = () => {
    if (input === PASSWORD) { setUnlocked(true); setError(false); }
    else { setError(true); setInput(""); }
  };
  if (unlocked) return children;
  return (
    <div style={{ background:"#0a0f1e", minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", fontFamily:"Calibri, sans-serif" }}>
      <h1 style={{ color:"#fff", fontSize:26, fontWeight:700, letterSpacing:1, marginBottom:8 }}>BDA PROJECTION</h1>
      <p style={{ color:"#888", fontSize:13, marginBottom:32 }}>Enter password to continue</p>
      <div style={{ display:"flex", gap:8 }}>
        <input type="password" value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          placeholder="Password"
          style={{ padding:"10px 16px", borderRadius:4, border: error ? "1px solid #E91E63" : "1px solid #1e2d4a",
            background:"#111827", color:"#fff", fontSize:14, outline:"none", width:200 }} />
        <button onClick={attempt} style={{ padding:"10px 20px", borderRadius:4, border:"none",
          background:"#2196F3", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}>Enter</button>
      </div>
      {error && <p style={{ color:"#E91E63", fontSize:12, marginTop:12 }}>Incorrect password</p>}
    </div>
  );
}

export default function App() {

  // â”€â”€ Remote data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [remoteData, setRemoteData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  useEffect(() => {
    fetch(DATA_URL)
      .then(r => r.json())
      .then(d => { setRemoteData(d); setDataLoading(false); })
      .catch(() => setDataLoading(false));
  }, []);

  const BDA_REPS = remoteData?.BDA_REPS ?? [];
  const SBC_REPS = remoteData?.SBC_REPS ?? [];
  const BDA_KNOWN_REPS = remoteData?.BDA_KNOWN_REPS ?? [];
  const SBC_KNOWN_REPS = remoteData?.SBC_KNOWN_REPS ?? [];
  const BDA_ACTIVE = remoteData?.BDA_ACTIVE ?? [];
  const BDA_INACTIVE = remoteData?.BDA_INACTIVE ?? [];
  const SBC_ACTIVE = remoteData?.SBC_ACTIVE ?? [];
  const SBC_INACTIVE = remoteData?.SBC_INACTIVE ?? [];
  const BDA_DATE_RPR = remoteData?.BDA_DATE_RPR ?? [];
  const SBC_DATE_RPR = remoteData?.SBC_DATE_RPR ?? [];
  const BDA_MONTH_RPR = remoteData?.BDA_MONTH_RPR ?? [];
  const SBC_MONTH_RPR = remoteData?.SBC_MONTH_RPR ?? [];
  const BDA_DATE_CCOST = remoteData?.BDA_DATE_CCOST ?? [];
  const SBC_DATE_CCOST = remoteData?.SBC_DATE_CCOST ?? [];
  const BDA_MONTH_CCOST = remoteData?.BDA_MONTH_CCOST ?? [];
  const SBC_MONTH_CCOST = remoteData?.SBC_MONTH_CCOST ?? [];
  const BDA_DATE_PC = remoteData?.BDA_DATE_PC ?? [];
  const SBC_DATE_PC = remoteData?.SBC_DATE_PC ?? [];
  const BDA_MONTH_PC = remoteData?.BDA_MONTH_PC ?? [];
  const SBC_MONTH_PC = remoteData?.SBC_MONTH_PC ?? [];

  const [universe,   setUniverse]   = useState("bda");
  const [activeReps, setActiveReps] = useState(new Set(BDA_ACTIVE));
  const [dateStart,  setDateStart]  = useState(null);
  const [dateEnd,    setDateEnd]    = useState(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [inspectRep, setInspectRep] = useState(null);

  // Projection state
  const [projRep,     setProjRep]     = useState("");
  const [projRevenue, setProjRevenue] = useState("");
  const [projMonths,  setProjMonths]  = useState("");
  const [projection,  setProjection]  = useState(null);
  const [showRates,   setShowRates]   = useState(false);

  useEffect(() => {
    setActiveReps(new Set(universe === "bda" ? BDA_ACTIVE : SBC_ACTIVE));
    setDateStart(null);
    setDateEnd(null);
    setProjection(null);
    setProjRep("");
    setShowRates(false);
  }, [universe]);

  const allReps   = universe === "bda" ? BDA_REPS    : SBC_REPS;
  const activeList= universe === "bda" ? BDA_ACTIVE  : SBC_ACTIVE;
  const colors    = universe === "bda" ? BDA_COLORS  : SBC_COLORS;
  const colorMap  = Object.fromEntries(allReps.map((r,i) => [r, colors[i % colors.length]]));

  const rawPC    = universe === "bda" ? BDA_DATE_PC    : SBC_DATE_PC;
  const rawRPr   = universe === "bda" ? BDA_DATE_RPR   : SBC_DATE_RPR;
  const rawCCost = universe === "bda" ? BDA_DATE_CCOST : SBC_DATE_CCOST;

  const allDates = useMemo(() => rawPC.map(d => d.date).filter(Boolean), [rawPC]);

  const pcData = useMemo(() => {
    let arr = [...rawPC];
    if (dateStart || dateEnd) {
      const dates = arr.map(d => d.date);
      const si = dateStart ? dates.indexOf(dateStart) : 0;
      const ei = dateEnd   ? dates.indexOf(dateEnd)   : dates.length - 1;
      arr = arr.slice(si < 0 ? 0 : si, ei < 0 ? arr.length : ei + 1);
    }
    while (arr.length > 0) {
      const last = arr[arr.length - 1];
      const hasValue = activeList.some(r => activeReps.has(r) && last[r] != null);
      if (hasValue) break;
      arr.pop();
    }
    return arr;
  }, [rawPC, activeReps, activeList, dateStart, dateEnd]);

  const ticks = useMemo(() =>
    pcData.filter((_,i) => i % 4 === 0).map(d => d.date),
  [pcData]);

  // Build RPr lookup by date+rep for tooltip
  const rprLookup = useMemo(() => {
    const map = {};
    rawRPr.forEach(row => {
      if (!row.date) return;
      map[row.date] = {};
      activeList.forEach(rep => { if (row[rep] != null) map[row.date][rep] = row[rep]; });
    });
    return map;
  }, [rawRPr, activeList]);

  const lastIndexMap = useMemo(() => {
    const map = {};
    activeList.forEach(rep => {
      let last = -1;
      pcData.forEach((row,i) => { if (row[rep] != null) last = i; });
      map[rep] = last;
    });
    return map;
  }, [pcData, activeList]);

  // Build projected chart data
  const chartData = useMemo(() => {
    if (!projection) return pcData;
    const { rep, months, projectedPoints } = projection;
    const lastDate = pcData[pcData.length - 1]?.date;
    if (!lastDate) return pcData;
    const futureDates = futureMonths(lastDate, months);
    const projKey = rep + "â˜…";
    // Clone existing data â€” add projKey column as null
    const base = pcData.map(row => ({ ...row, [projKey]: null }));
    // Set last actual point as start of projection
    const lastActualIdx = lastIndexMap[rep];
    if (lastActualIdx >= 0) {
      base[lastActualIdx] = { ...base[lastActualIdx], [projKey]: base[lastActualIdx][rep] };
    }
    // Add future rows
    futureDates.forEach((date, i) => {
      base.push({ date, [projKey]: projectedPoints[i] });
    });
    return base;
  }, [pcData, projection, lastIndexMap]);

  const makeEndDot = (rep, color, isProj) => (props) => {
    const { cx, cy, index } = props;
    const key = isProj ? rep + "â˜…" : rep;
    const lastIdx = isProj ? chartData.length - 1 : lastIndexMap[rep];
    if (index !== lastIdx) return <g key={`e-${key}-${index}`} />;
    const val = chartData[index]?.[key];
    if (val == null) return <g />;
    const label = `${lastName(rep)}${isProj ? " (proj)" : ""} ${fmtPC(val)}`;
    return (
      <g key={`end-${key}`}>
        <circle cx={cx} cy={cy} r={isProj ? 4 : 3} fill={color} />
        <text x={cx+7} y={cy-5} fill={color} fontSize={10} fontWeight={700}
          style={{ textShadow:"0 0 6px #0a0f1e" }}>{label}</text>
      </g>
    );
  };

  const toggle    = rep => setActiveReps(prev => { const n = new Set(prev); n.has(rep) ? n.delete(rep) : n.add(rep); return n; });
  const selectAll = () => setActiveReps(new Set(activeList));
  const clearAll  = () => setActiveReps(new Set());

  const yFmt = v => `${v.toFixed(1)}x`;

  const btnBase = { padding:"6px 14px", borderRadius:4, border:"none", cursor:"pointer", fontSize:12, fontWeight:600 };
  const btn     = on => ({ ...btnBase, background: on ? "#2196F3" : "#1e2d4a", color: on ? "#fff" : "#aaa" });
  const divider = { paddingRight:12, borderRight:"1px solid #1e2d4a", marginRight:4, display:"flex", gap:4 };

  const selectedReps = activeList.filter(r => activeReps.has(r));

  // Projection calculation
  const runProjection = () => {
    if (!projRep || !projRevenue || !projMonths) return;
    const rev     = parseFloat(projRevenue.replace(/[^0-9.-]/g,""));
    const months  = parseInt(projMonths);
    if (isNaN(rev) || isNaN(months) || months < 1) return;

    const monthlySalary = REP_MONTHLY_COST[projRep] || 4200;
    const bdaRate   = BDA_COMM_RATE[projRep] ?? 0.10;
    const bdaComm   = rev * bdaRate;
    const assocComm = rev * 0.25;
    const salTotal  = monthlySalary * months;
    const taxRate   = 0.12;
    const payrollTax = (salTotal + bdaComm) * taxRate;
    const totalCommCost = bdaComm + assocComm + payrollTax;
    const additionalCost = salTotal + totalCommCost;

    const netProfit = rev - bdaComm - assocComm - payrollTax - salTotal;

    const lastRPrRow   = [...rawRPr].reverse().find(r => r[projRep] != null);
    const lastCCostRow = [...rawCCost].reverse().find(r => r[projRep] != null);
    const currentRPr   = lastRPrRow?.[projRep]   ?? 0;
    const currentCCost = lastCCostRow?.[projRep] ?? 0;

    const projectedPoints = [];
    for (let m = 1; m <= months; m++) {
      const mSalCost  = monthlySalary * m;
      const mTax      = (mSalCost + bdaComm) * taxRate;
      const mCommCost = m === months ? (bdaComm + assocComm) : 0;
      const projRPr   = m === months ? currentRPr + netProfit : currentRPr - (mSalCost + mTax);
      const projCCost = currentCCost - mSalCost - mTax - mCommCost;
      const pc = projCCost !== 0 ? projRPr / Math.abs(projCCost) : 0;
      projectedPoints.push(parseFloat(pc.toFixed(4)));
    }

    const finalRPr   = currentRPr + netProfit;
    const finalCCost = currentCCost - additionalCost;
    const finalPC    = finalCCost !== 0 ? finalRPr / Math.abs(finalCCost) : 0;

    setProjection({
      rep: projRep,
      months,
      revenue: rev,
      additionalCost,
      currentRPr,
      currentCCost,
      currentPC: lastRPrRow ? currentRPr / Math.abs(currentCCost) : null,
      finalRPr,
      finalCCost,
      finalPC,
      projectedPoints,
    });
  };

  const clearProjection = () => {
    setProjection(null);
    setProjRep("");
    setProjRevenue("");
    setProjMonths("");
  };

  // Last updated month
  const lastUpdated = useMemo(() => {
    const src = universe === "bda" ? BDA_DATE_PC : SBC_DATE_PC;
    const list = universe === "bda" ? BDA_ACTIVE : SBC_ACTIVE;
    for (let i = src.length - 1; i >= 0; i--) {
      if (list.some(r => src[i][r] != null)) return src[i].date;
    }
    return null;
  }, [universe]);

  // â”€â”€ Overview computations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const overviewData = useMemo(() => {
    const list = universe === "bda" ? BDA_ACTIVE : SBC_ACTIVE;
    const pcSrc    = universe === "bda" ? BDA_DATE_PC    : SBC_DATE_PC;
    const rprSrc   = universe === "bda" ? BDA_DATE_RPR   : SBC_DATE_RPR;
    const ccostSrc = universe === "bda" ? BDA_DATE_CCOST : SBC_DATE_CCOST;

    return list.map(rep => {
      const latestPC    = [...pcSrc].reverse().find(r => r[rep] != null)?.[rep] ?? null;
      const latestRPr   = [...rprSrc].reverse().find(r => r[rep] != null)?.[rep] ?? 0;
      const latestCCost = [...ccostSrc].reverse().find(r => r[rep] != null)?.[rep] ?? 0;
      const pct = latestPC != null ? Math.round(latestPC * 100) : null;
      return { rep, pc: latestPC, pct, rpr: latestRPr, ccost: latestCCost };
    }).sort((a,b) => (b.pct ?? -999) - (a.pct ?? -999));
  }, [universe]);

  const kpis = useMemo(() => {
    const valid = overviewData.filter(d => d.pc != null);
    const avgPC = valid.length ? valid.reduce((s,d) => s + d.pc, 0) / valid.length : 0;
    const atBE  = valid.filter(d => d.pc >= 1).length;
    const totalInvested  = valid.reduce((s,d) => s + Math.abs(d.ccost), 0);
    const totalRecovered = valid.reduce((s,d) => s + Math.max(d.rpr, 0), 0);
    return { avgPC, atBE, total: valid.length, totalInvested, totalRecovered };
  }, [overviewData]);

  if (dataLoading) return (
    <div style={{ background:"#0a0f1e", minHeight:"100vh", display:"flex",
      alignItems:"center", justifyContent:"center", color:"#aaa", fontSize:14 }}>
      Loading dashboard data…
    </div>
  );

  return (
    <PasswordGate>
      <div style={{ background:"#0a0f1e", minHeight:"100vh", width:"100%", boxSizing:"border-box",
        padding:"20px 24px", fontFamily:"Calibri, sans-serif", color:"#fff", overflowX:"hidden" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"baseline", gap:16, marginBottom:4 }}>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, letterSpacing:0.5 }}>BDA PROJECTION</h1>
          <span style={{ color:"#888", fontSize:13 }}>
            {universe.toUpperCase()} Â· Active Â· Gross Â· Direct costs + commissions
          </span>
          {lastUpdated && (
            <span style={{ marginLeft:"auto", fontFamily:"monospace", fontSize:11,
              color:"#4CAF50", background:"rgba(76,175,80,0.1)", border:"1px solid rgba(76,175,80,0.3)",
              borderRadius:4, padding:"2px 10px" }}>
              Actuals through {lastUpdated}
            </span>
          )}
        </div>

        {/* Top controls */}
        <div style={{ display:"flex", gap:8, marginBottom:20, marginTop:12, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{...divider}}>
            {["bda","sbc"].map(u => (
              <button key={u} onClick={() => { setUniverse(u); setInspectRep(null); }}
                style={{...btn(universe===u), textTransform:"uppercase", letterSpacing:1}}>{u}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {[["overview","Overview"],["detail","Detail"]].map(([val,label]) => (
              <button key={val} onClick={() => setActiveTab(val)} style={{...btn(activeTab===val)}}>{label}</button>
            ))}
          </div>
          {activeTab === "detail" && (
            <div style={{ display:"flex", gap:8, alignItems:"center", marginLeft:8 }}>
              <span style={{ color:"#555", fontSize:11 }}>From</span>
              <select value={dateStart || ""} onChange={e => setDateStart(e.target.value || null)}
                style={{ background:"#1e2d4a", color:"#aaa", border:"1px solid #2a3a5a",
                  borderRadius:4, padding:"5px 8px", fontSize:12, cursor:"pointer", outline:"none" }}>
                <option value="">Start</option>
                {allDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span style={{ color:"#555", fontSize:11 }}>To</span>
              <select value={dateEnd || ""} onChange={e => setDateEnd(e.target.value || null)}
                style={{ background:"#1e2d4a", color:"#aaa", border:"1px solid #2a3a5a",
                  borderRadius:4, padding:"5px 8px", fontSize:12, cursor:"pointer", outline:"none" }}>
                <option value="">End</option>
                {allDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {(dateStart || dateEnd) && (
                <button onClick={() => { setDateStart(null); setDateEnd(null); }}
                  style={{ padding:"4px 10px", fontSize:11, borderRadius:4, border:"1px solid #555",
                    background:"transparent", color:"#888", cursor:"pointer" }}>Reset</button>
              )}
            </div>
          )}
        </div>

        {/* â”€â”€ OVERVIEW TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === "overview" && (
          <div>
            <div style={{ background:"#0f1f3d", border:"1px solid #1e2d4a", borderRadius:6,
              padding:"8px 16px", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ color:"#aaa", fontSize:12 }}>â„¹</span>
              <span style={{ color:"#aaa", fontSize:12, fontStyle:"italic" }}>
                Actuals only â€” no projections included in this view
              </span>
            </div>

            {/* KPI Cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
              {[
                { label:"TEAM AVG RECOVERY", val: `${Math.round(kpis.avgPC * 100)}%`,
                  color: kpis.avgPC >= 1 ? "#4CAF50" : "#E91E63" },
                { label:"REPS AT BREAKEVEN",
                  val: `${kpis.atBE} / ${kpis.total}`,
                  color: kpis.atBE === kpis.total ? "#4CAF50" : kpis.atBE > 0 ? "#FFC107" : "#E91E63" },
                { label:"TOTAL INVESTED",    val: fmt$(kpis.totalInvested),  color:"#E91E63" },
                { label:"TOTAL RECOVERED",   val: fmt$(kpis.totalRecovered), color:"#4CAF50" },
              ].map(card => (
                <div key={card.label} style={{ background:"#111827", borderRadius:8, padding:"16px 20px",
                  border:"1px solid #1e2d4a" }}>
                  <div style={{ fontSize:10, color:"#555", fontWeight:600, letterSpacing:1, marginBottom:8 }}>{card.label}</div>
                  <div style={{ fontSize:28, fontWeight:800, color:card.color }}>{card.val}</div>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            {(() => {
              const maxPct = Math.max(...overviewData.map(d => d.pct ?? 0), 210);
              const bePos  = (100 / maxPct) * 100;
              return (
                <div style={{ background:"#111827", borderRadius:8, padding:"18px 24px", marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#2196F3", letterSpacing:0.5 }}>
                      PROFIT GENERATED VS. COSTS â€” click to inspect
                    </div>
                  </div>
                  {overviewData.map((d, i) => {
                    const color = d.pc >= 1 ? "#4CAF50" : (d.pc > 0 ? "#FFC107" : "#E91E63");
                    const barW  = Math.min((d.pct ?? 0) / maxPct * 100, 99);
                    const isSel = inspectRep === d.rep;
                    const tenure = REP_TENURE[d.rep];
                    return (
                      <div key={d.rep} onClick={() => setInspectRep(isSel ? null : d.rep)}
                        style={{ display:"flex", alignItems:"center", gap:12, marginBottom:9, cursor:"pointer" }}>
                        <div style={{ width:160, textAlign:"right", fontSize:12, flexShrink:0,
                          color: isSel ? "#fff" : "#aaa", fontWeight: isSel ? 700 : 400 }}>
                          {d.rep}
                          {tenure != null && (
                            <span style={{ fontSize:10, color:"#607D8B", marginLeft:5 }}>
                              {tenure}mo
                            </span>
                          )}
                        </div>
                        <div style={{ flex:1, background:"#0f1f3d", borderRadius:4, height:26, position:"relative" }}>
                          <div style={{
                            width:`${barW}%`, height:"100%", borderRadius:4,
                            background: isSel ? color+"44" : color+"22",
                            border:`1px solid ${color}${isSel ? "cc" : "55"}`,
                            display:"flex", alignItems:"center",
                            paddingLeft:10, boxSizing:"border-box", transition:"all 0.2s",
                          }}>
                            <span style={{ fontSize:11, fontWeight:700, color: isSel ? color : color+"cc" }}>
                              {d.pct}%
                            </span>
                          </div>
                          <div style={{ position:"absolute", left:`${bePos}%`,
                            top:-6, width:1.5, height:38, background:"#FFD700", zIndex:2 }}>
                            {i === 0 && (
                              <div style={{ position:"absolute", top:-15, left:-22,
                                fontSize:9, color:"#FFD700", whiteSpace:"nowrap" }}>
                                100% breakeven
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display:"flex", gap:20, marginTop:14 }}>
                    {[
                      { color:"#4CAF50", label:"Above breakeven (â‰¥100%)" },
                      { color:"#FFC107", label:"Profitable but recovering (0â€“99%)" },
                      { color:"#E91E63", label:"Not yet profitable (<0%)" },
                    ].map(l => (
                      <div key={l.label} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#607D8B" }}>
                        <div style={{ width:10, height:10, borderRadius:2, background:l.color }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Inspect panel */}
            {inspectRep && (() => {
              const d = overviewData.find(x => x.rep === inspectRep);
              if (!d) return null;
              const isAbove = d.pc >= 1;
              const color   = d.pc >= 1 ? "#4CAF50" : d.pc > 0 ? "#FFC107" : "#E91E63";
              const dollarPer = d.pc != null ? d.pc.toFixed(2) : "â€”";
              return (
                <div style={{ background:"#111827", borderRadius:8, padding:"18px 24px",
                  marginBottom:20, borderLeft:`3px solid ${color}` }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#2196F3", letterSpacing:0.5, marginBottom:16 }}>
                    {inspectRep.toUpperCase()} Â· BREAKDOWN
                  </div>
                  <div style={{ display:"flex", gap:40, flexWrap:"wrap", marginBottom:18 }}>
                    {[
                      { label:"COST RECOVERY",          val:`${d.pct}%`,        color, big:true },
                      { label:"PROFIT GENERATED",       val:fmt$(d.rpr),        color:"#4CAF50" },
                      { label:"TOTAL COST INCURRED",    val:fmt$(d.ccost),      color:"#E91E63" },
                      { label:"RETURN PER $1 INVESTED", val:`$${dollarPer}`,    color },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ fontSize:10, color:"#888", textTransform:"uppercase",
                          letterSpacing:0.5, marginBottom:4 }}>{item.label}</div>
                        <div style={{ fontSize: item.big ? 30 : 18, fontWeight:800, color:item.color }}>
                          {item.val}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:10, color:"#555", marginBottom:6 }}>Progress toward breakeven (100%)</div>
                  <div style={{ background:"#0f1f3d", borderRadius:4, height:8, position:"relative" }}>
                    <div style={{ width:`${Math.min(d.pct ?? 0, 100)}%`, height:"100%",
                      borderRadius:4, background:color, transition:"width 0.4s ease" }} />
                  </div>
                  {isAbove && (
                    <div style={{ fontSize:11, color:"#4CAF50", marginTop:8, fontWeight:700 }}>
                      âœ“ Breakeven cleared â€” generating net return
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* â”€â”€ DETAIL TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === "detail" && (
          <div>

        {/* Projection Panel */}
        <div style={{ background:"#111827", borderRadius:8, padding:"16px 20px", marginBottom:20,
          border:"1px solid #1e3a6e" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#2196F3", marginBottom:14, letterSpacing:0.5 }}>
            REVENUE PROJECTION TOOL
          </div>
          <div style={{ display:"flex", gap:32, alignItems:"flex-start" }}>

            {/* LEFT â€” Inputs */}
            <div style={{ display:"flex", gap:16, flexWrap:"wrap", alignItems:"flex-end", flex:1 }}>

              {/* Rep dropdown */}
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ fontSize:11, color:"#aaa" }}>Rep</label>
                <select value={projRep} onChange={e => { setProjRep(e.target.value); setProjection(null); }}
                  style={{ background:"#0f1f3d", color:"#fff", border:"1px solid #2a3a5a",
                    borderRadius:4, padding:"8px 12px", fontSize:13, cursor:"pointer", outline:"none", minWidth:200 }}>
                  <option value="">Select rep...</option>
                  {activeList.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Projected revenue */}
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ fontSize:11, color:"#aaa" }}>Projected Revenue ($)</label>
                <input type="text" value={projRevenue}
                  onChange={e => { setProjRevenue(e.target.value); setProjection(null); }}
                  placeholder="e.g. 45000"
                  style={{ background:"#0f1f3d", color:"#fff", border:"1px solid #2a3a5a",
                    borderRadius:4, padding:"8px 12px", fontSize:13, outline:"none", width:160 }} />
              </div>

              {/* Months */}
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ fontSize:11, color:"#aaa" }}>Months until revenue hits</label>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <input type="number" value={projMonths} min={1} max={24}
                    onChange={e => { setProjMonths(e.target.value); setProjection(null); }}
                    placeholder="e.g. 3"
                    style={{ background:"#0f1f3d", color:"#fff", border:"1px solid #2a3a5a",
                      borderRadius:4, padding:"8px 12px", fontSize:13, outline:"none", width:90 }} />
                  {projMonths && !isNaN(parseInt(projMonths)) && (() => {
                    const lastDate = pcData[pcData.length - 1]?.date;
                    if (!lastDate) return null;
                    const target = futureMonths(lastDate, parseInt(projMonths));
                    return <span style={{ color:"#FFD700", fontSize:13, fontWeight:600 }}>â†’ {target[target.length-1]}</span>;
                  })()}
                </div>
              </div>

              {/* Commission rates toggle */}
              <button onClick={() => setShowRates(s => !s)}
                style={{ padding:"6px 12px", borderRadius:4, border:"1px solid #1e2d4a",
                  background:"transparent", color:"#607D8B", fontSize:11, cursor:"pointer",
                  alignSelf:"flex-end", display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:13 }}>â„¹</span>
                {showRates ? "Hide rates" : "Commission rates"}
              </button>

              {/* Buttons */}
              <button onClick={runProjection}
                style={{ padding:"8px 20px", borderRadius:4, border:"none", background:"#2196F3",
                  color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", alignSelf:"flex-end" }}>
                Calculate
              </button>
              {projection && (
                <button onClick={clearProjection}
                  style={{ padding:"8px 14px", borderRadius:4, border:"1px solid #555",
                    background:"transparent", color:"#888", fontSize:12, cursor:"pointer", alignSelf:"flex-end" }}>
                  Clear
                </button>
              )}
            </div>

            {/* Commission rates table â€” collapsible */}
            {showRates && (
              <div style={{ width:"100%", marginTop:4, background:"#0a0f1e",
                border:"1px solid #1e2d4a", borderRadius:6, padding:"12px 16px" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid #1e2d4a" }}>
                      {["Rep","Tenure","BDA Comm","Note"].map(h => (
                        <th key={h} style={{ textAlign: h==="Rep"||h==="Note" ? "left" : "center",
                          padding:"4px 10px", fontSize:10, color:"#607D8B",
                          textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeList.map((rep, i) => {
                      const rate    = BDA_COMM_RATE[rep] ?? 0.10;
                      const tenure  = REP_TENURE[rep] ?? "â€”";
                      const isHigh  = rate >= 0.10;
                      return (
                        <tr key={rep} style={{ borderBottom:"1px solid #111827",
                          background: i % 2 === 0 ? "transparent" : "#0d1829" }}>
                          <td style={{ padding:"6px 10px", color:"#dde4f0" }}>{rep}</td>
                          <td style={{ padding:"6px 10px", textAlign:"center", color:"#607D8B" }}>{tenure} mo</td>
                          <td style={{ padding:"6px 10px", textAlign:"center" }}>
                            <span style={{
                              padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:600,
                              background: isHigh ? "rgba(76,175,80,0.12)" : "rgba(255,193,7,0.12)",
                              color: isHigh ? "#4CAF50" : "#FFC107",
                              border: `1px solid ${isHigh ? "rgba(76,175,80,0.3)" : "rgba(255,193,7,0.3)"}`
                            }}>{Math.round(rate * 100)}%</span>
                          </td>
                          <td style={{ padding:"6px 10px", fontSize:11, color:"#607D8B" }}>
                            {tenure >= 12 ? "12+ months" : "Under 12 months"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ marginTop:8, fontSize:11, color:"#3d4f6e" }}>
                  Assoc. comm: 25% for all reps Â· Payroll tax: 12% on salary + BDA comm
                </div>
              </div>
            )}

            {/* RIGHT â€” Output column */}
            <div style={{ minWidth:260, borderLeft:"1px solid #1e2d4a", paddingLeft:24, display:"flex", flexDirection:"column", gap:12 }}>
              {projRep && projMonths && !isNaN(parseInt(projMonths)) && projRevenue && !isNaN(parseFloat(projRevenue)) && (
                <div style={{ fontSize:12, color:"#607D8B" }}>
                  Additional cost for {projRep.split(" ")[0]} over {projMonths} mo:{" "}
                  <span style={{ color:"#E91E63", fontWeight:700 }}>
                    {(() => {
                      const rev     = parseFloat(projRevenue.replace(/[^0-9.-]/g,""));
                      const mo      = parseInt(projMonths);
                      const sal     = (REP_MONTHLY_COST[projRep] || 4200) * mo;
                      const bdaRate = BDA_COMM_RATE[projRep] ?? 0.10;
                      const bda     = rev * bdaRate;
                      const asc     = rev * 0.25;
                      const tax     = (sal + bda) * 0.12;
                      return fmt$(sal + bda + asc + tax);
                    })()}
                  </span>
                  <span style={{ color:"#444", marginLeft:8, fontSize:11 }}>
                    (salary + BDA comm {Math.round((BDA_COMM_RATE[projRep] ?? 0.10) * 100)}% + assoc comm 25% + payroll tax 12%)
                  </span>
                </div>
              )}
              {projection ? (
                <>
                  {[
                    { label:"Current RPr",              val: fmt$(projection.currentRPr),        color:"#aaa" },
                    { label:"Current P+/-C",            val: fmtPC(projection.currentPC),        color: projection.currentPC >= 1 ? "#4CAF50" : "#E91E63" },
                    { label:"Projected Cumulated Cost", val: fmt$(projection.finalCCost),        color:"#E91E63" },
                    { label:"Profit In",                val: fmt$(projection.finalRPr - projection.currentRPr), color:"#4CAF50" },
                    { label:"Projected RPr",            val: fmt$(projection.finalRPr),          color: projection.finalRPr >= 0 ? "#4CAF50" : "#E91E63" },
                    { label:"Projected P+/-C",          val: fmtPC(projection.finalPC),          color: projection.finalPC >= 1 ? "#4CAF50" : "#E91E63", bold:true },
                  ].map(item => (
                    <div key={item.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:12 }}>
                      <span style={{ fontSize:13, color:"#b0bec5" }}>{item.label}</span>
                      <span style={{ fontSize: item.bold ? 18 : 15, fontWeight: item.bold ? 800 : 600, color:item.color }}>
                        {item.val}
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop:4, textAlign:"center", padding:"6px 12px", borderRadius:4,
                    fontWeight:700, fontSize:13,
                    color: projection.finalPC >= 1 ? "#4CAF50" : "#E91E63",
                    background: projection.finalPC >= 1 ? "#4CAF5022" : "#E91E6322",
                    border:`1px solid ${projection.finalPC >= 1 ? "#4CAF50" : "#E91E63"}` }}>
                    {projection.finalPC >= 1 ? "âœ“ BREAKEVEN" : "âœ— STILL UNDERWATER"}
                  </div>
                </>
              ) : (
                <div style={{ fontSize:12, color:"#2a3a55", fontStyle:"italic" }}>
                  Results will appear here after Calculate
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Chart */}
        <div style={{ background:"#111827", borderRadius:8, padding:"16px 8px 8px", marginBottom:20 }}>
          <div style={{ color:"#aaa", fontSize:11, paddingLeft:16, marginBottom:8 }}>
            P+/-C = RPr Ã· |Total Direct Cost|. &nbsp;
            <span style={{ color:"#4CAF50" }}>Above 1.0x = payback zone</span>
            &nbsp;Â·&nbsp;
            <span style={{ color:"#E91E63" }}>Below 1.0x = underwater</span>
            {projection && <span style={{ color:"#FFD700", marginLeft:12 }}>â€” â€” Dotted = projected path for {projection.rep}</span>}
          </div>
          <ResponsiveContainer width="100%" height={440}>
            <LineChart data={chartData} margin={{ top:8, right:160, left:10, bottom:4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
              <ReferenceArea y1={1.0} y2={4.0}  fill="#4CAF50" fillOpacity={0.08} ifOverflow="extendDomain" />
              <ReferenceArea y1={-2.0} y2={1.0} fill="#E91E63" fillOpacity={0.07} ifOverflow="extendDomain" />
              <XAxis dataKey="date" ticks={ticks} tick={{ fill:"#666", fontSize:11 }}
                axisLine={{ stroke:"#1e2d4a" }} tickLine={false} />
              <YAxis tickFormatter={yFmt} tick={{ fill:"#666", fontSize:11 }}
                axisLine={{ stroke:"#1e2d4a" }} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip rprLookup={rprLookup} />} />
              <ReferenceLine y={1.0} stroke="#FFD700" strokeWidth={1.5} strokeDasharray="5 3"
                label={{ value:"Breakeven 1.0x", fill:"#FFD700", fontSize:10, position:"insideTopLeft" }} />
              <ReferenceLine y={0} stroke="#333" strokeDasharray="3 3" />
              {activeList.map(rep => activeReps.has(rep) && (
                <Line key={rep} type="monotone" dataKey={rep} stroke={colorMap[rep]}
                  strokeWidth={2} dot={makeEndDot(rep, colorMap[rep], false)} connectNulls={false} />
              ))}
              {projection && (
                <Line key={projection.rep+"â˜…"} type="monotone" dataKey={projection.rep+"â˜…"}
                  stroke={colorMap[projection.rep]} strokeWidth={2} strokeDasharray="6 3"
                  dot={makeEndDot(projection.rep, colorMap[projection.rep], true)}
                  connectNulls={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Rep chips */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", marginBottom:24 }}>
          <button onClick={selectAll} style={{ padding:"4px 10px", fontSize:11, borderRadius:4,
            border:"1px solid #2196F3", background:"transparent", color:"#2196F3", cursor:"pointer" }}>All</button>
          <button onClick={clearAll} style={{ padding:"4px 10px", fontSize:11, borderRadius:4,
            border:"1px solid #555", background:"transparent", color:"#888", cursor:"pointer" }}>None</button>
          {activeList.map(rep => {
            const on = activeReps.has(rep);
            const c  = colorMap[rep];
            const latestPC = [...pcData].reverse().find(row => row[rep] != null)?.[rep];
            return (
              <button key={rep} onClick={() => toggle(rep)} style={{
                padding:"4px 12px", borderRadius:4, border:`1px solid ${c}`,
                background: on ? c+"22" : "transparent",
                color: on ? c : "#555", cursor:"pointer", fontSize:12, fontWeight:600,
                display:"flex", alignItems:"center", gap:6,
              }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background: on ? c : "#333", display:"inline-block" }} />
                {rep}
                <span style={{ fontSize:10, color: on ? c : "#444" }}>{fmtPC(latestPC)}</span>
              </button>
            );
          })}
        </div>

        {/* Horizontal table */}
        {selectedReps.length > 0 && (
          <div style={{ background:"#111827", borderRadius:8, overflow:"hidden", marginBottom:20 }}>
            <div style={{ padding:"10px 16px", borderBottom:"1px solid #1e2d4a", fontSize:12, color:"#aaa", fontWeight:600 }}>
              RPr & C.Cost by Calendar Period â€” Selected Reps
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ borderCollapse:"collapse", fontSize:12, whiteSpace:"nowrap", minWidth:"100%" }}>
                <thead>
                  <tr style={{ background:"#0f1f3d" }}>
                    <th style={{ textAlign:"left", padding:"7px 14px", color:"#aaa", fontWeight:600,
                      position:"sticky", left:0, background:"#0f1f3d", zIndex:2,
                      borderRight:"1px solid #1e2d4a", minWidth:180 }}>Rep</th>
                    <th style={{ textAlign:"left", padding:"7px 10px", color:"#607D8B", fontWeight:600,
                      position:"sticky", left:180, background:"#0f1f3d", zIndex:2,
                      borderRight:"1px solid #1e2d4a", minWidth:70 }}>Figure</th>
                    {pcData.map(row => (
                      <th key={row.date} style={{ textAlign:"right", padding:"7px 12px",
                        color:"#555", fontWeight:500, minWidth:88 }}>{row.date}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedReps.map((rep, i) => {
                    const c   = colorMap[rep];
                    const bg0 = i % 2 === 0 ? "#111827" : "#0d1829";
                    const rprData   = rawRPr.slice(0, pcData.length);
                    const ccostData = rawCCost.slice(0, pcData.length);
                    return (
                      <>
                        <tr key={`${rep}-rpr`} style={{ borderTop:"1px solid #1e2d4a", background: bg0 }}>
                          <td style={{ padding:"7px 14px", position:"sticky", left:0, zIndex:1,
                            background: bg0, borderRight:"1px solid #1e2d4a",
                            display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ width:7, height:7, borderRadius:"50%", background:c, display:"inline-block", flexShrink:0 }} />
                            <span style={{ color:c, fontWeight:600 }}>{rep}</span>
                          </td>
                          <td style={{ padding:"7px 10px", position:"sticky", left:180, zIndex:1,
                            background: bg0, borderRight:"1px solid #1e2d4a",
                            color:"#4CAF50", fontSize:11, fontWeight:600 }}>RPr</td>
                          {rprData.map(row => {
                            const val = row[rep];
                            const isPos = val != null && val >= 0;
                            return (
                              <td key={row.date} style={{ padding:"7px 12px", textAlign:"right",
                                fontWeight: val != null ? 600 : 400,
                                color: val == null ? "#2a3a55" : isPos ? "#4CAF50" : "#E91E63" }}>
                                {val == null ? "â€”" : fmt$(val)}
                              </td>
                            );
                          })}
                        </tr>
                        <tr key={`${rep}-ccost`} style={{ background: bg0 }}>
                          <td style={{ padding:"7px 14px", position:"sticky", left:0, zIndex:1,
                            background: bg0, borderRight:"1px solid #1e2d4a" }} />
                          <td style={{ padding:"7px 10px", position:"sticky", left:180, zIndex:1,
                            background: bg0, borderRight:"1px solid #1e2d4a",
                            color:"#E91E63", fontSize:11, fontWeight:600 }}>C.Cost</td>
                          {ccostData.map(row => {
                            const val = row[rep];
                            return (
                              <td key={row.date} style={{ padding:"7px 12px", textAlign:"right",
                                fontWeight: val != null ? 500 : 400,
                                color: val == null ? "#2a3a55" : "#E91E63" }}>
                                {val == null ? "â€”" : fmt$(val)}
                              </td>
                            );
                          })}
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

          </div>
        )}
      </div>
    </PasswordGate>
  );
}
