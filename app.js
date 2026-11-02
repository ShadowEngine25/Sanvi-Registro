/* PA1 · Sprint 1. Prototipo local, no es un servicio de identidad. */
'use strict';
const STORAGE_KEY = 'sanvi.sprint1.demo.v2';
const $ = selector => document.querySelector(selector);
const form = $('#registration-form');
const loginForm = $('#login-form');
const fields = ['name', 'email', 'password', 'confirm'];
const profiles = {
 estudiante: {label:'Estudiante', description:'Cada paso cuenta. Este será tu punto de partida para aprender y descubrir.', modules:['Mis actividades','Cuestionarios y práctica','Mi progreso']},
 docente: {label:'Docente', description:'Tu acompañamiento hace la diferencia. Este espacio estará dedicado a tu labor educativa.', modules:['Crear actividades','Asignar por sección','Reportes de aprendizaje']},
 tutor: {label:'Tutor', description:'Acompañar también es aprender. Conoce las futuras herramientas de seguimiento.', modules:['Seguimiento tutorial','Alertas académicas','Observaciones de acompañamiento']},
 coordinador: {label:'Coordinador académico', description:'Una mirada compartida para orientar mejor a nuestra comunidad educativa.', modules:['Panorama institucional','Reportes por nivel','Exportar reportes']}
};
let busy = false;
function readRecords() {
 const records = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
 if (!Array.isArray(records) || records.some(r => !r || typeof r.email !== 'string' || typeof r.name !== 'string' || !Object.hasOwn(profiles,r.role) || !/^[a-f0-9]{32}$/.test(r.salt) || !/^[a-f0-9]{64}$/.test(r.digest))) throw new Error('Datos locales no válidos');
 return records;
}
function setError(id,message) {
 $(`#${id}-error`).textContent=message;
 document.getElementById(id).setAttribute('aria-invalid',String(Boolean(message)));
}
function validate(id) {
 const input=document.getElementById(id); let message='';
 if(id==='name' && (input.value.trim().length<2 || input.value.length>100)) message='Escribe tu nombre (entre 2 y 100 caracteres).';
 if(id.includes('email') && (!input.value.trim() || !input.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()))) message='Escribe un correo válido, como ana@ejemplo.com.';
 if(id==='password' && (input.value.length<8 || input.value.length>128)) message='Usa una contraseña de 8 a 128 caracteres.';
 if(id==='confirm' && (!input.value || input.value!==form.elements.password.value)) message='Las contraseñas deben coincidir.';
 if(id==='login-password' && !input.value) message='Escribe tu contraseña de prueba.';
 setError(id,message); return !message;
}
function validateAll(ids) {
 const results=ids.map(validate); const first=results.indexOf(false);
 if(first!==-1) document.getElementById(ids[first]).focus();
 return first===-1;
}
const allFields=[...fields,'login-email','login-password'];
allFields.forEach(id=>{
 const input=document.getElementById(id);
 input.addEventListener('blur',()=>validate(id));
 input.addEventListener('input',()=>{
  $('#form-message').textContent=''; $('#login-message').textContent='';
  if(input.getAttribute('aria-invalid')==='true') validate(id);
  if(id==='password' && form.elements.confirm.value) validate('confirm');
 });
});
function updateReveal(button,visible) {
 const id=button.dataset.target;
 document.getElementById(id).type=visible?'text':'password';
 button.textContent=visible?'Ocultar':'Mostrar'; button.setAttribute('aria-pressed',String(visible));
 const name=id==='confirm'?'confirmación de contraseña':id==='login-password'?'contraseña de ingreso':'contraseña';
 button.setAttribute('aria-label',`${visible?'Ocultar':'Mostrar'} ${name}`);
}
document.querySelectorAll('.reveal').forEach(button=>button.addEventListener('click',()=>updateReveal(button,document.getElementById(button.dataset.target).type==='password')));
function clearPasswords() {
 ['password','confirm','login-password'].forEach(id=>{document.getElementById(id).value='';});
 document.querySelectorAll('.reveal').forEach(button=>updateReveal(button,false));
}
function showView(view) {
 $('#registration-panel').hidden=view!=='register'; $('#login-panel').hidden=view!=='login'; $('#success-panel').hidden=view!=='welcome';
 $('.access-nav').hidden=view==='welcome';
 $('#nav-register').setAttribute('aria-pressed',String(view==='register')); $('#nav-login').setAttribute('aria-pressed',String(view==='login'));
 allFields.forEach(id=>setError(id,''));
 $('#form-message').textContent=''; $('#login-message').textContent=''; $('#clear-status').textContent=''; clearPasswords();
 $(view==='register'?'#form-title':view==='login'?'#login-title':'#success-title').focus();
}
function showWelcome(record,isNew) {
 const profile=profiles[record.role];
 $('#success-title').textContent=`¡Hola, ${record.name.split(/\s+/)[0]}!`;
 $('#success-description').textContent=profile.description; $('#user-role').textContent=profile.label;
 $('#avatar').textContent=[...record.name][0].toUpperCase(); $('#account-email').textContent=record.email;
 $('#access-status').textContent=isNew?'Registro de prueba completado':'Ingreso de prueba completado';
 const container=$('#role-modules'); container.replaceChildren();
 profile.modules.forEach((title,index)=>{
  const card=document.createElement('div'); card.className='module-card';
  const number=document.createElement('span'); number.className='module-number'; number.textContent=`0${index+1}`;
  const label=document.createElement('strong'); label.textContent=title;
  const badge=document.createElement('span'); badge.className='pending'; badge.textContent='Próximamente';
  card.append(number,label,badge); container.append(card);
 });
 showView('welcome');
}
// No persiste contraseñas en texto claro. La derivación local NO acredita seguridad productiva.
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function derive(password,salt) {
 if(!globalThis.crypto?.subtle) throw new Error('crypto');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256));
}
function setBusy(value) {
 busy=value; document.querySelectorAll('button').forEach(button=>{button.disabled=value;});
 form.setAttribute('aria-busy',String(value)); loginForm.setAttribute('aria-busy',String(value));
}
function failureMessage(error) {
 return error.message==='crypto'?'Abre el sitio mediante HTTPS o un servidor local (localhost) para probar el ingreso.':'No se pudo acceder a los datos de prueba. Permite el almacenamiento de sesión o bórralos desde la sección inferior si están dañados.';
}
form.addEventListener('submit',async event=>{
 event.preventDefault(); if(busy || !validateAll(fields)) return;
 const email=form.elements.email.value.trim().toLowerCase(), name=form.elements.name.value.trim(), role=form.elements.role.value;
 if(!Object.hasOwn(profiles,role)) return;
 setBusy(true);
 try {
  let records=readRecords();
  if(records.some(r=>r.email===email)) {setError('email','Este correo ya está registrado en esta pestaña. Inicia sesión o usa otro correo de prueba.');form.elements.email.focus();return;}
  if(!globalThis.crypto?.subtle) throw new Error('crypto');
  const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
  const digest=await derive(form.elements.password.value,salt);
  records=readRecords();
  if(records.some(r=>r.email===email)) throw new Error('duplicate');
  const record={email,name,role,salt,digest}; records.push(record);
  sessionStorage.setItem(STORAGE_KEY,JSON.stringify(records));
  $('#login-email').value=email; form.reset(); showWelcome(record,true);
 } catch(error) {$('#form-message').textContent=failureMessage(error);}
 finally {setBusy(false);}
});
loginForm.addEventListener('submit',async event=>{
 event.preventDefault(); if(busy || !validateAll(['login-email','login-password'])) return; setBusy(true);
 try {
  const record=readRecords().find(r=>r.email===$('#login-email').value.trim().toLowerCase());
  if(!record || await derive($('#login-password').value,record.salt)!==record.digest) {
   $('#login-message').textContent='Correo o contraseña incorrectos. Crea primero una cuenta de prueba en esta pestaña.';
   $('#login-password').value=''; $('#login-password').focus(); return;
  }
  showWelcome(record,false);
 } catch(error) {$('#login-message').textContent=failureMessage(error);}
 finally {setBusy(false);}
});
['nav-register','switch-register'].forEach(id=>document.getElementById(id).addEventListener('click',()=>showView('register')));
['nav-login','switch-login','logout'].forEach(id=>document.getElementById(id).addEventListener('click',()=>showView('login')));
$('#clear-data').addEventListener('click',()=>{
 try {sessionStorage.removeItem(STORAGE_KEY);form.reset();loginForm.reset();showView('register');$('#clear-status').textContent='Se eliminaron las cuentas de prueba de esta pestaña.';}
 catch {$('#clear-status').textContent='El navegador no permite borrar los datos de sesión.';}
});
