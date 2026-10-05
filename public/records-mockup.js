// Enhance direct year links; native details keep all records usable without JavaScript.
function openLinkedYear(){const target=document.getElementById(location.hash.slice(1));if(target?.matches('details.records-year'))target.open=true;}
openLinkedYear();window.addEventListener('hashchange',openLinkedYear);
