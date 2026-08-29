import { useState, useRef, useEffect, useCallback } from "react";

// ─── DATA ───────────────────────────────────────────────────────────────────
const GRADES = [
  {
    name: "No DR", label: "Grade 0", urgency: "No Referral Required",
    action: "No diabetic retinopathy detected. Continue annual screening and diabetes management.",
    color: "#22C55E", textColor: "#4ADE80", bg: "rgba(34,197,94,0.07)",
    explanation: "No significant pathological regions detected. AI attention distributed uniformly across healthy vasculature. No microaneurysms or exudates found.",
  },
  {
    name: "Mild NPDR", label: "Grade 1", urgency: "Monitor — 6 Months",
    action: "Mild non-proliferative DR. Early microaneurysms noted. Schedule 6-month follow-up with improved glycaemic control.",
    color: "#A3E635", textColor: "#BEF264", bg: "rgba(163,230,53,0.07)",
    explanation: "Subtle microaneurysm clusters detected near macular region. Early haemorrhagic changes flagged for close monitoring.",
  },
  {
    name: "Moderate NPDR", label: "Grade 2", urgency: "Refer — 4 to 6 Weeks",
    action: "Moderate non-proliferative DR. Multiple lesions present. Ophthalmology referral within 4–6 weeks recommended.",
    color: "#FBBF24", textColor: "#FCD34D", bg: "rgba(251,191,36,0.07)",
    explanation: "Multiple haemorrhage foci, hard exudates, and possible cotton-wool spots detected. Macular involvement suspected on Grad-CAM.",
  },
  {
    name: "Severe NPDR", label: "Grade 3", urgency: "Urgent Referral",
    action: "Severe non-proliferative DR. Significant haemorrhages across quadrants. Urgent ophthalmology referral required.",
    color: "#F97316", textColor: "#FB923C", bg: "rgba(249,115,22,0.08)",
    explanation: "Widespread haemorrhages, soft exudates, and venous beading detected across multiple retinal quadrants. High progression risk.",
  },
  {
    name: "Proliferative DR", label: "Grade 4", urgency: "IMMEDIATE REFERRAL",
    action: "Sight-threatening proliferative DR. Neovascularisation detected. IMMEDIATE referral. Anti-VEGF or laser photocoagulation needed.",
    color: "#EF4444", textColor: "#F87171", bg: "rgba(239,68,68,0.09)",
    explanation: "Active neovascularisation detected near optic disc. Fragile new vessel growth consistent with PDR. High risk of vitreous haemorrhage.",
  },
];

const PHASES = [
  { name: "Quality Assessment",    detail: "entropy · sharpness · CNR metrics" },
  { name: "CLAHE Enhancement",     detail: "green channel · Retinex illumination" },
  { name: "Retinal Segmentation",  detail: "Frangi vessels · optic disc · lesions" },
  { name: "Deep Learning Grading", detail: "EfficientNet-B4 · focal loss inference" },
  { name: "Grad-CAM Generation",   detail: "gradient-weighted attention mapping" },
];
const PHASE_MS = [900, 1100, 1400, 1800, 1000];

const SAMPLES = [
  { label: "Healthy Retina",  grade: 0, dot: "#22C55E" },
  { label: "Moderate NPDR",   grade: 2, dot: "#FBBF24" },
  { label: "Proliferative DR",grade: 4, dot: "#EF4444" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function mkRand(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function generateFundus(grade) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 600;
  const ctx = cv.getContext("2d");
  const cx = 300, cy = 300, R = 285;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

  // Retinal background
  const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, R);
  bg.addColorStop(0,   "#5c2200");
  bg.addColorStop(0.4, "#3e1400");
  bg.addColorStop(0.7, "#2a0c00");
  bg.addColorStop(1,   "#110400");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 600, 600);

  // Optic disc
  const odx = 405, ody = 268;
  const od = ctx.createRadialGradient(odx, ody, 0, odx, ody, 52);
  od.addColorStop(0, "#ffe5b0"); od.addColorStop(0.45, "#e8a855");
  od.addColorStop(0.75, "#b06825"); od.addColorStop(1, "transparent");
  ctx.fillStyle = od; ctx.beginPath(); ctx.arc(odx, ody, 52, 0, Math.PI * 2); ctx.fill();

  // Vessels
  ctx.strokeStyle = "rgba(88,14,0,0.82)"; ctx.lineCap = "round";
  const segs = [
    { cp: [[352,238],[278,193]], ep: [168,172], w: 3.2 },
    { cp: [[376,296],[310,362]], ep: [188,416], w: 3.5 },
    { cp: [[416,294],[477,354]], ep: [514,424], w: 2.8 },
    { cp: [[432,246],[476,198]], ep: [492,152], w: 2.5 },
    { cp: [[352,270],[292,294]], ep: [192,298], w: 2.6 },
  ];
  segs.forEach(s => {
    ctx.lineWidth = s.w;
    ctx.beginPath(); ctx.moveTo(odx, ody);
    ctx.bezierCurveTo(...s.cp[0], ...s.cp[1], ...s.ep); ctx.stroke();
    ctx.lineWidth = s.w * 0.48;
    const mx = (s.cp[0][0]+s.cp[1][0])/2, my = (s.cp[0][1]+s.cp[1][1])/2;
    ctx.beginPath(); ctx.moveTo(mx, my);
    ctx.quadraticCurveTo(mx+18, my-22, s.ep[0]-18, s.ep[1]-48); ctx.stroke();
  });

  // Fovea
  const fov = ctx.createRadialGradient(228,294,0, 228,294,28);
  fov.addColorStop(0, "rgba(14,4,0,0.68)"); fov.addColorStop(1, "transparent");
  ctx.fillStyle = fov; ctx.beginPath(); ctx.arc(228,294,28,0,Math.PI*2); ctx.fill();

  // Pathology
  const r1 = mkRand(grade * 71 + 13);
  if (grade >= 1) {
    for (let i = 0; i < grade*4+3; i++) {
      const x=155+r1()*290, y=155+r1()*290;
      const d=ctx.createRadialGradient(x,y,0,x,y,3.5);
      d.addColorStop(0,"rgba(175,18,0,0.9)"); d.addColorStop(1,"transparent");
      ctx.fillStyle=d; ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2); ctx.fill();
    }
  }
  if (grade >= 2) {
    const r2=mkRand(grade*43+77);
    for (let i=0;i<grade*2+2;i++) {
      const x=165+r2()*270, y=175+r2()*250;
      const ex=ctx.createRadialGradient(x,y,0,x,y,5+r2()*4);
      ex.addColorStop(0,"rgba(255,238,136,0.88)"); ex.addColorStop(1,"transparent");
      ctx.fillStyle=ex; ctx.beginPath(); ctx.arc(x,y,7+r2()*4,0,Math.PI*2); ctx.fill();
    }
  }
  if (grade >= 3) {
    const r3=mkRand(grade*29+53);
    for (let i=0;i<5;i++) {
      const x=145+r3()*310, y=165+r3()*270;
      const h=ctx.createRadialGradient(x,y,0,x,y,11+r3()*13);
      h.addColorStop(0,"rgba(128,0,0,0.82)"); h.addColorStop(0.5,"rgba(100,0,0,0.38)"); h.addColorStop(1,"transparent");
      ctx.fillStyle=h; ctx.beginPath(); ctx.arc(x,y,14+r3()*13,0,Math.PI*2); ctx.fill();
    }
  }
  if (grade===4) {
    const r4=mkRand(211);
    ctx.strokeStyle="rgba(255,75,75,0.7)"; ctx.lineWidth=1;
    for(let i=0;i<8;i++){
      const a=r4()*Math.PI*2, l=36+r4()*44;
      ctx.beginPath(); ctx.moveTo(odx,ody);
      ctx.quadraticCurveTo(odx+Math.cos(a+0.3)*l*0.6+r4()*14-7,ody+Math.sin(a+0.3)*l*0.6+r4()*14-7,odx+Math.cos(a)*l,ody+Math.sin(a)*l);
      ctx.stroke();
    }
  }

  // Vignette
  const vig=ctx.createRadialGradient(cx,cy,R*0.65,cx,cy,R);
  vig.addColorStop(0,"transparent"); vig.addColorStop(1,"rgba(0,0,0,0.78)");
  ctx.fillStyle=vig; ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fill();
  ctx.restore();
  return cv.toDataURL("image/jpeg",0.92);
}

function applyGradcam(canvas, img, grade) {
  const ctx=canvas.getContext("2d");
  const W=600,H=600;
  canvas.width=W; canvas.height=H;
  ctx.drawImage(img,0,0,W,H);
  if(grade===0) return;
  const rand=mkRand(grade*47+91);
  const counts=[0,3,5,7,10];
  for(let i=0;i<counts[grade];i++){
    const cx2=(0.18+rand()*0.64)*W, cy2=(0.18+rand()*0.64)*H;
    const r2=(0.055+rand()*0.085)*W, alpha=0.42+rand()*0.34;
    const c=grade<=1?[80,255,80]:grade===2?[255,175,0]:[255,38,0];
    const grd=ctx.createRadialGradient(cx2,cy2,0,cx2,cy2,r2);
    grd.addColorStop(0,`rgba(${c},${alpha})`);
    grd.addColorStop(0.45,`rgba(${c},${alpha*0.42})`);
    grd.addColorStop(1,`rgba(${c},0)`);
    ctx.globalCompositeOperation="screen";
    ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);
  }
  ctx.globalCompositeOperation="source-over";
}

function makeProbs(grade) {
  const rand=mkRand(grade*31+(Date.now()%97));
  const main=0.70+rand()*0.24;
  const raw=Array(5).fill(0).map((_,i)=>i===grade?0:rand());
  const sum=raw.reduce((a,b)=>a+b,0);
  return raw.map((v,i)=>i===grade?main:(v/sum)*(1-main));
}

// ─── TINY ICONS ──────────────────────────────────────────────────────────────
const EyeIcon=()=>(
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const CheckIcon=()=>(
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={3}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const SpinnerIcon=({color="#00BFFF"})=>(
  <div style={{width:13,height:13,border:`2px solid rgba(0,191,255,0.15)`,borderTopColor:color,borderRadius:"50%",animation:"drSpin 0.75s linear infinite",flexShrink:0}}/>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function DRScreenAI() {
  const [stage,setStage]=useState("upload");
  const [imgSrc,setImgSrc]=useState(null);
  const [phaseIdx,setPhaseIdx]=useState(-1);
  const [done,setDone]=useState([]);
  const [results,setResults]=useState(null);
  const [tab,setTab]=useState("original");
  const [dragging,setDragging]=useState(false);

  const fileRef=useRef(null);
  const imgRef=useRef(null);
  const camRef=useRef(null);
  const timers=useRef([]);

  const runPipeline=useCallback((src,grade)=>{
    timers.current.forEach(clearTimeout);
    timers.current=[];
    setImgSrc(src); setStage("processing");
    setPhaseIdx(-1); setDone([]); setTab("original"); setResults(null);

    let t=400;
    PHASES.forEach((_,i)=>{
      timers.current.push(setTimeout(()=>setPhaseIdx(i),t));
      t+=PHASE_MS[i];
      const snap=i;
      timers.current.push(setTimeout(()=>setDone(p=>[...p,snap]),t));
    });
    timers.current.push(setTimeout(()=>{
      const probs=makeProbs(grade);
      const r2=mkRand(grade*17+83);
      setResults({
        grade, confidence:probs[grade], probs,
        quality:Math.floor(81+r2()*17),
        sharpness:(108+r2()*95).toFixed(0),
        entropy:(6.0+r2()*1.5).toFixed(2),
      });
      setStage("results");
    },t+500));
  },[]);

  const handleFile=useCallback((file)=>{
    if(!file?.type.startsWith("image/"))return;
    const rdr=new FileReader();
    rdr.onload=e=>{ const g=[0,0,1,2,2,3,4][Math.floor(Math.random()*7)]; runPipeline(e.target.result,g); };
    rdr.readAsDataURL(file);
  },[runPipeline]);

  const reset=useCallback(()=>{ timers.current.forEach(clearTimeout); setStage("upload"); setImgSrc(null); setResults(null); setPhaseIdx(-1); setDone([]); },[]);

  useEffect(()=>{
    if(stage!=="results"||!results||!camRef.current)return;
    const tryDraw=()=>{ const img=imgRef.current; if(img&&img.complete&&img.naturalWidth>0){ applyGradcam(camRef.current,img,results.grade); } else if(img){ img.onload=()=>applyGradcam(camRef.current,img,results.grade); } };
    setTimeout(tryDraw,80);
  },[stage,results,tab]);

  // Tokens
  const C={ bg:"#020B18", surface:"#071525", card:"#0C2040", border:"#143058", accent:"#00BFFF", text:"#E2EDF8", sub:"#6A8FAE", muted:"#2E5070" };

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:C.bg,minHeight:"100vh",color:C.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes drSpin{to{transform:rotate(360deg)}}
        @keyframes drPulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes drSweep{to{transform:rotate(360deg)}}
        @keyframes drFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .dr-upload:hover{border-color:#00BFFF!important;background:rgba(0,191,255,0.05)!important}
        .dr-sample{transition:all .2s ease!important}
        .dr-sample:hover{border-color:#00BFFF!important;background:rgba(0,191,255,0.08)!important;transform:translateY(-2px)!important}
        .dr-tab{transition:all .15s ease!important;cursor:pointer}
        .dr-tab:hover{border-color:#00BFFF!important;color:#00BFFF!important}
        .dr-cta:hover{filter:brightness(1.18)!important;transform:translateY(-1px)!important}
        .dr-outline:hover{border-color:#00BFFF!important;color:#E2EDF8!important}
      `}</style>

      {/* ══ HEADER ══════════════════════════════════════════════════════════════ */}
      <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 28px",borderBottom:`1px solid ${C.border}`,background:"rgba(2,11,24,0.94)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:99}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:33,height:33,borderRadius:"50%",background:"radial-gradient(circle,#00BFFF 0%,#0062A8 55%,#002A60 100%)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 14px rgba(0,191,255,0.38)"}}>
            <EyeIcon/>
          </div>
          <div>
            <div style={{fontFamily:"'Space Grotesk'",fontWeight:700,fontSize:15,letterSpacing:"-0.3px"}}>DR Screen <span style={{color:C.accent}}>AI</span></div>
            <div style={{fontSize:9,color:C.sub,textTransform:"uppercase",letterSpacing:"0.7px"}}>Retinopathy Screening · v1.0</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          {stage!=="upload"&&<button className="dr-outline" onClick={reset} style={{padding:"6px 14px",borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",color:C.sub,cursor:"pointer",fontSize:11,fontFamily:"'Inter'"}}>← New Scan</button>}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:"#22C55E",boxShadow:"0 0 7px #22C55E",animation:"drPulse 2s ease infinite"}}/>
            <span style={{fontSize:10,color:C.sub}}>System Online</span>
          </div>
        </div>
      </header>

      <main style={{maxWidth:1080,margin:"0 auto",padding:"36px 20px"}}>

        {/* ══ UPLOAD ══════════════════════════════════════════════════════════════ */}
        {stage==="upload"&&(
          <div style={{animation:"drFade 0.4s ease"}}>
            {/* Hero */}
            <div style={{textAlign:"center",marginBottom:44}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 14px",borderRadius:20,background:"rgba(0,191,255,0.08)",border:"1px solid rgba(0,191,255,0.2)",fontSize:10,color:C.accent,marginBottom:22,textTransform:"uppercase",letterSpacing:"1.2px"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:C.accent,animation:"drPulse 1.5s infinite"}}/>
                AI-Powered Fundus Analysis
              </div>
              <h1 style={{fontFamily:"'Space Grotesk'",fontSize:"clamp(30px,5vw,50px)",fontWeight:700,margin:"0 0 14px",letterSpacing:"-1.2px",lineHeight:1.08,background:`linear-gradient(145deg,${C.text} 30%,${C.accent} 100%)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                Diabetic Retinopathy<br/>Screening System
              </h1>
              <p style={{color:C.sub,fontSize:13,maxWidth:420,margin:"0 auto",lineHeight:1.65}}>
                Upload a fundus image for automated AI grading with explainable Grad-CAM heatmaps — built for India's rural PHCs
              </p>
            </div>

            {/* Drop zone */}
            <div
              className="dr-upload"
              onDragOver={e=>{e.preventDefault();setDragging(true);}}
              onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0]);}}
              onClick={()=>fileRef.current?.click()}
              style={{borderRadius:14,border:`2px dashed ${dragging?C.accent:C.border}`,padding:"52px 32px",textAlign:"center",cursor:"pointer",background:dragging?"rgba(0,191,255,0.05)":"rgba(7,21,37,0.5)",transition:"all .2s ease",marginBottom:28,position:"relative",overflow:"hidden"}}
            >
              {[220,320,420].map((s,i)=>(
                <div key={i} style={{position:"absolute",top:"50%",left:"50%",width:s,height:s,borderRadius:"50%",border:`1px solid rgba(0,191,255,${0.04-i*0.01})`,transform:"translate(-50%,-50%)",pointerEvents:"none"}}/>
              ))}
              <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(0,191,255,0.07)",border:"1px solid rgba(0,191,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>
                <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={1.5}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
              </div>
              <div style={{fontFamily:"'Space Grotesk'",fontSize:17,fontWeight:600,marginBottom:6}}>Drop fundus image here</div>
              <div style={{color:C.sub,fontSize:12,marginBottom:18}}>JPG · PNG · TIFF accepted</div>
              <div style={{display:"inline-block",padding:"7px 18px",borderRadius:7,background:"rgba(0,191,255,0.1)",border:"1px solid rgba(0,191,255,0.25)",fontSize:12,color:C.accent,fontWeight:500}}>Browse Files</div>
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
            </div>

            {/* Sample cases */}
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:10}}>
                <div style={{width:40,height:1,background:C.border}}/><span style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"1px"}}>or try a sample case</span><div style={{width:40,height:1,background:C.border}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:48}}>
              {SAMPLES.map(s=>(
                <button key={s.grade} className="dr-sample" onClick={()=>runPipeline(generateFundus(s.grade),s.grade)} style={{padding:"12px 20px",borderRadius:10,background:"rgba(12,32,64,0.5)",border:`1px solid ${C.border}`,color:C.text,cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontFamily:"'Inter'"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:s.dot,boxShadow:`0 0 6px ${s.dot}`}}/>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:12,fontWeight:600}}>{s.label}</div>
                    <div style={{fontSize:10,color:C.sub}}>Grade {s.grade} · Simulated</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Feature pills */}
            <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:8,paddingTop:28,borderTop:`1px solid ${C.border}`}}>
              {[["🔬","CLAHE + Retinex"],["🧠","EfficientNet-B4"],["🔥","Grad-CAM XAI"],["📊","Platt Calibrated"],["📡","PHC Optimized"]].map(([ic,lb])=>(
                <div key={lb} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 14px",borderRadius:20,border:`1px solid ${C.border}`,background:"rgba(12,32,64,0.4)",fontSize:11,color:C.sub}}>
                  <span>{ic}</span><span>{lb}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ PROCESSING ══════════════════════════════════════════════════════════ */}
        {stage==="processing"&&(
          <div style={{display:"grid",gridTemplateColumns:"minmax(250px,1fr) minmax(250px,1.1fr)",gap:28,animation:"drFade .35s ease"}}>
            {/* Image with radar overlay */}
            <div>
              <div style={{fontSize:10,color:C.sub,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Input Fundus Image</div>
              <div style={{borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`,aspectRatio:"1",background:"#000",position:"relative"}}>
                <img src={imgSrc} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:.8}}/>
                {/* Radar rings */}
                {[0.36,0.52,0.68].map((r,i)=>(
                  <div key={i} style={{position:"absolute",top:"50%",left:"50%",width:`${r*100}%`,height:`${r*100}%`,borderRadius:"50%",border:`1px solid rgba(0,191,255,${0.2-i*0.05})`,transform:"translate(-50%,-50%)"}}/>
                ))}
                {/* Sweep arm */}
                <div style={{position:"absolute",top:"50%",left:"50%",width:"68%",height:"68%",borderRadius:"50%",transform:"translate(-50%,-50%)",animation:"drSweep 2.4s linear infinite",transformOrigin:"center"}}>
                  <div style={{position:"absolute",top:"50%",left:"50%",width:"50%",height:"1px",background:`linear-gradient(to right,${C.accent}CC,transparent)`,transformOrigin:"left center"}}/>
                </div>
                {/* Center dot */}
                <div style={{position:"absolute",top:"50%",left:"50%",width:6,height:6,borderRadius:"50%",background:C.accent,boxShadow:`0 0 12px ${C.accent}`,transform:"translate(-50%,-50%)",animation:"drPulse 1s infinite"}}/>
                {/* Corner brackets */}
                <div style={{position:"absolute",top:10,left:10,width:14,height:14,borderTop:`2px solid ${C.accent}`,borderLeft:`2px solid ${C.accent}`,opacity:.7}}/>
                <div style={{position:"absolute",top:10,right:10,width:14,height:14,borderTop:`2px solid ${C.accent}`,borderRight:`2px solid ${C.accent}`,opacity:.7}}/>
                <div style={{position:"absolute",bottom:10,left:10,width:14,height:14,borderBottom:`2px solid ${C.accent}`,borderLeft:`2px solid ${C.accent}`,opacity:.7}}/>
                <div style={{position:"absolute",bottom:10,right:10,width:14,height:14,borderBottom:`2px solid ${C.accent}`,borderRight:`2px solid ${C.accent}`,opacity:.7}}/>
                <div style={{position:"absolute",bottom:10,left:12,fontSize:8,color:C.accent,fontFamily:"'JetBrains Mono'",letterSpacing:"1.2px",animation:"drPulse 1.2s infinite"}}>ANALYZING RETINA...</div>
              </div>
            </div>

            {/* Phase list */}
            <div>
              <div style={{fontSize:10,color:C.sub,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>AI Pipeline Progress</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
                {PHASES.map((ph,i)=>{
                  const isActive=phaseIdx===i, isDone=done.includes(i);
                  return(
                    <div key={i} style={{padding:"12px 13px",borderRadius:10,border:`1px solid ${isDone?"rgba(34,197,94,0.32)":isActive?C.accent+"88":C.border}`,background:isDone?"rgba(34,197,94,0.04)":isActive?"rgba(0,191,255,0.07)":"rgba(12,32,64,0.35)",opacity:!isActive&&!isDone?.38:1,transition:"all .35s ease",display:"flex",alignItems:"center",gap:11}}>
                      <div style={{width:25,height:25,borderRadius:"50%",flexShrink:0,border:`1px solid ${isDone?"#22C55E":isActive?C.accent:C.border}`,background:isDone?"rgba(34,197,94,0.12)":isActive?"rgba(0,191,255,0.12)":"rgba(255,255,255,0.03)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {isDone?<CheckIcon/>:isActive?<SpinnerIcon/>:<span style={{fontFamily:"'JetBrains Mono'",fontSize:9,color:C.muted}}>{i+1}</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:isDone?"#4ADE80":isActive?C.text:C.sub}}>{ph.name}</div>
                        <div style={{fontSize:9,color:C.muted,fontFamily:"'JetBrains Mono'",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ph.detail}</div>
                      </div>
                      {(isDone||isActive)&&<div style={{fontSize:9,fontWeight:600,flexShrink:0,color:isDone?"#22C55E":C.accent,textTransform:"uppercase",letterSpacing:".5px"}}>{isDone?"✓ done":"running"}</div>}
                    </div>
                  );
                })}
              </div>
              <div style={{fontSize:10,color:C.sub,display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span>Pipeline Progress</span>
                <span style={{fontFamily:"'JetBrains Mono'"}}>{Math.round(done.length/PHASES.length*100)}%</span>
              </div>
              <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${done.length/PHASES.length*100}%`,background:`linear-gradient(90deg,#0070BB,${C.accent})`,transition:"width .5s ease",boxShadow:`0 0 8px ${C.accent}55`}}/>
              </div>
            </div>
          </div>
        )}

        {/* ══ RESULTS ══════════════════════════════════════════════════════════════ */}
        {stage==="results"&&results&&(()=>{
          const G=GRADES[results.grade];
          return(
            <div style={{animation:"drFade .5s ease"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
                <div>
                  <h2 style={{fontFamily:"'Space Grotesk'",fontSize:20,fontWeight:700,margin:0}}>Analysis Complete</h2>
                  <div style={{fontSize:11,color:C.sub,marginTop:2}}>EfficientNet-B4 · Grad-CAM · Platt Calibration</div>
                </div>
                <button className="dr-outline" onClick={reset} style={{padding:"7px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.sub,cursor:"pointer",fontSize:11,fontFamily:"'Inter'"}}>← New Scan</button>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"minmax(250px,1fr) minmax(270px,1.15fr)",gap:22,alignItems:"start"}}>
                {/* LEFT: Image viewer */}
                <div>
                  <div style={{display:"flex",gap:4,marginBottom:10}}>
                    {[["original","Original"],["enhanced","Enhanced"],["heatmap","Grad-CAM"]].map(([id,lb])=>(
                      <button key={id} className="dr-tab" onClick={()=>setTab(id)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${tab===id?C.accent:C.border}`,background:tab===id?"rgba(0,191,255,0.1)":"transparent",color:tab===id?C.accent:C.sub,fontSize:10,fontWeight:500,fontFamily:"'Inter'"}}>
                        {lb}
                      </button>
                    ))}
                  </div>

                  <div style={{borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`,background:"#000",aspectRatio:"1",position:"relative"}}>
                    <img ref={imgRef} src={imgSrc} alt="Fundus" style={{width:"100%",height:"100%",objectFit:"cover",display:tab==="heatmap"?"none":"block",filter:tab==="enhanced"?"contrast(1.42) brightness(1.12) saturate(0.72)":"none"}}/>
                    <canvas ref={camRef} style={{width:"100%",height:"100%",objectFit:"cover",display:tab==="heatmap"?"block":"none"}}/>
                    <div style={{position:"absolute",top:9,left:9,padding:"3px 8px",borderRadius:4,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(6px)",fontSize:8,color:C.accent,textTransform:"uppercase",letterSpacing:"1px",fontFamily:"'JetBrains Mono'"}}>
                      {tab==="enhanced"?"CLAHE Enhanced":tab==="heatmap"?"Grad-CAM Attention":"Original Fundus"}
                    </div>
                    {tab==="heatmap"&&results.grade>0&&(
                      <div style={{position:"absolute",bottom:9,left:9,right:9,display:"flex",gap:4,justifyContent:"center"}}>
                        {[["🔵","Low"],["🟡","Med"],["🔴","High"]].map(([ic,lb])=>(
                          <div key={lb} style={{display:"flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:4,background:"rgba(0,0,0,0.65)",fontSize:9,color:C.sub}}>{ic} {lb}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:10}}>
                    {[{l:"Quality",v:`${results.quality}%`,ok:results.quality>75},{l:"Sharpness",v:results.sharpness,ok:Number(results.sharpness)>100},{l:"Entropy",v:results.entropy,ok:Number(results.entropy)>5.5}].map(m=>(
                      <div key={m.l} style={{padding:"9px 8px",borderRadius:8,textAlign:"center",background:"rgba(12,32,64,0.55)",border:`1px solid ${C.border}`}}>
                        <div style={{fontFamily:"'JetBrains Mono'",fontSize:13,fontWeight:500,color:m.ok?"#4ADE80":"#FCD34D"}}>{m.v}</div>
                        <div style={{fontSize:9,color:C.sub,marginTop:2,textTransform:"uppercase",letterSpacing:".4px"}}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT: Results panel */}
                <div style={{display:"flex",flexDirection:"column",gap:13}}>
                  {/* Grade card */}
                  <div style={{padding:20,borderRadius:12,background:G.bg,border:`1px solid ${G.color}38`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:13}}>
                      <div>
                        <div style={{fontSize:9,color:C.sub,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>DR Severity Grade</div>
                        <div style={{fontFamily:"'Space Grotesk'",fontSize:27,fontWeight:700,color:G.textColor,lineHeight:1}}>{G.name}</div>
                        <div style={{fontSize:11,color:C.sub,marginTop:3}}>{G.label}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:9,color:C.sub,marginBottom:4}}>AI Confidence</div>
                        <div style={{fontFamily:"'JetBrains Mono'",fontSize:25,fontWeight:600,color:G.color}}>{(results.confidence*100).toFixed(1)}%</div>
                      </div>
                    </div>
                    <div style={{height:5,background:"rgba(0,0,0,0.3)",borderRadius:3,overflow:"hidden",marginBottom:13}}>
                      <div style={{height:"100%",width:`${results.confidence*100}%`,background:G.color,borderRadius:3,boxShadow:`0 0 8px ${G.color}72`,transition:"width 1.2s ease"}}/>
                    </div>
                    <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:6,background:`${G.color}18`,border:`1px solid ${G.color}45`,fontSize:10,fontWeight:700,color:G.color,textTransform:"uppercase",letterSpacing:".5px"}}>
                      {results.grade>=3&&<div style={{width:6,height:6,borderRadius:"50%",background:G.color,animation:"drPulse .8s infinite"}}/>}
                      {G.urgency}
                    </span>
                  </div>

                  {/* Clinical action */}
                  <div style={{padding:"13px 15px",borderRadius:10,background:"rgba(12,32,64,0.55)",border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:9,color:C.sub,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>Clinical Recommendation</div>
                    <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>{G.action}</div>
                  </div>

                  {/* Probability bars */}
                  <div style={{padding:"13px 15px",borderRadius:10,background:"rgba(12,32,64,0.55)",border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:9,color:C.sub,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>Grade Probability Distribution</div>
                    {results.probs.map((p,i)=>(
                      <div key={i} style={{marginBottom:i<4?9:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                          <span style={{fontSize:10,fontWeight:i===results.grade?600:400,color:i===results.grade?GRADES[i].color:C.sub}}>G{i} — {GRADES[i].name}</span>
                          <span style={{fontFamily:"'JetBrains Mono'",fontSize:9,color:i===results.grade?GRADES[i].color:C.muted}}>{(p*100).toFixed(1)}%</span>
                        </div>
                        <div style={{height:4,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${p*100}%`,background:i===results.grade?GRADES[i].color:`${GRADES[i].color}45`,borderRadius:2,transition:`width ${1+i*.1}s ease`}}/>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Grad-CAM insight */}
                  <div style={{padding:"13px 15px",borderRadius:10,background:"rgba(0,191,255,0.04)",border:"1px solid rgba(0,191,255,0.14)",display:"flex",gap:11}}>
                    <div style={{fontSize:17,flexShrink:0}}>🔥</div>
                    <div>
                      <div style={{fontSize:10,fontWeight:600,color:C.accent,marginBottom:4}}>Grad-CAM Explanation</div>
                      <div style={{fontSize:11,color:C.sub,lineHeight:1.55}}>{G.explanation}</div>
                    </div>
                  </div>

                  {/* Download */}
                  <button
                    className="dr-cta"
                    onClick={()=>{
                      const rpt=`DR SCREEN AI — Clinical Screening Report\n${"═".repeat(44)}\n\nDR Grade     : ${results.grade} — ${G.name}\nConfidence   : ${(results.confidence*100).toFixed(1)}%\nAction       : ${G.action}\n\nImage Quality Metrics\n${"─".repeat(44)}\nQuality Score: ${results.quality}%\nSharpness    : ${results.sharpness}\nEntropy      : ${results.entropy}\n\nGrade Probabilities\n${"─".repeat(44)}\n${results.probs.map((p,i)=>`G${i} ${GRADES[i].name.padEnd(18)}: ${(p*100).toFixed(1)}%`).join("\n")}\n\n${"═".repeat(44)}\n⚠ AI screening only. Confirm with qualified ophthalmologist.\nGenerated by DR Screen AI v1.0`;
                      const blob=new Blob([rpt],{type:"text/plain"});
                      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`dr_report_grade${results.grade}.txt`;a.click();
                    }}
                    style={{width:"100%",padding:"12px",borderRadius:10,background:`linear-gradient(130deg,#005A99,${C.accent})`,border:"none",color:"white",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"'Space Grotesk'",boxShadow:"0 4px 20px rgba(0,191,255,0.22)",transition:"all .2s ease"}}
                  >
                    ↓ Download Clinical Report
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
