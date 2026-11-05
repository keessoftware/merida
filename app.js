'use strict';
const PRODUCTS=window.MERIDA_PRODUCTS || [];
const WHATSAPP_NUMBER='5492923582100'; // MÉRIDA: Argentina, 2923 582100
const defaultStock=5;
const productMap=Object.fromEntries(PRODUCTS.map(p=>[p.id,p]));
const $=id=>document.getElementById(id);
let cart=[];
try{const loaded=JSON.parse(localStorage.getItem('merida_bag_new')||'[]');cart=Array.isArray(loaded)?loaded:[]}catch(e){cart=[]}
let activeCat='Todos', hoverTimers=new Map(), currentDetail=null, selectedColor=0,selectedSize='',qty=1,bookIndex=0;
const formatMoney=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n);
const productUrl=p=>'producto.html?id='+encodeURIComponent(p.id);
function toast(s){const el=$('toast');el.textContent=s;el.style.display='block';clearTimeout(window.toastTimeout);window.toastTimeout=setTimeout(()=>el.style.display='none',2400)}
function colorAvailable(p,index){const color=p.colors[index];return Math.max(0,defaultStock-cart.filter(l=>l.id===p.id&&l.color===color.name).reduce((s,l)=>s+l.qty,0))}
function totalAvailable(p){return p.colors.reduce((s,_,i)=>s+colorAvailable(p,i),0)}
function cardImages(p){return [...new Set([...(p.images||[]),...p.colors.map(c=>c.image).filter(Boolean)])]}
function cardHTML(p){const n=totalAvailable(p), imgs=cardImages(p);return `<article class="product-card" data-product="${p.id}"><a class="card-photo" href="${productUrl(p)}" aria-label="Ver ${p.name}"><img src="${imgs[0]}" data-cardimage="${p.id}" alt="${p.name}" loading="lazy"><span class="stock ${n===0?'empty':''}">${n===0?'SIN STOCK':`${n} EN STOCK`}</span>${n===0?'<div class="sold-mark"><b>SIN STOCK</b></div>':''}</a><div class="card-meta"><a class="card-name" href="${productUrl(p)}">${p.name}</a><button class="card-button" data-cardadd="${p.id}" ${n===0?'disabled':''}>${n===0?'SIN STOCK':'AGREGAR AL CARRITO'}</button></div></article>`}
function bindCards(target){target.querySelectorAll('.product-card').forEach(node=>{
  const id=node.dataset.product,p=productMap[id],imgs=cardImages(p),image=node.querySelector('img');
  let idx=0;function change(){if(imgs.length>1){idx=(idx+1)%imgs.length;image.src=imgs[idx]}}
  node.addEventListener('mouseenter',()=>{if(imgs.length>1&&!hoverTimers.has(node)){change();hoverTimers.set(node,setInterval(change,1050))}});
  node.addEventListener('mouseleave',()=>{clearInterval(hoverTimers.get(node));hoverTimers.delete(node);idx=0;image.src=imgs[0]});
  node.querySelector('[data-cardadd]').addEventListener('click',()=>{
     if(p.colors.length===1){addToCart(p,p.colors[0].name,'Consultar',1);return}
     window.location.href=productUrl(p);
  });
})}
function renderCatalog(){if(!$('catalog'))return;const term=($('search').value||'').toLocaleLowerCase('es');const items=PRODUCTS.filter(p=>(activeCat==='Todos'||activeCat===p.category)&&[p.name,p.category,p.description,...p.colors.map(x=>x.name)].join(' ').toLocaleLowerCase('es').includes(term));$('catalog').innerHTML=items.map(cardHTML).join('')||'<p>No se encontraron productos.</p>';bindCards($('catalog'))}
function renderFilters(){const parent=$('filters');if(!parent)return;const cats=['Todos',...new Set(PRODUCTS.map(p=>p.category))];parent.innerHTML=cats.map(c=>`<button type="button" class="filter ${activeCat===c?'active':''}" data-category="${c}">${c}</button>`).join('');parent.querySelectorAll('button').forEach(b=>b.onclick=()=>{activeCat=b.dataset.category;renderFilters();renderCatalog()})}
function renderDetail(){let id=new URLSearchParams(location.search).get('id'),p=productMap[id],root=$('productDetail');if(!root)return;if(!p){root.innerHTML='<div class="placeholder" style="margin-top:110px"><h1>No encontramos ese producto</h1><a class="btn" href="index.html#catalogo">Volver a la colección</a></div>';return}currentDetail=p;document.title=`${p.name} | MÉRIDA`;selectedColor=0;selectedSize='';qty=1;
  root.innerHTML=`<section class="detail"><div class="detail-images" id="detailPhotos"></div><div class="detail-copy"><div class="breadcrumbs"><a href="index.html">Inicio</a> / <a href="index.html#catalogo">Colección</a> / ${p.category}</div><h1>${p.name}</h1><p class="price">${p.price?formatMoney(p.price):'Precio a consultar'}</p><p class="detail-desc">${p.description}</p><span class="label">Elegí un color</span><div class="swatches" id="detailColors"></div><p class="stock-note" id="detailStock"></p><span class="label">Talle</span><div class="sizes" id="detailSizes"></div><p class="stock-note">Los talles disponibles se confirman con la tienda. La selección es para la consulta.</p><span class="label">Cantidad</span><div class="qtyrow"><div class="counter"><button id="minusQty" aria-label="Restar una unidad">−</button><span id="qtyAmount">1</span><button id="plusQty" aria-label="Sumar una unidad">+</button></div><button class="btn detail-cart" id="detailAdd">AGREGAR AL CARRITO</button></div><div class="details-panel"><b>DESCRIPCIÓN Y DETALLES</b><p>${p.description}</p><p>${p.details}</p><p>Las fotos muestran el artículo disponible como referencia. El stock inicial de 5 unidades por color es de demostración, no stock confirmado.</p></div></div></section>`;
  root.querySelector('#minusQty').onclick=()=>{qty=Math.max(1,qty-1);$('qtyAmount').textContent=qty};root.querySelector('#plusQty').onclick=()=>{qty=Math.min(5,qty+1);$('qtyAmount').textContent=qty};root.querySelector('#detailAdd').onclick=()=>{const color=p.colors[selectedColor];addToCart(p,color.name,selectedSize||'Consultar',qty);renderVariantDetail()};
  renderVariantDetail();const related=PRODUCTS.filter(q=>q.id!==p.id).sort((a,b)=>+(b.category===p.category)-+(a.category===p.category)).slice(0,4);$('related').innerHTML=related.map(cardHTML).join('');bindCards($('related'));
}
function renderVariantDetail(){const p=currentDetail;if(!p)return;const v=p.colors[selectedColor],stock=colorAvailable(p,selectedColor);$('detailColors').innerHTML=p.colors.map((c,i)=>`<button class="swatch ${i===selectedColor?'active':''}" data-color-index="${i}" title="${c.name}"><span class="swatch-dot" style="--swatch:${c.hex}"></span>${c.name}</button>`).join('');$('detailColors').querySelectorAll('button').forEach(b=>b.onclick=()=>{selectedColor=+b.dataset.colorIndex;qty=1;$('qtyAmount').textContent=1;renderVariantDetail()});
  $('detailStock').textContent=stock>0?`${stock} unidades disponibles en este color (stock demo)`:'SIN STOCK — color agotado';$('detailAdd').disabled=stock<=0;$('detailAdd').textContent=stock<=0?'SIN STOCK':'AGREGAR AL CARRITO';
  const sizes=['Consultar','S','M','L','XL'];$('detailSizes').innerHTML=sizes.map(s=>`<button class="size-btn ${selectedSize===s?'active':''}" data-size="${s}">${s}</button>`).join('');$('detailSizes').querySelectorAll('button').forEach(b=>b.onclick=()=>{selectedSize=b.dataset.size;renderVariantDetail()});
  const photos=[...new Set([v.image,...p.images].filter(Boolean))];$('detailPhotos').innerHTML=photos.map((src,i)=>`<img src="${src}" alt="${p.name} - vista ${i+1}" ${i?'loading="lazy"':''}>`).join('');
}
function save(){localStorage.setItem('merida_bag_new',JSON.stringify(cart));updateCart();renderCatalog();if(currentDetail)renderVariantDetail()}
function addToCart(p,color,size,amount){let cidx=p.colors.findIndex(c=>c.name===color);if(cidx<0)cidx=0;const stock=colorAvailable(p,cidx);if(stock<=0){toast('Sin stock de ese color');return}if(amount>stock){toast(`Solo quedan ${stock} unidades de ese color`);return}const item=cart.find(x=>x.id===p.id&&x.color===color&&x.size===size);if(item)item.qty+=amount;else cart.push({id:p.id,color,size,qty:amount});save();toast('Agregado al carrito')}
function updateCart(){const count=cart.reduce((s,l)=>s+l.qty,0);if($('cartNum'))$('cartNum').textContent=count;const node=$('cartContent');if(!node)return;node.innerHTML=cart.length?cart.map((l,i)=>{const p=productMap[l.id];if(!p)return '';return `<div class="cart-entry"><img src="${p.images[0]}" alt=""><div><strong>${p.name}</strong><p>${l.color} · Talle ${l.size} · ${l.qty} unidad(es)</p><p>${p.price?formatMoney(p.price*l.qty):'Precio a consultar'}</p><button data-remove="${i}">Quitar</button></div></div>`}).join(''):'<p class="placeholder">Tu bolsa está vacía.</p>';node.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{cart.splice(+b.dataset.remove,1);save()})}
function showCart(){$('shade').classList.add('on');$('drawer').classList.add('on');document.body.classList.add('lock')}
function hideCart(){$('shade').classList.remove('on');$('drawer').classList.remove('on');document.body.classList.remove('lock')}
function checkout(){if(!cart.length){toast('Tu carrito está vacío');return}if(!WHATSAPP_NUMBER){toast('Falta configurar el número de WhatsApp de MÉRIDA');return}let lines=cart.map(l=>{const p=productMap[l.id];return `• ${p.name} — ${l.color} — talle ${l.size} — ${l.qty} unidades — ${p.price?formatMoney(p.price*l.qty):'precio a consultar'}`});const message=`Hola, quiero consultar este pedido en MÉRIDA:\n\n${lines.join('\n')}\n\n¿Me confirman precio, talles, disponibilidad y entrega?`;window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer')}
const bookPhotos=PRODUCTS.map(p=>({name:p.name,image:p.images[0]}));
const bookTitles=['DENIM STORY','BAJO EL SOL','CÓMODA & VOS','URBAN NOTES','TUS FAVORITOS','NUEVAS TEXTURAS','DÍAS DE MODA','ESENCIA MÉRIDA','COLOR & ESTILO','NUESTROS ELEGIDOS'];
const bookPages=Math.ceil(bookPhotos.length/4);
function renderBook(){if(!$('bookLeft'))return;const page=(side)=>{const i=bookIndex*4+(side==='left'?0:2),photos=bookPhotos.slice(i,i+2);return `<small>MÉRIDA · EDITORIAL / ${String(bookIndex+1).padStart(2,'0')}</small><h3>${bookTitles[bookIndex%bookTitles.length]}</h3><p>Estilo que se siente. Prendas para combinar y volver a elegir.</p><div class="page-photos">${photos.map(p=>`<img src="${p.image}" alt="${p.name}" loading="lazy">`).join('')}</div><footer>THE MÉRIDA EDIT · ${side==='left'?'ESTILO':'EDICIÓN'} / 2026</footer>`};$('bookLeft').innerHTML=page('left');$('bookRight').innerHTML=page('right');$('bookCount').textContent=`${String(bookIndex+1).padStart(2,'0')} / ${String(bookPages).padStart(2,'0')}`}
function turnBook(step){bookIndex=(bookIndex+step+bookPages)%bookPages;renderBook();const book=$('book');if(book){book.classList.remove('is-turning');void book.offsetWidth;book.classList.add('is-turning')} resetBookTimer()}
function pageCategory(category){
  if($('catalog')){activeCat=category;renderFilters();renderCatalog();$('catalogo').scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#catalogo')}
  else location.href='index.html?categoria='+encodeURIComponent(category)+'#catalogo';
}
function renderCategoryGrid(){
  const grid=$('categoryGrid');if(!grid)return;
  const cats=[...new Set(PRODUCTS.map(p=>p.category))];
  const html=cats.map(cat=>{const items=PRODUCTS.filter(p=>p.category===cat);let product=items.find(p=>p.images[0].includes('nuevo-'))||items[items.length-1];
   return `<a href="index.html?categoria=${encodeURIComponent(cat)}#catalogo" class="category-tile" data-tilecat="${cat}"><div class="category-photo"><img src="${product.images[0]}" alt="Categoría ${cat}" loading="lazy"></div><div class="category-label"><span>${cat}</span><small>${items.length} productos ↗</small></div></a>`;
  }).join('');
  grid.innerHTML=html;
  grid.querySelectorAll('[data-tilecat]').forEach(a=>a.addEventListener('click',ev=>{ev.preventDefault();pageCategory(a.dataset.tilecat)}));
}
function renderSidebar(){const node=$('sidebarCategories');if(!node)return;const cats=[...new Set(PRODUCTS.map(p=>p.category))];node.innerHTML=[`<a href="index.html#catalogo" data-menu-cat="Todos">Todas las prendas <span>${PRODUCTS.length}</span></a>`,...cats.map(c=>`<a href="index.html?categoria=${encodeURIComponent(c)}#catalogo" data-menu-cat="${c}">${c}<span>${PRODUCTS.filter(p=>p.category===c).length}</span></a>`)].join('');node.querySelectorAll('a').forEach(a=>a.addEventListener('click',ev=>{if($('catalog')){ev.preventDefault();closeMenu();pageCategory(a.dataset.menuCat)}}));}
function openMenu(){const menu=$('menuSidebar'),shade=$('menuShade');menu.classList.add('open');shade.classList.add('open');document.body.classList.add('lock');const btn=document.querySelector('.menu-trigger');if(btn)btn.setAttribute('aria-expanded','true')}
function closeMenu(){const menu=$('menuSidebar'),shade=$('menuShade');if(menu)menu.classList.remove('open');if(shade)shade.classList.remove('open');document.body.classList.remove('lock');const btn=document.querySelector('.menu-trigger');if(btn)btn.setAttribute('aria-expanded','false')}
function norm(s){return (s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function setupSmartSearch(){const input=$('smartSearch'), suggestions=$('suggestions');if(!input || !suggestions)return;
 function draw(){const query=norm(input.value.trim());if(!query){suggestions.classList.remove('open');suggestions.innerHTML='';return}
  const matches=PRODUCTS.filter(p=>norm(p.name).includes(query)||norm(p.category).includes(query)).slice(0,7);
  suggestions.innerHTML=matches.length?matches.map(p=>`<a class="suggestion" href="${productUrl(p)}"><img src="${p.images[0]}" alt=""><span>${p.name}<small>${p.category}</small></span></a>`).join(''):'<p style="padding:12px;font-size:12px">No encontramos productos.</p>';
  suggestions.classList.add('open');
 }
 input.addEventListener('input',()=>{draw();if($('search')){$('search').value=input.value;activeCat='Todos';renderFilters();renderCatalog()}});
 input.addEventListener('focus',draw);
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if($('catalog')){activeCat='Todos';$('search').value=input.value;renderFilters();renderCatalog();$('catalogo').scrollIntoView({behavior:'smooth'});suggestions.classList.remove('open')}else location.href='index.html?buscar='+encodeURIComponent(input.value)+'#catalogo'}if(e.key==='Escape')suggestions.classList.remove('open')});
 document.addEventListener('click',e=>{if(!e.target.closest('.header-search'))suggestions.classList.remove('open')});
}
let bookTimer=null;
function resetBookTimer(){clearInterval(bookTimer);if($('book'))bookTimer=setInterval(()=>{bookIndex=(bookIndex+1)%bookPages;renderBook();const book=$('book');if(book){book.classList.remove('is-turning');void book.offsetWidth;book.classList.add('is-turning')}},15000)}
if($('catalog')){
 const query=new URLSearchParams(location.search);
 const selected=query.get('categoria');if(selected&&PRODUCTS.some(p=>p.category===selected))activeCat=selected;
 if(query.get('buscar'))$('search').value=query.get('buscar');
 renderFilters();renderCatalog();$('search').addEventListener('input',()=>{renderCatalog();const input=$('smartSearch');if(input)input.value=$('search').value});
 renderBook();renderCategoryGrid();resetBookTimer();
 const book=$('book');if(book){book.addEventListener('mouseenter',()=>clearInterval(bookTimer));book.addEventListener('mouseleave',resetBookTimer)}
}
renderSidebar();setupSmartSearch();
if($('productDetail'))renderDetail();updateCart();
let lastY=window.scrollY;window.addEventListener('scroll',()=>{const h=$('header');if(!h)return;const y=window.scrollY;if(!h.classList.contains('detail-mode')){h.classList.toggle('at-top',y<70);h.classList.toggle('solid',y>=70)}h.classList.toggle('hide',y>110&&y>lastY+3);if(y<lastY-3||y<70)h.classList.remove('hide');lastY=y},{passive:true});document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideCart();closeMenu()}});
