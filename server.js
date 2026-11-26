const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, pingInterval: 10000, pingTimeout: 20000 });
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_,res)=>res.json({ok:true, game:"StrikePoint"}));

const players = new Map();
const rooms = new Map();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function roomState(room) {
  return [...players.values()].filter(p=>p.room===room).map(({id,name,team,x,y,z,yaw,pitch,hp,kills,deaths,alive})=>({id,name,team,x,y,z,yaw,pitch,hp,kills,deaths,alive}));
}
function broadcastRoom(room) { io.to(room).emit("state", roomState(room)); }
io.on("connection", socket=>{
  socket.on("join", data=>{
    const name=String(data?.name||"Player").slice(0,16).replace(/[<>]/g,"");
    const room=String(data?.room||"PUBLIC").toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,12)||"PUBLIC";
    const team=[...players.values()].filter(p=>p.room===room).filter(p=>p.team==="blue").length <= [...players.values()].filter(p=>p.room===room).filter(p=>p.team==="red").length ? "blue":"red";
    const p={id:socket.id,name,room,team,x:team==="blue"?-12:12,y:1.7,z:(Math.random()-.5)*5,yaw:team==="blue"?0:Math.PI,hp:100,kills:0,deaths:0,alive:true,lastShot:0,lastMove:Date.now()};
    players.set(socket.id,p); socket.join(room); socket.emit("joined",{id:socket.id,room,team}); broadcastRoom(room);
    socket.to(room).emit("feed",{text:`${name} joined ${room}`});
  });
  socket.on("move", d=>{
    const p=players.get(socket.id); if(!p||!p.alive)return;
    const now=Date.now(); if(now-p.lastMove<12)return; p.lastMove=now;
    p.x=clamp(Number(d.x)||0,-48,48); p.y=clamp(Number(d.y)||1.7,1.2,5); p.z=clamp(Number(d.z)||0,-48,48);
    p.yaw=Number(d.yaw)||0; p.pitch=clamp(Number(d.pitch)||0,-1.45,1.45);
    socket.to(p.room).emit("playerMove",{id:p.id,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch});
  });
  socket.on("shoot", d=>{
    const p=players.get(socket.id); if(!p||!p.alive)return;
    const now=Date.now(); if(now-p.lastShot<115)return; p.lastShot=now;
    const ox=p.x, oy=p.y-.12, oz=p.z;
    const dx=Math.sin(p.yaw)*Math.cos(p.pitch), dy=-Math.sin(p.pitch), dz=-Math.cos(p.yaw)*Math.cos(p.pitch);
    let hit=null, best=42;
    for(const q of players.values()){
      if(q.room!==p.room||q.id===p.id||q.team===p.team||!q.alive)continue;
      const vx=q.x-ox, vy=(q.y-.35)-oy, vz=q.z-oz;
      const t=vx*dx+vy*dy+vz*dz; if(t<0||t>best)continue;
      const dist=Math.sqrt((vx-dx*t)**2+(vy-dy*t)**2+(vz-dz*t)**2);
      if(dist<0.85){best=t;hit=q;}
    }
    if(hit){
      hit.hp-=34;
      io.to(p.room).emit("hitmarker",{shooter:p.id,target:hit.id,damage:34});
      if(hit.hp<=0){hit.hp=0;hit.alive=false;p.kills++;hit.deaths++;io.to(p.room).emit("feed",{text:`${p.name} eliminated ${hit.name}`});
        setTimeout(()=>{const current=players.get(hit.id);if(current){current.hp=100;current.alive=true;current.x=current.team==="blue"?-12:12;current.y=1.7;current.z=(Math.random()-.5)*5;io.to(current.id).emit("respawn",{x:current.x,y:current.y,z:current.z});broadcastRoom(current.room);}},3000);
      }
      broadcastRoom(p.room);
    }
  });
  socket.on("disconnect",()=>{const p=players.get(socket.id);if(p){players.delete(socket.id);broadcastRoom(p.room);}});
});
const PORT=process.env.PORT||3000;
server.listen(PORT,"0.0.0.0",()=>console.log(`StrikePoint running on ${PORT}`));