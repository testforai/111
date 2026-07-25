#!/usr/bin/env python3
from __future__ import annotations
import ast, io, json, re, tarfile, urllib.request
from pathlib import Path

UPSTREAM_SHA = "6b083a907fcdb499403fc45477187c4526bef312"
URL = f"https://codeload.github.com/SongKehao/lingxing-sdk/tar.gz/{UPSTREAM_SHA}"
OUT = Path("generated/endpoints.json")
MODULE_NAMES = {
    "basic":"基础资料","sale":"销售/订单/Listing","warehouse":"仓库与库存","fba":"FBA与头程",
    "finance":"财务与利润","product":"产品管理","purchase":"采购与供应商","statistics":"统计分析",
    "customer_service":"客服与评价","amazon_source":"Amazon数据源","vc":"Amazon VC","restocking":"补货建议",
    "logistics":"物流","tools":"工具","restocking_limit":"补货限制","new_ad":"新版广告",
    "multiplatform_ads":"多平台广告","multiplatform_platforms":"多平台商品/发货",
    "multiplatform_other":"多平台其他","target_manage":"目标管理"
}
WRITE_WORDS = {
    "add","create","delete","remove","modify","update","adjust","cancel","publish","submit","import",
    "bind","unbind","unlink","set","save","edit","push","send","upload","fulfillment","operate","enable","disable"
}

def annotation(node):
    if node is None: return "any"
    try: return ast.unparse(node)
    except Exception: return "any"

def literal(node):
    if node is None: return None
    try: return ast.literal_eval(node)
    except Exception: return None

def string_arg(call):
    for arg in call.args:
        if isinstance(arg, ast.Constant) and isinstance(arg.value, str) and arg.value.startswith("/"):
            return arg.value
    return None

def descriptions(doc):
    result = {}
    in_args = False
    for line in (doc or "").splitlines():
        stripped = line.strip()
        if stripped == "Args:":
            in_args = True
            continue
        if in_args and stripped in {"Returns:","Yields:","Raises:","Example:","Examples:"}:
            in_args = False
        if in_args:
            match = re.match(r"([A-Za-z_][A-Za-z0-9_]*):\s*(.*)", stripped)
            if match:
                result[match.group(1)] = match.group(2)
    return result

def discover_call(fn):
    found = []
    for node in ast.walk(fn):
        if not isinstance(node, ast.Call): continue
        target = node.func
        if isinstance(target, ast.Attribute) and target.attr in {"_get","_post"}:
            route = string_arg(node)
            if route: found.append((target.attr[1:].upper(), route))
    if found: return found[0]
    doc = ast.get_docstring(fn) or ""
    match = re.search(r"\b(GET|POST)\s+(/[A-Za-z0-9_./{}-]+)", doc)
    return (match.group(1), match.group(2)) if match else (None, None)

def risk_for(name, route, method):
    tokens = set(re.split(r"[^a-z0-9]+", (name + " " + route).lower()))
    matched = sorted(tokens & WRITE_WORDS)
    if matched:
        return "write", "可能修改领星数据，调用前必须二次确认"
    if method == "GET" or any(word in name.lower() for word in ["get","query","list","search","detail","statistics"]):
        return "read", "只读查询"
    return "review", "接口语义需人工确认后调用"

def main():
    with urllib.request.urlopen(URL, timeout=60) as response:
        archive = response.read()
    endpoints = []
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
        members = [m for m in tar.getmembers() if "/src/lingxing/endpoints/" in m.name and m.name.endswith(".py")]
        for member in members:
            module = Path(member.name).stem
            if module in {"__init__","_base"}: continue
            source = tar.extractfile(member).read().decode("utf-8")
            tree = ast.parse(source)
            for fn in [n for n in ast.walk(tree) if isinstance(n, ast.AsyncFunctionDef)]:
                if fn.name.startswith("_") or fn.name.endswith("_sync"): continue
                method, route = discover_call(fn)
                if not route: continue
                doc = ast.get_docstring(fn) or ""
                title = doc.splitlines()[0].rstrip(".。") if doc else fn.name.replace("_"," ")
                arg_nodes = list(fn.args.args)
                if arg_nodes and arg_nodes[0].arg == "self": arg_nodes = arg_nodes[1:]
                defaults = [None] * (len(arg_nodes) - len(fn.args.defaults)) + list(fn.args.defaults)
                desc = descriptions(doc)
                params = []
                for arg, default in zip(arg_nodes, defaults):
                    default_value = literal(default)
                    d = desc.get(arg.arg, "")
                    params.append({
                        "name": arg.arg,
                        "type": annotation(arg.annotation),
                        "required": default is None or "(required)" in d.lower(),
                        "default": default_value,
                        "description": d
                    })
                risk, risk_text = risk_for(fn.name, route, method)
                endpoints.append({
                    "id": f"{module}.{fn.name}",
                    "module": module,
                    "moduleName": MODULE_NAMES.get(module, module),
                    "name": fn.name,
                    "title": title,
                    "method": method,
                    "route": route,
                    "risk": risk,
                    "riskText": risk_text,
                    "params": params,
                    "doc": doc[:4000]
                })
    unique = {}
    for endpoint in endpoints:
        unique[endpoint["id"]] = endpoint
    endpoints = sorted(unique.values(), key=lambda e: (e["module"], e["title"], e["name"]))
    modules = []
    for key, name in MODULE_NAMES.items():
        count = sum(1 for e in endpoints if e["module"] == key)
        if count: modules.append({"id":key,"name":name,"count":count})
    payload = {
        "source":"SongKehao/lingxing-sdk",
        "upstreamSha":UPSTREAM_SHA,
        "generatedAt":"2026-07-25",
        "endpointCount":len(endpoints),
        "moduleCount":len(modules),
        "modules":modules,
        "endpoints":endpoints
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",",":")), encoding="utf-8")
    print(json.dumps({"endpointCount":len(endpoints),"moduleCount":len(modules)}, ensure_ascii=False))

if __name__ == "__main__":
    main()
