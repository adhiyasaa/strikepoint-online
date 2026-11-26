import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const $=id=>document.getElementById(id);
let socket,scene,camera,renderer,clock,playerId,team,roomCode,players=new Map(),keys={},yaw=0,pitch=0,velY=0,hp=100,locked=false,lastSend=0,gun,gunKick=0;
const colliders=[];
function mat(c,rough=.85){return new THREE.MeshStandardMaterial({color:c,roughness:rough});}
function box(x,y,z,sx,sy,sz,m,collide=true){const o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);scene.add(o);if(collide)colliders.push({x,z,hx:sx/2,hz:sz/2,sy});return o;}
function buildMap(){
 scene.background=new THREE.Color(0x82939b);scene.fog=new THREE.Fog(0x82939b,45,105);
 scene.add(new THREE.HemisphereLight(0xc9e1ec,0x343c40,2));
 const sun=new THREE.DirectionalLight(0xffe2bd,2.2);sun.position.set(-25,40,20);scene.add(sun);
 const ground=box(0,-.35,0,110,.7,110,mat(0x4b5554),false);
 const grid=new THREE.GridHelper(110,55,0x687574,0x596361);grid.position.y=.02;scene.add(grid);
 const concrete=mat(0x77817e),dark=mat(0x303b3d),sand=mat(0xa18d70),blue=mat(0x294c5a),rust=mat(0x74513d);
 // perimeter walls
 box(0,3,-53,110,6,2,dark);box(0,3,53,110,6,2,dark);box(-53,3,0,2,6,110,dark);box(53,3,0,2,6,110,dark);
 // central long warehouse and lanes
 box(0,2,-17,25,4,2,concrete);box(0,2,17,25,4,2,concrete);
 box(-13,2,0,2,4,34,concrete);box(13,2,0,2,4,34,concrete);
 // containers / cover
 for(const [x,z,c] of [[-27,-25,blue],[-27,-12,rust],[-27,15,blue],[-27,28,rust],[27,-25,rust],[27,-12,blue],[27,15,rust],[27,28,blue],[-5,-34,blue],[7,34,rust],[0,0,sand]]){
  box(x,1.5,z,9,3,5,c);
  box(x,3.12,z,9.2,.18,5.2,dark,false);
 }
 // crates, barriers, pipes
 for(let x=-38;x<=38;x+=19){for(let z of [-39,39]){box(x,1,z,5,2,3,sand);}}
 for(const [x,z,rot] of [[-20,0,0],[20,0,0],[-7,-7,.3],[8,8,-.3],[-39,2,0],[39,-2,0]]){
  const b=box(x,.65,z,8,1.3,1.1,concrete);b.rotation.y=rot;
 }
 // industrial poles and lamps
 for(const x of [-45,45])for(const z of [-40,0,40]){box(x,5,z,.45,10,.45,dark,false);const l=new THREE.PointLight(0xffd9a0,1,18);l.position.set(x,8,z);scene.add(l);}
}
function makePlayer(id,data){
 const group=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.38,.8,4,8),mat(data.team==='blue'?0x258ac0:0xb83d38));body.position.y=1.05;group.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,10),mat(0xc4a58c));head.position.y=1.75;group.add(head);
 const visor=new THREE.Mesh(new THREE.BoxGeometry(.38,.1,.12),mat(0x17252c));visor.position.set(0,1.78,-.19);group.add(visor);
 const gunMesh=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.75),mat(0x20272a));gunMesh.position.set(.35,1.25,-.35);group.add(gunMesh);
 scene.add(group);return group;
}
function setup(){
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(78,innerWidth/innerHeight,.08,180);camera.position.set(-12,1.7,0);
 renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=false;renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.appendChild(renderer.domElement);
 buildMap();clock=new THREE.Clock();
}
function join(){
 roomCode=$('room').value.trim().toUpperCase()||'PUBLIC';$('menu').style.display='none';$('hud').style.display='block';$('roomLabel').textContent='// '+roomCode;
 setup();socket=io({transports:['websocket','polling']});
 socket.on('connect',()=>socket.emit('join',{name:$('name').value||'Operator',room:roomCode}));
 socket.on('joined',d=>{playerId=d.id;team=d.team;camera.position.set(team==='blue'?-12:12,1.7,0);yaw=team==='blue'?0:Math.PI;lock();});
 socket.on('state',list=>{for(const p of list){if(p.id===playerId){hp=p.hp;$('hp').textContent=hp;continue;}let entry=players.get(p.id);if(!entry){entry={mesh:makePlayer(p.id,p),data:p};players.set(p.id,entry);}entry.data=p;entry.mesh.position.set(p.x,0,p.z);entry.mesh.rotation.y=p.yaw;entry.mesh.visible=p.alive;}for(const [id,e] of players)if(!list.some(p=>p.id===id)){scene.remove(e.mesh);players.delete(id);}renderScore(list);});
 socket.on('playerMove',d=>{const e=players.get(d.id);if(e){e.mesh.position.set(d.x,0,d.z);e.mesh.rotation.y=d.yaw;}});
 socket.on('respawn',d=>{camera.position.set(d.x,d.y,d.z);hp=100;$('hp').textContent=100;});
 socket.on('feed',d=>{const el=document.createElement('div');el.className='feeditem';el.textContent=d.text;$('feed').prepend(el);setTimeout(()=>el.remove(),4000);});
 socket.on('hitmarker',d=>{if(d.shooter===playerId){$('toast').textContent='✕ HIT';setTimeout(()=>$('toast').textContent='',250);}});
}
function renderScore(list){const rows=list.sort((a,b)=>b.kills-a.kills).map(p=>`<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:${p.team==='blue'?'#62c8ff':'#ff7770'}">${p.name}</span><b>${p.kills} / ${p.deaths}</b></div>`).join('');$('score').innerHTML='<div class="small" style="margin-bottom:7px">K / D — SCOREBOARD</div>'+rows;}
function lock(){renderer.domElement.requestPointerLock?.();}
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;$('overlay').style.display=locked?'none':'flex';});
document.addEventListener('mousemove',e=>{if(!locked)return;yaw-=e.movementX*.0022;pitch-=e.movementY*.0022;pitch=Math.max(-1.25,Math.min(1.25,pitch));});
document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space')e.preventDefault();});
document.addEventListener('keyup',e=>keys[e.code]=false);
document.addEventListener('mousedown',e=>{if(e.button===0&&locked&&socket){socket.emit('shoot',{});gunKick=.12;}});
$('join').onclick=join;$('resume').onclick=lock;
function blocked(x,z){for(const c of colliders){if(Math.abs(x-c.x)<c.hx+.42&&Math.abs(z-c.z)<c.hz+.42)return true;}return false;}
function animate(){
 requestAnimationFrame(animate);if(!renderer)return;const dt=Math.min(clock.getDelta(),.04);
 if(locked&&playerId){
  const speed=(keys.ShiftLeft?12:7)*dt;let f=(keys.KeyW?1:0)-(keys.KeyS?1:0),s=(keys.KeyD?1:0)-(keys.KeyA?1:0);
  const len=Math.hypot(f,s)||1;f/=len;s/=len;
  const dx=(Math.sin(yaw)*f+Math.cos(yaw)*s)*speed,dz=(-Math.cos(yaw)*f+Math.sin(yaw)*s)*speed;
  let nx=camera.position.x+dx,nz=camera.position.z+dz;
  if(!blocked(nx,camera.position.z))camera.position.x=nx;if(!blocked(camera.position.x,nz))camera.position.z=nz;
  if(keys.Space&&camera.position.y<=1.71)velY=6.5;velY-=18*dt;camera.position.y+=velY*dt;if(camera.position.y<1.7){camera.position.y=1.7;velY=0;}
  camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;
  const now=performance.now();if(now-lastSend>45){socket.emit('move',{x:camera.position.x,y:camera.position.y,z:camera.position.z,yaw,pitch});lastSend=now;}
 }
 renderer.render(scene,camera);
}
addEventListener('resize',()=>{if(camera){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));}});
animate();