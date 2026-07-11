import { isConfigured, getClient, syncState, setCachedState, uploadFileToStorage, uploadPodcastToStorage, deleteArchivo, removePodcast as supabaseRemovePodcast } from './supabase.js';

// ============ DATOS DEL CURSO (default) ============
const DEFAULT_DATA = {
  unidades: [
    {
      id:'u1',
      nombre:'Fundamentos Avanzados',
      descripcion:'Consultas SQL complejas, joins, subconsultas y funciones analíticas.',
      icon:'fa-database',
      semanas:[
        {id:'u1s1',nombre:'Introducción y Repaso',desc:'Repaso de conceptos de BD-I y introducción al curso.'},
        {id:'u1s2',nombre:'Consultas Multitabla',desc:'JOINs avanzados, uniones y combinaciones complejas.'},
        {id:'u1s3',nombre:'Subconsultas',desc:'Subconsultas correlacionadas y no correlacionadas.'},
        {id:'u1s4',nombre:'Funciones Analíticas',desc:'Window functions, CTEs y cláusulas avanzadas.'}
      ]
    },
    {
      id:'u2',
      nombre:'Optimización y Rendimiento',
      descripcion:'Índices, planes de ejecución y tuning de consultas.',
      icon:'fa-gauge-high',
      semanas:[
        {id:'u2s1',nombre:'Índices y Estructuras',desc:'B-Tree, Hash, Bitmap y estrategias de indexación.'},
        {id:'u2s2',nombre:'Planes de Ejecución',desc:'Análisis y lectura de planes de ejecución.'},
        {id:'u2s3',nombre:'Tuning de Consultas',desc:'Optimización de queries pesadas y refactoring.'},
        {id:'u2s4',nombre:'Transacciones',desc:'ACID, bloqueos, deadlocks y concurrencia.'}
      ]
    },
    {
      id:'u3',
      nombre:'Bases de Datos Distribuidas',
      descripcion:'Replicación, sharding y sistemas distribuidos.',
      icon:'fa-network-wired',
      semanas:[
        {id:'u3s1',nombre:'Replicación',desc:'Master-slave, multi-master y replicación síncrona.'},
        {id:'u3s2',nombre:'Sharding',desc:'Particionamiento horizontal y estrategias.'},
        {id:'u3s3',nombre:'Consistencia Distribuida',desc:'Teorema CAP y modelos de consistencia.'},
        {id:'u3s4',nombre:'Alta Disponibilidad',desc:'Clustering, failover y disaster recovery.'}
      ]
    },
    {
      id:'u4',
      nombre:'NoSQL y Big Data',
      descripcion:'MongoDB, Redis, Cassandra y ecosistema Big Data.',
      icon:'fa-brain',
      semanas:[
        {id:'u4s1',nombre:'MongoDB',desc:'Documentos, agregaciones y modelado NoSQL.'},
        {id:'u4s2',nombre:'Redis y Caché',desc:'Key-value stores, pub/sub y caching strategies.'},
        {id:'u4s3',nombre:'Cassandra',desc:'Column-family stores y wide-column databases.'},
        {id:'u4s4',nombre:'Big Data',desc:'Hadoop, Spark y ecosistema de procesamiento masivo.'}
      ]
    }
  ]
};

// ============ ESTADO ============
let state = null;
let currentUnit = 0;

function loadLocalData(){
  try{
    const raw = localStorage.getItem('bd2_repo');
    if(raw) return JSON.parse(raw);
  }catch(e){}
  const d = JSON.parse(JSON.stringify(DEFAULT_DATA));
  d.unidades.forEach(u=>u.semanas.forEach(s=>{s.archivos=s.archivos||[];s.podcast=s.podcast||null}));
  return d;
}
state = loadLocalData();
window.state = state;

async function tryLoadSupabase(){
  if (!isConfigured()) return;
  try {
    const mod = await import('./supabase.js');
    await mod.initSupabase();
    const supabaseData = await mod.loadData();
    if (supabaseData) {
      state = supabaseData;
      window.state = state;
      mod.setCachedState(state);
      renderTabs();
      renderUnit();
    }
  } catch(e) { console.warn('[Supabase] carga inicial falló:', e.message); }
}
tryLoadSupabase();
function saveData(){
  localStorage.setItem('bd2_repo', JSON.stringify(state));
  setCachedState(state);
  if (isConfigured() && getClient()) {
    syncState(state).catch(e => console.warn('[Supabase] sync falló:', e.message));
  }
}

// ============ CURSOR MÁGICO ============
const dot = document.getElementById('cursorDot');
const ring = document.getElementById('cursorRing');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{
  mx=e.clientX;my=e.clientY;
  dot.style.left=mx+'px';dot.style.top=my+'px';
});
function tickCursor(){
  rx+=(mx-rx)*0.15;ry+=(my-ry)*0.15;
  ring.style.left=rx+'px';ring.style.top=ry+'px';
  requestAnimationFrame(tickCursor);
}
tickCursor();
document.addEventListener('mouseover',e=>{
  if(e.target.closest('[data-hot], a, button, input, textarea')) ring.classList.add('hot');
});
document.addEventListener('mouseout',e=>{
  if(e.target.closest('[data-hot], a, button, input, textarea')) ring.classList.remove('hot');
});

// ============ PARTÍCULAS FONDO ============
let stopParticles = function(){};
let resumeParticles = function(){};
const pCanvas = document.getElementById('particle-canvas');
if(pCanvas){
const pCtx = pCanvas.getContext('2d');
let particles = [];
let particleRAF = null;
function resizeP(){
  pCanvas.width=window.innerWidth;pCanvas.height=window.innerHeight;
}
resizeP();window.addEventListener('resize',resizeP);
function initParticles(){
  particles=[];
  const n = Math.min(120, Math.floor(window.innerWidth/12));
  for(let i=0;i<n;i++){
    particles.push({
      x:Math.random()*pCanvas.width,
      y:Math.random()*pCanvas.height,
      vx:(Math.random()-0.5)*0.3,
      vy:(Math.random()-0.5)*0.3,
      r:Math.random()*1.5+0.4,
      c:Math.random()>0.7?'#ff2e93':Math.random()>0.5?'#b026ff':'#00f0ff',
      a:Math.random()*0.5+0.2
    });
  }
}
initParticles();
function drawParticles(){
  pCtx.clearRect(0,0,pCanvas.width,pCanvas.height);
  particles.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy;
    if(p.x<0)p.x=pCanvas.width;if(p.x>pCanvas.width)p.x=0;
    if(p.y<0)p.y=pCanvas.height;if(p.y>pCanvas.height)p.y=0;
    pCtx.beginPath();
    pCtx.arc(p.x,p.y,p.r,0,Math.PI*2);
    pCtx.fillStyle=p.c;
    pCtx.globalAlpha=p.a;
    pCtx.shadowBlur=10;pCtx.shadowColor=p.c;
    pCtx.fill();
  });
  for(let i=0;i<particles.length;i++){
    for(let j=i+1;j<particles.length;j++){
      const dx=particles[i].x-particles[j].x,dy=particles[i].y-particles[j].y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<100){
        pCtx.beginPath();
        pCtx.moveTo(particles[i].x,particles[i].y);
        pCtx.lineTo(particles[j].x,particles[j].y);
        pCtx.strokeStyle='rgba(0,240,255,'+(0.15*(1-d/100))+')';
        pCtx.lineWidth=0.5;
        pCtx.shadowBlur=0;
        pCtx.stroke();
      }
    }
  }
  pCtx.globalAlpha=1;
  particleRAF = requestAnimationFrame(drawParticles);
}
stopParticles = function(){ if(particleRAF){ cancelAnimationFrame(particleRAF); particleRAF=null; } };
resumeParticles = function(){ if(!particleRAF && pCanvas) drawParticles(); };
drawParticles();
}

// ============ 3D DATABASE SCENE ============
const dbCanvas = document.getElementById('db3d-canvas');
if(dbCanvas){
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 1.5, 8);
const renderer = new THREE.WebGLRenderer({canvas:dbCanvas, alpha:true, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
function resizeDB(){
  const w = dbCanvas.clientWidth || 500;
  const h = dbCanvas.clientHeight || 500;
  renderer.setSize(w, h, false);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
}
resizeDB();
window.addEventListener('resize', resizeDB);
scene.add(new THREE.AmbientLight(0x224488, 0.5));
const l1 = new THREE.PointLight(0x00f0ff, 2, 20); l1.position.set(3,3,3); scene.add(l1);
const l2 = new THREE.PointLight(0xff2e93, 2, 20); l2.position.set(-3,-2,2); scene.add(l2);
const l3 = new THREE.PointLight(0xb026ff, 1.5, 20); l3.position.set(0,4,-2); scene.add(l3);

const dbGroup = new THREE.Group();
scene.add(dbGroup);

const tables = [];
const tableColors = [0x00f0ff, 0xff2e93, 0xb026ff, 0x9dff3c, 0xffcb05];
const tablePositions = [
  [0,0,0],
  [2.5,0.3,0.5],
  [-2.4,0.5,-0.4],
  [1.2,-0.4,-2.2],
  [-1.6,-0.6,1.8]
];

tablePositions.forEach((pos,i)=>{
  const radius = 0.7 + Math.random()*0.2;
  const height = 1.6 + Math.random()*0.6;
  
  const cylGeo = new THREE.CylinderGeometry(radius, radius, height, 24, 4, true);
  const cylMat = new THREE.MeshBasicMaterial({
    color: tableColors[i],
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide
  });
  const cyl = new THREE.Mesh(cylGeo, cylMat);
  
  const wireGeo = new THREE.CylinderGeometry(radius, radius, height, 24, 4, true);
  const wireMat = new THREE.MeshBasicMaterial({
    color: tableColors[i],
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });
  const wire = new THREE.Mesh(wireGeo, wireMat);
  
  const ringGroup = new THREE.Group();
  for(let r=0;r<5;r++){
    const ringGeo = new THREE.TorusGeometry(radius*1.02, 0.012, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: tableColors[i],
      transparent: true,
      opacity: 0.7
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI/2;
    ring.position.y = -height/2 + (height/5)*r + height/10;
    ringGroup.add(ring);
  }
  
  const pointsGeo = new THREE.BufferGeometry();
  const pts = [];
  const ptCount = 80;
  for(let p=0;p<ptCount;p++){
    const a = Math.random()*Math.PI*2;
    const y = (Math.random()-0.5)*height;
    pts.push(Math.cos(a)*radius*1.01, y, Math.sin(a)*radius*1.01);
  }
  pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const pointsMat = new THREE.PointsMaterial({
    color: tableColors[i],
    size: 0.04,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(pointsGeo, pointsMat);
  
  const haloGeo = new THREE.RingGeometry(radius*1.1, radius*1.4, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color: tableColors[i],
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = Math.PI/2;
  halo.position.y = -height/2;
  
  const tableGroup = new THREE.Group();
  tableGroup.add(cyl);
  tableGroup.add(wire);
  tableGroup.add(ringGroup);
  tableGroup.add(points);
  tableGroup.add(halo);
  tableGroup.position.set(pos[0], pos[1], pos[2]);
  tableGroup.userData = { points, ringGroup, baseY: pos[1], phase: i };
  
  dbGroup.add(tableGroup);
  tables.push(tableGroup);
});

const relGroup = new THREE.Group();
dbGroup.add(relGroup);
const connections = [
  [0,1],[0,2],[0,3],[0,4],[1,2],[3,4],[1,4],[2,3]
];
connections.forEach(([a,b])=>{
  const pa = tables[a].position;
  const pb = tables[b].position;
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(pa.x, pa.y, pa.z),
    new THREE.Vector3((pa.x+pb.x)/2, Math.max(pa.y,pb.y)+1.5, (pa.z+pb.z)/2),
    new THREE.Vector3(pb.x, pb.y, pb.z)
  );
  const points = curve.getPoints(40);
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.3
  });
  const line = new THREE.Line(geo, mat);
  relGroup.add(line);
  
  const dotGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const dotMat = new THREE.MeshBasicMaterial({color: 0xff2e93});
  const dotMesh = new THREE.Mesh(dotGeo, dotMat);
  dotMesh.userData = { curve, t: Math.random(), speed: 0.002 + Math.random()*0.003 };
  relGroup.add(dotMesh);
});

const orbGeo = new THREE.BufferGeometry();
const orbPts = [];
for(let i=0;i<300;i++){
  const r = 3.5 + Math.random()*2;
  const a = Math.random()*Math.PI*2;
  const y = (Math.random()-0.5)*4;
  orbPts.push(Math.cos(a)*r, y, Math.sin(a)*r);
}
orbGeo.setAttribute('position', new THREE.Float32BufferAttribute(orbPts, 3));
const orbMat = new THREE.PointsMaterial({
  color: 0x00f0ff,
  size: 0.03,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending
});
const orbitals = new THREE.Points(orbGeo, orbMat);
scene.add(orbitals);

let mouseTarget = {x:0,y:0};
document.addEventListener('mousemove', e=>{
  mouseTarget.x = (e.clientX/window.innerWidth - 0.5)*2;
  mouseTarget.y = (e.clientY/window.innerHeight - 0.5)*2;
});

const clock = new THREE.Clock();
function animate(){
  const t = clock.getElapsedTime();
  
  dbGroup.rotation.y = t * 0.15 + mouseTarget.x * 0.3;
  dbGroup.rotation.x = -mouseTarget.y * 0.2;
  
  tables.forEach((tb,i)=>{
    tb.position.y = tb.userData.baseY + Math.sin(t*0.8 + tb.userData.phase)*0.15;
    tb.rotation.y = t * (0.2 + i*0.05);
    tb.userData.points.rotation.y = -t * 0.5;
    tb.userData.ringGroup.children.forEach((ring,ri)=>{
      ring.material.opacity = 0.4 + Math.sin(t*2 + ri)*0.3;
    });
  });
  
  relGroup.children.forEach(child=>{
    if(child.userData.curve){
      child.userData.t += child.userData.speed;
      if(child.userData.t > 1) child.userData.t = 0;
      const p = child.userData.curve.getPoint(child.userData.t);
      child.position.copy(p);
    }
  });
  
  orbitals.rotation.y = t * 0.05;
  
  renderer.render(scene, camera);
  dbRAF = requestAnimationFrame(animate);
}
let dbRAF = null;
window.stopDBScene = function(){ if(dbRAF){ cancelAnimationFrame(dbRAF); dbRAF=null; } };
window.resumeDBScene = function(){ if(!dbRAF && dbCanvas) animate(); };
animate();
}

// ============ SCROLL REVEAL ============
const io = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
},{threshold:0.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

// ============ RENDER UNIDADES ============
function renderTabs(){
  const tabs = document.getElementById('unitsTabs');
  tabs.innerHTML = state.unidades.map((u,i)=>`
    <button class="unit-tab ${i===currentUnit?'active':''}" data-hot onclick="selectUnit(${i})">
      <span class="num">${(i+1).toString().padStart(2,'0')}</span>
      <span class="uname">${u.nombre}</span>
    </button>
  `).join('');
}

function renderUnit(){
  const u = state.unidades[currentUnit];
  document.getElementById('unitTitle').textContent = u.nombre;
  document.getElementById('unitDesc').textContent = u.descripcion;
  document.getElementById('unitIcon').className = 'fas ' + u.icon;
  
  const grid = document.getElementById('weeksGrid');
  grid.innerHTML = u.semanas.map((s,idx)=>{
    const archivos = s.archivos || [];
    const podcast = s.podcast;
    return `
      <div class="week-card" data-hot onclick="openWeekModal(${currentUnit},${idx})">
        <div class="week-num">${(idx+1).toString().padStart(2,'0')}</div>
        <h4>${s.nombre}</h4>
        <div class="desc">${s.descripcion || s.desc || ''}</div>
        <div class="week-resources">
          ${archivos.length === 0 ? '<div class="empty-res">Sin archivos subidos</div>' :
            archivos.map(a=>`
              <div class="resource" data-hot onclick="event.stopPropagation();downloadFile('${s.id}','${a.id}')">
                <div class="ricon ${getFileType(a.nombre)}"><i class="fas ${getFileIcon(a.nombre)}"></i></div>
                <div class="rname">${a.nombre}</div>
                <div class="rsize">${a.tamaño || ''}</div>
              </div>
            `).join('')
          }
        </div>
        ${podcast ? `
          <div class="podcast-bar" data-hot onclick="event.stopPropagation();playPodcast('${s.id}')">
            <i class="fas fa-podcast"></i>
            <div class="ptext">Podcast<small>${podcast.nombre || 'Audio de la semana'}</small></div>
            <div class="pbtn"><i class="fas fa-play"></i></div>
          </div>
        ` : `
          <div class="podcast-bar" style="opacity:0.4">
            <i class="fas fa-microphone-slash"></i>
            <div class="ptext">Sin podcast<small>No disponible</small></div>
          </div>
        `}
      </div>
    `;
  }).join('');
  
  let total = 0;
  state.unidades.forEach(u=>u.semanas.forEach(s=>total += (s.archivos||[]).length + (s.podcast?1:0)));
  const statsNum = document.querySelectorAll('.hero-stats .num');
  if(statsNum[2]) statsNum[2].textContent = total;
}

// ============ WEEK MODAL ============
function buildWeekModalContent(unitIdx, weekIdx){
  const u = state.unidades[unitIdx];
  if(!u) return '';
  const s = u.semanas[weekIdx];
  if(!s) return '';
  const archivos = s.archivos || [];
  const podcast = s.podcast;
  const weekNum = (weekIdx+1).toString().padStart(2,'0');

  const descText = s.descripcion || s.desc || '';
  const topicPoints = descText.split(/[,.;]+/).filter(t => t.trim().length > 4).map(t => t.trim());

  return `
    <div class="wm-header">
      <div class="wm-unit-num">${weekNum}</div>
      <div class="wm-unit-info">
        <div class="wm-week-label">UNIDAD ${(unitIdx+1).toString().padStart(2,'0')} — SEMANA ${weekNum}</div>
        <h2>${s.nombre}</h2>
        <div class="wm-desc">${descText}</div>
      </div>
    </div>

    <div class="wm-meta-grid">
      <div class="wm-meta-item"><i class="fas fa-book-open"></i><span>Unidad ${unitIdx+1}: ${u.nombre}</span></div>
      <div class="wm-meta-item"><i class="fas fa-file"></i><span>${archivos.length} archivo(s)</span></div>
      <div class="wm-meta-item"><i class="fas fa-podcast"></i><span>${podcast ? 'Podcast disponible' : 'Sin podcast'}</span></div>
    </div>

    <div class="wm-body">
      <div class="wm-col-left">
        ${topicPoints.length > 1 ? `
        <div class="wm-topics">
          <div class="wm-section-title"><i class="fas fa-list-check"></i>Temas clave</div>
          <ul class="wm-topic-list">
            ${topicPoints.map(t => `<li><i class="fas fa-circle"></i>${t}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div class="wm-podcast-section">
          <div class="wm-section-title"><i class="fas fa-record-vinyl"></i>Podcast</div>
          ${!podcast ? `
            <div class="wm-podcast-missing">
              <i class="fas fa-microphone-slash"></i>
              No hay podcast disponible para esta semana.
            </div>
          ` : `
            <div class="wm-vinyl-player" data-podcast-id="${s.id}">
              <div class="vinyl-deck">
                <div class="vinyl-record" id="vr-${s.id}">
                  <div class="vr-grooves"></div>
                  <div class="vr-label">
                    <span class="vr-label-icon"><i class="fas fa-microphone"></i></span>
                    <span class="vr-label-title">${(podcast.nombre || 'Podcast').substring(0,14)}</span>
                  </div>
                  <div class="vr-hole"></div>
                </div>
                <div class="vinyl-tonearm" id="vta-${s.id}">
                  <div class="vta-pivot"></div>
                  <div class="vta-bar"><div class="vta-head"></div></div>
                </div>
              </div>
              ${isSoundCloudUrl(podcast.url) ? `
                <div class="vc-info">
                  <div class="vc-title">${podcast.nombre || 'Podcast de la semana'}</div>
                  <div class="vc-sub">${s.nombre} <i class="fab fa-soundcloud" style="color:#ff7700;margin-left:4px"></i></div>
                </div>
                <div class="sc-embed-wrapper">
                  <iframe src="${getSoundCloudEmbedUrl(podcast.url)}" class="sc-iframe" allow="autoplay" style="filter:invert(1)"></iframe>
                </div>
              ` : `
                <div class="vinyl-controls">
                  <div class="vc-info">
                    <div class="vc-title">${podcast.nombre || 'Podcast de la semana'}</div>
                    <div class="vc-sub">${s.nombre}</div>
                  </div>
                  <div class="vc-progress">
                    <span class="vc-time current" id="vcCurr-${s.id}">0:00</span>
                    <div class="vc-bar" id="vcBar-${s.id}" onclick="vinylSeek(event,'${s.id}')">
                      <div class="vc-fill" id="vcFill-${s.id}"></div>
                      <div class="vc-thumb" id="vcThumb-${s.id}"></div>
                    </div>
                    <span class="vc-time total" id="vcTotal-${s.id}">0:00</span>
                  </div>
                  <div class="vc-actions">
                    <button class="vc-btn vc-play" id="vcPlay-${s.id}" data-hot onclick="toggleVinylPlay('${s.id}')">
                      <i class="fas fa-play"></i>
                    </button>
                  </div>
                </div>
                <audio id="va-${s.id}" src="${podcast.url}" preload="metadata" style="display:none"></audio>
              `}
            </div>
          `}
        </div>
      </div>

      <div class="wm-col-right">
        <div class="wm-files">
          <div class="wm-section-title"><i class="fas fa-files"></i>Archivos</div>
          ${archivos.length === 0 ? '<div class="wm-empty">No hay archivos disponibles para esta semana.</div>' :
            `<div class="wm-files-grid">
              ${archivos.map(a=>{
                const ft = getFileType(a.nombre);
                const isLink = a.tipo === 'link' || ft === 'link';
                const isViewable = ['pdf','img','txt','code','aud','vid','sql'].includes(ft);
                const fileUrl = a.url || '';
                return `
                <div class="wm-file-card" data-file-id="${a.id}">
                  <div class="wfc-icon ${ft}">
                    <i class="fas ${getFileIcon(a.nombre)}"></i>
                    <span class="wfc-ext">${isLink ? 'URL' : a.nombre.split('.').pop().toUpperCase()}</span>
                  </div>
                  <div class="wfc-info">
                    <span class="wfc-name" title="${a.nombre}">${a.nombre}</span>
                    ${!isLink ? `<span class="wfc-size">${a.tamaño || ''}</span>` : ''}
                  </div>
                  <div class="wfc-actions">
                    ${isLink ? `
                      <a href="${fileUrl}" target="_blank" class="wfc-btn" data-hot title="Abrir enlace"><i class="fas fa-external-link-alt"></i></a>
                    ` : `
                      ${isViewable && fileUrl ? `<button class="wfc-btn" data-hot onclick="viewFile('${s.id}','${a.id}')" title="Ver en página"><i class="fas fa-eye"></i></button>` : ''}
                      ${fileUrl ? `<button class="wfc-btn" data-hot onclick="downloadFile('${s.id}','${a.id}')" title="Descargar"><i class="fas fa-download"></i></button>` : ''}
                      ${fileUrl ? `<button class="wfc-btn" data-hot onclick="openFileTab('${s.id}','${a.id}')" title="Abrir en nueva pestaña"><i class="fas fa-external-link-alt"></i></button>` : ''}
                    `}
                  </div>
                </div>
              `}).join('')}
            </div>`
          }
        </div>
      </div>
    </div>
  `;
}

window.openWeekModal = function(unitIdx, weekIdx){
  const content = buildWeekModalContent(unitIdx, weekIdx);
  if(!content) return;
  document.getElementById('weekModalContent').innerHTML = content;
  document.getElementById('weekModal').classList.add('show');
  document.body.style.overflow = 'hidden';
};

window.closeWeekModal = function(){
  document.getElementById('weekModal').classList.remove('show');
  document.body.style.overflow = '';
  // Stop and clear all vinyl players (DOM elements get destroyed on modal close)
  Object.values(vinylPlayers).forEach(p => { if(p.playing) p.pause(); });
  vinylPlayers = {};
};

// Close modal on overlay click
document.getElementById('weekModal').addEventListener('click',function(e){
  if(e.target === this) closeWeekModal();
});

window.selectUnit = function(i){
  currentUnit = i;
  renderTabs();
  renderUnit();
};

function timeAgo(dateStr){
  if(!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff/60000);
  if(mins < 1) return 'just now';
  if(mins < 60) return mins + ' min ago';
  const hrs = Math.floor(mins/60);
  if(hrs < 24) return hrs + ' hour' + (hrs>1?'s':'') + ' ago';
  const days = Math.floor(hrs/24);
  return days + ' day' + (days>1?'s':'') + ' ago';
}
function getFileType(name){
  const ext = name.split('.').pop().toLowerCase();
  if(['pdf'].includes(ext)) return 'pdf';
  if(['doc','docx'].includes(ext)) return 'doc';
  if(['sql'].includes(ext)) return 'sql';
  if(['xls','xlsx','csv'].includes(ext)) return 'xls';
  if(['ppt','pptx'].includes(ext)) return 'ppt';
  if(['png','jpg','jpeg','gif','svg','webp','bmp','ico'].includes(ext)) return 'img';
  if(['mp4','avi','mov','mkv','webm'].includes(ext)) return 'vid';
  if(['mp3','wav','ogg','m4a','flac','aac'].includes(ext)) return 'aud';
  if(['zip','rar','7z','tar','gz'].includes(ext)) return 'zip';
  if(['txt','md','log'].includes(ext)) return 'txt';
  if(['html','htm','css','js','ts','jsx','tsx','vue','svelte'].includes(ext)) return 'code';
  if(ext==='link') return 'link';
  return 'file';
}
function getFileIcon(name){
  const ext = name.split('.').pop().toLowerCase();
  if(['pdf'].includes(ext)) return 'fa-file-pdf';
  if(['doc','docx'].includes(ext)) return 'fa-file-word';
  if(['sql'].includes(ext)) return 'fa-database';
  if(['xls','xlsx','csv'].includes(ext)) return 'fa-file-excel';
  if(['ppt','pptx'].includes(ext)) return 'fa-file-powerpoint';
  if(['png','jpg','jpeg','gif','svg','webp','bmp','ico'].includes(ext)) return 'fa-file-image';
  if(['mp4','avi','mov','mkv','webm'].includes(ext)) return 'fa-file-video';
  if(['mp3','wav','ogg','m4a','flac','aac'].includes(ext)) return 'fa-file-audio';
  if(['zip','rar','7z','tar','gz'].includes(ext)) return 'fa-file-zipper';
  if(['txt','md','log'].includes(ext)) return 'fa-file-lines';
  if(['html','htm','css','js','ts','jsx','tsx','vue','svelte'].includes(ext)) return 'fa-file-code';
  if(ext==='link') return 'fa-link';
  return 'fa-file';
}

// ============ LOGIN ============
window.btnAdmin = document.getElementById('btnAdmin');
document.getElementById('btnAdmin').addEventListener('click',()=>{
  if(sessionStorage.getItem('bd2_admin')==='1'){
    openAdmin();
  }else{
    document.getElementById('loginModal').classList.add('show');
    setTimeout(()=>document.getElementById('loginUser').focus(),300);
  }
});
window.closeLogin = function(){
  document.getElementById('loginModal').classList.remove('show');
  document.getElementById('loginError').classList.remove('show');
};
window.tryLogin = function(){
  const u = document.getElementById('loginUser').value;
  const p = document.getElementById('loginPass').value;

  if (u === 'Isaac' && p === 'Isaac321') {
    sessionStorage.setItem('bd2_admin', '1');
    closeLogin();
    openAdmin();
  } else {
    document.getElementById('loginError').classList.add('show');
    document.getElementById('loginPass').value = '';
  }
};
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    closeLogin();
    closeWeekModal();
    if(document.getElementById('adminPanel').classList.contains('show') && confirm('¿Cerrar sesión de administrador?')){
      logout();
    }
  }
  if(e.key==='Enter' && document.getElementById('loginModal').classList.contains('show')){
    tryLogin();
  }
});

// ============ ADMIN PANEL ============
function openAdmin(){
  document.getElementById('adminPanel').classList.add('show');
  document.getElementById('chatFab').style.display = 'none';
  document.getElementById('chatThought').style.display = 'none';
  const cd = document.getElementById('cursorDot'), cr = document.getElementById('cursorRing');
  if(cd) cd.style.display = 'none';
  if(cr) cr.style.display = 'none';
  stopParticles();
  if(window.stopAurora) window.stopAurora();
  if(window.stopDBScene) window.stopDBScene();
  if(window.stopTubes) window.stopTubes();
  if(window.splineApp && window.splineApp.pause) window.splineApp.pause();
  renderAdminContent('content');
  const toggle = document.getElementById('adminSidebarToggle');
  const sidebar = document.querySelector('.admin-sidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  if (toggle && sidebar && overlay) {
    toggle.onclick = () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    };
    overlay.onclick = () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    };
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth < 1025) {
          sidebar.classList.remove('open');
          overlay.classList.remove('open');
        }
      });
    });
  }
}
window.logout = function(){
  sessionStorage.removeItem('bd2_admin');
  document.getElementById('adminPanel').classList.remove('show');
  document.getElementById('chatFab').style.display = '';
  document.getElementById('chatThought').style.display = '';
  const cd2 = document.getElementById('cursorDot'), cr2 = document.getElementById('cursorRing');
  if(cd2) cd2.style.display = '';
  if(cr2) cr2.style.display = '';
  document.getElementById('previewBanner')?.remove();
  resumeParticles();
  if(window.resumeAurora) window.resumeAurora();
  if(window.resumeDBScene) window.resumeDBScene();
  if(window.resumeTubes) window.resumeTubes();
  if(window.splineApp && window.splineApp.play) window.splineApp.play();
};

window.openPreview = function(){
  const existing = document.getElementById('previewBanner');
  if(existing) existing.remove();
  document.getElementById('adminPanel').classList.remove('show');
  renderUnit();
  const banner = document.createElement('div');
  banner.id = 'previewBanner';
  banner.className = 'preview-banner';
  banner.innerHTML = '<i class="fas fa-eye"></i> Vista previa — los cambios aún no se guardan automáticamente <button class="preview-close" onclick="closePreview()"><i class="fas fa-xmark"></i> Volver</button>';
  document.body.prepend(banner);
};
window.closePreview = function(){
  document.getElementById('previewBanner')?.remove();
  document.getElementById('adminPanel').classList.add('show');
};

window.showAdminPage = function(page, e){
  document.querySelectorAll('.sidebar-item').forEach(s=>s.classList.remove('active'));
  if(e && e.currentTarget) e.currentTarget.classList.add('active');
  renderAdminContent(page);
};

function renderAdminContent(page){
  const c = document.getElementById('adminContent');
  try {
  if(page==='content'){
    c.innerHTML = `
      <div class="admin-page-title"><i class="fas fa-pen-to-square" style="margin-right:10px"></i>Editar Contenido</div>
      <div class="admin-page-sub">Edita nombres y descripciones de unidades y semanas. También puedes eliminar o agregar nuevas.</div>
      <button class="preview-btn" data-hot onclick="openPreview()"><i class="fas fa-eye"></i> Vista previa</button>
      <div class="admin-units-grid">
        ${state.unidades.map((u,ui)=>`
          <div class="admin-unit-card">
            <div class="admin-unit-head">
              <div class="left">
                <div class="unum">U${ui+1}</div>
                <div style="flex:1">
                  <input class="editable-name" value="${u.nombre}" onchange="updateUnit(${ui},'nombre',this.value)">
                  <textarea class="desc-edit" rows="2" onchange="updateUnit(${ui},'descripcion',this.value)">${u.descripcion}</textarea>
                </div>
                <button class="fdel" data-hot onclick="deleteUnit(${ui})" title="Eliminar unidad" style="align-self:flex-start"><i class="fas fa-trash"></i></button>
              </div>
            </div>
            <div class="admin-weeks">
              ${u.semanas.map((s,si)=>`
                <div class="admin-week">
                  <div class="admin-week-head">
                    <div class="wnum">S${si+1}</div>
                    <input class="aweek-name" value="${s.nombre}" onchange="updateWeek(${ui},${si},'nombre',this.value)">
                    <button class="fdel" data-hot onclick="deleteWeek(${ui},${si})" title="Eliminar semana"><i class="fas fa-times"></i></button>
                  </div>
                  <textarea class="aweek-desc" placeholder="Descripción de la semana" onchange="updateWeek(${ui},${si},'descripcion',this.value)">${s.descripcion||s.desc||''}</textarea>
                </div>
              `).join('')}
              <button class="add-week-btn" data-hot onclick="addWeek(${ui})"><i class="fas fa-plus"></i> Añadir Semana</button>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="add-unit-btn" data-hot onclick="addUnit()"><i class="fas fa-plus"></i> Añadir Unidad</button>
      <div class="save-bar">
        <button class="btn-save" data-hot onclick="saveAll()">
          <i class="fas fa-floppy-disk"></i>GUARDAR CAMBIOS
        </button>
      </div>
    `;
  }else if(page==='files'){
    const allWeeks = state.unidades.flatMap((u,ui)=>u.semanas.map((s,si)=>({id:s.id,label:'U'+(ui+1)+' S'+(si+1)+' - '+s.nombre,unitIdx:ui,weekIdx:si,unitName:u.nombre})));
    const defaultWeek = allWeeks[0]?.id || '';
    c.innerHTML = `
      <div class="admin-page-title"><i class="fas fa-upload" style="margin-right:10px"></i>Subir Archivos</div>
      <div class="admin-page-sub">Selecciona la unidad y semana, luego arrastra o selecciona tus archivos.</div>
      
      <div class="unified-upload-section">
        <div class="unified-upload-selectors">
          <div class="selector-group">
            <label for="unifiedUnitSelect"><i class="fas fa-layer-group"></i> Unidad</label>
            <select id="unifiedUnitSelect" onchange="updateUnifiedWeeks()">
              ${state.unidades.map((u,ui)=>`<option value="${ui}">U${ui+1} - ${u.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="selector-group">
            <label for="unifiedWeekSelect"><i class="fas fa-calendar-week"></i> Semana</label>
            <select id="unifiedWeekSelect">
              ${state.unidades[0]?.semanas.map((s,si)=>`<option value="${s.id}">S${si+1} - ${s.nombre}</option>`).join('') || ''}
            </select>
          </div>
        </div>

        <div class="upload-zone unified-drop" data-hot id="uploadZone-unified" style="position:relative">
          <div class="upload-zone-inner" onclick="document.getElementById('fileInput-unified').click()" ondragover="this.parentElement.classList.add('drag');event.preventDefault()" ondragleave="this.parentElement.classList.remove('drag')" ondrop="event.preventDefault();this.parentElement.classList.remove('drag');handleDrop(event)">
            <i class="fas fa-cloud-arrow-up"></i>
            <p><strong>Suelta tus archivos aquí</strong><br>PDF, DOCX, SQL, PNG, JPG, ZIP, etc.</p>
            <input id="fileInput-unified" type="file" multiple style="display:none" onchange="addPendingFiles(this.files)" 
              accept=".pdf,.doc,.docx,.sql,.png,.jpg,.jpeg,.gif,.zip,.rar,.txt,.csv,.xlsx,.pptx">
          </div>
        </div>

        <div id="pendingFilesList" class="pending-files-list" style="display:none"></div>
        <div id="uploadSuccessMsg" class="upload-success-msg" style="display:none"></div>
        <div class="upload-progress" id="uploadProgress-unified" style="display:none;margin-top:8px">
          <div class="up-bar"><div class="up-fill" id="upFill-unified"></div></div>
          <span class="up-text" id="upText-unified">Subiendo...</span>
        </div>

        <div class="link-input-section">
          <div class="link-input-row">
            <i class="fas fa-link"></i>
            <input type="text" id="fileLinkInput" placeholder="Pega una URL (Google Drive, YouTube, etc.)" class="link-field">
            <input type="text" id="fileLinkName" placeholder="Nombre (opcional)" class="link-name-field">
            <button class="link-add-btn" onclick="addFileLink()"><i class="fas fa-plus"></i> Agregar</button>
          </div>
        </div>
      </div>

      <div class="admin-files-all-section">
        <div class="admin-files-all-header" onclick="document.getElementById('allFilesContainer').classList.toggle('collapsed');this.querySelector('i').classList.toggle('fa-chevron-down');this.querySelector('i').classList.toggle('fa-chevron-right')">
          <i class="fas fa-chevron-down" style="margin-right:8px;font-size:12px;transition:transform .2s"></i>
          <span style="font-weight:700;font-size:15px;color:var(--text)">Archivos por semana</span>
          <span style="margin-left:auto;font-size:12px;color:var(--muted)">${state.unidades.flatMap(u=>u.semanas).reduce((acc,s)=>acc+(s.archivos||[]).length,0)} archivos</span>
        </div>
        <div id="allFilesContainer" class="all-files-container">
          ${state.unidades.map((u,ui)=>`
            <div class="admin-unit-card" style="margin-top:12px">
              <div class="admin-unit-head">
                <div class="left">
                  <div class="unum">U${ui+1}</div>
                  <div style="flex:1">
                    <div class="editable-name" style="font-size:16px;font-weight:700;color:var(--text)">${u.nombre}</div>
                  </div>
                </div>
              </div>
              <div class="admin-weeks">
                ${u.semanas.map((s,si)=>`
                  <div class="admin-week">
                    <div class="admin-week-head">
                      <div class="wnum">S${si+1}</div>
                      <div style="flex:1;font-size:13px;font-weight:600;color:var(--text)">${s.nombre}</div>
                      <span style="font-size:11px;color:var(--muted);margin-left:4px">(${(s.archivos||[]).length})</span>
                    </div>
                    <div class="afiles" id="files-${s.id}">
                      ${(s.archivos||[]).map(a=>{
                        const ft = getFileType(a.nombre);
                        const weeks = state.unidades.flatMap((u2,ui2)=>u2.semanas.map((s2,si2)=>({id:s2.id,label:ui2+1+'.'+(si2+1)+' '+s2.nombre})));
                        return `
                        <div class="afile">
                          <div class="afile-icon ${ft}">
                            <i class="fas ${getFileIcon(a.nombre)}"></i>
                          </div>
                          <div class="afile-body">
                            <span class="fname-edit" title="${a.nombre}">${a.nombre}</span>
                            <span class="afile-size">${a.tamaño||''}</span>
                          </div>
                          <div class="afile-actions">
                            <button class="afile-btn" data-hot onclick="viewFile('${s.id}','${a.id}')" title="Vista previa"><i class="fas fa-eye"></i></button>
                            <select class="move-week-select" onchange="moveFile('${s.id}','${a.id}',this.value)" title="Mover a otra semana">
                              <option value="">Mover</option>
                              ${weeks.filter(w=>w.id!==s.id).map(w=>`<option value="${w.id}">${w.label}</option>`).join('')}
                            </select>
                            <button class="fdel" data-hot onclick="deleteFile('${s.id}','${a.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                          </div>
                        </div>
                      `}).join('')}
                      ${(s.archivos||[]).length===0 ? '<div style="font-size:12px;color:var(--muted);padding:6px 0;text-align:center">Sin archivos</div>' : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }else if(page==='podcasts'){
    c.innerHTML = `
      <div class="admin-page-title"><i class="fas fa-microphone" style="margin-right:10px"></i>Subir Podcasts</div>
      <div class="admin-page-sub">Selecciona la unidad y semana, sube un archivo de audio o pega un enlace.</div>
      
      <div class="unified-upload-section podcast-unified">
        <div class="unified-upload-selectors">
          <div class="selector-group">
            <label for="podcastUnitSelect"><i class="fas fa-layer-group"></i> Unidad</label>
            <select id="podcastUnitSelect" onchange="updatePodcastWeeks()">
              ${state.unidades.map((u,ui)=>`<option value="${ui}">U${ui+1} - ${u.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="selector-group">
            <label for="podcastWeekSelect"><i class="fas fa-calendar-week"></i> Semana</label>
            <select id="podcastWeekSelect">
              ${state.unidades[0]?.semanas.map((s,si)=>`<option value="${s.id}">S${si+1} - ${s.nombre}</option>`).join('') || ''}
            </select>
          </div>
        </div>

        <div class="upload-zone unified-drop podcast-drop" data-hot id="uploadZone-podcast" style="position:relative">
          <div class="upload-zone-inner" onclick="document.getElementById('fileInput-podcast').click()" ondragover="this.parentElement.classList.add('drag');event.preventDefault()" ondragleave="this.parentElement.classList.remove('drag')" ondrop="event.preventDefault();this.parentElement.classList.remove('drag');handlePodcastDrop(event)">
            <i class="fas fa-podcast"></i>
            <p><strong>Suelta un archivo de audio aquí</strong><br>MP3, WAV, OGG, etc.</p>
            <input id="fileInput-podcast" type="file" style="display:none" onchange="addPendingPodcastFile(this.files[0])" 
              accept="audio/*">
          </div>
        </div>

        <div class="link-input-section podcast-link-section">
          <div class="link-input-row">
            <i class="fas fa-link"></i>
            <input type="text" id="podcastLinkInput" placeholder="URL de SoundCloud, Spotify, YouTube, etc." class="link-field">
            <input type="text" id="podcastLinkName" placeholder="Nombre del podcast" class="link-name-field">
            <button class="link-add-btn podcast-link-btn" onclick="addPodcastLink()"><i class="fas fa-plus"></i> Agregar</button>
          </div>
        </div>

        <div id="pendingPodcastList" class="pending-files-list" style="display:none"></div>
        <div id="podcastSuccessMsg" class="upload-success-msg" style="display:none"></div>
        <div class="upload-progress" id="uploadProgress-podcast" style="display:none;margin-top:8px">
          <div class="up-bar"><div class="up-fill" id="upFill-podcast"></div></div>
          <span class="up-text" id="upText-podcast">Subiendo...</span>
        </div>
      </div>

      <div class="admin-files-all-section">
        <div class="admin-files-all-header" onclick="document.getElementById('allPodcastsContainer').classList.toggle('collapsed');this.querySelector('i').classList.toggle('fa-chevron-down');this.querySelector('i').classList.toggle('fa-chevron-right')">
          <i class="fas fa-chevron-down" style="margin-right:8px;font-size:12px;transition:transform .2s"></i>
          <span style="font-weight:700;font-size:15px;color:var(--text)">Podcasts por semana</span>
          <span style="margin-left:auto;font-size:12px;color:var(--muted)">${state.unidades.flatMap(u=>u.semanas).reduce((acc,s)=>acc+(s.podcast?1:0),0)} podcasts</span>
        </div>
        <div id="allPodcastsContainer" class="all-files-container">
          ${state.unidades.map((u,ui)=>`
            <div class="admin-unit-card" style="margin-top:12px">
              <div class="admin-unit-head">
                <div class="left">
                  <div class="unum">U${ui+1}</div>
                  <div style="flex:1">
                    <div class="editable-name" style="font-size:16px;font-weight:700;color:var(--text)">${u.nombre}</div>
                  </div>
                </div>
              </div>
              <div class="admin-weeks">
                ${u.semanas.map((s,si)=>`
                  <div class="admin-week">
                    <div class="admin-week-head">
                      <div class="wnum">S${si+1}</div>
                      <div style="flex:1;font-size:13px;font-weight:600;color:var(--text)">${s.nombre}</div>
                      <span style="font-size:11px;color:var(--muted);margin-left:4px">${s.podcast?'1':'0'}</span>
                    </div>
                    ${s.podcast ? `
                    <div class="podcast-info">
                      <div class="pi-header">
                        <i class="fas ${s.podcast.tipo==='link'?'fa-link':'fa-music'}" style="color:var(--violet)"></i>
                        <span class="pi-name">${s.podcast.nombre || 'Sin nombre'}</span>
                      </div>
                      <span class="pi-url">${(s.podcast.url||'').substring(0,60)}${(s.podcast.url||'').length>60?'...':''}</span>
                      <button class="pfile-btn pfile-remove" style="margin-top:6px;font-size:10px;padding:4px 10px" onclick="removePodcast(${ui},${si})"><i class="fas fa-trash"></i> Quitar</button>
                    </div>` : `<div style="font-size:12px;color:var(--muted);padding:6px 0;text-align:center">Sin podcast</div>`}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }else if(page==='dashboard'){
    let totalFiles=0, lastActivity=[], totalSales=0, activeUsers=0, totalOrders=0;
    const now = Date.now();
    state.unidades.forEach(u=>u.semanas.forEach(s=>{
      (s.archivos||[]).forEach(a=>{
        totalFiles++;
        const age = a.createdAt ? Math.floor((now - new Date(a.createdAt).getTime())/60000) : null;
        if(age !== null && age < 10080){
          lastActivity.push({...a, unit: u.nombre, week: s.nombre, weekId: s.id});
        }
      });
    }));
    lastActivity.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const recentFiles = lastActivity.slice(0,4);
    totalSales = totalFiles * 125;
    activeUsers = Math.max(0, Math.floor(Math.random() * 200 + 200));
    totalOrders = Math.max(0, Math.floor(Math.random() * 100 + 50));

    c.innerHTML = `
      <div class="dash-wrapper">
        <div class="dash-header">
          <div>
            <h1 class="dash-title">Dashboard</h1>
            <p class="dash-subtitle">Welcome back to your dashboard</p>
          </div>
          <div class="dash-header-actions">
            <button class="dash-icon-btn" onclick="showToast('Notificaciones')">
              <i class="fas fa-bell"></i>
              <span class="dash-badge"></span>
            </button>
            <button class="dash-icon-btn" onclick="document.body.classList.toggle('dash-dark')">
              <i class="fas fa-moon" id="dashThemeIcon"></i>
            </button>
            <button class="dash-icon-btn">
              <i class="fas fa-user"></i>
            </button>
          </div>
        </div>

        <div class="dash-stats-grid">
          <div class="dash-stat-card">
            <div class="dash-stat-header">
              <div class="dash-stat-icon blue">
                <i class="fas fa-dollar-sign"></i>
              </div>
              <i class="fas fa-arrow-up dash-stat-trend"></i>
            </div>
            <div class="dash-stat-label">Total Sales</div>
            <div class="dash-stat-value">$${totalSales.toLocaleString()}</div>
            <div class="dash-stat-change up">+12% from last month</div>
          </div>
          <div class="dash-stat-card">
            <div class="dash-stat-header">
              <div class="dash-stat-icon green">
                <i class="fas fa-users"></i>
              </div>
              <i class="fas fa-arrow-up dash-stat-trend"></i>
            </div>
            <div class="dash-stat-label">Active Users</div>
            <div class="dash-stat-value">${activeUsers.toLocaleString()}</div>
            <div class="dash-stat-change up">+5% from last week</div>
          </div>
          <div class="dash-stat-card">
            <div class="dash-stat-header">
              <div class="dash-stat-icon purple">
                <i class="fas fa-shopping-cart"></i>
              </div>
              <i class="fas fa-arrow-up dash-stat-trend"></i>
            </div>
            <div class="dash-stat-label">Orders</div>
            <div class="dash-stat-value">${totalOrders}</div>
            <div class="dash-stat-change up">+8% from yesterday</div>
          </div>
          <div class="dash-stat-card">
            <div class="dash-stat-header">
              <div class="dash-stat-icon orange">
                <i class="fas fa-box"></i>
              </div>
              <i class="fas fa-arrow-up dash-stat-trend"></i>
            </div>
            <div class="dash-stat-label">Products</div>
            <div class="dash-stat-value">${totalFiles}</div>
            <div class="dash-stat-change up">+3 new this week</div>
          </div>
        </div>

        <div class="dash-content-grid">
          <div class="dash-card-wide">
            <div class="dash-card-header">
              <h3>Recent Activity</h3>
              <button class="dash-card-link" onclick="showAdminPage('storage')">View all</button>
            </div>
            <div class="dash-activity-list">
              ${recentFiles.length ? recentFiles.map(a=>{
                const colors = {pdf:'green',sql:'blue',doc:'purple',img:'orange',file:'red'};
                const ft = getFileType(a.nombre) || 'file';
                const icons = {pdf:'fa-file-pdf',sql:'fa-database',doc:'fa-file-word',img:'fa-file-image',file:'fa-file'};
                const colorMap = {green:'#22c55e',blue:'#3b82f6',purple:'#a855f7',orange:'#f97316',red:'#ef4444'};
                const bgMap = {green:'rgba(34,197,94,0.1)',blue:'rgba(59,130,246,0.1)',purple:'rgba(168,85,247,0.1)',orange:'rgba(249,115,22,0.1)',red:'rgba(239,68,68,0.1)'};
                const c = colors[ft] || 'blue';
                return `
                  <div class="dash-activity-item" onclick="downloadFile('${a.weekId}','${a.id}')">
                    <div class="dash-activity-icon" style="background:${bgMap[c]};color:${colorMap[c]}">
                      <i class="fas ${icons[ft] || 'fa-file'}"></i>
                    </div>
                    <div class="dash-activity-info">
                      <div class="dash-activity-title">${a.nombre}</div>
                      <div class="dash-activity-desc">${a.unit} — ${a.week}</div>
                    </div>
                    <div class="dash-activity-time">${a.createdAt ? timeAgo(a.createdAt) : ''}</div>
                  </div>
                `;
              }).join('') : `
                <div class="dash-activity-empty">
                  <i class="fas fa-inbox"></i>
                  <p>No recent activity</p>
                </div>
              `}
            </div>
          </div>

          <div class="dash-card-narrow">
            <div class="dash-card-header">
              <h3>Quick Stats</h3>
            </div>
            <div class="dash-quick-stats">
              <div class="dash-qs-row">
                <span class="dash-qs-label">Conversion Rate</span>
                <span class="dash-qs-value">3.2%</span>
              </div>
              <div class="dash-qs-bar"><div class="dash-qs-fill blue" style="width:32%"></div></div>
              <div class="dash-qs-row">
                <span class="dash-qs-label">Bounce Rate</span>
                <span class="dash-qs-value">45%</span>
              </div>
              <div class="dash-qs-bar"><div class="dash-qs-fill orange" style="width:45%"></div></div>
              <div class="dash-qs-row">
                <span class="dash-qs-label">Page Views</span>
                <span class="dash-qs-value">8.7k</span>
              </div>
              <div class="dash-qs-bar"><div class="dash-qs-fill green" style="width:87%"></div></div>
            </div>

            <div class="dash-card-header" style="margin-top:24px">
              <h3>Top Products</h3>
            </div>
            <div class="dash-top-products">
              ${['iPhone 15 Pro','MacBook Air M2','AirPods Pro','iPad Air'].map(p => {
                const price = '$' + (Math.floor(Math.random() * 1000 + 500));
                return `<div class="dash-tp-row"><span>${p}</span><span class="dash-tp-price">${price}</span></div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }else if(page==='storage'){
    c.innerHTML = `
      <div class="admin-page-title"><i class="fas fa-database" style="margin-right:12px"></i>Storage</div>
      <div class="admin-page-sub">Archivos subidos al repositorio.</div>
      <div class="storage-summary">
        ${(()=>{
          let allFiles = [];
          state.unidades.forEach(u=>u.semanas.forEach(s=>(s.archivos||[]).forEach(a=>{
            allFiles.push({...a, unit: u.nombre, week: s.nombre, weekId: s.id});
          })));
          allFiles.sort((a,b)=>{
            const extA = a.nombre.split('.').pop().toLowerCase();
            const extB = b.nombre.split('.').pop().toLowerCase();
            if(extA !== extB) return extA.localeCompare(extB);
            return a.nombre.localeCompare(b.nombre);
          });
          if(allFiles.length===0) return '<div class="wm-empty" style="padding:40px"><i class="fas fa-folder-open" style="font-size:32px;margin-bottom:10px;display:block"></i>No hay archivos en el repositorio.</div>';
          const types = {};
          allFiles.forEach(a=>{
            const ext = (a.nombre.split('.').pop()||'unknown').toLowerCase();
            types[ext] = (types[ext]||0)+1;
          });
          return `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px">
              ${Object.entries(types).sort((a,b)=>b[1]-a[1]).map(([ext,count])=>`
                <div class="storage-type-badge"><span class="ext">${ext}</span><span class="count">${count}</span></div>
              `).join('')}
            </div>
            <div class="admin-page-sub" style="margin-bottom:16px;border-top:1px solid var(--border);padding-top:16px">Listado completo de archivos</div>
            <div class="storage-list">
              ${allFiles.map(a=>{
                const ft = getFileType(a.nombre);
                const isLink = a.tipo === 'link' || ft === 'link';
                const isViewable = ['pdf','img','txt','code','aud','vid','sql'].includes(ft);
                return `
                <div class="storage-item" data-hot>
                  <div class="st-icon ${ft}"><i class="fas ${getFileIcon(a.nombre)}"></i></div>
                  <div class="st-info">
                    <div class="st-name">${a.nombre}</div>
                    <div class="st-meta">${a.unit} — ${a.week}</div>
                  </div>
                  <span class="st-size">${a.tamaño||''}</span>
                  <div class="st-actions">
                    ${isViewable && !isLink ? `<button class="st-btn" onclick="viewFile('${a.weekId}','${a.id}');event.stopPropagation()" title="Ver"><i class="fas fa-eye"></i></button>` : ''}
                    ${!isLink ? `<button class="st-btn" onclick="openFileTab('${a.weekId}','${a.id}');event.stopPropagation()" title="Abrir en pestaña"><i class="fas fa-external-link-alt"></i></button>` : ''}
                    ${!isLink ? `<button class="st-btn" onclick="downloadFile('${a.weekId}','${a.id}');event.stopPropagation()" title="Descargar"><i class="fas fa-download"></i></button>` : ''}
                    <button class="st-btn st-del" onclick="if(confirm('Eliminar ${a.nombre}?')){deleteFile('${a.weekId}','${a.id}');}event.stopPropagation()" title="Eliminar"><i class="fas fa-trash"></i></button>
                  </div>
                </div>
              `}).join('')}
            </div>
          `;
        })()}
      </div>
    `;
  }
  } catch(e) { console.error('Admin render error:', e); }
}

window.updateUnit = function(ui, field, val){
  state.unidades[ui][field] = val;
  saveData();
  if(field==='nombre' || field==='descripcion') renderUnit();
  if(field==='nombre') renderTabs();
};
window.updateWeek = function(ui, si, field, val){
  state.unidades[ui].semanas[si][field] = val;
  saveData();
  renderUnit();
};
window.showUploadProgress = function(sid, pct, text){
  const bar = document.getElementById('upFill-' + sid);
  const txt = document.getElementById('upText-' + sid);
  const prog = document.getElementById('uploadProgress-' + sid);
  if(!bar || !txt || !prog) return;
  if(pct < 0){
    prog.style.display = 'none';
    return;
  }
  prog.style.display = 'flex';
  bar.style.width = Math.min(pct, 100) + '%';
  txt.textContent = text || (pct + '%');
};

window.handleDrop = function(e){
  const dt = e.dataTransfer;
  if(dt?.files?.length){
    addPendingFiles(dt.files);
  }
};

window.updateUnifiedWeeks = function(){
  const unitIdx = parseInt(document.getElementById('unifiedUnitSelect').value);
  const weekSelect = document.getElementById('unifiedWeekSelect');
  const unit = state.unidades[unitIdx];
  if(!unit) return;
  weekSelect.innerHTML = unit.semanas.map((s,si)=>`<option value="${s.id}">S${si+1} - ${s.nombre}</option>`).join('');
};

window._pendingFiles = [];

window.addPendingFiles = function(files){
  if(!files || !files.length) return;
  for(const f of files){
    const maxSize = 50*1024*1024;
    if(f.size > maxSize){ showToast(`${f.name} es demasiado grande (máx 50MB)`); continue; }
    const allowed = ['pdf','doc','docx','sql','png','jpg','jpeg','gif','svg','webp','bmp','zip','rar','7z','txt','csv','xlsx','xls','pptx','ppt','mp4','mp3','wav','ogg'];
    const ext = f.name.split('.').pop().toLowerCase();
    if(!allowed.includes(ext)){ showToast(`Tipo .${ext} no soportado`); continue; }
    window._pendingFiles.push({file:f, customName:f.name.replace(/\.[^.]+$/,'')});
  }
  renderPendingFiles();
};

window.renderPendingFiles = function(){
  const list = document.getElementById('pendingFilesList');
  if(!list) return;
  if(!window._pendingFiles.length){ list.style.display='none'; return; }
  list.style.display='block';
  list.innerHTML = window._pendingFiles.map((p,i)=>{
    if(p.isLink){
      const ext = p.linkExt || 'link';
      return `
      <div class="pending-file-row pending-file-link">
        <div class="pending-file-icon link-icon"><i class="fas fa-link"></i></div>
        <div class="pending-file-info">
          <input class="pending-file-name" type="text" value="${p.customName}" onchange="window._pendingFiles[${i}].customName=this.value" placeholder="Nombre del enlace">
          <span class="pending-file-ext">.${ext}</span>
          <span class="pending-file-size link-url-preview" title="${p.linkUrl}">${p.linkUrl.substring(0,40)}${p.linkUrl.length>40?'...':''}</span>
        </div>
        <button class="pending-file-remove" onclick="window._pendingFiles.splice(${i},1);renderPendingFiles()" title="Quitar"><i class="fas fa-xmark"></i></button>
      </div>`;
    }
    const ext = p.file.name.split('.').pop();
    return `
    <div class="pending-file-row">
      <div class="pending-file-icon"><i class="fas ${getFileIcon(p.file.name)}"></i></div>
      <div class="pending-file-info">
        <input class="pending-file-name" type="text" value="${p.customName}" onchange="window._pendingFiles[${i}].customName=this.value" placeholder="Nombre del archivo">
        <span class="pending-file-ext">.${ext}</span>
        <span class="pending-file-size">${formatSize(p.file.size)}</span>
      </div>
      <button class="pending-file-remove" onclick="window._pendingFiles.splice(${i},1);renderPendingFiles()" title="Quitar"><i class="fas fa-xmark"></i></button>
    </div>`;
  }).join('') + `
    <div class="pending-actions">
      <button class="pending-clear-btn" onclick="window._pendingFiles=[];renderPendingFiles();const fi=document.getElementById('fileInput-unified');if(fi)fi.value=''"><i class="fas fa-trash"></i> Limpiar todo</button>
      <button class="pending-upload-btn" onclick="uploadPendingFiles()"><i class="fas fa-cloud-arrow-up"></i> Subir ${window._pendingFiles.length} archivo(s)</button>
    </div>`;
};

window.removePendingFile = function(i){
  window._pendingFiles.splice(i,1);
  renderPendingFiles();
};

window.uploadPendingFiles = async function(){
  if(!window._pendingFiles.length) return;
  const sid = document.getElementById('unifiedWeekSelect')?.value;
  if(!sid){ showToast('Selecciona una semana primero'); return; }
  let targetWeek = null;
  state.unidades.forEach(u=>u.semanas.forEach(s=>{if(s.id===sid) targetWeek=s}));
  if(!targetWeek) return;
  targetWeek.archivos = targetWeek.archivos || [];
  const useStorage = isConfigured() && getClient();
  const progId = 'unified';
  const total = window._pendingFiles.length;
  let done = 0;
  showUploadProgress(progId, 0, 'Preparando...');
  const successNames = [];
  for(const p of window._pendingFiles){
    const baseName = p.customName || (p.isLink ? 'enlace' : p.file.name.replace(/\.[^.]+$/,''));
    if(p.isLink){
      const ext = p.linkExt || 'link';
      const finalName = baseName + (baseName.endsWith('.'+ext) ? '' : '.'+ext);
      const entry = {
        id:'f'+Date.now()+Math.random().toString(36).substr(2,5),
        nombre: finalName,
        tamaño: 'Enlace',
        tipo: ext,
        url: p.linkUrl,
        storage_path: '',
        createdAt: new Date().toISOString()
      };
      targetWeek.archivos.push(entry);
      successNames.push(finalName);
      done++;
      showUploadProgress(progId, Math.round(done/total*100), `${done}/${total} completado`);
      continue;
    }
    const f = p.file;
    const ext = f.name.split('.').pop();
    const finalName = baseName + (baseName.endsWith('.'+ext) ? '' : '.'+ext);
    const entry = {
      id:'f'+Date.now()+Math.random().toString(36).substr(2,5),
      nombre: finalName,
      tamaño: formatSize(f.size),
      tipo: ext,
      url:'',
      storage_path:'',
      createdAt: new Date().toISOString()
    };
    if(useStorage){
      showUploadProgress(progId, Math.round(done/total*100), `${finalName} — subiendo...`);
      const result = await uploadFileToStorage(f, sid, p2 => {
        const overall = Math.round((done + p2/100) / total * 100);
        showUploadProgress(progId, overall, `${finalName} — ${Math.round(p2)}%`);
      });
      if(result){
        entry.url=result.url;
        entry.storage_path=result.storage_path;
      } else if(f.size < 10*1024*1024){
        showUploadProgress(progId, Math.round(done/total*100), `${finalName} — guardando local...`);
        await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => { entry.url = e.target.result; resolve(); };
          reader.readAsDataURL(f);
        });
      } else {
        showToast(`${finalName} no se pudo subir y es demasiado grande para local (máx 10MB)`);
        continue;
      }
    } else if(f.size < 10*1024*1024){
      showUploadProgress(progId, Math.round(done/total*100), `${finalName} — leyendo...`);
      await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => { entry.url = e.target.result; resolve(); };
        reader.readAsDataURL(f);
      });
    } else {
      showToast(`${finalName} es demasiado grande para almacenamiento local (máx 10MB)`);
      continue;
    }
    targetWeek.archivos.push(entry);
    successNames.push(finalName);
    done++;
    showUploadProgress(progId, Math.round(done/total*100), `${done}/${total} completado`);
  }
  showUploadProgress(progId, -1);
  window._pendingFiles = [];
  const fileInput = document.getElementById('fileInput-unified');
  if(fileInput) fileInput.value = '';
  renderPendingFiles();
  saveData();
  renderAdminContent('files');
  renderUnit();
  showToast(`${successNames.length} archivo(s) subido(s) correctamente`);
  const msg = document.getElementById('uploadSuccessMsg');
  if(msg){
    msg.style.display='flex';
    msg.innerHTML = `<i class="fas fa-circle-check"></i> <span>${successNames.length} archivo(s) subido(s) correctamente: ${successNames.join(', ')}</span>`;
    setTimeout(()=>{ if(msg) msg.style.display='none'; },5000);
  }
};

window.addFileLink = function(){
  const urlInput = document.getElementById('fileLinkInput');
  const nameInput = document.getElementById('fileLinkName');
  const url = urlInput?.value?.trim();
  if(!url){ showToast('Pega una URL primero'); return; }
  try { new URL(url); } catch(e){ showToast('URL no válida'); return; }
  const ext = url.split('.').pop().split(/[?#]/)[0].toLowerCase() || 'link';
  const customName = nameInput?.value?.trim() || url.split('/').pop().split(/[?#]/)[0] || 'enlace';
  window._pendingFiles.push({file:null, customName:customName, isLink:true, linkUrl:url, linkExt:ext});
  urlInput.value = '';
  nameInput.value = '';
  renderPendingFiles();
};

window.uploadFiles = async function(sid, files, customName){
  if(!files || !files.length) return;
  let targetWeek = null;
  state.unidades.forEach(u=>u.semanas.forEach(s=>{if(s.id===sid) targetWeek=s}));
  if(!targetWeek) return;
  for(const f of files){
    const maxSize = 50*1024*1024;
    if(f.size > maxSize){
      showToast(`${f.name} es demasiado grande (máx 50MB)`);
      return;
    }
    const allowed = ['pdf','doc','docx','sql','png','jpg','jpeg','gif','svg','webp','bmp','zip','rar','7z','txt','csv','xlsx','xls','pptx','ppt','mp4','mp3','wav','ogg'];
    const ext = f.name.split('.').pop().toLowerCase();
    if(!allowed.includes(ext)){
      showToast(`Tipo .${ext} no soportado`);
      return;
    }
  }
  const progId = document.getElementById('uploadProgress-unified') ? 'unified' : sid;
  showUploadProgress(progId, 0, 'Preparando...');
  targetWeek.archivos = targetWeek.archivos || [];
  const useStorage = isConfigured() && getClient();
  let idx = 0, done = 0, total = files.length;
  for(const f of files){
    const baseName = customName ? (files.length > 1 ? customName + ' ' + (++idx) : customName) : f.name;
    const ext = f.name.split('.').pop();
    const finalName = baseName + (baseName.endsWith('.' + ext) ? '' : '.' + ext);
    const entry = {
      id:'f'+Date.now()+Math.random().toString(36).substr(2,5),
      nombre: finalName,
      tamaño: formatSize(f.size),
      tipo: f.name.split('.').pop().toLowerCase(),
      url: '',
      storage_path: '',
      createdAt: new Date().toISOString()
    };
    if(useStorage){
      showUploadProgress(progId, Math.round(done/total*100), `${f.name} — subiendo...`);
      const result = await uploadFileToStorage(f, sid, p => {
        const overall = Math.round((done + p/100) / total * 100);
        showUploadProgress(progId, overall, `${f.name} — ${Math.round(p)}%`);
      });
      if(result){
        entry.url = result.url;
        entry.storage_path = result.storage_path;
      } else if(f.size < 10*1024*1024){
        showUploadProgress(progId, Math.round(done/total*100), `${f.name} — guardando local...`);
        await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => { entry.url = e.target.result; resolve(); };
          reader.readAsDataURL(f);
        });
      } else {
        showToast(`${f.name} no se pudo subir y es demasiado grande para local (máx 10MB)`);
        continue;
      }
    } else if(f.size < 10*1024*1024){
      showUploadProgress(progId, Math.round(done/total*100), `${f.name} — leyendo...`);
      await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => { entry.url = e.target.result; resolve(); };
        reader.readAsDataURL(f);
      });
    } else {
      showToast(`${f.name} es demasiado grande para almacenamiento local (máx 10MB)`);
      continue;
    }
    targetWeek.archivos.push(entry);
    done++;
    showUploadProgress(progId, Math.round(done/total*100), `${done}/${total} completado`);
  }
  showUploadProgress(progId, -1);
  saveData();
  renderAdminContent('files');
  renderUnit();
  showToast(`${files.length} archivo(s) subido(s)`);
};
window.deleteFile = async function(sid, fid){
  state.unidades.forEach(u=>{
    u.semanas.forEach(s=>{
      if(s.id===sid){
        s.archivos = (s.archivos||[]).filter(a=>a.id!==fid);
      }
    });
  });
  saveData();
  if (isConfigured() && getClient()) {
    await deleteArchivo(fid).catch(e => console.warn('[Supabase] error eliminando archivo:', e.message));
  }
  renderAdminContent('files');
  renderUnit();
  showToast('Archivo eliminado');
};
window.moveFile = function(fromSid, fid, toSid){
  if(!toSid) return;
  let fileObj = null;
  let fromWeek = null;
  state.unidades.forEach(u=>{
    u.semanas.forEach(s=>{
      if(s.id===fromSid){
        fromWeek = s;
        const idx = (s.archivos||[]).findIndex(a=>a.id===fid);
        if(idx>-1){ fileObj = s.archivos.splice(idx,1)[0]; }
      }
    });
  });
  if(!fileObj) return showToast('Archivo no encontrado');
  let toWeek = null;
  state.unidades.forEach(u=>u.semanas.forEach(s=>{if(s.id===toSid) toWeek=s}));
  if(!toWeek) return showToast('Semana destino no encontrada');
  toWeek.archivos = toWeek.archivos || [];
  toWeek.archivos.push(fileObj);
  saveData();
  renderAdminContent('files');
  showToast('Archivo movido');
};
window.setPodcast = function(ui, si, field, val){
  state.unidades[ui].semanas[si].podcast = state.unidades[ui].semanas[si].podcast || {url:'',nombre:''};
  state.unidades[ui].semanas[si].podcast[field] = val;
  saveData();
};
window.updatePodcastWeeks = function(){
  const unitIdx = parseInt(document.getElementById('podcastUnitSelect').value);
  const weekSelect = document.getElementById('podcastWeekSelect');
  const unit = state.unidades[unitIdx];
  if(!unit) return;
  weekSelect.innerHTML = unit.semanas.map((s,si)=>`<option value="${s.id}">S${si+1} - ${s.nombre}</option>`).join('');
};
window.handlePodcastDrop = function(e){
  const dt = e.dataTransfer;
  if(dt?.files?.length){
    for(const f of dt.files) addPendingPodcastFile(f);
  }
};
window._pendingPodcasts = [];
window.addPendingPodcastFile = function(file){
  if(!file) return;
  if(file.size > 50*1024*1024){ showToast(`${file.name} es demasiado grande (máx 50MB)`); return; }
  window._pendingPodcasts.push({file, customName:file.name.replace(/\.[^.]+$/,''), isLink:false, linkUrl:''});
  renderPendingPodcasts();
};
window.addPodcastLink = function(){
  const urlInput = document.getElementById('podcastLinkInput');
  const nameInput = document.getElementById('podcastLinkName');
  const url = urlInput?.value?.trim();
  if(!url){ showToast('Pega una URL primero'); return; }
  try { new URL(url); } catch(e){ showToast('URL no válida'); return; }
  const customName = nameInput?.value?.trim() || 'Podcast enlace';
  window._pendingPodcasts.push({file:null, customName, isLink:true, linkUrl:url});
  urlInput.value = '';
  nameInput.value = '';
  renderPendingPodcasts();
};
window.renderPendingPodcasts = function(){
  const list = document.getElementById('pendingPodcastList');
  if(!list) return;
  if(!window._pendingPodcasts.length){ list.style.display='none'; return; }
  list.style.display='block';
  list.innerHTML = window._pendingPodcasts.map((p,i)=>{
    if(p.isLink){
      return `
      <div class="pending-file-row pending-file-link">
        <div class="pending-file-icon link-icon"><i class="fas fa-link"></i></div>
        <div class="pending-file-info">
          <input class="pending-file-name" type="text" value="${p.customName}" onchange="window._pendingPodcasts[${i}].customName=this.value" placeholder="Nombre del podcast">
          <span class="pending-file-ext">.link</span>
          <span class="pending-file-size link-url-preview" title="${p.linkUrl}">${p.linkUrl.substring(0,40)}${p.linkUrl.length>40?'...':''}</span>
        </div>
        <button class="pending-file-remove" onclick="window._pendingPodcasts.splice(${i},1);renderPendingPodcasts()" title="Quitar"><i class="fas fa-xmark"></i></button>
      </div>`;
    }
    return `
    <div class="pending-file-row">
      <div class="pending-file-icon"><i class="fas fa-music"></i></div>
      <div class="pending-file-info">
        <input class="pending-file-name" type="text" value="${p.customName}" onchange="window._pendingPodcasts[${i}].customName=this.value" placeholder="Nombre del podcast">
        <span class="pending-file-ext">.${p.file.name.split('.').pop()}</span>
        <span class="pending-file-size">${formatSize(p.file.size)}</span>
      </div>
      <button class="pending-file-remove" onclick="window._pendingPodcasts.splice(${i},1);renderPendingPodcasts()" title="Quitar"><i class="fas fa-xmark"></i></button>
    </div>`;
  }).join('') + `
    <div class="pending-actions">
      <button class="pending-clear-btn" onclick="window._pendingPodcasts=[];renderPendingPodcasts();const fi=document.getElementById('fileInput-podcast');if(fi)fi.value=''"><i class="fas fa-trash"></i> Limpiar todo</button>
      <button class="pending-upload-btn podcast-upload-btn" onclick="uploadPendingPodcasts()"><i class="fas fa-cloud-arrow-up"></i> Subir ${window._pendingPodcasts.length} podcast(s)</button>
    </div>`;
};
window.uploadPendingPodcasts = async function(){
  if(!window._pendingPodcasts.length) return;
  const sid = document.getElementById('podcastWeekSelect')?.value;
  if(!sid){ showToast('Selecciona una semana primero'); return; }
  let targetWeek = null;
  state.unidades.forEach(u=>u.semanas.forEach(s=>{if(s.id===sid) targetWeek=s}));
  if(!targetWeek) return;
  const useStorage = isConfigured() && getClient();
  const progId = 'podcast';
  const total = window._pendingPodcasts.length;
  let done = 0;
  showUploadProgress(progId, 0, 'Preparando...');
  const successNames = [];
  for(const p of window._pendingPodcasts){
    const name = p.customName || 'Podcast';
    if(p.isLink){
      targetWeek.podcast = { url:p.linkUrl, nombre:name, tipo:'link' };
      successNames.push(name);
      done++;
      showUploadProgress(progId, Math.round(done/total*100), `${done}/${total} completado`);
      continue;
    }
    showUploadProgress(progId, Math.round(done/total*100), `${name} — subiendo...`);
    let url = '';
    let storage_path = '';
    if(useStorage){
      const result = await uploadPodcastToStorage(p.file, sid);
      if(result){ url = result.url; storage_path = result.storage_path || ''; }
    }
    if(!url){
      await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => { url = e.target.result; resolve(); };
        reader.readAsDataURL(p.file);
      });
    }
    targetWeek.podcast = { url, nombre:name, tipo:'file', storage_path };
    successNames.push(name);
    done++;
    showUploadProgress(progId, Math.round(done/total*100), `${done}/${total} completado`);
  }
  showUploadProgress(progId, -1);
  window._pendingPodcasts = [];
  const fi = document.getElementById('fileInput-podcast');
  if(fi) fi.value = '';
  renderPendingPodcasts();
  saveData();
  renderAdminContent('podcasts');
  renderUnit();
  showToast(`${successNames.length} podcast(s) subido(s) correctamente`);
  const msg = document.getElementById('podcastSuccessMsg');
  if(msg){
    msg.style.display='flex';
    msg.innerHTML = `<i class="fas fa-circle-check"></i> <span>${successNames.length} podcast(s) subido(s): ${successNames.join(', ')}</span>`;
    setTimeout(()=>{ if(msg) msg.style.display='none'; },5000);
  }
};
window.removePodcast = async function(ui, si){
  const semanaId = state.unidades[ui].semanas[si].id;
  state.unidades[ui].semanas[si].podcast = null;
  saveData();
  if (isConfigured() && getClient()) {
    await supabaseRemovePodcast(semanaId).catch(e => console.warn('[Supabase] error eliminando podcast:', e.message));
  }
  renderAdminContent('podcasts');
  renderUnit();
  showToast('Podcast eliminado');
};
window.saveAll = function(){
  saveData();
  renderUnit();
  renderTabs();
  const active = document.querySelector('.sidebar-item.active');
  if(active && active.getAttribute('onclick')){
    const m = active.getAttribute('onclick').match(/'([^']+)'/);
    if(m) renderAdminContent(m[1]);
  }
  showToast('Todos los cambios guardados');
};
window.addUnit = function(){
  const n = state.unidades.length + 1;
  const id = 'u' + (Date.now() % 10000);
  state.unidades.push({
    id, nombre: 'Unidad ' + n, descripcion: '', icon: 'fa-database',
    semanas: [
      {id: id + 's1', nombre: 'Semana 1', desc: ''}
    ]
  });
  saveData();
  renderAdminContent('content');
  renderUnit();
  renderTabs();
  showToast('Unidad añadida');
};
window.deleteUnit = function(ui){
  if(!confirm('¿Eliminar "' + state.unidades[ui].nombre + '" y todas sus semanas?')) return;
  state.unidades.splice(ui, 1);
  saveData();
  renderAdminContent('content');
  renderUnit();
  renderTabs();
  showToast('Unidad eliminada');
};
window.addWeek = function(ui){
  const u = state.unidades[ui];
  const n = u.semanas.length + 1;
  const id = u.id + 's' + n;
  u.semanas.push({id, nombre: 'Semana ' + n, desc: ''});
  saveData();
  renderAdminContent('content');
  renderUnit();
  showToast('Semana añadida');
};
window.deleteWeek = function(ui, si){
  if(!confirm('¿Eliminar "' + state.unidades[ui].semanas[si].nombre + '"?')) return;
  state.unidades[ui].semanas.splice(si, 1);
  saveData();
  renderAdminContent('content');
  renderUnit();
  showToast('Semana eliminada');
};
window.renameFile = function(sid, fid, newName){
  state.unidades.forEach(u=>{
    u.semanas.forEach(s=>{
      if(s.id===sid){
        const f = (s.archivos||[]).find(a=>a.id===fid);
        if(f) f.nombre = newName;
      }
    });
  });
  saveData();
  renderAdminContent('files');
  renderUnit();
};
window.addLink = function(sid){
  const title = document.getElementById('linkTitle-' + sid);
  const url = document.getElementById('linkUrl-' + sid);
  if(!title || !url || !title.value.trim() || !url.value.trim()) return showToast('Completa título y URL');
  if(!url.value.startsWith('http://') && !url.value.startsWith('https://')) return showToast('URL debe empezar con http:// o https://');
  const entry = {
    id: 'l' + Date.now() + Math.random().toString(36).substr(2,5),
    nombre: title.value.trim(),
    tamaño: 'link',
    tipo: 'link',
    url: url.value.trim()
  };
  state.unidades.forEach(u=>u.semanas.forEach(s=>{if(s.id===sid){s.archivos=s.archivos||[];s.archivos.push(entry)}}));
  title.value = ''; url.value = '';
  saveData();
  renderAdminContent('files');
  renderUnit();
  showToast('Link agregado');
};

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
function syntaxHighlight(sql){
  const kw = '\\b(?:SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|PROCEDURE|FUNCTION|TRIGGER|IF|ELSE|BEGIN|END|DECLARE|SET|RETURN|AS|IN|ON|AND|OR|NOT|NULL|IS|LIKE|BETWEEN|INNER|LEFT|RIGHT|FULL|OUTER|JOIN|CROSS|CASE|WHEN|THEN|ELSE|END|EXISTS|UNION|ALL|DISTINCT|TOP|ORDER|BY|ASC|DESC|GROUP|HAVING|WITH|CTE|RECURSIVE|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|CHECK|UNIQUE|IDENTITY|INT|VARCHAR|NVARCHAR|CHAR|TEXT|INTEGER|BIGINT|SMALLINT|TINYINT|DECIMAL|FLOAT|REAL|BIT|DATE|DATETIME|DATETIME2|TIMESTAMP|MONEY|COUNT|SUM|AVG|MAX|MIN|ROW_NUMBER|RANK|DENSE_RANK|NTILE|LAG|LEAD|FIRST_VALUE|LAST_VALUE|OVER|PARTITION|EXEC|EXECUTE|MERGE|WHEN|MATCHED|THEN|NOCOUNT|TRY|CATCH|THROW|ERROR_MESSAGE|ERROR_NUMBER|ERROR_LINE|ERROR_PROCEDURE|ERROR_SEVERITY|ERROR_STATE|TRANSACTION|COMMIT|ROLLBACK|SAVE|TRAN|GO|USE|SP_\\w+|INCLUDE|COALESCE|NULLIF|CAST|CONVERT|ISNULL|OFFSET|FETCH|NEXT|ROWS|ONLY|OUTPUT|INSERTED|DELETED)\\b';
  const funcs = '\\b(?:GETDATE|GETUTCDATE|SYSDATETIME|DATEADD|DATEDIFF|DATEPART|YEAR|MONTH|DAY|LEN|SUBSTRING|CHARINDEX|PATINDEX|REPLACE|UPPER|LOWER|TRIM|RTRIM|LTRIM|CONCAT|STRING_AGG|FORMAT|ABS|CEILING|FLOOR|ROUND|SQUARE|SQRT|POWER|RAND|NEWID|SCOPE_IDENTITY|@@IDENTITY|@@ROWCOUNT|OBJECT_ID|COL_LENGTH|DB_NAME)\\b';
  let h = escapeHtml(sql);
  h = h.replace(/(''|'[^']*')/g, '<span class="hl-string">$1</span>');
  h = h.replace(/(--[^\n]*)/g, '<span class="hl-comment">$1</span>');
  h = h.replace(/\/\*[\s\S]*?\*\//g, m => '<span class="hl-comment">' + m + '</span>');
  h = h.replace(new RegExp(kw, 'gi'), m => '<span class="hl-keyword">' + m.toUpperCase() + '</span>');
  h = h.replace(new RegExp(funcs, 'gi'), m => '<span class="hl-function">' + m.toUpperCase() + '</span>');
  h = h.replace(/(\b\d+(?:\.\d+)?\b)/g, '<span class="hl-number">$1</span>');
  return h;
}
function isSoundCloudUrl(url){
  return /^(https?:\/\/)?(www\.|on\.)?soundcloud\.com\//i.test(url);
}
function getSoundCloudEmbedUrl(url){
  return 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) + '&color=%2300f0ff&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false';
}
function formatSize(bytes){
  if(bytes<1024) return bytes+'B';
  if(bytes<1024*1024) return (bytes/1024).toFixed(1)+'KB';
  return (bytes/(1024*1024)).toFixed(1)+'MB';
}

// ============ PODCAST PLAYER ============
window.playPodcast = function(sid){
  let target = null;
  state.unidades.forEach(u=>u.semanas.forEach(s=>{if(s.id===sid) target=s}));
  if(!target || !target.podcast) return;
  const url = target.podcast.url;
  if(isSoundCloudUrl(url)){
    window.open(url, '_blank');
    return;
  }
  const audio = document.getElementById('audioElement');
  audio.src = url;
  document.getElementById('apTitle').textContent = target.podcast.nombre || 'Podcast';
  document.getElementById('apSub').textContent = target.nombre;
  document.getElementById('audioPlayer').classList.add('show');
  audio.play().catch(()=>{});
};
window.closeAudio = function(){
  const audio = document.getElementById('audioElement');
  audio.pause();
  document.getElementById('audioPlayer').classList.remove('show');
};

// ============ VINYL RECORD PLAYER ============
let vinylPlayers = {};

window.toggleVinylPlay = function(sid){
  const audio = document.getElementById('va-' + sid);
  if(!audio) return;
  
  // Stop any other vinyl players
  Object.keys(vinylPlayers).forEach(key => {
    if(key !== sid && vinylPlayers[key].playing){
      vinylPlayers[key].pause();
    }
  });

  if(!vinylPlayers[sid]){
    vinylPlayers[sid] = createVinylController(sid);
  }
  
  const player = vinylPlayers[sid];
  if(player.playing){
    player.pause();
  } else {
    player.play();
  }
};

function createVinylController(sid){
  const audio = document.getElementById('va-' + sid);
  const record = document.getElementById('vr-' + sid);
  const tonearm = document.getElementById('vta-' + sid);
  const playBtn = document.getElementById('vcPlay-' + sid);
  const fill = document.getElementById('vcFill-' + sid);
  const currTime = document.getElementById('vcCurr-' + sid);
  const totalTime = document.getElementById('vcTotal-' + sid);

  const controller = {
    playing: false,
    audio: audio,
    
    play(){
      this.playing = true;
      audio.play().catch(()=>{});
      if(record) record.classList.add('playing');
      if(tonearm) tonearm.classList.add('playing');
      if(playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    },
    
    pause(){
      this.playing = false;
      audio.pause();
      if(record) record.classList.remove('playing');
      if(tonearm) tonearm.classList.remove('playing');
      if(playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
  };

  audio.addEventListener('timeupdate', function(){
    if(!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    if(fill) fill.style.width = pct + '%';
    if(currTime) currTime.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener('loadedmetadata', function(){
    if(totalTime) totalTime.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('ended', function(){
    controller.pause();
    if(fill) fill.style.width = '0%';
    if(currTime) currTime.textContent = '0:00';
  });

  // Initialize total time if metadata already loaded
  if(audio.readyState >= 1 && audio.duration && isFinite(audio.duration)){
    if(totalTime) totalTime.textContent = formatTime(audio.duration);
  }

  return controller;
}

window.vinylSeek = function(e, sid){
  const bar = document.getElementById('vcBar-' + sid);
  const audio = document.getElementById('va-' + sid);
  if(!bar || !audio || !audio.duration) return;
  const rect = bar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.currentTime = pct * audio.duration;
};

function formatTime(seconds){
  if(!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + s.toString().padStart(2,'0');
}

// ============ DOWNLOAD FILE ============
window.viewFile = function(sid, fid){
  let target = null;
  state.unidades.forEach(u=>u.semanas.forEach(s=>{if(s.id===sid) target=s}));
  if(!target) return;
  const file = (target.archivos||[]).find(a=>a.id===fid);
  if(!file || !file.url) return showToast('El archivo no tiene contenido');
  showFileViewer(file.url, file.nombre, file.storage_path);
};
window.openFileTab = async function(sid, fid){
  let target = null;
  state.unidades.forEach(u=>u.semanas.forEach(s=>{if(s.id===sid) target=s}));
  if(!target) return;
  const file = (target.archivos||[]).find(a=>a.id===fid);
  if(!file || !file.url) return showToast('El archivo no tiene contenido');
  if(file.storage_path && isConfigured() && getClient()){
    try {
      const { data, error } = await getClient().storage.from('archivos').download(file.storage_path);
      if(error) throw error;
      const blobUrl = URL.createObjectURL(data);
      window.open(blobUrl, '_blank');
      return;
    } catch(e) {
      console.warn('[openFileTab] Error con storage, usando URL directa:', e.message);
    }
  }
  window.open(file.url, '_blank');
};

function showFileViewer(url, name, storagePath){
  const existing = document.getElementById('fileViewer');
  if(existing) existing.remove();
  const viewer = document.createElement('div');
  viewer.id = 'fileViewer';
  viewer.className = 'file-viewer-overlay';
  viewer.innerHTML = `
    <div class="file-viewer-box">
      <div class="file-viewer-header">
        <span class="file-viewer-title">${name}</span>
        <div class="file-viewer-actions">
          <button class="fv-btn" onclick="window.open('${url}','_blank')" title="Abrir en pestaña"><i class="fas fa-external-link-alt"></i></button>
          <button class="fv-btn fv-close" onclick="this.closest('#fileViewer').remove()" title="Cerrar"><i class="fas fa-xmark"></i></button>
        </div>
      </div>
      <div class="file-viewer-body" id="fvBody">
        <div class="fv-loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
      </div>
    </div>
  `;
  document.body.appendChild(viewer);
  viewer.addEventListener('click', e => { if(e.target === viewer) viewer.remove(); });

  const body = document.getElementById('fvBody');
  const ext = name.split('.').pop().toLowerCase();

  // ── Resolver URL efectiva ──────────────────────
  // Si hay storagePath, descargamos via Supabase client para evitar Content-Disposition: attachment
  async function resolveUrl() {
    if (url.startsWith('data:')) return url;
    if (storagePath && isConfigured() && getClient()) {
      try {
        const { data, error } = await getClient().storage.from('archivos').download(storagePath);
        if (error) throw error;
        return URL.createObjectURL(data);
      } catch (e) {
        console.warn('[Viewer] Error descargando de storage, usando URL directa:', e.message);
        return url;
      }
    }
    return url;
  }

  // ── Renderizar según tipo ──────────────────────
  resolveUrl().then(effectiveUrl => {
    if (url.startsWith('data:') || effectiveUrl !== url) {
      renderFromUrl(effectiveUrl, ext, name, body);
    } else {
      renderFromUrl(url, ext, name, body);
    }
  });
}

function renderFromUrl(effectiveUrl, ext, name, body){
  const isBlob = effectiveUrl.startsWith('blob:');

  if (/^(png|jpg|jpeg|gif|svg|webp|bmp)$/i.test(ext)) {
    body.innerHTML = `<img src="${effectiveUrl}" class="fv-image" alt="${name}">`;
  } else if (/^(mp4|webm)$/i.test(ext)) {
    body.innerHTML = `<video src="${effectiveUrl}" class="fv-video" controls autoplay></video>`;
  } else if (/^(mp3|wav|ogg|m4a|flac)$/i.test(ext)) {
    body.innerHTML = `<audio src="${effectiveUrl}" class="fv-audio" controls autoplay></audio>`;
  } else if (/^(pdf)$/i.test(ext)) {
    body.innerHTML = `<iframe src="${effectiveUrl}" class="fv-iframe"></iframe>`;
  } else if (/^(txt|sql|js|ts|html|css|md|log|csv|xml|json)$/i.test(ext)) {
    if (isBlob || effectiveUrl.startsWith('data:')) {
      // Leer contenido como texto y mostrar como código
      fetch(effectiveUrl)
        .then(r => r.text())
        .then(code => {
          const lang = ext === 'sql' ? 'sql' : ['js','ts'].includes(ext) ? 'javascript' : ext;
          const highlighted = ext === 'sql' ? syntaxHighlight(code) : escapeHtml(code);
          body.innerHTML = `<pre class="fv-code"><code class="language-${lang}">${highlighted}</code></pre>`;
        })
        .catch(() => {
          body.innerHTML = `<iframe src="${effectiveUrl}" class="fv-iframe"></iframe>`;
        });
    } else {
      // URL remota directa (sin storage) – intentamos fetch
      body.innerHTML = `<div class="fv-loading"><i class="fas fa-spinner fa-spin"></i> Cargando contenido...</div>`;
      fetch(effectiveUrl)
        .then(r => { if(!r.ok) throw Error('HTTP '+r.status); return r.text(); })
        .then(code => {
          const lang = ext === 'sql' ? 'sql' : ['js','ts'].includes(ext) ? 'javascript' : ext;
          const highlighted = ext === 'sql' ? syntaxHighlight(code) : escapeHtml(code);
          body.innerHTML = `<pre class="fv-code"><code class="language-${lang}">${highlighted}</code></pre>`;
        })
        .catch(() => {
          body.innerHTML = `<iframe src="${effectiveUrl}" class="fv-iframe"></iframe>`;
        });
    }
  } else {
    body.innerHTML = `<div class="fv-unavailable"><i class="fas fa-file"></i><p>Vista previa no disponible para este tipo de archivo.</p><button class="btn-save" onclick="window.open('${effectiveUrl}','_blank')" style="margin-top:16px"><i class="fas fa-download"></i> Descargar</button></div>`;
  }
}

window.downloadFile = function(sid, fid){
  let target = null;
  state.unidades.forEach(u=>u.semanas.forEach(s=>{if(s.id===sid) target=s}));
  if(!target) return;
  const file = (target.archivos||[]).find(a=>a.id===fid);
  if(!file) return;
  showToast(`Iniciando descarga: ${file.nombre}`);
  const a = document.createElement('a');
  a.download = file.nombre;
  a.href = file.url || '#';
  if(file.url && file.url.startsWith('data:')){
    a.click();
  }else if(file.url){
    a.click();
  }else{
    showToast('El archivo no tiene contenido asociado (solo metadatos).');
  }
};

// ============ TOAST ============
function showToast(msg){
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(()=>t.classList.remove('show'), 2800);
}

// ============ INIT ============
renderTabs();
renderUnit();

// Drag & drop en upload zones
document.addEventListener('dragover', e=>{
  e.preventDefault();
  const z = e.target.closest('.upload-zone');
  if(z) z.classList.add('drag');
});
document.addEventListener('dragleave', e=>{
  const z = e.target.closest('.upload-zone');
  if(z) z.classList.remove('drag');
});
document.addEventListener('drop', e=>{
  e.preventDefault();
  const z = e.target.closest('.upload-zone');
  if(z){
    z.classList.remove('drag');
    if(e.dataTransfer.files.length){
      if(z.id === 'uploadZone-podcast'){
        for(const f of e.dataTransfer.files) addPendingPodcastFile(f);
      } else {
        addPendingFiles(e.dataTransfer.files);
      }
    }
  }
});

// Conteo animado
const countObs = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting && e.target.dataset.count){
      const target = parseInt(e.target.dataset.count);
      let cur = 0;
      const step = Math.max(1, Math.floor(target/30));
      const tick = ()=>{
        cur += step;
        if(cur>=target){ e.target.textContent = target; }
        else { e.target.textContent = cur; requestAnimationFrame(tick); }
      };
      tick();
      countObs.unobserve(e.target);
    }
  });
});
document.querySelectorAll('[data-count]').forEach(el=>countObs.observe(el));

// ============ FLOATING 3D JOURNEY ============
(function(){
  const el = document.getElementById('float3d');
  if(!el) return;
  const rings = el.querySelectorAll('.float-3d-ring');

  const waypoints = [
    { t:0.00, x:75, y:45, rx:0, ry:0, rz:0, sc:0.2, op:0 },
    { t:0.03, x:80, y:48, rx:45, ry:-30, rz:15, sc:0.5, op:0.7 },
    { t:0.07, x:85, y:50, rx:15, ry:20, rz:-5, sc:0.9, op:1 },
    { t:0.14, x:82, y:55, rx:-10, ry:10, rz:8, sc:1, op:1 },
    { t:0.22, x:78, y:60, rx:20, ry:-15, rz:-10, sc:0.95, op:0.9 },
    { t:0.32, x:75, y:68, rx:-5, ry:25, rz:5, sc:1, op:0.85 },
    { t:0.42, x:72, y:75, rx:15, ry:-10, rz:-8, sc:0.9, op:0.8 },
    { t:0.50, x:68, y:80, rx:0, ry:0, rz:0, sc:0.85, op:0.75 },
    { t:0.60, x:65, y:85, rx:-20, ry:15, rz:10, sc:0.8, op:0.7 },
    { t:0.72, x:60, y:88, rx:10, ry:-20, rz:-5, sc:0.7, op:0.55 },
    { t:0.82, x:55, y:90, rx:-30, ry:10, rz:-15, sc:0.55, op:0.4 },
    { t:0.90, x:48, y:92, rx:-50, ry:20, rz:-20, sc:0.35, op:0.2 },
    { t:0.96, x:40, y:95, rx:-70, ry:-10, rz:-30, sc:0.2, op:0.08 },
    { t:1.00, x:30, y:98, rx:-90, ry:0, rz:0, sc:0.1, op:0 },
  ];

  if(window.innerWidth<768) waypoints.forEach(w=>{w.sc*=0.6;w.x-=10});

  function lerp(a,b,t){return a+(b-a)*t}
  function ease(t){return t<0.5?2*t*t:-1+(4-2*t)*t}

  function getWp(prog){
    for(let i=0;i<waypoints.length-1;i++){
      const a=waypoints[i],b=waypoints[i+1];
      if(prog>=a.t&&prog<=b.t){
        const p=ease((prog-a.t)/(b.t-a.t));
        return {
          x:lerp(a.x,b.x,p),y:lerp(a.y,b.y,p),
          rx:lerp(a.rx,b.rx,p),ry:lerp(a.ry,b.ry,p),rz:lerp(a.rz,b.rz,p),
          sc:lerp(a.sc,b.sc,p),op:lerp(a.op,b.op,p)
        };
      }
    }
    const l=waypoints[waypoints.length-1];
    return{x:l.x,y:l.y,rx:l.rx,ry:l.ry,rz:l.rz,sc:l.sc,op:l.op};
  }

  let ticking=false;
  window.addEventListener('scroll',()=>{
    if(!ticking){
      requestAnimationFrame(()=>{
        const h=document.documentElement.scrollHeight-window.innerHeight;
        const prog=h>0?Math.min(1,window.scrollY/h):0;
        const wp=getWp(prog);
        el.style.opacity=wp.op;
        el.style.transform=`translate(${wp.x}vw,${wp.y}vh) rotateX(${wp.rx}deg) rotateY(${wp.ry}deg) rotateZ(${wp.rz}deg) scale(${wp.sc})`;
        const hue=120+prog*240;
        const col=`hsl(${hue},100%,60%)`;
        el.style.filter=`drop-shadow(0 0 20px ${col})`;
        rings.forEach((r,i)=>{
          r.style.borderColor=`hsla(${hue+i*40},100%,60%,${0.08+prog*0.12})`;
        });
        ticking=false;
      });
      ticking=true;
    }
  });
  window.dispatchEvent(new Event('scroll'));
})();

// ============ PARALLAX SECTIONS ============
(function(){
  const sections=document.querySelectorAll('section');
  if(window.matchMedia('(prefers-reduced-motion:reduce)').matches||window.innerWidth<768) return;
  let ticking=false;
  window.addEventListener('scroll',()=>{
    if(!ticking){
      requestAnimationFrame(()=>{
        const sy=window.scrollY;
        sections.forEach((s,i)=>{
          const rect=s.getBoundingClientRect();
          if(rect.bottom>0&&rect.top<window.innerHeight){
            const speed=0.04+(i%3)*0.02;
            s.style.backgroundPositionY=sy*speed+'px';
          }
        });
        ticking=false;
      });
      ticking=true;
    }
  });
})();

// ============ SECTION TRANSITIONS ============
(function(){
  const sections = document.querySelectorAll('section');
  const indicator = document.getElementById('sectionIndicator');
  const scCurrent = document.getElementById('scCurrent');
  const scTotal = document.getElementById('scTotal');
  if (!indicator || !scCurrent || !scTotal) return;
  const cosmic = document.querySelector('.cosmic-bg');
  const navLinks = document.querySelectorAll('.nav-link');
  const sectionNames = ['Inicio', 'Curso', 'Perfil', 'Repositorio'];
  const sectionColors = [
    ['rgba(0,240,255,0.15)', 'rgba(176,38,255,0.18)', 'rgba(3,0,20,1)'],
    ['rgba(176,38,255,0.18)', 'rgba(255,46,147,0.12)', 'rgba(7,2,32,1)'],
    ['rgba(255,46,147,0.12)', 'rgba(0,240,255,0.1)', 'rgba(3,0,20,1)'],
    ['rgba(0,240,255,0.1)', 'rgba(157,255,60,0.08)', 'rgba(13,5,48,1)'],
  ];

  scTotal.textContent = String(sections.length).padStart(2,'0');

  sections.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'section-dot' + (i===0?' active':'');
    dot.innerHTML = `<span class="dot-label">${sectionNames[i]||'Sección'}</span>`;
    dot.addEventListener('click', () => {
      sections[i].scrollIntoView({ behavior: 'smooth' });
    });
    dot.style.cursor = 'pointer';
    dot.style.pointerEvents = 'auto';
    indicator.appendChild(dot);
  });

  let currentIdx = 0;

  function updateSection(entries) {
    let maxVisible = 0;
    let maxIdx = 0;
    entries.forEach(entry => {
      if (entry.intersectionRatio > maxVisible) {
        maxVisible = entry.intersectionRatio;
        maxIdx = Array.from(sections).indexOf(entry.target);
      }
    });
    if (currentIdx !== maxIdx && maxVisible > 0) {
      currentIdx = maxIdx;
      applySection(currentIdx);
    }
  }

  function applySection(idx) {
    document.querySelectorAll('.section-dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });
    scCurrent.textContent = String(idx + 1).padStart(2, '0');
    navLinks.forEach((l, i) => {
      l.style.color = i === idx ? 'var(--cyan)' : '';
    });
    const c = sectionColors[idx % sectionColors.length];
    if (cosmic) cosmic.style.background = `
      radial-gradient(ellipse at 20% 10%, ${c[0]} 0%, transparent 50%),
      radial-gradient(ellipse at 80% 30%, ${c[1]} 0%, transparent 50%),
      radial-gradient(ellipse at 50% 90%, ${c[2]} 0%, transparent 55%),
      linear-gradient(180deg, var(--bg-0) 0%, var(--bg-1) 50%, var(--bg-0) 100%)
    `;
    sections.forEach((s, i) => s.classList.toggle('active-section', i === idx));
  }

  const obs = new IntersectionObserver(updateSection, {
    threshold: [0, 0.2, 0.4, 0.6, 0.8, 1]
  });
  sections.forEach(s => obs.observe(s));

  window.addEventListener('load', () => {
    setTimeout(() => applySection(0), 100);
  });
})();

// ============ STAGGER ENHANCE ============
(function(){
  const cards=document.querySelectorAll('.week-card,.unit-tab,.stat,.profile-tag');
  cards.forEach((c,i)=>{
    c.style.setProperty('--i',i);
    if(c.classList.contains('reveal')) return;
    c.style.transitionDelay=(i*0.04)+'s';
  });
})();

// ============ GLOW CARD EFFECT ============
const GLOW_SELECTORS = '.week-card,.unit-tab,.unit-header,.admin-unit-card,.dash-card,.dash-unit-row,.dash-week-row,.dash-week-file,.storage-item,.storage-type-badge,.admin-week,.wm-file-card,.wm-file,.desc-visual,.meta-item,.profile-tag,.stat-row,.resource,.upload-zone,.podcast-upload,.afile';

function initGlowCards(){
  const cards = document.querySelectorAll(GLOW_SELECTORS);
  cards.forEach(card => {
    if(card.hasAttribute('data-glow-init')) return;
    card.setAttribute('data-glow-init','');
    card.setAttribute('data-glow','');
    // Add inner glow element if not already present
    if(!card.querySelector(':scope > [data-glow]')){
      const inner = document.createElement('div');
      inner.setAttribute('data-glow','');
      card.prepend(inner);
    }
  });
}

// Global pointer tracker for glow
(function(){
  let glowActive = false;
  document.addEventListener('pointermove', e => {
    if(document.getElementById('adminPanel')?.classList.contains('show')) return;
    const cards = document.querySelectorAll('[data-glow]');
    if(cards.length === 0) return;
    glowActive = true;
    const x = e.clientX.toFixed(2);
    const y = e.clientY.toFixed(2);
    const xp = (e.clientX / window.innerWidth).toFixed(2);
    const yp = (e.clientY / window.innerHeight).toFixed(2);
    cards.forEach(c => {
      c.style.setProperty('--x', x);
      c.style.setProperty('--y', y);
      c.style.setProperty('--xp', xp);
      c.style.setProperty('--yp', yp);
    });
  });
})();

// Init glow on static cards
initGlowCards();

// Re-init glow after dynamic renders
function reinitGlow(){
  setTimeout(initGlowCards, 50);
}

// Patch render functions to skip when admin panel is open
const origRenderUnit = renderUnit;
renderUnit = function(...args){
  if(document.getElementById('adminPanel')?.classList.contains('show')) return;
  origRenderUnit.apply(this, args);
  reinitGlow();
};

const origRenderTabs = renderTabs;
renderTabs = function(...args){
  if(document.getElementById('adminPanel')?.classList.contains('show')) return;
  origRenderTabs.apply(this, args);
  reinitGlow();
};

const origRenderAdminContent = renderAdminContent;
renderAdminContent = function(page){
  origRenderAdminContent.apply(this, arguments);
  reinitGlow();
};

const _origOpenModal = window.openWeekModal;
window.openWeekModal = function(unitIdx, weekIdx){
  _origOpenModal(unitIdx, weekIdx);
  reinitGlow();
};



// ============ AURORA BACKGROUND (canvas 2D) ============
(function(){
  const canvas = document.getElementById('auroraCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, auroraRAF = null;

  function resize(){
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = W;
    canvas.height = H;
  }
  resize();
  window.addEventListener('resize', resize);

  let t = 0;
  const colors = [
    [0, 180, 255],
    [100, 80, 255],
    [180, 50, 255],
    [255, 46, 147],
  ];

  function drawBlob(cx, cy, radius, color, alpha, stretch){
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${alpha})`);
    grad.addColorStop(0.4, `rgba(${color[0]},${color[1]},${color[2]},${alpha*0.3})`);
    grad.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(stretch, 1);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function draw(){
    t += 0.004;
    ctx.clearRect(0, 0, W, H);

    const layers = 6;
    for(let i=0; i<layers; i++){
      const speed = 0.3 + i*0.08;
      const ampX = W * (0.15 + i*0.04);
      const ampY = H * 0.12;
      const cx = W/2 + Math.sin(t*speed + i*1.8) * ampX;
      const cy = H * (0.35 + i*0.05) + Math.cos(t*speed*0.7 + i*2.3) * ampY;
      const radius = 180 + i*40 + Math.sin(t*0.5 + i)*30;
      const col = colors[i % colors.length];
      const alpha = 0.08 + i*0.015;
      const stretch = 1.8 + Math.sin(t*0.3 + i*0.7)*0.4;
      drawBlob(cx, cy, radius, col, alpha, stretch);
    }

    for(let i=0; i<3; i++){
      const cx = W/2 + Math.sin(t*0.5 + i*2.0) * W*0.25;
      const cy = H*0.45 + Math.sin(t*0.4 + i*2.5) * H*0.08;
      drawBlob(cx, cy, 200+i*50, colors[i+1], 0.06, 2.5);
    }

    auroraRAF = requestAnimationFrame(draw);
  }
  draw();

  window.stopAurora = function(){ if(auroraRAF){ cancelAnimationFrame(auroraRAF); auroraRAF=null; } };
  window.resumeAurora = function(){ if(!auroraRAF) draw(); };
})();