import {useEffect,useState,useCallback} from "react";
import {supabase as sb} from "./supabase";

const fmt=d=>new Date(d).toLocaleString();
const qrUrl=p=>p?sb.storage.from("deposit-qr").getPublicUrl(p).data.publicUrl:null;
const Badge=({s})=><span className={"px-2 py-0.5 rounded-full text-xs font-semibold "+(s==="active"?"bg-go/15 text-go":s==="expired"?"bg-slate-500/20 text-slate-300":"bg-red-500/15 text-red-400")}>{s}</span>;
const Logo=()=><div className="font-bold tracking-wide text-lg">P2P <span className="text-brand">EXPERT TRADERS</span></div>;

function Auth({recovery}){
  const [mode,setMode]=useState(recovery?"reset":"login");
  const [email,setEmail]=useState("");const [pw,setPw]=useState("");const [msg,setMsg]=useState("");const [busy,setBusy]=useState(false);
  const go=async e=>{e.preventDefault();setBusy(true);setMsg("");
    const o=window.location.origin;let r;
    if(mode==="login")r=await sb.auth.signInWithPassword({email,password:pw});
    else if(mode==="signup"){if(pw.length<8){setBusy(false);return setMsg("Password must be at least 8 characters.")}
      r=await sb.auth.signUp({email,password:pw,options:{emailRedirectTo:o}});if(!r.error)setMsg("Check your email to verify your account, then log in.")}
    else if(mode==="forgot"){r=await sb.auth.resetPasswordForEmail(email,{redirectTo:o});if(!r.error)setMsg("Password reset link sent. Check your email.")}
    else{r=await sb.auth.updateUser({password:pw});if(!r.error){setMsg("Password updated.");setMode("login")}}
    if(r?.error)setMsg(r.error.message);setBusy(false)};
  return <div className="min-h-screen grid place-items-center p-4"><form onSubmit={go} className="card w-full max-w-sm space-y-4">
    <Logo/><h1 className="text-xl font-semibold">{{login:"Log in",signup:"Create account",forgot:"Reset password",reset:"Set a new password"}[mode]}</h1>
    {mode!=="reset"&&<input className="inp" type="email" required placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>}
    {mode!=="forgot"&&<input className="inp" type="password" required minLength={8} placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)}/>}
    {msg&&<p className="text-sm text-amber-300">{msg}</p>}
    <button className="btn w-full" disabled={busy}>{busy?"Please wait…":{login:"Log in",signup:"Sign up",forgot:"Send reset link",reset:"Save password"}[mode]}</button>
    <div className="text-sm flex justify-between text-slate-400">
      <button type="button" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"Create account":"Back to log in"}</button>
      {mode==="login"&&<button type="button" onClick={()=>setMode("forgot")}>Forgot password?</button>}</div></form></div>}

function Deposit({user}){
  const [sess,setSess]=useState(null);const [hist,setHist]=useState([]);const [left,setLeft]=useState(0);const [err,setErr]=useState("");const [busy,setBusy]=useState(false);const [copied,setCopied]=useState(false);
  const load=useCallback(async()=>{await sb.rpc("expire_my_sessions");
    const {data,error}=await sb.from("deposit_sessions").select("*").order("created_at",{ascending:false});
    if(error)return setErr(error.message);setHist(data);setSess(data.find(s=>s.status==="active")||null)},[]);
  useEffect(()=>{load()},[load]);
  useEffect(()=>{if(!sess)return;const t=()=>{const l=Math.max(0,new Date(sess.expires_at)-Date.now());setLeft(l);if(l===0)load()};t();const i=setInterval(t,1000);return()=>clearInterval(i)},[sess,load]);
  const act=async fn=>{setBusy(true);setErr("");const {error}=await sb.rpc(fn);if(error)setErr(error.message);await load();setBusy(false)};
  const mm=String(Math.floor(left/60000)).padStart(2,"0"),ss=String(Math.floor(left/1000)%60).padStart(2,"0");
  return <div className="space-y-6"><div className="card max-w-xl">
    <h2 className="text-lg font-semibold mb-4">Deposit cryptocurrency</h2>
    {err&&<p className="text-red-400 text-sm mb-3">{err}</p>}
    {sess?<div className="space-y-4 text-center">
      {sess.qr_path&&<img src={qrUrl(sess.qr_path)} alt="Deposit QR" className="mx-auto w-48 h-48 object-contain bg-white rounded-xl p-2"/>}
      <p><b>Coin:</b> {sess.coin} &nbsp; <b>Network:</b> {sess.network}</p>
      <div className="bg-ink border border-line rounded-lg p-3 break-all font-mono text-sm">{sess.address}</div>
      <button className="btn2" onClick={async()=>{await navigator.clipboard.writeText(sess.address);setCopied(true);setTimeout(()=>setCopied(false),1500)}}>{copied?"Copied":"Copy address"}</button>
      <div><p className="text-slate-400 text-sm">Session expires in</p><p className="text-4xl font-bold text-go tabular-nums">{mm}:{ss}</p></div>
      <p className="rounded-lg border border-brand bg-brand/10 px-3 py-2 font-semibold">Minimum deposit: {sess.min_amount} {sess.coin}</p>
      <p className="text-sm text-slate-400 whitespace-pre-line">{sess.instructions}</p>
      <p className="text-xs text-slate-500">The timer only shows how long this session stays open. It does not confirm any payment.</p>
      <button className="btn2 text-red-400" disabled={busy} onClick={()=>act("cancel_deposit_session")}>Cancel session</button>
    </div>:<div className="text-center space-y-3"><p className="text-slate-400 text-sm">No active session. Start one to see the deposit details for 18 minutes.</p>
      <button className="btn" disabled={busy} onClick={()=>act("create_deposit_session")}>{busy?"Starting…":hist.length?"Start new deposit session":"Start deposit session"}</button></div>}
  </div>
  <div className="card overflow-x-auto"><h2 className="text-lg font-semibold mb-3">Deposit history</h2><Table rows={hist}/></div></div>}

function Table({rows,email}){
  if(!rows.length)return <p className="text-slate-500 text-sm">No sessions yet.</p>;
  return <table className="w-full text-sm text-left"><thead className="text-slate-400"><tr>{email&&<th className="py-2 pr-3">User</th>}<th className="pr-3">Coin</th><th className="pr-3">Network</th><th className="pr-3">Created</th><th className="pr-3">Expires</th><th>Status</th></tr></thead>
  <tbody>{rows.map(r=><tr key={r.id} className="border-t border-line"><td className={email?"py-2 pr-3":"hidden"}>{r.user_email}</td><td className="py-2 pr-3">{r.coin}</td><td className="pr-3">{r.network}</td><td className="pr-3">{fmt(r.created_at)}</td><td className="pr-3">{fmt(r.expires_at)}</td><td><Badge s={r.status}/></td></tr>)}</tbody></table>}

function Settings(){
  const [s,setS]=useState(null);const [msg,setMsg]=useState("");const [busy,setBusy]=useState(false);
  useEffect(()=>{sb.from("deposit_settings").select("*").eq("id",1).single().then(({data})=>setS(data))},[]);
  if(!s)return <p>Loading…</p>;const set=k=>e=>setS({...s,[k]:e.target.type==="checkbox"?e.target.checked:e.target.value});
  const upload=async e=>{const f=e.target.files[0];if(!f)return;
    if(!/^image\/(png|jpeg|webp)$/.test(f.type)||f.size>2e6)return setMsg("Use a PNG, JPG or WebP image under 2 MB.");
    setBusy(true);const path=`qr-${Date.now()}.${f.type.split("/")[1]}`;
    const {error}=await sb.storage.from("deposit-qr").upload(path,f);if(error)setMsg(error.message);else{setS({...s,qr_path:path});setMsg("QR uploaded. Click Save settings to apply.")}setBusy(false)};
  const save=async()=>{if(s.enabled&&!s.address.trim())return setMsg("Enter a deposit address before enabling deposits.");
    setBusy(true);const {error}=await sb.from("deposit_settings").update({coin:s.coin.trim(),network:s.network.trim(),address:s.address.trim(),min_amount:Number(s.min_amount)||0,qr_path:s.qr_path,instructions:s.instructions,enabled:s.enabled,updated_at:new Date().toISOString()}).eq("id",1);
    setMsg(error?error.message:"Settings saved.");setBusy(false)};
  return <div className="card max-w-xl space-y-3"><h2 className="text-lg font-semibold">Deposit settings</h2>
    <label className="block text-sm">Cryptocurrency<input className="inp mt-1" value={s.coin} onChange={set("coin")}/></label>
    <label className="block text-sm">Network<input className="inp mt-1" value={s.network} onChange={set("network")}/></label>
    <label className="block text-sm">Deposit address<input className="inp mt-1 font-mono" value={s.address} onChange={set("address")}/></label>
    <label className="block text-sm">Minimum deposit amount<input type="number" min="0" step="any" className="inp mt-1" value={s.min_amount} onChange={set("min_amount")}/></label>
    <label className="block text-sm">Binance deposit QR image<input type="file" accept="image/png,image/jpeg,image/webp" className="mt-1 block" onChange={upload}/></label>
    {s.qr_path&&<img src={qrUrl(s.qr_path)} alt="QR preview" className="w-32 h-32 object-contain bg-white rounded-lg p-1"/>}
    <label className="block text-sm">Instructions<textarea rows={4} className="inp mt-1" value={s.instructions} onChange={set("instructions")}/></label>
    <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={s.enabled} onChange={set("enabled")}/>Deposits enabled</label>
    {msg&&<p className="text-sm text-amber-300">{msg}</p>}<button className="btn" disabled={busy} onClick={save}>{busy?"Saving…":"Save settings"}</button></div>}

function Admin(){
  const [tab,setTab]=useState("settings");const [users,setUsers]=useState([]);const [rows,setRows]=useState([]);const [q,setQ]=useState("");const [st,setSt]=useState("");
  useEffect(()=>{if(tab==="users")sb.from("profiles").select("*").ilike("email",`%${q}%`).order("created_at",{ascending:false}).then(({data})=>setUsers(data||[]))},[tab,q]);
  useEffect(()=>{if(tab==="sessions"){let r=sb.from("deposit_sessions").select("*").ilike("user_email",`%${q}%`).order("created_at",{ascending:false}).limit(200);if(st)r=r.eq("status",st);r.then(({data})=>setRows(data||[]))}},[tab,q,st]);
  const [pick,setPick]=useState(null);
  const T=(k,l)=><button onClick={()=>{setTab(k);setQ("");setPick(null)}} className={"px-3 py-1.5 rounded-lg "+(tab===k?"bg-brand text-white":"btn2")}>{l}</button>;
  return <div className="space-y-4"><div className="flex gap-2 flex-wrap">{T("settings","Deposit settings")}{T("users","Users")}{T("sessions","All sessions")}</div>
    {tab==="settings"&&<Settings/>}
    {tab!=="settings"&&<div className="flex gap-2"><input className="inp max-w-xs" placeholder="Search by email" value={q} onChange={e=>setQ(e.target.value)}/>
      {tab==="sessions"&&<select className="inp max-w-[10rem]" value={st} onChange={e=>setSt(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select>}</div>}
    {tab==="users"&&<div className="card overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-slate-400"><tr><th className="py-2">Email</th><th>Role</th><th>Registered</th><th></th></tr></thead><tbody>{users.map(u=><tr key={u.id} className="border-t border-line"><td className="py-2">{u.email}</td><td>{u.role}</td><td>{fmt(u.created_at)}</td><td><button className="text-brand" onClick={async()=>{const {data}=await sb.from("deposit_sessions").select("*").eq("user_id",u.id).order("created_at",{ascending:false});setPick({u,data})}}>View sessions</button></td></tr>)}</tbody></table>
      {pick&&<div className="mt-4"><h3 className="font-semibold mb-2">{pick.u.email}</h3><Table rows={pick.data}/></div>}</div>}
    {tab==="sessions"&&<div className="card overflow-x-auto"><Table rows={rows} email/></div>}</div>}

export default function App(){
  const [session,setSession]=useState(undefined);const [role,setRole]=useState("user");const [view,setView]=useState("deposit");const [rec,setRec]=useState(false);const [nav,setNav]=useState(false);
  useEffect(()=>{sb.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}}=sb.auth.onAuthStateChange((ev,s)=>{setSession(s);if(ev==="PASSWORD_RECOVERY")setRec(true)});return()=>subscription.unsubscribe()},[]);
  useEffect(()=>{if(session)sb.from("profiles").select("role").eq("id",session.user.id).single().then(({data})=>setRole(data?.role||"user"))},[session]);
  if(session===undefined)return <p className="p-8">Loading…</p>;
  if(!session||rec)return <Auth recovery={rec}/>;
  const item=(k,l)=><button onClick={()=>{setView(k);setNav(false)}} className={"block w-full text-left px-3 py-2 rounded-lg "+(view===k?"bg-brand/20 text-white":"text-slate-400 hover:text-white")}>{l}</button>;
  return <div className="min-h-screen md:flex">
    <aside className={"bg-panel border-r border-line p-4 md:w-60 space-y-2 "+(nav?"":"hidden md:block")}><Logo/><div className="pt-4 space-y-1">{item("deposit","Deposit")}{item("account","Account")}{role==="admin"&&item("admin","Admin panel")}</div>
      <button className="btn2 w-full mt-6" onClick={()=>sb.auth.signOut()}>Log out</button></aside>
    <main className="flex-1 p-4 md:p-8 space-y-6"><button className="md:hidden btn2" onClick={()=>setNav(!nav)}>Menu</button>
      <h1 className="text-2xl font-semibold">Welcome to P2P EXPERT TRADERS</h1>
      {view==="deposit"&&<Deposit user={session.user}/>}
      {view==="account"&&<div className="card max-w-md text-sm space-y-1"><p>Email: {session.user.email}</p><p>User ID: <span className="font-mono">{session.user.id}</span></p><p>Role: {role}</p></div>}
      {view==="admin"&&role==="admin"&&<Admin/>}</main></div>}
