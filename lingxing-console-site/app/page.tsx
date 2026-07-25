"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import catalog from "@/generated/endpoints.json";

type Param = { name:string; type:string; required:boolean; default:unknown; description:string };
type Endpoint = {
  id:string; module:string; moduleName:string; name:string; title:string; method:"GET"|"POST";
  route:string; risk:"read"|"review"|"write"; riskText:string; params:Param[]; doc:string;
};
type HistoryItem = {
  id:string; endpointId:string; route:string; method:string; status:string; responseCode:string|null;
  durationMs:number; errorMessage:string|null; createdAt:number;
};
const endpoints = catalog.endpoints as Endpoint[];
const modules = catalog.modules as Array<{id:string;name:string;count:number}>;

function formatTime(value:number) {
  return new Intl.DateTimeFormat("zh-CN", { month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit" }).format(value);
}
function inputKind(type:string) {
  const value = type.toLowerCase();
  if (value.includes("list") || value.includes("dict") || value.includes("any") || value.includes("object")) return "json";
  if (value.includes("bool")) return "bool";
  if (value.includes("int") || value.includes("float") || value.includes("number")) return "number";
  return "text";
}
function parseInput(param:Param, value:string) {
  if (!value.trim()) return undefined;
  const kind = inputKind(param.type);
  if (kind === "json") return JSON.parse(value);
  if (kind === "number") return Number(value);
  if (kind === "bool") return value === "true";
  return value;
}
export default function ConsolePage() {
  const [moduleId,setModuleId] = useState("all");
  const [search,setSearch] = useState("");
  const [selectedId,setSelectedId] = useState(endpoints[0]?.id || "");
  const [values,setValues] = useState<Record<string,string>>({});
  const [configured,setConfigured] = useState(false);
  const [appId,setAppId] = useState("");
  const [appSecret,setAppSecret] = useState("");
  const [showSetup,setShowSetup] = useState(false);
  const [profileMessage,setProfileMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [response,setResponse] = useState<unknown>(null);
  const [history,setHistory] = useState<HistoryItem[]>([]);
  const [tab,setTab] = useState<"console"|"history">("console");
  const [confirmWrite,setConfirmWrite] = useState(false);

  const filtered = useMemo(() => endpoints.filter((item) => {
    if (moduleId !== "all" && item.module !== moduleId) return false;
    const q = search.trim().toLowerCase();
    return !q || [item.title,item.name,item.route,item.moduleName].some((value) => value.toLowerCase().includes(q));
  }),[moduleId,search]);
  const selected = endpoints.find((item) => item.id === selectedId) || filtered[0] || endpoints[0];

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((data) => {
      setConfigured(Boolean(data.configured));
      if (data.profile?.appId) setAppId(data.profile.appId);
      if (!data.configured) setShowSetup(true);
    }).catch(() => setShowSetup(true));
  },[]);
  useEffect(() => {
    setValues(Object.fromEntries((selected?.params || []).map((param) => [
      param.name,
      param.default == null ? "" : typeof param.default === "object" ? JSON.stringify(param.default,null,2) : String(param.default)
    ])));
    setResponse(null);
    setConfirmWrite(false);
  },[selected?.id]);

  async function saveProfile(event:FormEvent) {
    event.preventDefault();
    setBusy(true); setProfileMessage("");
    try {
      const r = await fetch("/api/profile", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({appId,appSecret}) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "保存失败");
      setConfigured(true); setAppSecret("");
      setProfileMessage("凭据已加密保存，正在验证认证…");
      const test = await fetch("/api/connection", { method:"POST" });
      const testData = await test.json();
      if (!test.ok) throw new Error(testData.error || "认证失败");
      setProfileMessage("连接成功，Token 已安全缓存");
      window.setTimeout(() => setShowSetup(false),700);
    } catch (error) { setProfileMessage(error instanceof Error ? error.message : "保存失败"); }
    finally { setBusy(false); }
  }
  async function runEndpoint() {
    if (!configured) { setShowSetup(true); return; }
    setBusy(true); setResponse(null);
    try {
      const input:Record<string,unknown> = {};
      for (const param of selected.params) {
        try {
          const parsed = parseInput(param, values[param.name] || "");
          if (parsed !== undefined) input[param.name] = parsed;
        } catch { throw new Error(param.name + " 不是有效的 JSON"); }
      }
      const r = await fetch("/api/call", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({endpointId:selected.id,input,confirmedWrite:confirmWrite})
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "调用失败");
      setResponse(data);
      loadHistory();
    } catch (error) { setResponse({ok:false,error:error instanceof Error ? error.message : "调用失败"}); }
    finally { setBusy(false); }
  }
  async function loadHistory() {
    const r = await fetch("/api/history");
    const data = await r.json();
    if (r.ok) setHistory(data.items || []);
  }
  function openHistory() { setTab("history"); loadHistory(); }

  return <main className="shell">
    <header className="topbar">
      <div className="brand">
        <span className="brandMark">LX</span>
        <div><strong>领星 OpenAPI 控制台</strong><small>独立开发者工作台</small></div>
      </div>
      <nav className="tabs">
        <button className={tab==="console"?"active":""} onClick={()=>setTab("console")}>接口控制台</button>
        <button className={tab==="history"?"active":""} onClick={openHistory}>调用历史</button>
      </nav>
      <div className="topActions">
        <span className={"connection "+(configured?"ready":"waiting")}><i />{configured?"凭据已配置":"等待配置"}</span>
        <button className="outline" onClick={()=>setShowSetup(true)}>连接设置</button>
      </div>
    </header>

    {tab === "console" ? <div className="workspace">
      <aside className="moduleRail">
        <div className="railTitle"><span>接口模块</span><em>{catalog.moduleCount}</em></div>
        <button className={moduleId==="all"?"selected":""} onClick={()=>setModuleId("all")}>
          <span className="moduleIcon">⌘</span><span>全部接口</span><em>{catalog.endpointCount}</em>
        </button>
        {modules.map((module,index)=><button key={module.id} className={moduleId===module.id?"selected":""} onClick={()=>setModuleId(module.id)}>
          <span className="moduleIcon">{String(index+1).padStart(2,"0")}</span><span>{module.name}</span><em>{module.count}</em>
        </button>)}
        <div className="sourceNote">
          <span>SDK SOURCE</span>
          <strong>SongKehao/lingxing-sdk</strong>
          <small>{catalog.upstreamSha.slice(0,7)} · 固定版本</small>
        </div>
      </aside>

      <section className="endpointList">
        <div className="searchBox"><span>⌕</span><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="搜索接口名称、路径或方法…" /></div>
        <div className="listMeta"><strong>{filtered.length} 个接口</strong><span>来自完整 SDK 目录</span></div>
        <div className="endpointScroll">
          {filtered.map((item)=><button key={item.id} className={"endpointItem "+(selected?.id===item.id?"selected":"")} onClick={()=>setSelectedId(item.id)}>
            <span className={"method "+item.method.toLowerCase()}>{item.method}</span>
            <span className="endpointCopy"><strong>{item.title}</strong><small>{item.route}</small></span>
            {item.risk==="write"&&<span className="riskDot" title="写操作" />}
          </button>)}
          {!filtered.length&&<div className="empty">没有匹配的接口</div>}
        </div>
      </section>

      <section className="detail">
        <div className="detailHead">
          <div className="crumb">{selected.moduleName}<span>/</span>{selected.name}</div>
          <div className="titleRow">
            <span className={"method large "+selected.method.toLowerCase()}>{selected.method}</span>
            <div><h1>{selected.title}</h1><code>{selected.route}</code></div>
          </div>
          <div className={"riskBanner "+selected.risk}>
            <strong>{selected.risk==="read"?"只读接口":selected.risk==="write"?"写入型接口":"需确认语义"}</strong>
            <span>{selected.riskText}</span>
          </div>
        </div>
        <div className="detailBody">
          <section className="panel">
            <div className="panelTitle"><div><span>请求参数</span><small>{selected.params.length} 个字段</small></div><span className="contentType">application/json</span></div>
            {selected.params.length ? <div className="params">
              {selected.params.map((param)=><label key={param.name} className={inputKind(param.type)==="json"?"wide":""}>
                <span><code>{param.name}</code>{param.required&&<b>必填</b>}<em>{param.type}</em></span>
                <small>{param.description || "上游 SDK 未提供参数说明"}</small>
                {inputKind(param.type)==="json"
                  ? <textarea value={values[param.name]||""} onChange={(e)=>setValues({...values,[param.name]:e.target.value})} placeholder={param.type.toLowerCase().includes("list")?"[]":"{}"} />
                  : inputKind(param.type)==="bool"
                    ? <select value={values[param.name]||""} onChange={(e)=>setValues({...values,[param.name]:e.target.value})}><option value="">不传</option><option value="true">true</option><option value="false">false</option></select>
                    : <input type={inputKind(param.type)==="number"?"number":"text"} value={values[param.name]||""} onChange={(e)=>setValues({...values,[param.name]:e.target.value})} placeholder={param.required?"请输入必填参数":"选填"} />}
              </label>)}
            </div> : <div className="emptyParams">这个接口不需要业务参数</div>}
            {selected.risk==="write"&&<label className="confirm"><input type="checkbox" checked={confirmWrite} onChange={(e)=>setConfirmWrite(e.target.checked)} /><span>我确认这是写入操作，允许向领星提交修改</span></label>}
            <div className="executeBar">
              <span>Secret 与 Token 不会显示在结果或调用历史中</span>
              <button onClick={runEndpoint} disabled={busy || (selected.risk==="write"&&!confirmWrite)}>{busy?<><i className="spinner" />正在调用</>:<>▶ 发送请求</>}</button>
            </div>
          </section>

          <section className="panel responsePanel">
            <div className="panelTitle"><div><span>响应结果</span><small>自动脱敏</small></div>{response&&<button className="copy" onClick={()=>navigator.clipboard.writeText(JSON.stringify(response,null,2))}>复制 JSON</button>}</div>
            {response ? <pre>{JSON.stringify(response,null,2)}</pre> : <div className="responseEmpty"><span>{ }</span><strong>等待发送请求</strong><small>返回数据将在这里以 JSON 格式展示</small></div>}
          </section>
        </div>
      </section>
    </div> : <section className="historyPage">
      <div className="historyHead"><div><small>审计记录</small><h1>最近100次接口调用</h1><p>只记录接口、状态和耗时，不保存 App Secret、Token 或完整敏感响应。</p></div><button className="outline" onClick={loadHistory}>刷新</button></div>
      <div className="historyTable">
        <div className="historyRow header"><span>时间</span><span>接口</span><span>方法</span><span>状态</span><span>响应码</span><span>耗时</span></div>
        {history.map((item)=><div className="historyRow" key={item.id}>
          <span>{formatTime(item.createdAt)}</span><span><strong>{item.endpointId}</strong><small>{item.route}</small></span>
          <span><b className={"method "+item.method.toLowerCase()}>{item.method}</b></span>
          <span><i className={"status "+item.status} />{item.status}</span><span>{item.responseCode??"—"}</span><span>{item.durationMs} ms</span>
        </div>)}
        {!history.length&&<div className="empty historyEmpty">暂无调用记录，先到接口控制台发送一个请求。</div>}
      </div>
    </section>}

    {showSetup&&<div className="modalBackdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget&&configured)setShowSetup(false)}}>
      <form className="setupModal" onSubmit={saveProfile}>
        <div className="setupHeader"><div><span className="eyebrow">SECURE CONNECTION</span><h2>连接领星 OpenAPI</h2><p>凭据加密保存在独立项目的私有存储中，只由服务器端使用。</p></div>{configured&&<button type="button" onClick={()=>setShowSetup(false)}>×</button>}</div>
        <label><span>OpenAPI 地址</span><input value="https://openapi.lingxing.com" disabled /><small>为防止请求伪造，当前只允许领星官方域名。</small></label>
        <label><span>App ID</span><input value={appId} onChange={(e)=>setAppId(e.target.value)} autoComplete="off" placeholder="请输入领星 App ID" required /></label>
        <label><span>App Secret</span><input type="password" value={appSecret} onChange={(e)=>setAppSecret(e.target.value)} autoComplete="new-password" placeholder={configured?"输入新 Secret 可覆盖原配置":"请输入领星 App Secret"} required /></label>
        <div className="securityNote"><strong>安全说明</strong><span>Secret 不进入页面源码、不写入调用日志，保存后无法从网页读取明文。</span></div>
        {profileMessage&&<div className={"profileMessage "+(profileMessage.includes("成功")?"ok":"")}>{profileMessage}</div>}
        <button className="primary full" disabled={busy}>{busy?"正在验证…":"保存并测试连接"}</button>
      </form>
    </div>}
  </main>;
}
