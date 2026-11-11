import {cp,mkdir,rm} from 'node:fs/promises';
// Publicación con lista explícita: nunca copia pruebas, datos locales o capturas.
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const path of ['index.html','styles.css','favicon.svg','src','docs'])await cp(path,`dist/${path}`,{recursive:true});
console.log('Sitio estático preparado en dist/.');
