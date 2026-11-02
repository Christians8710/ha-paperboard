// Gemeinsame Gestaltung für Editor und eigenständigen USB-Installer.
// Home Assistant hat Vorrang; eigenständige Installer folgen dem Betriebssystem.
export function syncAppearance(element,hass) {
  const dark=hass?.themes?.darkMode;
  if(typeof dark==='boolean')element.setAttribute('appearance',dark?'dark':'light');
  else element.removeAttribute('appearance');
}
const lightCSS = `
  --pb-background:#f1f6f7; --pb-card:#ffffff; --pb-border:#6b858e;
  --pb-text:#16343d; --pb-muted:#46636c; --pb-primary:#f5c66a;
  --pb-accent:#076967; --pb-secondary:#e2edef; --pb-input:#f8fbfb;
  --pb-error-bg:#fff0ee; --pb-error-text:#8c2520; --pb-error-border:#b53a32;
  --pb-warning-bg:#fff4d9; --pb-warning-text:#624600;
  --pb-success-bg:#e7f3ee; --pb-logo-bg:#edf6f6;
  color-scheme:light;
`;
export const themeCSS = `
:host {
  --pb-background:#10252c; --pb-card:#18363e; --pb-border:#36525b;
  --pb-text:#edf6f6; --pb-muted:#b6cdd0; --pb-primary:#f5c66a; --pb-primary-text:#10252c;
  --pb-accent:#65d9d7; --pb-secondary:#2e535b; --pb-input:#10252c;
  --pb-error-bg:#472b33; --pb-error-text:#ffdad6; --pb-error-border:#e9a29b;
  --pb-warning-bg:#3c3525; --pb-warning-text:#f9dda3;
  --pb-success-bg:#193f3e; --pb-paper:#fff; --pb-logo-bg:#edf6f6;
  --pb-radius:18px; --pb-control-radius:10px; --pb-space:20px; --pb-padding:22px;
  color-scheme:dark; color:var(--pb-text); background:var(--pb-background);
  font:400 1rem/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  display:block; min-height:100%; overflow-wrap:anywhere;
}
:host([appearance=light]) {${lightCSS}}
@media(prefers-color-scheme:light) {:host(:not([appearance])) {${lightCSS}}}
*,*::before,*::after {box-sizing:border-box}
[hidden] {display:none!important}
h1,h2,h3,p {margin-top:0}
h1 {font-size:clamp(1.55rem,3vw,2rem);line-height:1.25;letter-spacing:-.025em;margin-bottom:12px}
h2 {font-size:1.2rem;line-height:1.4;margin-bottom:12px}
h3 {font-size:1rem;line-height:1.4;margin-bottom:12px}
p {color:var(--pb-muted);line-height:1.65;margin-bottom:16px}
small,.small {font-size:.875rem;color:var(--pb-muted)}
a {color:var(--pb-accent);text-underline-offset:4px;overflow-wrap:anywhere}
button,input,select,textarea {font:inherit}
button,.button {
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  min-height:44px;padding:9px 15px;border:1px solid var(--pb-border);
  border-radius:var(--pb-control-radius);background:var(--pb-secondary);
  color:var(--pb-text);text-align:center;line-height:1.4;text-decoration:none;cursor:pointer;
  white-space:normal;overflow-wrap:anywhere;
}
button:hover:not(:disabled),.button:hover {border-color:var(--pb-accent)}
button.primary,.button.primary {background:var(--pb-primary);color:var(--pb-primary-text);border-color:var(--pb-primary);font-weight:700}
button.primary:hover:not(:disabled),.button.primary:hover {border-color:var(--pb-text)}
button:disabled {opacity:.5;cursor:default}
input:not([type=checkbox]):not([type=range]),select,textarea {
  display:block;width:100%;min-width:0;min-height:44px;padding:10px 12px;
  background:var(--pb-input);color:var(--pb-text);border:1px solid var(--pb-border);
  border-radius:var(--pb-control-radius);line-height:1.5;
}
textarea {resize:vertical}
input::placeholder,textarea::placeholder {color:var(--pb-muted);opacity:.8}
input[type=checkbox] {width:20px;height:20px;flex:0 0 20px;margin:2px 8px 0 0;accent-color:var(--pb-accent)}
input[type=range] {accent-color:var(--pb-accent);width:100%;min-height:44px}
input[type=file] {overflow:hidden}
input[type=file]::file-selector-button {font:inherit;color:var(--pb-text);background:var(--pb-secondary);border:0;border-radius:6px;padding:5px 9px;margin-right:8px;cursor:pointer}
label {display:block;font-size:.9rem;color:var(--pb-muted);overflow-wrap:anywhere}
label>input:not([type=checkbox]),label>select,label>textarea {margin-top:7px}
.check {display:flex;align-items:flex-start;gap:6px;min-height:44px;line-height:1.5;color:var(--pb-text)}
hr {border:0;border-top:1px solid var(--pb-border);margin:22px 0}
details {border:1px solid var(--pb-border);border-radius:12px;padding:0 14px}
summary {cursor:pointer;min-height:44px;padding:11px 0;color:var(--pb-text);font-weight:600;line-height:1.5}
details[open]>summary {margin-bottom:12px;border-bottom:1px solid var(--pb-border)}
details>p:last-child {margin-bottom:14px}
.note,.notice {border:1px solid var(--pb-border);border-radius:12px;background:var(--pb-success-bg);padding:14px 16px;color:var(--pb-text);line-height:1.6}
.warning {background:var(--pb-warning-bg);color:var(--pb-warning-text);border-color:var(--pb-primary)}
.error {background:var(--pb-error-bg);color:var(--pb-error-text);border-color:var(--pb-error-border)}
[aria-invalid=true] {border-color:var(--pb-error-border)!important}
:is(button,a,input,select,textarea,summary,[tabindex]):focus-visible {outline:3px solid var(--pb-accent);outline-offset:3px}
pre {white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%;padding:16px;background:var(--pb-background);border:1px solid var(--pb-border);border-radius:12px;color:var(--pb-text);font-size:.875rem}
.appFooter {display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid var(--pb-border);padding-top:20px;margin-top:24px;font-size:.8rem;color:var(--pb-muted)}
.appFooter p {margin:0}
@media(prefers-reduced-motion:reduce) {*{scroll-behavior:auto!important}}
`;

export const footerHTML = `<footer class="appFooter"><p>© 2026 Christians8710 · <a href="https://github.com/Christians8710/ha-paperboard/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT-Lizenz</a></p><a href="https://github.com/Christians8710/ha-paperboard#readme" target="_blank" rel="noopener noreferrer">Hilfe & Dokumentation</a></footer>`;
