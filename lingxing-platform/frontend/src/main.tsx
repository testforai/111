import React, {FormEvent, useEffect, useState} from "react";
import {createRoot} from "react-dom/client";
import {Activity, Cable, Database, FileCode2, LogOut, Play, Plus, Settings, ShieldCheck} from "lucide-react";
import "./styles.css";

type View = "dashboard"|"setup"|"endpoints"|"jobs"|"audit";
type Endpoint = {id:number;name:string;module:string;method:string;path:string;description:string;parameter_location:string;parameters:any[];operation_kind:string;status:string};
const api = async (path:string, options:RequestInit={}) => {
  const response=await fetch(path,{credentials:"include",headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
  const data=await response.json().catch(()=>({detail:"请求失败"}));
  if(!response.ok) throw new Error(data.detail||"请求失败");
  return data;
};
function Login({done}:{done:()=>void}){
  const [email,setEmail]=useState("admin@example.com"),[password,setPassword]=useState(""),[error,setError]=useState("");
  async function submit(e:FormEvent){e.preventDefault();try{await api("/api/auth/login",{method:"POST",body:JSON.stringify({email,password})});done()}catch(x:any){setError(x.message)}}
  return <main className="login"><form onSubmit={submit} className="login-card"><div className="brand-mark">LX</div><h1>领星数据中枢</h1><p>独立 OpenAPI · ETL · 飞书同步平台</p><label>管理员邮箱<input value={email} onChange={e=>setEmail(e.target.value)}/></label><label>密码<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div className="error">{error}</div>}<button>安全登录</button></form></main>
}
function App(){
 const [user,setUser]=useState<any>(null),[loading,setLoading]=useState(true),[view,setView]=useState<View>("dashboard");
 useEffect(()=>{api("/api/auth/me").then(setUser).catch(()=>setUser(null)).finally(()=>setLoading(false))},[]);
 if(loading)return <div className="splash">正在加载安全控制台…</div>;
 if(!user)return <Login done={()=>api("/api/auth/me").then(setUser)}/>;
 const items:[View,string,any][]=[["dashboard","总览",Activity],["setup","接入向导",Cable],["endpoints","接口中心",FileCode2],["jobs","任务中心",Database],["audit","审计日志",ShieldCheck]];
 return <div className="shell"><aside><div className="logo"><span>LX</span><div>领星数据中枢<small>独立系统</small></div></div><nav>{items.map(([id,label,Icon])=><button className={view===id?"active":""} onClick={()=>setView(id)}><Icon size={18}/>{label}</button>)}</nav><button className="logout" onClick={()=>api("/api/auth/logout",{method:"POST"}).then(()=>setUser(null))}><LogOut size={17}/>退出</button></aside><section className="content"><header><div><small>LINGXING DATA HUB</small><h2>{items.find(x=>x[0]===view)?.[1]}</h2></div><div className="user">{user.email}<b>{user.role}</b></div></header>{view==="dashboard"&&<Dashboard/>}{view==="setup"&&<Setup/>}{view==="endpoints"&&<Endpoints/>}{view==="jobs"&&<Jobs/>}{view==="audit"&&<Audit/>}</section></div>
}
function Dashboard(){
 const [connections,setConnections]=useState<any[]>([]),[jobs,setJobs]=useState<any[]>([]);
 useEffect(()=>{api("/api/connections/lingxing").then(setConnections);api("/api/jobs").then(setJobs)},[]);
 const cards=[["领星连接",connections.length,"已配置连接"],["任务模板",jobs.length,"六类核心ETL"],["可运行任务",jobs.filter(x=>x.status==="ready_for_test"||x.status==="enabled").length,"依赖已满足"],["安全状态","正常","密钥后端加密"]];
 return <><div className="hero"><div><span className="eyebrow">独立 · 安全 · 可配置</span><h1>从接口接入到数据落地，<br/>一套系统完成。</h1><p>填写凭据、补充缺失接口、验证并发布，任务即可进入自动运行链路。</p></div><div className="radar"><i></i><b>API</b></div></div><div className="cards">{cards.map(c=><article><span>{c[0]}</span><strong>{c[1]}</strong><small>{c[2]}</small></article>)}</div><div className="panel"><h3>首次接入流程</h3><div className="steps">{["配置领星","测试连接","配置飞书","补充接口","验证任务","启用调度"].map((x,i)=><div><b>{i+1}</b><span>{x}</span></div>)}</div></div></>
}
function Setup(){
 const [lx,setLx]=useState({name:"默认领星连接",host:"https://openapi.lingxing.com",app_id:"",app_secret:""}),[fs,setFs]=useState({name:"默认飞书连接",app_id:"",app_secret:"",app_token:"",table_id:""}),[msg,setMsg]=useState("");
 async function saveLx(e:FormEvent){e.preventDefault();try{const row=await api("/api/connections/lingxing",{method:"POST",body:JSON.stringify(lx)});await api("/api/connections/lingxing/"+row.id+"/test",{method:"POST"});setMsg("领星连接测试成功，Secret已加密保存")}catch(x:any){setMsg(x.message)}}
 async function saveFs(e:FormEvent){e.preventDefault();try{const row=await api("/api/connections/feishu",{method:"POST",body:JSON.stringify(fs)});await api("/api/connections/feishu/"+row.id+"/test",{method:"POST"});setMsg("飞书连接测试成功，Secret已加密保存")}catch(x:any){setMsg(x.message)}}
 return <div className="grid2"><form className="panel form" onSubmit={saveLx}><h3><Cable/>领星 OpenAPI</h3><label>连接名称<input value={lx.name} onChange={e=>setLx({...lx,name:e.target.value})}/></label><label>官方地址<input value={lx.host} onChange={e=>setLx({...lx,host:e.target.value})}/></label><label>App ID<input value={lx.app_id} onChange={e=>setLx({...lx,app_id:e.target.value})}/></label><label>App Secret<input type="password" value={lx.app_secret} onChange={e=>setLx({...lx,app_secret:e.target.value})}/></label><button>保存并测试</button></form><form className="panel form" onSubmit={saveFs}><h3><Settings/>飞书多维表格</h3>{(["app_id","app_secret","app_token","table_id"] as const).map(k=><label>{k.replace("_"," ").toUpperCase()}<input type={k==="app_secret"?"password":"text"} value={fs[k]} onChange={e=>setFs({...fs,[k]:e.target.value})}/></label>)}<button>保存并测试</button></form>{msg&&<div className="notice">{msg}</div>}</div>
}
function Endpoints(){
 const [rows,setRows]=useState<Endpoint[]>([]),[open,setOpen]=useState(false),[message,setMessage]=useState(""),[form,setForm]=useState<any>({name:"",module:"自定义",method:"POST",path:"/",description:"",parameter_location:"body",parameters:[],response_path:"data",primary_keys:[],pagination:{},operation_kind:"query"});
 const load=()=>api("/api/endpoints").then(setRows);useEffect(load,[]);
 async function save(e:FormEvent){e.preventDefault();try{await api("/api/endpoints/custom",{method:"POST",body:JSON.stringify(form)});setOpen(false);setMessage("接口草稿已保存，请测试成功并保存响应样本后发布");load()}catch(x:any){setMessage(x.message)}}
 return <><div className="toolbar"><div><h3>可配置接口目录</h3><p>SDK缺失接口无需改代码，在这里录入并验证。</p></div><button onClick={()=>setOpen(!open)}><Plus size={17}/>新增接口</button></div>{open&&<form className="panel endpoint-form" onSubmit={save}><div className="row"><label>接口名称<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>模块<input value={form.module} onChange={e=>setForm({...form,module:e.target.value})}/></label><label>方法<select value={form.method} onChange={e=>setForm({...form,method:e.target.value})}><option>GET</option><option>POST</option></select></label></div><label>官方相对路径<input value={form.path} onChange={e=>setForm({...form,path:e.target.value})}/></label><label>说明<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="row"><label>参数位置<select value={form.parameter_location} onChange={e=>setForm({...form,parameter_location:e.target.value})}><option value="body">JSON Body</option><option value="query">Query</option><option value="form">Form</option></select></label><label>操作类型<select value={form.operation_kind} onChange={e=>setForm({...form,operation_kind:e.target.value})}><option value="query">查询</option><option value="write">写操作</option></select></label></div><button>保存草稿</button></form>}{message&&<div className="notice">{message}</div>}<div className="table"><div className="tr head"><span>接口</span><span>模块</span><span>方法/路径</span><span>类型</span><span>状态</span></div>{rows.map(x=><div className="tr"><span><b>{x.name}</b><small>{x.description||"暂无说明"}</small></span><span>{x.module}</span><span><code>{x.method}</code><small>{x.path}</small></span><span>{x.operation_kind==="query"?"查询":"写操作"}</span><span className={"status "+x.status}>{x.status}</span></div>)}</div></>
}
function Jobs(){const [rows,setRows]=useState<any[]>([]);useEffect(()=>{api("/api/jobs").then(setRows)},[]);return <><div className="toolbar"><div><h3>六类ETL任务</h3><p>缺少接口的任务会停在“等待配置”，不会误运行。</p></div><button><Play size={17}/>历史补数</button></div><div className="cards jobs">{rows.map(x=><article><span>{x.template}</span><strong>{x.name}</strong><small>{x.schedule} · {x.status}</small><div className={"status "+x.status}>{x.status}</div></article>)}</div></>}
function Audit(){const [rows,setRows]=useState<any[]>([]);useEffect(()=>{api("/api/audit/api-calls").then(setRows)},[]);return <div className="table"><div className="tr head"><span>时间</span><span>接口ID</span><span>状态</span><span>耗时</span><span>错误</span></div>{rows.map(x=><div className="tr"><span>{new Date(x.created_at).toLocaleString()}</span><span>{x.endpoint_id||"-"}</span><span className={"status "+x.status}>{x.status}</span><span>{x.duration_ms}ms</span><span>{x.error||"-"}</span></div>)}</div>}
createRoot(document.getElementById("root")!).render(<App/>);
