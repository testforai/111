import React,{useMemo,useState} from "react";
import{createRoot}from"react-dom/client";
import{Search,ExternalLink,ShieldCheck,Database,GitFork,SlidersHorizontal,ArrowUpRight,Code2,Server,AlertTriangle,CheckCircle2}from"lucide-react";
import scan from "./data/repos.json";
import "./styles.css";

const curated=[
{name:"SongKehao/lingxing-sdk",platform:"领星",type:"SDK/API",grade:"A",fit:94,title:"领星全量 Python SDK",summary:"README 声明覆盖 613 个 OpenAPI、1800+ Pydantic 模型，具备 Token、限流、重试和分页。",use:"优先审计为 Linux 后端领星适配层",risk:"接口覆盖与模型绑定比例仍需逐项验证",tags:["Python","异步","类型安全","OpenAPI"]},
{name:"zach22-1999/lingxing-mcp",platform:"领星",type:"MCP",grade:"A",fit:92,title:"领星只读 MCP 与固定出口网关",summary:"覆盖店铺、销量、广告、订单、利润、FBA 库存和报告解析，强调固定出口、多人令牌与主凭证集中。",use:"参考只读 AI 访问层和固定出口部署",risk:"README 标记 Audit Passed / Not Pushed，成熟度需复核",tags:["MCP","只读","固定出口","Linux"]},
{name:"bryce-code-world/lingxing-ipass",platform:"领星",type:"业务程序",grade:"A",fit:90,title:"DSCO 同步领星服务",summary:"Go + Gin + PostgreSQL + Cron 的服务化集成，含 Admin、健康检查、锁、迁移与 Docker。",use:"参考后端同步、调度和数据库设计",risk:"真实接口联调测试需要凭证，写入边界需审计",tags:["Go","PostgreSQL","Cron","Docker"]},
{name:"AresJef/LingXingApi",platform:"领星",type:"SDK/API",grade:"B",fit:82,title:"轻量异步领星客户端",summary:"Python 3.10+ 异步客户端，已发布 PyPI，适合较小范围快速接入。",use:"作为轻量 SDK 对照实现",risk:"覆盖面小于 SongKehao 版本",tags:["Python","aiohttp","PyPI"]},
{name:"Wangggod/lingxing_erp_exporter",platform:"领星",type:"业务程序",grade:"C",fit:58,title:"领星数据导出与飞书 ETL",summary:"自动登录下载领星数据，聚合后上传飞书多维表格，包含定时和清理。",use:"只参考 ETL 分层和飞书上传",risk:"依赖浏览器模拟登录，生产事实链不应采用",tags:["Playwright","飞书","ETL"]},
{name:"pholex/lingxing-warehouse-assignment",platform:"领星",type:"业务程序",grade:"B",fit:74,title:"领星仓库分配规则生成",summary:"按美国邮编前三位与仓库配送天数生成优先级规则和 SQL 视图。",use:"参考海外仓分仓规则建模",risk:"是专项组件，不含 OpenAPI 同步",tags:["MySQL","仓库","邮编规则"]},
{name:"xiaoguo0426/hyperf-admin-amazon",platform:"Amazon",type:"业务程序",grade:"A",fit:91,title:"多商户 Amazon SP-API 后端",summary:"Hyperf/Swoole 后端，包含多商户多店铺、报告任务、Redis 队列、定时调度和日志。",use:"参考 Linux 报告采集、队列与多店铺模型",risk:"作者明确不保证代码正确，必须安全审计",tags:["PHP","Hyperf","Redis","SP-API"]},
{name:"saleweaver/python-amazon-sp-api",platform:"Amazon",type:"SDK/API",grade:"A",fit:88,title:"成熟 Python SP-API 封装",summary:"覆盖 Selling Partner API 常用能力，是 Python 生态的重要底座候选。",use:"作为 Amazon 采集适配层候选",risk:"接入前核对最新端点版本和限流实现",tags:["Python","SP-API","SDK"]},
{name:"amzn/selling-partner-api-sdk",platform:"Amazon",type:"SDK/API",grade:"A",fit:87,title:"Amazon 官方 SP-API SDK",summary:"官方多语言 SDK，适合作为接口模型和正确性基准。",use:"作为正式接口与版本基线",risk:"不是完整业务系统，仍需任务、缓存和审计层",tags:["官方","Java","PHP","JS","Python","C#"]},
{name:"Cloud-Dev77/Amazon_Seller_Data_Extract",platform:"Amazon",type:"业务程序",grade:"B",fit:71,title:"Amazon Ads 报告中间件",summary:"Flask 应用，包含 OAuth、Token/Profile 缓存、SP/SD 广告报表与 Power BI 接入。",use:"参考广告报表下载和 BI 输出",risk:"工程体量较小，生产可靠性待验证",tags:["Flask","Amazon Ads","Power BI"]},
{name:"SHCSCA/amazon-ai-ops",platform:"Amazon",type:"业务程序",grade:"B",fit:79,title:"领星驱动的 Amazon AI Ops 工作台",summary:"将报表采集、广告诊断、AI 建议、人工审批和执行回读串成审计闭环。",use:"参考业务流程、审批、证据和 UI 信息架构",risk:"项目自标 APP_NEEDS_WORK，且 Windows 桌面架构不适合作为本项目底座",tags:["Electron","React","审批","审计"]},
{name:"lineofflight/peddler",platform:"Amazon",type:"SDK/API",grade:"B",fit:78,title:"Python SP-API 客户端",summary:"长期存在的 Amazon API Python 客户端，可与其他 Python SDK 交叉对比。",use:"用于端点实现和兼容性参考",risk:"需核对 MWS 历史代码与当前 SP-API 边界",tags:["Python","SP-API"]},
{name:"hendt/ebay-api",platform:"eBay",type:"SDK/API",grade:"A",fit:94,title:"eBay TypeScript 全接口客户端",summary:"同时覆盖 REST 与传统 XML API，包含 Sell、Buy、Commerce、Trading、OAuth 与数字签名。",use:"首选 eBay Linux 后端 SDK 候选",risk:"浏览器代理示例不应进入生产密钥链路",tags:["TypeScript","Sell API","Trading API","OAuth"]},
{name:"YosefHayim/ebay-mcp",platform:"eBay",type:"MCP",grade:"A",fit:90,title:"eBay 全接口 MCP",summary:"README 声明 322 个工具、覆盖 Sell API 的库存、履约、营销、分析和开发者能力。",use:"作为接口覆盖清单和 AI 工具层参考",risk:"不能替代 ERP 后端快照、权限与 api_call_logs",tags:["MCP","TypeScript","322 tools","MIT"]},
{name:"hoiung/ebay-seller-tool",platform:"eBay",type:"业务程序",grade:"A",fit:89,title:"真实卖家 Listing 管理工具",summary:"支持创建/修改刊登、批量描述、图片上传、活动 Listing、Best Offer 和竞品价格。",use:"参考 Listing 工作流、dry-run 与字段校验",risk:"部分运营规则来自私有 overlay，公开版并非完整系统",tags:["Python","MCP","Listing","Dry-run"]},
{name:"timotheus/ebaysdk-python",platform:"eBay",type:"SDK/API",grade:"B",fit:82,title:"Python eBay SDK",summary:"Python 生态常用 eBay SDK，可用于传统 API 与部分业务调用。",use:"Python 技术栈备选",risk:"需核对新 Sell API 的覆盖程度",tags:["Python","SDK"]},
{name:"jakebildy/sellustrate",platform:"eBay",type:"业务程序",grade:"C",fit:55,title:"拍照生成 eBay Listing 原型",summary:"利用图像识别匹配类目、相似商品与价格并生成刊登。",use:"仅参考拍照建档和刊登交互",risk:"Hackathon 老项目，技术和接口可能过时",tags:["Android","图像识别","Listing"]},
{name:"rickapps/eBay-Sell-Feed-API",platform:"eBay",type:"SDK/API",grade:"B",fit:68,title:"eBay Sell Feed API 专项",summary:"聚焦批量 Feed 流程，可作为大批量商品同步的专项参考。",use:"参考批量数据提交",risk:"功能面窄，需要并入统一适配层",tags:["Feed API","批量"]},
];

const fmt=n=>new Intl.NumberFormat("zh-CN").format(n);
function App(){
 const [platform,setPlatform]=useState("全部");
 const [type,setType]=useState("全部");
 const [q,setQ]=useState("");
 const [catalogOnly,setCatalogOnly]=useState(false);
 const [sort,setSort]=useState("score");
 const repos=useMemo(()=>scan.repositories.filter(r=>{
  const matchP=platform==="全部"||r.platform===platform;
  const matchT=type==="全部"||r.type===type;
  const text=(r.name+" "+r.queries.join(" ")).toLowerCase();
  return matchP&&matchT&&text.includes(q.toLowerCase())&&(!catalogOnly||r.score>=6);
 }).sort((a,b)=>sort==="size"?b.size-a.size:b.score-a.score),[platform,type,q,catalogOnly,sort]);
 const picks=curated.filter(x=>(platform==="全部"||x.platform===platform)&&(type==="全部"||x.type===type)&&(x.name+" "+x.title+" "+x.tags.join(" ")).toLowerCase().includes(q.toLowerCase()));
 return <div className="app">
  <header className="hero">
   <nav><div className="brand"><Code2 size={18}/> 跨境开发雷达</div><a href="#catalog">仓库总表 <ArrowUpRight size={15}/></a></nav>
   <div className="hero-grid"><div><p className="eyebrow">GITHUB LANDSCAPE · 2026-07-25</p><h1>Amazon、eBay、领星<br/><span>二次开发项目全景报告</span></h1><p className="lead">从 1,358 个去重仓库中识别真正可复用的 SDK、业务系统、MCP 与专项工具。重点不是“搜到多少”，而是哪些值得进入智能 ERP 的技术评估。</p><div className="hero-actions"><a className="primary" href="#picks">查看优先候选</a><a className="ghost" href="#method">了解扫描口径</a></div></div>
   <div className="scan-card"><div className="scan-orbit"><span>1,358</span><small>去重仓库</small></div><div className="scan-list"><p><CheckCircle2/>20 组关键词覆盖</p><p><CheckCircle2/>10 组核心词翻至第 4 页</p><p><CheckCircle2/>README 深度核验</p><p><AlertTriangle/>自动标签不等于代码审计</p></div></div></div>
  </header>
  <main>
   <section className="metrics">
    <article><Database/><span>{fmt(scan.method.rawHits)}</span><p>搜索命中</p></article>
    <article><GitFork/><span>{fmt(scan.method.uniqueRepositories)}</span><p>去重仓库</p></article>
    <article><ShieldCheck/><span>{curated.filter(x=>x.grade==="A").length}</span><p>A 级候选</p></article>
    <article><Server/><span>2</span><p>账号授权仓库</p></article>
   </section>
   <section className="decision"><div><p className="eyebrow">EXECUTIVE TAKEAWAY</p><h2>六个项目值得立即进入技术审计</h2></div><div className="decision-grid">
    {["SongKehao/lingxing-sdk","zach22-1999/lingxing-mcp","bryce-code-world/lingxing-ipass","xiaoguo0426/hyperf-admin-amazon","hendt/ebay-api","hoiung/ebay-seller-tool"].map(n=>{const x=curated.find(c=>c.name===n);return <a key={n} href={"https://github.com/"+n} target="_blank"><span>{x.platform}</span><strong>{x.title}</strong><small>{x.use}</small><ArrowUpRight/></a>})}
   </div></section>
   <section id="picks" className="section">
    <div className="section-head"><div><p className="eyebrow">CURATED SHORTLIST</p><h2>深度核验候选</h2></div><p>等级综合考虑功能完整度、与 Linux 后端架构的契合度、数据源边界和可复用性。</p></div>
    <FilterBar {...{q,setQ,platform,setPlatform,type,setType,sort,setSort,catalogOnly,setCatalogOnly}}/>
    <div className="cards">{picks.map(x=><article className="repo-card" key={x.name}>
      <div className="card-top"><div><span className={"grade g"+x.grade}>{x.grade}</span><span className="platform">{x.platform}</span><span className="type">{x.type}</span></div><b>{x.fit}<small>/100</small></b></div>
      <h3>{x.title}</h3><a className="repo-name" href={"https://github.com/"+x.name} target="_blank">{x.name}<ExternalLink size={14}/></a>
      <p>{x.summary}</p><div className="fact good"><strong>建议用途</strong>{x.use}</div><div className="fact risk"><strong>主要风险</strong>{x.risk}</div>
      <div className="tags">{x.tags.map(t=><span key={t}>{t}</span>)}</div>
    </article>)}</div>
   </section>
   <section className="architecture"><div><p className="eyebrow">RECOMMENDED ARCHITECTURE</p><h2>开源项目应被放在正确的层</h2></div><div className="layers">
    <article><span>01</span><h3>平台适配层</h3><p>Amazon SP-API、eBay Sell/Trading API、领星 OpenAPI SDK。仅负责鉴权、限流、分页和字段映射。</p></article>
    <article><span>02</span><h3>Linux 后端事实层</h3><p>任务队列、幂等刷新、不可变字段保护、历史封账、本地快照与 api_call_logs。</p></article>
    <article><span>03</span><h3>智能 ERP 应用层</h3><p>前端只读本地后端；AI/MCP 提供分析与建议，不冒充事实源，也不绕开审批直接写平台。</p></article>
   </div></section>
   <section id="catalog" className="section catalog">
    <div className="section-head"><div><p className="eyebrow">FULL CATALOG</p><h2>1,358 个仓库索引</h2></div><p>用于发现线索。名称、体量和搜索命中来自 GitHub；“类型”和相关度为自动分类，需在采用前复核。</p></div>
    <div className="table-wrap"><table><thead><tr><th>仓库</th><th>平台</th><th>自动分类</th><th>相关度</th><th>仓库体量</th><th>命中词</th></tr></thead><tbody>{repos.slice(0,400).map(r=><tr key={r.name}><td><a href={r.url} target="_blank">{r.name}<ExternalLink size={12}/></a>{r.archived&&<em>已归档</em>}</td><td><span className={"pill "+r.platform}>{r.platform}</span></td><td>{r.type}</td><td><div className="score"><i style={{width:Math.min(100,r.score*10)+"%"}}></i></div></td><td>{fmt(r.size)} KB</td><td>{r.queries.slice(0,2).join(" · ")||"名称匹配"}</td></tr>)}</tbody></table></div>
    {repos.length>400&&<p className="table-note">当前筛选共 {fmt(repos.length)} 项，为保证浏览性能显示前 400 项；继续缩小关键词或平台即可定位其余仓库。</p>}
   </section>
   <section id="method" className="method">
    <div><p className="eyebrow">METHODOLOGY</p><h2>扫描口径与限制</h2></div><div className="method-grid">
     <article><span>01</span><h3>仓库搜索</h3><p>20 组中英文关键词覆盖 SP-API、Seller、Ads、ERP、Sell API、Inventory、Order、LingXing/OpenAPI/MCP。</p></article>
     <article><span>02</span><h3>分页扩展</h3><p>对 10 组核心词抓取前 4 页。累计 1,534 条命中，按 owner/repo 去重后为 1,358 个仓库。</p></article>
     <article><span>03</span><h3>深度核验</h3><p>重点候选读取 README，判断是否真接平台 API、是否含后端任务/缓存/审计，以及是否只是 Demo 或分叉。</p></article>
     <article><span>04</span><h3>明确边界</h3><p>本报告不是安全审计或许可证法律意见。星标、更新时间、完整依赖与密钥泄露检查应在最终选型时重新采集。</p></article>
    </div>
   </section>
  </main>
  <footer><div><strong>跨境平台二次开发项目雷达</strong><p>为智能 ERP 技术选型提供可追溯线索。</p></div><p>数据日期：2026-07-25 · GitHub 公共仓库 + 已授权仓库</p></footer>
 </div>
}
function FilterBar(p){return <div className="filters"><label><Search size={17}/><input value={p.q} onChange={e=>p.setQ(e.target.value)} placeholder="搜索仓库、技术栈或能力"/></label><div className="seg">{["全部","Amazon","eBay","领星"].map(x=><button className={p.platform===x?"active":""} onClick={()=>p.setPlatform(x)} key={x}>{x}</button>)}</div><select value={p.type} onChange={e=>p.setType(e.target.value)} aria-label="类型"><option>全部</option><option>业务程序</option><option>SDK/API</option><option>MCP</option><option>待核验</option></select><select value={p.sort} onChange={e=>p.setSort(e.target.value)} aria-label="排序"><option value="score">相关度</option><option value="size">仓库体量</option></select><button className={"quality "+(p.catalogOnly?"on":"")} onClick={()=>p.setCatalogOnly(!p.catalogOnly)}><SlidersHorizontal size={16}/>高相关</button></div>}
createRoot(document.getElementById("root")).render(<App/>);