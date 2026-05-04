import { useState, useRef, useEffect, useCallback } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, where, serverTimestamp,
} from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../services/firebase";

const COLUMNS = ["backlog", "inprogress", "inreview", "done"];
const COL = {
  backlog:    { label: "Backlog",     dot: "#6B778C", bg: "#EBECF0", hbg: "#DFE1E6" },
  inprogress: { label: "In Progress", dot: "#0052CC", bg: "#EAF0FB", hbg: "#DEEBFF" },
  inreview:   { label: "In Review",   dot: "#FF8B00", bg: "#FFF4E5", hbg: "#FFE4A3" },
  done:       { label: "Done",        dot: "#00875A", bg: "#E3FCEF", hbg: "#ABF5D1" },
};
const PRI = {
  high:   { label: "High",   color: "#DE350B", bg: "#FFEBE6" },
  medium: { label: "Medium", color: "#FF8B00", bg: "#FFF4E5" },
  low:    { label: "Low",    color: "#006644", bg: "#E3FCEF" },
};
const PROJ_COLORS = ["#6554C0","#0052CC","#00875A","#DE350B","#FF8B00","#00B8D9","#36B37E","#6B778C"];
const LS_KEY = "jira_active_project_id";

const Ic = {
  Plus:  (p) => <svg {...p} viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Dots:  (p) => <svg {...p} viewBox="0 0 16 16" fill="none"><circle cx="2.5" cy="8" r="1.3" fill="currentColor"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="13.5" cy="8" r="1.3" fill="currentColor"/></svg>,
  Edit:  (p) => <svg {...p} viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  Trash: (p) => <svg {...p} viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  X:     (p) => <svg {...p} viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Folder:(p) => <svg {...p} viewBox="0 0 16 16" fill="none"><path d="M1.5 3.5h5l1.5 2h6.5v8h-13V3.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
  Logout:(p) => <svg {...p} viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Menu:  (p) => <svg {...p} viewBox="0 0 18 18" fill="none"><rect x="2" y="4"    width="14" height="1.5" rx=".75" fill="currentColor"/><rect x="2" y="8.25" width="14" height="1.5" rx=".75" fill="currentColor"/><rect x="2" y="12.5" width="14" height="1.5" rx=".75" fill="currentColor"/></svg>,
  ChevR: (p) => <svg {...p} viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Warn:  (p) => <svg {...p} viewBox="0 0 16 16" fill="none"><path d="M8 2L1 14h14L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Jira: () => (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#2684FF"/>
      <path d="M16 6.4L8.8 13.6 16 20.8l7.2-7.2z" fill="white"/>
      <path d="M16 13.2L8.8 20.4 16 27.6l7.2-7.2z" fill="url(#jg2)"/>
      <defs><linearGradient id="jg2" x1="16" y1="13.2" x2="16" y2="27.6" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0052CC"/><stop offset="1" stopColor="#2684FF"/>
      </linearGradient></defs>
    </svg>
  ),
};

const T = {
  lbl: { fontSize:11, fontWeight:700, color:"#6B778C", letterSpacing:".05em", textTransform:"uppercase" },
  inp: { padding:"9px 12px", fontSize:14, color:"#172B4D", background:"#FAFBFC", border:"2px solid #DFE1E6", borderRadius:4, outline:"none", fontFamily:"inherit", boxSizing:"border-box", width:"100%", transition:"border-color .15s, box-shadow .15s" },
  can: { padding:"8px 16px", fontSize:14, fontWeight:600, background:"#fff", color:"#172B4D", border:"1px solid #DFE1E6", borderRadius:4, cursor:"pointer", fontFamily:"inherit" },
  pri: { padding:"8px 18px", fontSize:14, fontWeight:600, background:"#0052CC", color:"#fff", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"inherit", transition:"background .15s" },
};
const fOn  = (e) => { e.target.style.borderColor="#4C9AFF"; e.target.style.boxShadow="0 0 0 2px rgba(76,154,255,.2)"; };
const fOff = (e) => { e.target.style.borderColor="#DFE1E6"; e.target.style.boxShadow="none"; };

function useOutside(ref, cb) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  });
}

function MItem({ icon, label, onClick, danger }) {
  const [h, sH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => sH(true)} onMouseLeave={() => sH(false)}
      style={{ display:"flex", alignItems:"center", gap:9, width:"100%", padding:"8px 14px", background:h?(danger?"#FFEBE6":"#F4F5F7"):"transparent", border:"none", cursor:"pointer", fontSize:13, color:danger?"#BF2600":"#172B4D", textAlign:"left" }}>
      {icon}{label}
    </button>
  );
}

// FIX 2: Added onDoubleClick handler to open edit modal
// FIX 3: Dropdown z-index fixed to 9999, overflow visible, no scrollbar
// FIX 4: Done column tasks get strikethrough on title/desc
function TaskCard({ task, colId, onEdit, onDelete, onMove, onDragStart, onDragEnd }) {
  const [open, sO] = useState(false);
  const [drag, sD] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => sO(false));
  const pm = PRI[task.priority] || PRI.medium;
  const isDone = colId === "done";

  return (
    <div
      draggable
      onDragStart={(e) => { sD(true);  onDragStart(e, task); }}
      onDragEnd={()   => { sD(false); onDragEnd(); }}
      // FIX 2: double click anywhere on card opens edit modal
      onDoubleClick={() => onEdit(task)}
      style={{
        background:"#fff",
        border:"1px solid #DFE1E6",
        borderRadius:6,
        padding:"12px 12px 10px",
        cursor:"grab",
        position:"relative",
        userSelect:"none",
        boxShadow: drag ? "0 8px 24px rgba(9,30,66,.18)" : "0 1px 2px rgba(9,30,66,.06)",
        opacity: drag ? .45 : 1,
        transform: drag ? "rotate(1.5deg) scale(1.02)" : "none",
        transition:"box-shadow .15s, opacity .15s, transform .15s",
      }}
      onMouseEnter={(e) => { if (!drag) { e.currentTarget.style.boxShadow="0 3px 12px rgba(9,30,66,.14)"; e.currentTarget.style.borderColor="#B3BAC5"; }}}
      onMouseLeave={(e) => { if (!drag) { e.currentTarget.style.boxShadow="0 1px 2px rgba(9,30,66,.06)"; e.currentTarget.style.borderColor="#DFE1E6"; }}}
    >
      {/* tag row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        {task.tag
          ? <span style={{ fontSize:11, fontWeight:600, color:"#5E6C84", background:"#F4F5F7", padding:"2px 7px", borderRadius:3, letterSpacing:".02em" }}>{task.tag}</span>
          : <span/>}

        {/* FIX 3: dropdown wrapper with position relative, z-index 9999, no overflow/scrollbar */}
        <div ref={ref} style={{ position:"relative", marginLeft:"auto" }}>
          <button
            onClick={(e) => { e.stopPropagation(); sO(o=>!o); }}
            style={{ background:"none", border:"none", cursor:"pointer", padding:"2px 4px", borderRadius:4, color:"#97A0AF", display:"flex" }}
          >
            <Ic.Dots style={{ width:16, height:16 }}/>
          </button>
          {open && (
            <div
              style={{
                position:"fixed",   // FIX 3: fixed positioning so it always renders above everything
                zIndex:9999,        // FIX 3: very high z-index
                background:"#fff",
                border:"1px solid #DFE1E6",
                borderRadius:6,
                boxShadow:"0 8px 24px rgba(9,30,66,.16)",
                minWidth:176,
                overflow:"visible",  // FIX 3: no scrollbar
              }}
              // FIX 3: position it correctly using getBoundingClientRect via inline ref callback
              ref={el => {
                if (el && ref.current) {
                  const btn = ref.current.querySelector("button");
                  if (btn) {
                    const rect = btn.getBoundingClientRect();
                    el.style.top  = (rect.bottom + 4) + "px";
                    el.style.left = (rect.right - 176) + "px";
                  }
                }
              }}
            >
              <MItem icon={<Ic.Edit style={{ width:14, height:14 }}/>} label="Edit task"   onClick={() => { sO(false); onEdit(task); }}/>
              <div style={{ borderTop:"1px solid #F4F5F7" }}>
                <div style={{ padding:"4px 14px 3px", fontSize:11, fontWeight:700, color:"#97A0AF", textTransform:"uppercase", letterSpacing:".06em" }}>Move to</div>
                {COLUMNS.filter(c=>c!==colId).map(c => (
                  <MItem key={c}
                    icon={<span style={{ width:8, height:8, borderRadius:"50%", background:COL[c].dot, display:"inline-block" }}/>}
                    label={COL[c].label}
                    onClick={() => { sO(false); onMove(task.id, c); }}
                  />
                ))}
              </div>
              <div style={{ borderTop:"1px solid #F4F5F7" }}>
                <MItem icon={<Ic.Trash style={{ width:14, height:14 }}/>} label="Delete task" onClick={() => { sO(false); onDelete(task.id); }} danger/>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FIX 4: strikethrough title and desc when in done column */}
      <p style={{
        margin:"0 0 8px",
        fontSize:14,
        fontWeight:500,
        color: isDone ? "#97A0AF" : "#172B4D",
        lineHeight:1.45,
        wordBreak:"break-word",
        textDecoration: isDone ? "line-through" : "none",
        transition:"color .2s, text-decoration .2s",
      }}>{task.title}</p>

      {task.desc && (
        <p style={{
          margin:"0 0 10px",
          fontSize:12,
          color: isDone ? "#B3BAC5" : "#6B778C",
          lineHeight:1.4,
          overflow:"hidden",
          textOverflow:"ellipsis",
          whiteSpace:"nowrap",
          textDecoration: isDone ? "line-through" : "none",
        }}>{task.desc}</p>
      )}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:4 }}>
        <span style={{ fontSize:11, fontWeight:600, color: isDone ? "#97A0AF" : pm.color, background: isDone ? "#F4F5F7" : pm.bg, padding:"2px 8px", borderRadius:10 }}>{pm.label}</span>
        <div style={{ width:24, height:24, borderRadius:"50%", background:"#0052CC", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:10, fontWeight:700, color:"#fff" }}>{(auth.currentUser?.displayName||"U")[0].toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

// FIX 1: minHeight on drop zone changed to accommodate at least 2 task cards (~180px each = ~380px)
function KanbanCol({ colId, tasks, onAdd, onEdit, onDelete, onMove, onDragStart, onDragEnd, onDrop }) {
  const m = COL[colId];
  const [over, sOv] = useState(false);
  const [addH, sAH] = useState(false);

  return (
    <div className="k-col" style={{ display:"flex", flexDirection:"column", flex:"1 1 240px", minWidth:230, maxWidth:310 }}>
      {/* header */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"0 2px 10px" }}>
        <span style={{ width:10, height:10, borderRadius:"50%", background:m.dot, flexShrink:0 }}/>
        <span style={{ fontSize:12, fontWeight:700, color:"#5E6C84", textTransform:"uppercase", letterSpacing:".06em", flex:1 }}>{m.label}</span>
        <span style={{ fontSize:12, fontWeight:700, color:"#6B778C", background:"#EBECF0", borderRadius:10, padding:"1px 8px", minWidth:20, textAlign:"center" }}>{tasks.length}</span>
      </div>
      {/* FIX 1: minHeight increased to ~2 task heights (each ~130px + gaps) so bg shows for at least 2 tasks */}
      <div
        onDragOver={(e) => { e.preventDefault(); sOv(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) sOv(false); }}
        onDrop={(e)     => { e.preventDefault(); sOv(false); onDrop(colId); }}
        style={{
          flex:1,
          background: over ? m.hbg : m.bg,
          borderRadius:8,
          padding:10,
          display:"flex",
          flexDirection:"column",
          gap:8,
          minHeight:300,   // FIX 1: enough height for ~2 task cards
          border: over ? `2px dashed ${m.dot}` : "2px dashed transparent",
          transition:"background .15s, border-color .15s",
        }}
      >
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} colId={colId}
            onEdit={onEdit} onDelete={onDelete} onMove={onMove}
            onDragStart={onDragStart} onDragEnd={onDragEnd}/>
        ))}
        {colId === "backlog" && (
          <button onClick={() => onAdd("backlog")}
            onMouseEnter={() => sAH(true)} onMouseLeave={() => sAH(false)}
            style={{ display:"flex", alignItems:"center", gap:6, background:addH?"rgba(0,82,204,.08)":"transparent",
                     border:"none", borderRadius:6, padding:"8px 10px", cursor:"pointer",
                     color:addH?"#0052CC":"#5E6C84", fontSize:13, fontWeight:500, width:"100%",
                     transition:"background .15s, color .15s" }}>
            <Ic.Plus style={{ width:16, height:16 }}/> Create issue
          </button>
        )}
      </div>
    </div>
  );
}


function TaskModal({ mode, task, defaultStatus, onClose, onSave, saving }) {
  const [title, sT]  = useState(task?.title    || "");
  const [desc,  sD]  = useState(task?.desc     || "");
  const [pri,   sP]  = useState(task?.priority || "medium");
  const [tag,   sG]  = useState(task?.tag      || "");
  const [stat,  sSt] = useState(task?.status   || defaultStatus || "backlog");
  const r = useRef(null);
  useEffect(() => { r.current?.focus(); }, []);

  return (
    <div onClick={(e) => { if (e.target===e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(9,30,66,.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:10, width:"100%", maxWidth:520, boxShadow:"0 20px 60px rgba(9,30,66,.28)", overflow:"hidden", animation:"mpop .18s ease" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px 16px", borderBottom:"1px solid #DFE1E6" }}>
          <h2 style={{ margin:0, fontSize:18, fontWeight:600, color:"#172B4D" }}>{mode==="edit"?"Edit issue":"Create issue"}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#97A0AF", display:"flex", padding:4 }}><Ic.X style={{ width:18, height:18 }}/></button>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16, maxHeight:"70vh", overflowY:"auto" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={T.lbl}>Summary *</label>
            <input ref={r} value={title} onChange={e=>sT(e.target.value)} placeholder="What needs to be done?" style={T.inp} onFocus={fOn} onBlur={fOff}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={T.lbl}>Description</label>
            <textarea value={desc} onChange={e=>sD(e.target.value)} placeholder="Add details…" rows={3} style={{ ...T.inp, resize:"vertical", lineHeight:1.5 }} onFocus={fOn} onBlur={fOff}/>
          </div>
          <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
            <div style={{ flex:"1 1 160px", display:"flex", flexDirection:"column", gap:6 }}>
              <label style={T.lbl}>Status</label>
              <select value={stat} onChange={e=>sSt(e.target.value)} style={{ ...T.inp, cursor:"pointer" }} onFocus={fOn} onBlur={fOff}>
                {COLUMNS.map(c=><option key={c} value={c}>{COL[c].label}</option>)}
              </select>
            </div>
            <div style={{ flex:"1 1 160px", display:"flex", flexDirection:"column", gap:6 }}>
              <label style={T.lbl}>Priority</label>
              <select value={pri} onChange={e=>sP(e.target.value)} style={{ ...T.inp, cursor:"pointer" }} onFocus={fOn} onBlur={fOff}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={T.lbl}>Label / Tag</label>
            <input value={tag} onChange={e=>sG(e.target.value)} placeholder="e.g. Frontend, Backend" style={T.inp} onFocus={fOn} onBlur={fOff}/>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, padding:"14px 24px 18px", borderTop:"1px solid #DFE1E6" }}>
          <button onClick={onClose} style={T.can}>Cancel</button>
          <button onClick={() => { if (title.trim()) onSave({ title:title.trim(), desc, priority:pri, tag, status:stat }); }}
            disabled={!title.trim()||saving}
            style={{ ...T.pri, opacity:(!title.trim()||saving)?.55:1, cursor:(!title.trim()||saving)?"not-allowed":"pointer" }}>
            {saving?"Saving…":(mode==="edit"?"Save changes":"Create issue")}
          </button>
        </div>
      </div>
    </div>
  );
}


function NewProjectModal({ onClose, onCreate, saving }) {
  const [name, sN] = useState("");
  const [key,  sK] = useState("");
  const [col,  sC] = useState(PROJ_COLORS[0]);
  const r = useRef(null);
  useEffect(() => { r.current?.focus(); }, []);

  return (
    <div onClick={(e) => { if (e.target===e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(9,30,66,.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:10, width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(9,30,66,.28)", overflow:"hidden", animation:"mpop .18s ease" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px 16px", borderBottom:"1px solid #DFE1E6" }}>
          <h2 style={{ margin:0, fontSize:18, fontWeight:600, color:"#172B4D" }}>New project</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#97A0AF", display:"flex", padding:4 }}><Ic.X style={{ width:18, height:18 }}/></button>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={T.lbl}>Project name *</label>
            <input ref={r} value={name}
              onChange={e => { sN(e.target.value); sK(e.target.value.replace(/[^A-Za-z]/g,"").toUpperCase().slice(0,6)); }}
              placeholder="e.g. Awal Plastics" style={T.inp} onFocus={fOn} onBlur={fOff}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={T.lbl}>Project key</label>
            <input value={key} onChange={e=>sK(e.target.value.toUpperCase().slice(0,6))} placeholder="SCRUM" style={T.inp} onFocus={fOn} onBlur={fOff}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <label style={T.lbl}>Color</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {PROJ_COLORS.map(c => (
                <button key={c} onClick={() => sC(c)}
                  style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer",
                           border: col===c ? "3px solid #172B4D":"2px solid transparent",
                           transition:"border .12s" }}/>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, padding:"14px 24px 18px", borderTop:"1px solid #DFE1E6" }}>
          <button onClick={onClose} style={T.can}>Cancel</button>
          <button onClick={() => { if (name.trim()) onCreate({ name:name.trim(), key:key||"PROJ", color:col }); }}
            disabled={!name.trim()||saving}
            style={{ ...T.pri, opacity:(!name.trim()||saving)?.55:1, cursor:(!name.trim()||saving)?"not-allowed":"pointer" }}>
            {saving?"Creating…":"Create project"}
          </button>
        </div>
      </div>
    </div>
  );
}


function ConfirmModal({ title, body, confirmLabel, confirmColor, onClose, onConfirm }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(9,30,66,.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:10, width:"100%", maxWidth:380, boxShadow:"0 20px 60px rgba(9,30,66,.28)", padding:"28px 28px 22px", animation:"mpop .18s ease" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:"#FFEBE6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
            <Ic.Warn style={{ width:18, height:18, color:"#DE350B" }}/>
          </div>
          <div>
            <h3 style={{ margin:"0 0 6px", fontSize:16, fontWeight:600, color:"#172B4D" }}>{title}</h3>
            <p style={{ margin:0, fontSize:14, color:"#5E6C84", lineHeight:1.5 }}>{body}</p>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={T.can}>Cancel</button>
          <button onClick={onConfirm} style={{ ...T.pri, background:confirmColor||"#DE350B" }}>{confirmLabel||"Delete"}</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  /* ── auth guard ── */
  const [user, setUser] = useState(() => auth.currentUser);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login", { replace: true });
      else setUser(u);
    });
    return unsub;
  }, [navigate]);

  const [projects,   sProj]   = useState([]);
  const [activeProj, sAP]     = useState(null);
  const [tasks,      sTasks]  = useState([]);
  const [modal,      sModal]  = useState(null);
  const [search,     sSearch] = useState("");
  const [sidebar,    sSide]   = useState(true);
  const [mobileOpen, sMob]    = useState(false);
  const [avatarMenu, sAM]     = useState(false);
  const [saving,     sSaving] = useState(false);
  const [loadingT,   sLT]     = useState(false);
  const [dragTask,   sDT]     = useState(null);

  const avatarRef  = useRef(null);
  const taskCntRef = useRef(0);
  useOutside(avatarRef, () => sAM(false));

  const setActive = useCallback((proj) => {
    sAP(proj);
    if (proj) localStorage.setItem(LS_KEY, proj.id);
    else      localStorage.removeItem(LS_KEY);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "projects"), where("ownerId","==",user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d=>({ id:d.id, ...d.data() }));
      list.sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));
      sProj(list);

      const saved = localStorage.getItem(LS_KEY);
      const found = list.find(p => p.id === saved);
      sAP(prev => {
        if (prev) {
          const refresh = list.find(p => p.id === prev.id);
          return refresh || (list[0] ?? null);
        }
        return found || list[0] || null;
      });
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!activeProj || !user) { sTasks([]); return; }
    sTasks([]);
    sLT(true);
    const q = query(
      collection(db, "tasks"),
      where("projectId","==",activeProj.id),
      where("ownerId",  "==",user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d=>({ id:d.id, ...d.data() }));
      list.sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));
      sTasks(list);
      taskCntRef.current = list.length;
      sLT(false);
    });
    return unsub;
  }, [activeProj?.id, user]);

  /* ── logout ── */
  const logout = async () => {
    localStorage.removeItem(LS_KEY);
    await signOut(auth);
    navigate("/", { replace:true });
  };

  /* ── task CRUD ── */
  const saveTask = async (data) => {
    sSaving(true);
    try {
      if (modal.type==="create") {
        await addDoc(collection(db,"tasks"), {
          ...data, projectId:activeProj.id, ownerId:user.uid,
          key:`${activeProj.key}-${++taskCntRef.current}`,
          createdAt:serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db,"tasks",modal.task.id), { ...data, updatedAt:serverTimestamp() });
      }
      sModal(null);
    } finally { sSaving(false); }
  };

  const moveTask = useCallback(async (id, status) => {
    await updateDoc(doc(db,"tasks",id), { status, updatedAt:serverTimestamp() });
  }, []);

  const deleteTask = async () => {
    await deleteDoc(doc(db,"tasks",modal.taskId));
    sModal(null);
  };

  /* ── project CRUD ── */
  const createProject = async (data) => {
    sSaving(true);
    try {
      const ref = await addDoc(collection(db,"projects"), { ...data, ownerId:user.uid, createdAt:serverTimestamp() });
      const newProj = { id:ref.id, ...data, ownerId:user.uid };
      setActive(newProj);
      sModal(null);
    } finally { sSaving(false); }
  };

  const deleteProject = async () => {
    const pid = modal.projectId;
    const q = query(collection(db,"tasks"), where("projectId","==",pid), where("ownerId","==",user.uid));
    const snap = await new Promise(res => { const u = onSnapshot(q, s => { u(); res(s); }); });
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db,"tasks",d.id))));
    await deleteDoc(doc(db,"projects",pid));
    sAP(prev => {
      if (prev?.id === pid) { localStorage.removeItem(LS_KEY); return null; }
      return prev;
    });
    sModal(null);
  };

  /* ── drag & drop ── */
  const onDragStart = useCallback((e, task) => { sDT(task); e.dataTransfer.effectAllowed="move"; }, []);
  const onDragEnd   = useCallback(() => sDT(null), []);
  const onDrop      = useCallback(async (colId) => {
    if (dragTask && dragTask.status !== colId) await moveTask(dragTask.id, colId);
    sDT(null);
  }, [dragTask, moveTask]);

  /* ── helpers ── */
  const filtered = tasks.filter(t =>
    !search ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.tag||"").toLowerCase().includes(search.toLowerCase())
  );
  const byCol = (col) => filtered.filter(t => t.status===col);
  const ini   = (n)   => (n||"U").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

  if (!user) return null;

  return (
    <>
      {/* ── global styles ── */}
      <style>{`
        @keyframes mpop { from{transform:scale(.94);opacity:0} to{transform:scale(1);opacity:1} }
        *,*::before,*::after{box-sizing:border-box}
        html,body{margin:0;padding:0;height:100%;background:#F1F2F4}
        input,textarea,select,button{font-family:inherit}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#F1F2F4}
        ::-webkit-scrollbar-thumb{background:#C1C7D0;border-radius:3px}

        .ds-side{
          width:242px; min-width:242px;
          background:#1D2125;
          display:flex; flex-direction:column;
          transition:width .22s,min-width .22s;
          overflow:hidden; flex-shrink:0;
        }
        .ds-side.collapsed{ width:0!important; min-width:0!important; }

        @media(max-width:768px){
          .ds-side{
            position:fixed!important; left:0; top:0;
            height:100vh; z-index:500;
            width:242px!important; min-width:242px!important;
            transform:translateX(-100%);
            transition:transform .25s!important;
            box-shadow:4px 0 24px rgba(9,30,66,.3);
          }
          .ds-side.mob-open{ transform:translateX(0)!important; }
          .ds-overlay{ display:block!important; }
          .ds-board-wrap{ padding:16px 12px!important; }
          .ds-cols{ gap:10px!important; }
          .k-col{ min-width:200px!important; }
          .ds-search{ display:none!important; }
          .ds-breadcrumb{ display:none!important; }
          .ds-nav{ padding:0 12px!important; gap:8px!important; }
        }
        @media(max-width:480px){
          .k-col{ min-width:175px!important; max-width:175px!important; }
          .ds-board-wrap{ padding:10px 8px!important; }
          .ds-nav-logo{ display:flex!important; }
        }
        .ds-overlay{ display:none; position:fixed; inset:0; background:rgba(9,30,66,.45); z-index:499; }
        .ds-nav-logo{ display:none; }
      `}</style>

      <div style={{ display:"flex", height:"100vh", fontFamily:"'Segoe UI',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif", overflow:"hidden", background:"#F1F2F4" }}>

        {/* mobile overlay */}
        {mobileOpen && (
          <div className="ds-overlay" style={{ display:"block" }} onClick={() => sMob(false)}/>
        )}

        {/* ══ SIDEBAR ══ */}
        <aside className={`ds-side${!sidebar?" collapsed":""}${mobileOpen?" mob-open":""}`}>
          <div style={{ padding:"14px 16px 12px", borderBottom:"1px solid #2C333A", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <Ic.Jira/>
            <span style={{ fontSize:17, fontWeight:700, color:"#4C9AFF", letterSpacing:".09em" }}>JIRA</span>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"14px 0 20px" }}>
            <div style={{ padding:"0 10px 10px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, padding:"0 4px" }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#8C9BAB", letterSpacing:".08em", textTransform:"uppercase" }}>Projects</span>
                <button onClick={() => sModal({ type:"newProject" })} title="New project"
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#8C9BAB", padding:"2px 3px", borderRadius:3, display:"flex" }}
                  onMouseEnter={e=>{ e.currentTarget.style.color="#fff"; e.currentTarget.style.background="#2C333A"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.color="#8C9BAB"; e.currentTarget.style.background="none"; }}>
                  <Ic.Plus style={{ width:16, height:16 }}/>
                </button>
              </div>

              {projects.length===0 && (
                <p style={{ fontSize:12, color:"#6B778C", padding:"2px 10px", margin:0 }}>No projects yet</p>
              )}

              {projects.map(proj => {
                const active = activeProj?.id===proj.id;
                return (
                  <div key={proj.id} style={{ display:"flex", alignItems:"center", borderRadius:6, marginBottom:2,
                    background:active?"#2C333A":"transparent",
                    transition:"background .12s" }}
                    onMouseEnter={e=>{ if (!active) e.currentTarget.style.background="#252B30"; }}
                    onMouseLeave={e=>{ if (!active) e.currentTarget.style.background="transparent"; }}>
                    <button onClick={() => { setActive(proj); sMob(false); }}
                      style={{ display:"flex", alignItems:"center", gap:9, flex:1, padding:"8px 10px", background:"none", border:"none", cursor:"pointer", textAlign:"left", color:active?"#fff":"#B8C4CE", fontSize:13, fontWeight:500, minWidth:0 }}>
                      <div style={{ width:22, height:22, borderRadius:4, background:proj.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ fontSize:9, fontWeight:800, color:"#fff" }}>{(proj.key||"P").slice(0,2)}</span>
                      </div>
                      <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{proj.name}</span>
                      {active && <Ic.ChevR style={{ width:13, height:13, opacity:.5 }}/>}
                    </button>
                    <button
                      onClick={() => sModal({ type:"deleteProject", projectId:proj.id, projectName:proj.name })}
                      title={`Delete ${proj.name}`}
                      style={{ background:"none", border:"none", cursor:"pointer", color:"#6B778C", padding:"4px 8px", display:"flex", alignItems:"center", flexShrink:0, borderRadius:4 }}
                      onMouseEnter={e=>{ e.currentTarget.style.color="#DE350B"; e.currentTarget.style.background="rgba(222,53,11,.1)"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.color="#6B778C"; e.currentTarget.style.background="none"; }}>
                      <Ic.Trash style={{ width:13, height:13 }}/>
                    </button>
                  </div>
                );
              })}
            </div>

            {projects.length > 0 && (
              <div style={{ padding:"14px 10px 0", borderTop:"1px solid #2C333A", marginTop:6 }}>
                <div style={{ padding:"0 4px 8px" }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"#8C9BAB", letterSpacing:".08em", textTransform:"uppercase" }}>Recent</span>
                </div>
                {[...projects].reverse().slice(0,4).map(proj => (
                  <button key={proj.id+"r"} onClick={() => { setActive(proj); sMob(false); }}
                    style={{ display:"flex", alignItems:"center", gap:9, width:"100%", padding:"7px 10px", borderRadius:6, background:"transparent", border:"none", cursor:"pointer", color:"#8C9BAB", fontSize:12, marginBottom:2, transition:"background .12s, color .12s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="#2C333A"; e.currentTarget.style.color="#B8C4CE"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#8C9BAB"; }}>
                    <Ic.Folder style={{ width:13, height:13, flexShrink:0 }}/>
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{proj.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ══ MAIN ══ */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

          {/* ── NAVBAR ── */}
          <header className="ds-nav"
            style={{ height:54, background:"#1D2125", borderBottom:"1px solid #2C333A", display:"flex", alignItems:"center", padding:"0 18px", gap:10, flexShrink:0 }}>

            <button
              onClick={() => {
                if (window.innerWidth <= 768) sMob(o=>!o);
                else sSide(o=>!o);
              }}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#8C9BAB", padding:"4px 5px", borderRadius:4, display:"flex", alignItems:"center", flexShrink:0 }}
              onMouseEnter={e=>{ e.currentTarget.style.color="#fff"; e.currentTarget.style.background="#2C333A"; }}
              onMouseLeave={e=>{ e.currentTarget.style.color="#8C9BAB"; e.currentTarget.style.background="none"; }}>
              <Ic.Menu style={{ width:18, height:18 }}/>
            </button>

            <div className="ds-nav-logo" style={{ display: sidebar ? "none":"flex", alignItems:"center", gap:7, marginRight:4 }}>
              <Ic.Jira/>
              <span style={{ fontSize:15, fontWeight:700, color:"#4C9AFF", letterSpacing:".08em" }}>JIRA</span>
            </div>

            <div className="ds-breadcrumb" style={{ display:"flex", alignItems:"center", gap:5, flex:1, overflow:"hidden", minWidth:0 }}>
              <span style={{ fontSize:13, color:"#6B778C", whiteSpace:"nowrap" }}>Projects</span>
              <span style={{ color:"#3D4551", fontSize:14 }}>/</span>
              <span style={{ fontSize:13, fontWeight:600, color:"#9FADBC", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{activeProj?.name||"—"}</span>
              <span style={{ color:"#3D4551", fontSize:14 }}>/</span>
              <span style={{ fontSize:13, fontWeight:600, color:"#fff", whiteSpace:"nowrap" }}>Board</span>
            </div>
            <div style={{ flex:1 }}/>

            <div className="ds-search" style={{ position:"relative", display:"flex", alignItems:"center" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ position:"absolute", left:10, pointerEvents:"none" }}>
                <circle cx="6.5" cy="6.5" r="4.5" stroke="#6B778C" strokeWidth="1.5"/>
                <path d="M10 10l3 3" stroke="#6B778C" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input value={search} onChange={e=>sSearch(e.target.value)} placeholder="Search board…"
                style={{ background:"#2C333A", border:"1px solid #3D4551", borderRadius:6, padding:"7px 12px 7px 30px", fontSize:13, color:"#B8C4CE", outline:"none", width:185, fontFamily:"inherit" }}
                onFocus={e=>{ e.target.style.borderColor="#4C9AFF"; e.target.style.background="#22272B"; }}
                onBlur={e =>{ e.target.style.borderColor="#3D4551"; e.target.style.background="#2C333A"; }}/>
            </div>

            <button
              onClick={() => { if (activeProj) sModal({ type:"create", defaultStatus:"backlog" }); }}
              disabled={!activeProj}
              style={{ display:"flex", alignItems:"center", gap:6, background:"#0052CC", color:"#fff", border:"none", borderRadius:6, padding:"8px 14px", fontSize:13, fontWeight:600, cursor:activeProj?"pointer":"not-allowed", opacity:activeProj?1:.5, whiteSpace:"nowrap", flexShrink:0 }}
              onMouseEnter={e=>{ if (activeProj) e.currentTarget.style.background="#0065FF"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="#0052CC"; }}>
              <Ic.Plus style={{ width:15, height:15 }}/> Create
            </button>

            <div ref={avatarRef} style={{ position:"relative", flexShrink:0 }}>
              <button onClick={() => sAM(o=>!o)}
                style={{ width:34, height:34, borderRadius:"50%", background:"#0052CC", border:avatarMenu?"2px solid #4C9AFF":"2px solid transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"border .12s" }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{ini(user?.displayName||user?.email)}</span>
              </button>
              {avatarMenu && (
                <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", background:"#fff", border:"1px solid #DFE1E6", borderRadius:8, boxShadow:"0 8px 28px rgba(9,30,66,.18)", zIndex:600, minWidth:210, overflow:"hidden", animation:"mpop .15s ease" }}>
                  <div style={{ padding:"14px 16px 12px", borderBottom:"1px solid #F4F5F7" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#172B4D", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.displayName||"User"}</div>
                    <div style={{ fontSize:12, color:"#6B778C", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</div>
                  </div>
                  <MItem icon={<Ic.Logout style={{ width:14, height:14 }}/>} label="Log out" onClick={logout} danger/>
                </div>
              )}
            </div>
          </header>

          {/* ── BOARD ── */}
          <div className="ds-board-wrap" style={{ flex:1, overflowY:"auto", padding:"24px 28px", minWidth:0 }}>
            {!activeProj ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"65%", gap:14 }}>
                <div style={{ width:68, height:68, borderRadius:"50%", background:"#EBECF0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Ic.Folder style={{ width:30, height:30, color:"#6B778C" }}/>
                </div>
                <p style={{ fontSize:17, fontWeight:600, color:"#172B4D", margin:0 }}>No project selected</p>
                <p style={{ fontSize:14, color:"#6B778C", margin:0 }}>Create a project to get started</p>
                <button onClick={() => sModal({ type:"newProject" })}
                  style={{ ...T.pri, display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                  <Ic.Plus style={{ width:15, height:15 }}/> New project
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom:22 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                    <div style={{ width:28, height:28, borderRadius:6, background:activeProj.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:10, fontWeight:800, color:"#fff" }}>{(activeProj.key||"P").slice(0,2)}</span>
                    </div>
                    <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:"#172B4D", letterSpacing:"-.01em" }}>{activeProj.name}</h1>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:13, color:"#6B778C" }}>Board</span>
                    <span style={{ fontSize:13, color:"#C1C7D0" }}>·</span>
                    <span style={{ fontSize:13, color:"#6B778C" }}>{tasks.length} issue{tasks.length!==1?"s":""}</span>
                    {loadingT && <span style={{ fontSize:12, color:"#97A0AF" }}>· syncing…</span>}
                  </div>
                </div>

                <div className="ds-cols" style={{ display:"flex", gap:14, alignItems:"flex-start", overflowX:"auto", paddingBottom:20 }}>
                  {COLUMNS.map(col => (
                    <KanbanCol key={col} colId={col}
                      tasks={byCol(col)}
                      onAdd={st => sModal({ type:"create", defaultStatus:st })}
                      onEdit={t  => sModal({ type:"edit", task:t })}
                      onDelete={id => sModal({ type:"deleteTask", taskId:id })}
                      onMove={moveTask}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      onDrop={onDrop}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══ MODALS ══ */}
      {(modal?.type==="create"||modal?.type==="edit") && (
        <TaskModal mode={modal.type} task={modal.task} defaultStatus={modal.defaultStatus}
          onClose={()=>sModal(null)} onSave={saveTask} saving={saving}/>
      )}
      {modal?.type==="deleteTask" && (
        <ConfirmModal
          title="Delete this issue?"
          body="This action cannot be undone. The issue will be permanently removed."
          confirmLabel="Delete issue"
          onClose={()=>sModal(null)}
          onConfirm={deleteTask}
        />
      )}
      {modal?.type==="deleteProject" && (
        <ConfirmModal
          title={`Delete "${modal.projectName}"?`}
          body="This will permanently delete the project and ALL its issues. This cannot be undone."
          confirmLabel="Delete project"
          onClose={()=>sModal(null)}
          onConfirm={deleteProject}
        />
      )}
      {modal?.type==="newProject" && (
        <NewProjectModal onClose={()=>sModal(null)} onCreate={createProject} saving={saving}/>
      )}
    </>
  );
}