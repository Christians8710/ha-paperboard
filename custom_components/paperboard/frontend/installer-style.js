export const installerCSS = `
:host {position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:#08161dcc;padding:24px;min-height:0}
.box {background:var(--pb-card);border:1px solid var(--pb-border);border-radius:var(--pb-radius);padding:28px;max-width:740px;width:100%;max-height:calc(100dvh - 48px);overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable;min-width:0}
header {display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
header h1 {font-size:1.5rem;line-height:1.4;margin:0}
header button {flex:0 0 44px;padding:0;font-size:1.4rem;background:transparent}
.eyebrow {font-size:.8rem;font-weight:700;letter-spacing:.08em;color:var(--pb-accent);margin-bottom:8px}
.installerBrand {display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:22px}
.logoFrame {background:var(--pb-logo-bg);padding:6px 10px;border-radius:10px}
.logoFrame img {display:block;width:136px;max-width:100%;height:auto}
.installerBrand .eyebrow {margin:0}
label {margin:18px 0}
.note {margin-bottom:16px}
label.check {margin-top:18px}
label.note {padding:16px}
.buttons {display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}
.buttons button {flex:1 1 220px}
.progress {height:14px;background:var(--pb-background);border:1px solid var(--pb-border);border-radius:8px;overflow:hidden;margin:22px 0 14px}
.progress span {height:100%;background:var(--pb-accent);display:block}
.progressLabel {color:var(--pb-text);font-size:.95rem}
.helpDetails {margin-top:20px}
.helpDetails p {font-size:.875rem}
.appFooter {font-size:.75rem}
:host([standalone]) {position:static;min-height:100dvh;background:var(--pb-background);padding:36px 24px;align-items:start}
:host([standalone]) .box {max-height:none;max-width:900px;overflow:visible}
@media(max-width:700px) {
  :host {padding:10px}.box {padding:20px 16px;max-height:calc(100dvh - 20px);border-radius:18px}
  header h1 {font-size:1.25rem}.buttons {flex-direction:column}.buttons button {flex:auto;width:100%}
  :host([standalone]) {padding:14px}.appFooter {flex-direction:column}
}
`;
