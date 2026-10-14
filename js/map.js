(()=>{'use strict';
const $=id=>document.getElementById(id);
const fmt=(n,d=1)=>Number.isFinite(Number(n))?Number(n).toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const safe=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const palette={1:'#36a4ad',2:'#ed9572',3:'#aa83c4'};
const classes=[{id:1,name:'Lahan terbuka',rgb:[217,198,164],color:'#D9C6A4'},{id:2,name:'Kawasan terbangun',rgb:[207,103,95],color:'#CF675F'},{id:3,name:'Pertanian',rgb:[231,197,95],color:'#E7C55F'},{id:4,name:'Forest (kelas LULC)',rgb:[63,155,120],color:'#3F9B78'},{id:5,name:'Semak/belukar',rgb:[177,199,136],color:'#B1C788'},{id:6,name:'Badan air',rgb:[90,166,209],color:'#5AA6D1'}];
let map=null,osm=null,sat=null,grid=null,summary=null,area=null,primary='som',opacity=.78;
let som=null,raster=null,areaLayer=null,protectedLayer=null,floodLayer=null;
let clusters=new Set([1,2,3]);const rasterImages={};let currentBase='osm';
const small=()=>window.matchMedia('(max-width:700px)').matches;
const notify=t=>{$('loadStatus').textContent=t;};
// Layer updates preserve the geographic map view. The page itself is
// viewport-locked in CSS; only the layer-list scrolls independently.
function fixedView(update){
  const center=map?.getCenter(), zoom=map?.getZoom();
  const panel=$('controlScroll');
  const panelTop=panel?.scrollTop;
  update();
  if(map && center && zoom!==undefined &&
     (map.getZoom()!==zoom || !map.getCenter().equals(center))){
    map.setView(center,zoom,{animate:false});
  }
  if(panel && panelTop!==undefined) panel.scrollTop=panelTop;
}

async function json(url){const r=await fetch(url);if(!r.ok)throw Error(`${url} [${r.status}]`);return await r.json();}
function panel(show){$('controlPanel').classList.toggle('open',show);$('overlay').classList.toggle('open',show);$('overlay').hidden=!show;$('openLayers').setAttribute('aria-expanded',String(show));}
function closePanel(){panel(false);}
function initPanel(){const opener=$('openLayers');opener.addEventListener('click',()=>panel(true));$('closeLayers').addEventListener('click',closePanel);$('overlay').addEventListener('click',closePanel);document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePanel();closeInfo();hideSummary();}});}
function offline(msg){$('mapOffline').hidden=false;notify(msg);}
function initLeaflet(){if(!window.L){offline('Leaflet belum dimuat. Periksa koneksi internet.');return false;}
 map=L.map('map',{preferCanvas:true,zoomControl:false,worldCopyJump:false,zoomSnap:.25,inertia:false});
 L.control.zoom({position:'bottomright'}).addTo(map);
 osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19});
 sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'Imagery © Esri and contributors',maxZoom:18});
 osm.addTo(map);map.setView([-7.1,110.6],10);
 map.on('click',e=>{if(primary!=='som'&&primary!=='none')inspectLulc(e.latlng);});
 return true;
}
function showInfo(title,rows,note){hideSummary();$('drawerTitle').textContent=title;
 $('drawerBody').innerHTML='<div class="drawer-body">'+rows.map(([k,v])=>`<div class="data-row"><span>${safe(k)}</span><b>${safe(v)}</b></div>`).join('')+(note?`<p class="data-explain">${safe(note)}</p>`:'')+'</div>';
 $('infoDrawer').hidden=false;
}
function closeInfo(){$('infoDrawer').hidden=true;}
function hideSummary(){$('summaryDrawer').hidden=true;}
function toggleSummary(){closeInfo();$('summaryDrawer').hidden=!$('summaryDrawer').hidden;}
function siteBounds(){if(areaLayer&&areaLayer.getBounds().isValid())return areaLayer.getBounds();if(som&&som.getBounds().isValid())return som.getBounds();return L.latLngBounds([[-7.51,109.9],[-6.69,111.28]]);}
function mainLegend(){const host=$('legendContent');let rows=[],note='';
 if(primary==='som'){rows=[['Vegetasi / dataran tinggi',palette[1]],['Dataran rendah',palette[2]],['Perkotaan berakses tinggi',palette[3]]];note='Area tanpa warna tidak dikelompokkan SOM.';}
 else if(primary==='none'){note='Tidak ada layer utama yang aktif.';}
 else{rows=classes.map(c=>[c.name,c.color]);note=primary==='2045'?'Proyeksi model, bukan tutupan lahan teramati.':'Klik peta untuk identifikasi kelas LULC.';}
 host.innerHTML=rows.map(([label,color])=>`<div class="legend-row"><i style="background:${color}"></i>${safe(label)}</div>`).join('')+`<p class="legend-note">${safe(note)}</p>`;
 $('activeTitle').textContent=primary==='som'?'Tipologi ekspansi perkotaan':primary==='none'?'Peta dasar KEDUNGSEPUR':'Tutupan lahan KEDUNGSEPUR';
 $('activeSubtitle').textContent=primary==='som'?'SOM · 2020–2045':primary==='none'?'OSM atau citra satelit':`${primary} · ${primary==='2045'?'Simulasi GeoSOS-FLUS':'LULC historis'}`;
 $('mapHint').textContent=primary==='som'?'Klik grid untuk membaca atribut':primary==='none'?'Pilih layer dari panel kiri':'Klik peta untuk mengetahui kelas tutupan lahan';
 const clusterGroup=$('clusterGroup');
 clusterGroup.classList.toggle('is-disabled', primary!=='som');
 clusterGroup.querySelectorAll('input[data-cluster]').forEach(input=>{input.disabled=primary!=='som';});
}
function removeMain(){if(som){map.removeLayer(som);som=null;}if(raster){map.removeLayer(raster);raster=null;}closeInfo();}
function renderMain(){if(!map||!grid||!summary)return;removeMain();
 if(primary==='som'){
   som=L.geoJSON(grid,{filter:f=>clusters.has(Number(f.properties.cluster_id)),style:f=>({color:palette[f.properties.cluster_id]||'#7a9',weight:.25,opacity:.45,fillColor:palette[f.properties.cluster_id],fillOpacity:opacity}),onEachFeature:(f,layer)=>{
    layer.on('click',()=>inspectGrid(f));
    layer.on('mouseover',()=>layer.setStyle({weight:1.1,color:'#153f41'}));
    layer.on('mouseout',()=>layer.setStyle({weight:.25,color:palette[f.properties.cluster_id]||'#7a9'}));
   }}).addTo(map);
 } else if(primary!=='none'){
   const item=(summary.lulc?.overlays||[]).find(x=>String(x.year)===primary);
   if(item){raster=L.imageOverlay(item.src,item.bounds,{opacity:opacity,interactive:false}).addTo(map);preloadRaster(primary,item);}
 }
 mainLegend();
}
function preloadRaster(year,entry){if(rasterImages[year])return;
 const im=new Image();im.src=entry.src;im.onload=()=>{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(im,0,0);rasterImages[year]={canvas:c,ctx:cx,width:c.width,height:c.height,bounds:entry.bounds};};
}
function inspectLulc(ll){const dat=rasterImages[primary];if(!dat)return notify('Raster masih disiapkan, coba klik ulang.');
 const [[south,west],[north,east]]=dat.bounds;
 if(ll.lng<west||ll.lng>east||ll.lat<south||ll.lat>north)return;
 const x=Math.max(0,Math.min(dat.width-1,Math.floor((ll.lng-west)/(east-west)*dat.width)));
 const y=Math.max(0,Math.min(dat.height-1,Math.floor((north-ll.lat)/(north-south)*dat.height)));
 const pix=dat.ctx.getImageData(x,y,1,1).data;
 if(pix[3]<10){showInfo('LULC — tidak ada data',[['Tahun',primary],['Koordinat',`${fmt(ll.lat,5)}, ${fmt(ll.lng,5)}`]],'Piksel transparan pada layer LULC; jangan ditafsirkan sebagai kelas tutupan lahan.');return;}
 const cls=classes.find(c=>c.rgb.every((v,i)=>Math.abs(v-pix[i])<4));
 showInfo(`LULC ${primary}`, [['Kelas',cls?.name||'Kode warna tidak dikenali'],['Kode kelas',cls?.id??'—'],['Tahun',primary],['Lintang',fmt(ll.lat,5)],['Bujur',fmt(ll.lng,5)]],primary==='2045'?'Kelas ini berasal dari proyeksi GeoSOS-FLUS 2045, bukan observasi aktual.':'Identifikasi berbasis piksel gambar LULC tergeoreferensi yang telah disederhanakan untuk WebGIS.');
}
function inspectGrid(f){const p=f.properties||{};showInfo(`Grid ${p.grid_id??'—'}`,[
 ['Tipologi SOM',p.tipologi_sementara],['Luas ekspansi',`${fmt(p.expansion_km2,4)} km²`],['Kepadatan',`${fmt(p.X10_population_density_per_km2,0)} jiwa/km²`],['Jarak ke jalan',`${fmt(p.X6_distance_road_m,0)} m`],['Jarak ke ekonomi',`${fmt(p.X7_distance_economy_m,0)} m`],['Elevasi',`${fmt(p.X13_elevation_center_m,0)} m`],['Data banjir tersedia',`${fmt(p.banjir_cakupan_pct,1)}%`],['Data longsor tersedia',`${fmt(p.longsor_cakupan_pct,1)}%`],['Irisan layer lindung',`${fmt(p.kawasan_lindung_irisan_km2,4)} km²`]],p.arahan_konseptual||'Interpretasi tipologi bersifat sementara dan perlu verifikasi kebijakan.');}
function extra(){
  if(!map||!grid)return;
  for(const layer of [areaLayer,protectedLayer,floodLayer]){
    if(layer)map.removeLayer(layer);
  }
  areaLayer=protectedLayer=floodLayer=null;
  if($('areaToggle').checked&&area){
    areaLayer=L.geoJSON(area,{interactive:false,style:{color:'#101010',weight:2.7,opacity:1,fillOpacity:0}}).addTo(map);
  }
  if($('protectedToggle').checked){
    protectedLayer=L.geoJSON(grid,{interactive:false,
      filter:f=>Number(f.properties.kawasan_lindung_irisan_km2)>0,
      style:{color:'#bb712e',weight:1.4,opacity:.8,fillOpacity:0}
    }).addTo(map);
  }
  if($('floodToggle').checked){
    floodLayer=L.geoJSON(grid,{interactive:false,
      filter:f=>f.properties.cek_banjir_nodata===true,
      style:{color:'#985a78',weight:.55,opacity:.65,fillColor:'#985a78',fillOpacity:.13}
    }).addTo(map);
  }
}
function wire(){
  initPanel();
  // Panel dibiarkan terbuka saat mengubah layer (khususnya di layar mobile).
  document.querySelectorAll('input[name="basemap"]').forEach(inp=>inp.addEventListener('change',e=>fixedView(()=>{
    if(map){
      if(currentBase==='osm')map.removeLayer(osm);else map.removeLayer(sat);
      currentBase=e.target.value;
      (currentBase==='osm'?osm:sat).addTo(map);
    }
  })));
  document.querySelectorAll('input[name="primary"]').forEach(inp=>inp.addEventListener('change',e=>fixedView(()=>{
    primary=e.target.value;
    renderMain();
  })));
  document.querySelectorAll('input[data-cluster]').forEach(inp=>inp.addEventListener('change',e=>fixedView(()=>{
    const id=Number(e.target.dataset.cluster);
    if(e.target.checked)clusters.add(id);else clusters.delete(id);
    renderMain();
  })));
  for(const id of ['areaToggle','protectedToggle','floodToggle']){
    $(id).addEventListener('change',()=>fixedView(extra));
  }
  $('opacity').addEventListener('input',e=>fixedView(()=>{
    opacity=Number(e.target.value)/100;
    $('opacityText').textContent=`${Math.round(opacity*100)}%`;
    if(som)som.setStyle({fillOpacity:opacity});
    if(raster)raster.setOpacity(opacity);
  }));
  // Hanya tombol ini yang sengaja mengubah extent peta.
  $('fit').addEventListener('click',()=>{if(map)map.fitBounds(siteBounds(),{padding:[28,28]});});
  $('fullscreen').addEventListener('click',()=>{
    const el=$('canvasWrap');
    if(document.fullscreenElement)document.exitFullscreen?.();else el.requestFullscreen?.();
  });
  $('summaryButton').addEventListener('click',toggleSummary);
  $('drawerClose').addEventListener('click',closeInfo);
  $('summaryClose').addEventListener('click',hideSummary);
  $('reset').addEventListener('click',()=>fixedView(()=>{
    clusters=new Set([1,2,3]);primary='som';opacity=.78;currentBase='osm';
    document.querySelector('input[name="basemap"][value="osm"]').checked=true;
    document.querySelector('input[name="primary"][value="som"]').checked=true;
    document.querySelectorAll('input[data-cluster]').forEach(x=>x.checked=true);
    ['protectedToggle','floodToggle'].forEach(x=>$(x).checked=false);
    $('areaToggle').checked=true;
    $('opacity').value=78;$('opacityText').textContent='78%';
    if(map){map.removeLayer(sat);osm.addTo(map);}
    renderMain();extra();
  }));
}
async function start(){wire();if(!initLeaflet())return;
 try{[grid,summary,area]=await Promise.all([json('data/grid.geojson'),json('data/summary.json'),json('data/area_studi.geojson')]);
 if(!Array.isArray(grid.features)||grid.features.length!==4931)throw Error(`Jumlah grid tidak sesuai: ${grid.features?.length}`);
 renderMain();extra();map.fitBounds(siteBounds(),{padding:[25,25]});notify(`${fmt(grid.features.length,0)} grid berhasil dimuat · data eksploratif`);
 }catch(e){console.error(e);offline('Data penelitian belum dapat dibaca: '+e.message+'; gunakan server HTTP dan pertahankan struktur folder ZIP.');}
}
window.addEventListener('load',start);
})();
