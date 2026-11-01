import {PaperBoardInstaller} from '../custom_components/paperboard/frontend/installer-ui.js';
import logoData from '../custom_components/paperboard/frontend/paperboard-logo.png';
const data=JSON.parse(document.getElementById('paperboard-config').textContent);
document.getElementById('paperboard-config').remove();
const installer=new PaperBoardInstaller();
installer.context={...data,offline:true,logoSrc:logoData};
installer.setAttribute('standalone','');
document.body.style.margin='0';
document.body.append(installer);
