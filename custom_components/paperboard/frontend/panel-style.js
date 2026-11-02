export const panelCSS = `
.shell {max-width:1048px;margin:auto;padding:28px 24px 24px;min-width:0}
.appHeader {display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:24px}
.brand {display:flex;align-items:center;gap:18px;min-width:0}
.logoFrame {display:flex;align-items:center;background:var(--pb-logo-bg);border-radius:12px;padding:8px 12px;flex-shrink:0}
.logoFrame img {display:block;width:174px;height:auto;max-width:100%}
.brand strong {display:block;color:var(--pb-text);font-size:1.15rem;line-height:1.4}
.brand small {display:block;max-width:260px;margin-top:4px}
.headerActions {display:flex;align-items:center;gap:12px}
.version {color:var(--pb-muted);font-size:.8rem}
nav {display:flex;gap:8px;align-items:end;flex-wrap:wrap;border-bottom:1px solid var(--pb-border);padding-bottom:20px;margin-bottom:20px}
.deviceSelect {flex:1 1 100%;max-width:100%;margin-bottom:8px}
.deviceSelect select {max-width:380px}
nav button {background:transparent;border-color:transparent}
nav button.active {background:var(--pb-secondary);border-color:var(--pb-accent);color:var(--pb-accent);font-weight:650}
.newDevice {margin-left:auto;align-self:center;padding:8px}
.notice {display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:20px}
.notice button {flex:0 0 44px;padding:0;background:transparent;font-size:1.4rem}
.workspace {display:grid;grid-template-columns:minmax(0,1fr) 276px;gap:20px;align-items:start}
.pages,.editor,.inspector,.settings section,.settings>details,.empty,.loadState {background:var(--pb-card);border:1px solid var(--pb-border);border-radius:var(--pb-radius);padding:var(--pb-padding);min-width:0}
.pages {grid-column:1/-1}
.asideTitle {display:flex;align-items:center;gap:10px;font-size:.75rem;letter-spacing:.08em;font-weight:700;color:var(--pb-muted);margin-bottom:12px}
.asideTitle span {color:var(--pb-accent);letter-spacing:0}
.pageList {display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.page {justify-content:flex-start;text-align:left;background:var(--pb-background);font-size:.9rem;max-width:100%}
.page span {color:var(--pb-muted);font-variant-numeric:tabular-nums}
.chosen {border-color:var(--pb-accent)!important;color:var(--pb-accent)!important;background:var(--pb-secondary)!important}
.dashed {border-style:dashed;background:transparent}
.palette {display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
.widgets,.layers {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding-bottom:14px}
.widgets button,.layer {text-align:left;justify-content:flex-start;font-size:.85rem}
.toolbar,.tools {display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.toolbar label {flex:1 1 100%}
.toolbar input {width:100%}
.toolbar button,.tools button {font-size:.85rem}
.tools label {display:flex;align-items:center;font-size:.8rem;min-height:44px}
.stageWrap {padding:10px;border:1px solid var(--pb-border);border-radius:12px;background:var(--pb-background);overflow:hidden}
.stage {container-type:inline-size;position:relative;background:var(--pb-paper);color:#000;isolation:isolate}
.stage.grid {background-image:linear-gradient(#0000000b 1px,transparent 1px),linear-gradient(90deg,#0000000b 1px,transparent 1px);background-size:8px 8px}
.widget {position:absolute;background:var(--widget-bg);color:var(--widget-color);overflow:hidden;cursor:move;user-select:none;white-space:pre-wrap;line-height:1.3;border:1px solid transparent;touch-action:none}
.widget span {display:block;padding:5px}
.widget.calendar {font-size:1.6cqw!important;background:var(--pb-paper);border:1px solid #ddd}
.widget.calendar span {line-height:2}
.widget.line {background:var(--widget-color)}
.widget.rectangle {border:2px solid var(--widget-color)}
.widget:hover {outline:1px dashed var(--pb-secondary)}
.widget.selected {outline:2px solid var(--pb-accent);z-index:50}
.resize {position:absolute;bottom:0;right:0;width:44px;height:44px;max-width:100%;max-height:100%;cursor:nwse-resize}
.resize::after {content:"";position:absolute;bottom:0;right:0;width:14px;height:14px;background:var(--pb-accent);border:2px solid var(--pb-background);pointer-events:none}
.canvasMeta {font-size:.75rem;color:var(--pb-muted);margin:12px 0 20px}
.preview {border-top:1px solid var(--pb-border);padding-top:20px}
.previewHeading {display:flex;gap:8px;justify-content:space-between;align-items:baseline;flex-wrap:wrap;margin-bottom:12px}
.previewHeading h3 {margin:0}
.previewHeading span,.preview p {font-size:.8rem;color:var(--pb-muted)}
.preview img {display:block;width:100%;height:auto;border:1px solid var(--pb-border);background:var(--pb-paper)}
.preview p {margin:12px 0 0}
.preview p.error {color:var(--pb-error-text)}
.preview p.warning {color:var(--pb-warning-text)}
.inspector label {margin-bottom:14px}
.inspector h3 {margin-bottom:16px}
.inspector p {font-size:.875rem}
.inspector button {font-size:.85rem;width:100%}
.pairs {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.file {margin-top:16px}
.settings {min-width:0}
.settings>p {max-width:720px}
.settingsGrid {display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);grid-template-areas:"setup status" "settings status" "connection status";gap:20px;align-items:start}
.deviceSetup {grid-area:setup}.deviceStatus {grid-area:status}.deviceSettings {grid-area:settings}.deviceConnection {grid-area:connection}
.settings section {margin:0}
.settings>section,.settings>details {margin-top:20px}
.settings h2 {font-size:1.15rem}
.settings label {margin-bottom:14px}
.settings section>p:last-child {margin-bottom:0}
.calendarSource {display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) 120px;gap:14px;border-bottom:1px solid var(--pb-border);padding-bottom:16px;margin-bottom:20px}
.calendarSource .check {align-self:center}
.calendarSource button {align-self:center;justify-self:start;font-size:.9rem}
.bindingGrid {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.statusList {margin:0;display:grid;gap:0}
.statusList>div {padding:12px 0;border-bottom:1px solid var(--pb-border)}
.statusList>div:last-child {border-bottom:0}
.statusList dt {font-size:.8rem;color:var(--pb-muted);margin-bottom:4px}
.statusList dd {margin:0;color:var(--pb-text);font-size:.95rem;overflow-wrap:anywhere}
.empty,.loadState {max-width:700px;margin:24px auto}
.loadingDot {display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--pb-accent);margin-right:10px}
.helpDetails {margin-top:16px}
.helpDetails p {font-size:.875rem}
@media(max-width:850px) {
  .brand {gap:12px}.brand small {max-width:210px}.logoFrame img {width:150px}
  .workspace {grid-template-columns:minmax(0,1fr) 252px}.editor,.inspector {padding:16px}
  .palette {grid-template-columns:1fr 1fr}.widgets,.layers {grid-template-columns:1fr}
}
@media(max-width:700px) {
  .shell {padding:20px 14px}.appHeader {gap:16px}.brand {width:100%}.brand small {max-width:none}
  .headerActions {width:100%;justify-content:space-between}.headerActions button {flex:1;max-width:300px}
  .logoFrame {padding:6px 8px}.logoFrame img {width:126px}.brand strong {font-size:1rem}.brand small {font-size:.8rem}
  nav {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:end;gap:8px}
  .deviceSelect {grid-column:1/3;margin:0}.deviceSelect select {max-width:none;margin-top:0}
  .deviceSelect .labelText {position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
  nav button {grid-row:2;padding:10px 6px;font-size:.8rem}.newDevice {grid-row:1;grid-column:3;margin:0;padding:8px 0;min-height:44px;display:flex;justify-content:center;align-items:center}
  .workspace,.settingsGrid {grid-template-columns:minmax(0,1fr)}
  .settingsGrid {grid-template-areas:none}.settingsGrid>section {grid-area:auto}
  .pages {grid-column:auto;padding:16px}.editor {grid-row:2}.inspector {grid-row:3}
  .pageList {display:grid;grid-template-columns:1fr}.page {width:100%}
  .palette,.calendarSource,.bindingGrid {grid-template-columns:1fr}
  .widgets {grid-template-columns:repeat(2,minmax(0,1fr))}.layers {grid-template-columns:1fr}
  .settings section,.settings>details {padding:18px}
  .calendarSource {gap:0}.calendarSource button {width:100%}
  .toolbar button {flex:1 1 40%}.tools {gap:8px}.tools label {flex:1 1 100%}
  .inspector .pairs {grid-template-columns:repeat(2,minmax(0,1fr))}
  .notice {align-items:flex-start}.previewHeading span {font-size:.75rem}
}
@media(forced-colors:active) {.chosen,button.active {outline:2px solid Highlight}.widget.selected {outline:3px solid Highlight}}
`;
