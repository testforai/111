"use client";
import React,{useMemo,useState} from "react";
import{Search,ExternalLink,ShieldCheck,Database,GitFork,SlidersHorizontal,ArrowUpRight,Code2,Server,AlertTriangle,CheckCircle2}from"lucide-react";
import scan from "../src/data/repos.json";

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
{"name":"hendt/ebay-api","platform":"eBay","type":"SDK/API","grade":"A","fit":94,"title":"eBay TypeScript 10.x REST / Trading 客户端","summary":"支持 Buy Browse 搜索、Inventory/Trading 刊登及 Stores 店铺分类；OAuth2、传统 XML 与数字签名仍保留。10.x 已移除 Finding 和 Sell Compliance，不能再称全接口覆盖。","use":"有条件保留 A 级，优先作为 Node.js 22+ 的 eBay Linux 后端适配层；上线前完成 10.x 调用点迁移与授权回归","risk":"须选含 #221 修复的可验证制品并锁定依赖；10.0.2 为仓库版本，尚未确认对应 GitHub Release。零漏洞是 PR 当时报告；浏览器代理示例不应进入生产密钥链路","tags":["TypeScript","10.x","Browse","Inventory","Trading","Stores","OAuth2"]},
{name:"YosefHayim/ebay-mcp",platform:"eBay",type:"MCP",grade:"A",fit:90,title:"eBay 全接口 MCP",summary:"README 声明 322 个工具、覆盖 Sell API 的库存、履约、营销、分析和开发者能力。",use:"作为接口覆盖清单和 AI 工具层参考",risk:"不能替代 ERP 后端快照、权限与 api_call_logs",tags:["MCP","TypeScript","322 tools","MIT"]},
{name:"hoiung/ebay-seller-tool",platform:"eBay",type:"业务程序",grade:"A",fit:89,title:"真实卖家 Listing 管理工具",summary:"支持创建/修改刊登、批量描述、图片上传、活动 Listing、Best Offer 和竞品价格。",use:"参考 Listing 工作流、dry-run 与字段校验",risk:"部分运营规则来自私有 overlay，公开版并非完整系统",tags:["Python","MCP","Listing","Dry-run"]},
{name:"timotheus/ebaysdk-python",platform:"eBay",type:"SDK/API",grade:"B",fit:82,title:"Python eBay SDK",summary:"Python 生态常用 eBay SDK，可用于传统 API 与部分业务调用。",use:"Python 技术栈备选",risk:"需核对新 Sell API 的覆盖程度",tags:["Python","SDK"]},
{name:"jakebildy/sellustrate",platform:"eBay",type:"业务程序",grade:"C",fit:55,title:"拍照生成 eBay Listing 原型",summary:"利用图像识别匹配类目、相似商品与价格并生成刊登。",use:"仅参考拍照建档和刊登交互",risk:"Hackathon 老项目，技术和接口可能过时",tags:["Android","图像识别","Listing"]},
{name:"rickapps/eBay-Sell-Feed-API",platform:"eBay",type:"SDK/API",grade:"B",fit:68,title:"eBay Sell Feed API 专项",summary:"聚焦批量 Feed 流程，可作为大批量商品同步的专项参考。",use:"参考批量数据提交",risk:"功能面窄，需要并入统一适配层",tags:["Feed API","批量"]},
];

const fmt=n=>new Intl.NumberFormat("zh-CN").format(n);
export default function App(){
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

   <section id="ebay-sdk-review" className="section">
    <div className="section-head"><div><p className="eyebrow">EBAY SDK · 2026-10-21 定向复核</p><h2>hendt/ebay-api：有条件保留 A 级推荐</h2></div><p>仅复核该候选；全库扫描仍为 2026-07-25，仓库数量、搜索统计和其他候选不变。94/100 沿用原评估分，不代表重新量化评分。</p></div>
    <div className="fact good"><strong>选型判断</strong>REST 与传统 Trading、OAuth2 和数字签名仍可复用，适合 Linux / Node.js 22+ 的 ERP 平台适配层。移除停用接口并不否定核心刊登能力；A 级表示优先技术审计候选，须通过迁移、权限和业务回归后才能上线，不能视作完整 ERP 或安全认证。</div>
    <div className="table-wrap"><table><thead><tr><th>能力</th><th>10.x 已核实边界</th><th>替代路径与迁移成本（工程判断）</th></tr></thead><tbody>
     <tr><td>商品搜索</td><td>移除 eBay.finding；使用 eBay.buy.browse.search / getItem。Browse 的 addItem、removeItem、updateQuantity、getShoppingCart 也已移除，不能把购物车方法当成刊登库存管理。</td><td>Finding → Browse 不是简单改名：重做筛选、分页、商品 ID 与响应字段映射，核对 marketplace、OAuth scope、生产访问资格及限额；不保证历史搜索语义等价。已有 Finding 依赖的项目成本中高，新项目直接按 Browse 建模。</td></tr>
     <tr><td>Listing 管理</td><td>Inventory 保留 createOrReplaceInventoryItem、createOffer / updateOffer、publishOffer / withdrawOffer、bulkUpdatePriceQuantity；Trading 保留 AddFixedPriceItem、ReviseFixedPriceItem、EndFixedPriceItem 等。Sell Listing 当前仅封装 createItemDraft，不能描述为完整刊登 CRUD。</td><td>新刊登使用 SKU → Inventory Item → Offer → 发布流程，并配置库存地点、类目和业务政策。旧 Trading 刊登可继续按该路径管理；若转 Inventory，先验证 bulkMigrateListing 的资格和数据映射。eBay 文档规定 Inventory 创建的刊登应由 Inventory 修改，不能假定可与 Seller Hub / Trading 任意混用。跨模型迁移成本中高。</td></tr>
     <tr><td>店铺接口</td><td>新增 eBay.sell.stores：getStore、getStoreCategories、addStoreCategory、renameStoreCategory、deleteStoreCategory、moveStoreCategory、getStoreTask / getStoreTasks。</td><td>支持店铺信息读取与分类维护，不等于完整店铺装修、订阅或运营系统。分类移动为异步任务，需要状态轮询、分类 ID 映射和写操作审计；新增集成成本中等。</td></tr>
     <tr><td>身份认证</td><td>保留 OAuth2 client credentials（应用令牌）、authorization code（卖家用户令牌）、刷新机制、传统 Auth'N'Auth / IAF 及数字签名；发布说明称鉴权与配置公共接口不变。</td><td>公共应用数据按端点要求使用应用令牌；卖家数据和写操作需要用户授权及对应 scope，Auth'N'Auth 仅适用于传统 API。ERP 仍须实现 RuName 回调与 state 校验、令牌加密和按店铺隔离、刷新结果持久化、撤权处理；按端点核对签名要求。已有标准 OAuth2 接入成本通常较低，扩 scope 需重新授权。</td></tr>
     <tr><td>合规与其他旧调用</td><td>Sell Compliance 及 getListingViolations / getListingViolationsSummary 已移除，迁移说明未给出等价替代。Sell Account v1 的七个库存地点方法应转 eBay.sell.inventory。另移除若干 Buy、Catalog、Marketing、Metadata 及 29 个 Post-Order 方法。</td><td>逐项盘点调用和类型引用，不能宣称合规巡检仍完整可用；没有已核实替代的功能需重新评估业务方案。notification.test 改为 testSubscription；自定义 IEBayApiRequest 必须补 patch；核验请求头优先级、上传、PDF 返回及 finances 参数变动。成本取决于实际调用清单，不按版本号推断无痛升级。</td></tr>
    </tbody></table></div>
    <div className="fact risk"><strong>版本与安全证据</strong>2026-07-29 正式发布 v10.0.0，刷新 REST OpenAPI 并新增 Stores / Account v2。2026-10-12 合并 PR #221；PR 声明解决 11 项依赖问题（1 严重、5 高危、5 中危），并报告 npm audit 为 0、1371 项测试通过。直接升级包括 axios ^1.20.0、qs ^6.16.0 和开发测试依赖 vitest；同时刷新传递依赖锁文件，src/request.ts 有 Axios 类型适配。以上是上游当时的报告，本次未独立重跑，不能推导所有问题均影响生产，也不能保证今天或下游安装仍零漏洞。</div>
    <p>2026-10-14 提交 2e0ed33 将 package.json 标为 10.0.2，且该提交位于 #221 合并之后；本次 GitHub Releases 列表仍仅见 v10.0.0 与 v7.0.0，未确认 10.0.2 正式 GitHub Release，也未验证 npm 发布制品。投产前验证制品确含安全修复、锁定版本与依赖，在自身安装树重跑依赖检查及搜索、刊登、店铺分类、授权刷新回归；仓库锁文件不会自动成为下游项目的锁文件。</p>
    <p>核验来源：
     <a href="https://github.com/hendt/ebay-api/releases/tag/v10.0.0" target="_blank" rel="noreferrer">v10.0.0 发布说明</a> ·
     <a href="https://github.com/hendt/ebay-api/blob/2e0ed33e234da271f9edccd71a4bb206f7ccbde8/README.md#migrating-from-v9-to-v10" target="_blank" rel="noreferrer">迁移与鉴权说明</a> ·
     <a href="https://github.com/hendt/ebay-api/tree/2e0ed33e234da271f9edccd71a4bb206f7ccbde8/src/api" target="_blank" rel="noreferrer">接口实现</a> ·
     <a href="https://github.com/hendt/ebay-api/pull/221" target="_blank" rel="noreferrer">安全 PR #221</a> ·
     <a href="https://github.com/hendt/ebay-api/blob/2e0ed33e234da271f9edccd71a4bb206f7ccbde8/package.json" target="_blank" rel="noreferrer">10.0.2 版本与运行时</a> ·
     <a href="https://github.com/hendt/ebay-api/releases" target="_blank" rel="noreferrer">Release 列表</a> ·
     <a href="https://developer.ebay.com/api-docs/sell/inventory/overview.html" target="_blank" rel="noreferrer">eBay Inventory 官方边界</a>
    </p>
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
