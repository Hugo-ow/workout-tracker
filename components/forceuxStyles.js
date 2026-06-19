// components/forceuxStyles.js
// CSS de l'app Forceux. Template string normale — éditable sans échappement.

export const CSS = `
:root {
  --accent:#E63946; --accent-hover:#FF4D5A; --accent-active:#B02A34;
  --bg:#0E0E0E; --bg2:#141416; --surface:#1C1C1E;
  --text:#F2F2F2; --text2:#B3B3B3; --text3:#7A7A7A;
  --border:#2E2E2E; --divider:#242424; --hover:#262626;
  --green:#1DB954; --green-bg:rgba(29,185,84,0.08); --green-border:rgba(29,185,84,0.2);
  --gold:#FFB703;
}
*{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overflow:hidden;}
body{
  font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);
  max-width:480px;margin:0 auto;display:flex;flex-direction:column;
}
#app{flex:1;display:flex;flex-direction:column;min-height:0;}
::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
input[type=number]{-moz-appearance:textfield;}

.tab-content{display:none;flex:1;min-height:0;}
.tab-content.active{display:flex;flex-direction:column;flex:1;min-height:0;}

.bottom-nav{flex-shrink:0;width:100%;background:var(--bg2);border-top:1px solid var(--border);display:flex;padding-bottom:env(safe-area-inset-bottom,0px);z-index:100;}
.nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px 10px;background:none;border:none;cursor:pointer;color:var(--text3);font-family:'Inter',sans-serif;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;transition:color .15s;position:relative;}
.nav-btn.active{color:var(--accent);}
.nav-btn.active::before{content:'';position:absolute;top:0;left:20%;right:20%;height:2px;background:var(--accent);border-radius:0 0 2px 2px;}
.nav-btn svg{width:22px;height:22px;}

.page-header{flex-shrink:0;padding:52px 20px 20px;display:flex;align-items:center;justify-content:space-between;}
.page-title{font-size:28px;font-weight:800;color:var(--text);letter-spacing:-.5px;}
.main-scroll{flex:1;overflow-y:auto;padding:0 16px 24px;}

.btn-cta{width:100%;background:var(--accent);color:#fff;border:none;border-radius:14px;padding:18px 24px;font-family:'Inter',sans-serif;font-size:16px;font-weight:800;letter-spacing:.02em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:background .15s,transform .1s;position:relative;overflow:hidden;}
.btn-cta::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.08) 0%,transparent 60%);pointer-events:none;}
.btn-cta:hover{background:var(--accent-hover);} .btn-cta:active{background:var(--accent-active);transform:scale(.98);}
.btn-secondary{width:100%;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:14px;padding:16px 24px;font-family:'Inter',sans-serif;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .15s,border-color .15s;}
.btn-secondary:hover{background:var(--hover);border-color:var(--text3);}

.section-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text3);margin-bottom:10px;padding-left:2px;}

.card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;transition:background .15s,border-color .15s;cursor:pointer;}
.card:hover{background:var(--hover);border-color:#3a3a3a;} .card+.card{margin-top:8px;}
.recent-card{display:flex;flex-direction:column;gap:10px;}
.recent-header{display:flex;align-items:flex-start;justify-content:space-between;}
.recent-title{font-size:15px;font-weight:700;color:var(--text);}
.recent-date{font-size:12px;font-weight:500;color:var(--text3);}
.recent-stats{display:flex;gap:16px;}
.stat-pill{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--text2);}
.ex-tag{font-size:11px;font-weight:600;color:var(--text3);background:var(--bg2);border:1px solid var(--divider);border-radius:6px;padding:3px 8px;}
.pr-badge{background:rgba(230,57,70,.15);border:1px solid rgba(230,57,70,.3);color:var(--accent);font-size:10px;font-weight:800;letter-spacing:.08em;padding:2px 7px;border-radius:4px;text-transform:uppercase;}
.streak-banner{background:linear-gradient(135deg,rgba(230,57,70,.15) 0%,rgba(230,57,70,.05) 100%);border:1px solid rgba(230,57,70,.25);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:20px;}
.streak-fire{font-size:28px;line-height:1;}
.streak-info{flex:1;}
.streak-num{font-size:22px;font-weight:900;color:var(--accent);letter-spacing:-.5px;}
.streak-label{font-size:12px;font-weight:500;color:var(--text2);}

.resume-banner{background:linear-gradient(135deg,rgba(58,134,255,.15),rgba(58,134,255,.05));border:1px solid rgba(58,134,255,.3);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:16px;cursor:pointer;}
.resume-banner:hover{background:linear-gradient(135deg,rgba(58,134,255,.2),rgba(58,134,255,.08));}

.session-header{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:52px 20px 16px;border-bottom:1px solid var(--border);}
.session-timer{font-size:32px;font-weight:900;color:var(--accent);letter-spacing:-1px;font-variant-numeric:tabular-nums;}
.session-name-wrap{display:flex;align-items:center;gap:6px;cursor:pointer;}
.session-name-label{font-size:18px;font-weight:800;color:var(--text);letter-spacing:-.3px;line-height:1.2;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.session-name-input{font-size:18px;font-weight:800;color:var(--text);letter-spacing:-.3px;background:transparent;border:none;border-bottom:2px solid var(--accent);outline:none;font-family:'Inter',sans-serif;width:200px;padding:0 0 2px;}
.session-scroll{flex:1;overflow-y:auto;padding:16px;}
.session-footer{flex-shrink:0;padding:12px 16px;padding-bottom:calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--border);background:var(--bg);}

.exercise-block{background:var(--surface);border:1px solid var(--border);border-radius:14px;margin-bottom:12px;overflow:hidden;animation:fadeIn .22s ease;}
.exercise-block-header{padding:13px 14px;display:flex;align-items:center;justify-content:space-between;background:var(--bg2);border-bottom:1px solid var(--divider);}
.exercise-block-title{font-size:15px;font-weight:700;color:var(--text);}
.exercise-block-group{font-size:11px;font-weight:600;margin-top:1px;}

.sets-table-head{display:grid;grid-template-columns:26px 1fr 1fr 40px;padding:7px 14px;border-bottom:1px solid var(--divider);gap:6px;}
.sets-table-head span{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text3);text-align:center;}
.sets-table-head span:first-child{text-align:left;}
.set-row{display:grid;grid-template-columns:26px 1fr 1fr 40px;padding:6px 14px;align-items:center;border-bottom:1px solid var(--divider);transition:background .25s;gap:6px;position:relative;}
.set-row:last-child{border-bottom:none;}
.set-row.done{background:var(--green-bg);}
.set-row.done .set-num{color:var(--green);}
.set-row.pr-row{background:rgba(255,183,3,.06);}
.set-num{font-size:13px;font-weight:700;color:var(--text3);}
.set-input{background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:'Inter',sans-serif;font-size:15px;font-weight:700;padding:7px 4px;text-align:center;width:100%;transition:border-color .15s,color .2s;cursor:pointer;}
.set-input:focus{outline:none;border-color:var(--accent);}
.set-input::placeholder{color:var(--text3);font-weight:500;}
.set-row.done .set-input{border-color:var(--green-border);color:var(--green);}
.set-row.pr-row .set-input{border-color:rgba(255,183,3,.4);color:var(--gold);}
.set-check{width:30px;height:30px;background:var(--bg);border:1.5px solid var(--border);border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin:0 auto;transition:all .15s;flex-shrink:0;}
.set-check svg{width:14px;height:14px;color:transparent;transition:color .15s;}
.set-check.checked{background:var(--green);border-color:var(--green);}
.set-check.checked svg{color:#fff;}
.set-row.pr-flash{animation:prFlash .6s ease;}
@keyframes prFlash{0%{background:rgba(255,183,3,.3);}100%{background:rgba(255,183,3,.06);}}

.rpe-row{display:flex;align-items:center;gap:5px;padding:6px 14px 7px;background:rgba(255,255,255,.02);border-bottom:1px solid var(--divider);overflow-x:auto;scrollbar-width:none;}
.rpe-row::-webkit-scrollbar{display:none;}
.rpe-label{font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.06em;flex-shrink:0;margin-right:2px;}
.rpe-chip{flex-shrink:0;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:4px 7px;font-family:'Inter',sans-serif;font-size:11px;font-weight:700;color:var(--text3);cursor:pointer;transition:all .12s;}
.rpe-chip:hover{border-color:var(--accent);color:var(--accent);}
.rpe-chip.selected{background:rgba(230,57,70,.15);border-color:var(--accent);color:var(--accent);}
.rpe-badge{font-size:9px;font-weight:800;color:var(--accent);line-height:1;margin-top:2px;}

.add-set-btn{width:100%;background:none;border:none;padding:10px 14px;display:flex;align-items:center;gap:6px;color:var(--accent);font-family:'Inter',sans-serif;font-size:13px;font-weight:700;cursor:pointer;border-top:1px solid var(--divider);transition:background .15s;}
.add-set-btn:hover{background:rgba(230,57,70,.05);}
.add-exercise-btn{width:100%;background:var(--surface);border:1.5px dashed var(--border);border-radius:14px;padding:15px 16px;display:flex;align-items:center;justify-content:center;gap:8px;color:var(--text3);font-family:'Inter',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .15s;margin-bottom:12px;}
.add-exercise-btn:hover{border-color:var(--accent);color:var(--accent);background:rgba(230,57,70,.04);}
.finish-btn{width:100%;background:var(--accent);color:#fff;border:none;border-radius:14px;padding:18px;font-family:'Inter',sans-serif;font-size:16px;font-weight:800;cursor:pointer;transition:background .15s;}
.finish-btn:hover{background:var(--accent-hover);}

.modal-box{background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:24px;width:100%;max-width:400px;}
.modal-title{font-size:18px;font-weight:800;color:var(--text);}

.pr-toast{position:fixed;top:72px;left:50%;transform:translateX(-50%) translateY(-20px);background:linear-gradient(135deg,#2d1a00,#1a1200);border:1px solid rgba(255,183,3,.4);border-radius:14px;padding:12px 20px;display:flex;align-items:center;gap:10px;z-index:500;opacity:0;transition:all .3s cubic-bezier(.32,.72,0,1);pointer-events:none;white-space:nowrap;box-shadow:0 8px 32px rgba(255,183,3,.15);}
.pr-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
.pr-toast-icon{font-size:20px;}
.pr-toast-text{font-size:13px;font-weight:700;color:var(--gold);}

.numpad-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:400;backdrop-filter:blur(4px);}
.numpad-overlay.open{display:block;}
.numpad{position:fixed;bottom:0;left:50%;transform:translateX(-50%) translateY(100%);width:100%;max-width:480px;background:var(--bg2);border-radius:20px 20px 0 0;border-top:1px solid var(--border);z-index:401;padding-bottom:env(safe-area-inset-bottom,16px);transition:transform .28s cubic-bezier(.32,.72,0,1);}
.numpad.open{transform:translateX(-50%) translateY(0);}
.numpad-header{padding:12px 20px 8px;display:flex;align-items:center;justify-content:space-between;}
.numpad-label{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text3);}
.numpad-display{font-size:36px;font-weight:900;color:var(--text);letter-spacing:-1px;min-width:80px;text-align:right;}
.numpad-display.has-value{color:var(--accent);}
.numpad-increments{display:flex;gap:8px;padding:0 16px 10px;}
.inc-btn{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 4px;color:var(--text2);font-family:'Inter',sans-serif;font-size:13px;font-weight:700;cursor:pointer;text-align:center;transition:all .12s;}
.inc-btn:active{background:rgba(230,57,70,.1);border-color:var(--accent);color:var(--accent);transform:scale(.96);}
.numpad-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:0 16px 8px;}
.np-btn{background:var(--surface);border:none;border-radius:12px;padding:16px;font-family:'Inter',sans-serif;font-size:20px;font-weight:700;color:var(--text);cursor:pointer;transition:background .12s,transform .1s;text-align:center;}
.np-btn:active{background:rgba(255,255,255,.08);transform:scale(.94);}
.np-btn.del{color:var(--text2);}
.np-btn.confirm{background:var(--accent);color:#fff;font-size:15px;font-weight:800;}
.numpad-half-row{display:flex;gap:6px;padding:0 16px 8px;}

.drawer-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:300;backdrop-filter:blur(4px);}
.drawer-overlay.open{display:block;}
.drawer{position:fixed;bottom:0;left:50%;transform:translateX(-50%) translateY(100%);width:100%;max-width:480px;background:var(--bg2);border-radius:20px 20px 0 0;border-top:1px solid var(--border);z-index:400;display:flex;flex-direction:column;max-height:88vh;transition:transform .3s cubic-bezier(.32,.72,0,1);}
.drawer.open{transform:translateX(-50%) translateY(0);}
.drawer-handle{width:36px;height:4px;background:var(--border);border-radius:2px;margin:12px auto 0;flex-shrink:0;}
.drawer-header{padding:16px 20px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--divider);flex-shrink:0;}
.drawer-title{font-size:18px;font-weight:800;color:var(--text);}
.drawer-search-wrap{padding:12px 16px;flex-shrink:0;border-bottom:1px solid var(--divider);}
.search-wrap-inner{position:relative;}
.drawer-search{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 14px 10px 38px;color:var(--text);font-family:'Inter',sans-serif;font-size:14px;font-weight:500;transition:border-color .15s;}
.drawer-search:focus{outline:none;border-color:var(--accent);}
.drawer-search::placeholder{color:var(--text3);}
.search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--text3);}
.group-tabs{display:flex;gap:6px;padding:10px 16px;overflow-x:auto;flex-shrink:0;border-bottom:1px solid var(--divider);}
.group-tabs::-webkit-scrollbar{display:none;}
.group-tab{flex-shrink:0;padding:6px 14px;border-radius:100px;background:var(--surface);border:1px solid var(--border);color:var(--text3);font-family:'Inter',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.group-tab.active{background:var(--accent);border-color:var(--accent);color:#fff;}
.drawer-list{overflow-y:auto;flex:1;padding:8px 0;}
.drawer-item{display:flex;align-items:center;gap:12px;padding:10px 20px;cursor:pointer;transition:background .12s;}
.drawer-item:hover{background:var(--hover);}
.drawer-item-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.drawer-item-info{flex:1;min-width:0;}
.drawer-item-name{font-size:14px;font-weight:600;color:var(--text);line-height:1.3;}
.drawer-item-target{font-size:11px;font-weight:500;color:var(--text3);margin-top:1px;}
.drawer-empty{padding:40px 20px;text-align:center;color:var(--text3);font-size:14px;font-weight:500;}

.rest-widget{position:fixed;bottom:calc(64px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%) translateY(20px);width:calc(100% - 32px);max-width:448px;background:var(--bg2);border:1px solid var(--border);border-radius:18px;z-index:150;box-shadow:0 8px 40px rgba(0,0,0,.6);overflow:hidden;opacity:0;pointer-events:none;transition:opacity .25s cubic-bezier(.32,.72,0,1),transform .25s cubic-bezier(.32,.72,0,1);}
.rest-widget.visible{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:all;}
.rest-progress-track{height:3px;background:var(--divider);}
.rest-progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-hover));transition:width 1s linear;}
.rest-body{display:flex;align-items:center;padding:12px 14px;gap:12px;}
.rest-icon{width:36px;height:36px;background:rgba(230,57,70,.12);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.rest-center{flex:1;}
.rest-lbl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text3);margin-bottom:1px;}
.rest-cd{font-size:26px;font-weight:900;color:var(--text);letter-spacing:-1px;font-variant-numeric:tabular-nums;line-height:1;}
.rest-cd.urgent{color:var(--accent);}
.rest-adj{width:32px;height:32px;background:var(--surface);border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2);flex-shrink:0;font-size:18px;font-weight:700;line-height:1;font-family:'Inter',sans-serif;}
.rest-skip{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 12px;color:var(--text2);font-family:'Inter',sans-serif;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;white-space:nowrap;}

.finish-screen{display:none;position:fixed;inset:0;background:var(--bg);z-index:600;flex-direction:column;max-width:480px;margin:0 auto;overflow:hidden;}
.finish-screen.open{display:flex;}
.finish-scroll{flex:1;overflow-y:auto;padding:60px 20px 24px;}
.finish-footer{flex-shrink:0;padding:12px 20px;padding-bottom:calc(12px + env(safe-area-inset-bottom,0px));background:var(--bg);border-top:1px solid var(--border);display:flex;gap:10px;}
.finish-big{font-size:56px;font-weight:900;color:var(--text);letter-spacing:-3px;line-height:1;animation:countUp .4s ease both;}
.finish-big.accent{color:var(--accent);}
.finish-big.green{color:var(--green);}
.finish-stat-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px;text-align:center;}
.finish-stat-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text3);margin-top:6px;}

.history-group-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text3);padding:16px 2px 8px;}
.history-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:8px;}
.history-card-header{padding:14px 16px;display:flex;justify-content:space-between;align-items:flex-start;}
.history-card-body{border-top:1px solid var(--divider);padding:10px 16px 12px;display:flex;gap:20px;}
.history-stat{display:flex;flex-direction:column;gap:1px;}
.history-stat-val{font-size:16px;font-weight:800;color:var(--text);}
.history-stat-label{font-size:11px;font-weight:500;color:var(--text3);}

.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;}
.stat-card-val{font-size:28px;font-weight:900;color:var(--text);letter-spacing:-1px;line-height:1;}
.stat-card-label{font-size:12px;font-weight:500;color:var(--text3);margin-top:6px;}
.accent-val{color:var(--accent);}
.chart-bars{display:flex;align-items:flex-end;gap:6px;height:100px;}
.chart-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end;}
.chart-bar{width:100%;background:var(--border);border-radius:4px 4px 0 0;transition:background .2s;}
.chart-bar.accent{background:var(--accent);}
.chart-label{font-size:10px;font-weight:600;color:var(--text3);text-align:center;}

.toast{display:none;position:fixed;bottom:calc(72px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 20px;font-size:14px;font-weight:600;color:var(--text);z-index:700;box-shadow:0 8px 32px rgba(0,0,0,.5);white-space:nowrap;}
.toast.show{display:block;}

@keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulseAccent{0%,100%{box-shadow:0 0 0 0 rgba(230,57,70,.3);}50%{box-shadow:0 0 0 10px rgba(230,57,70,0);}}
@keyframes countUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
.btn-cta.pulse{animation:pulseAccent 2.2s infinite;}
`
