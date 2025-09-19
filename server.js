// Z-Code Full App (All in One)
// Run: node server.js
// Deploy: Push to GitHub, connect to Render

const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let users = {};   // username -> { username, avatar, points, chats }
let admins = { admin: { password: "admin123" } };
let sockets = {}; // username -> ws

// Serve Homepage
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Z-Code</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin:0; font-family:Poppins, sans-serif; color:white; text-align:center;
      background:linear-gradient(270deg,#00f,#ff00ff,#00ffea);
      background-size:600% 600%; animation:gradient 12s ease infinite; }
    @keyframes gradient {0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    input,select,button{padding:10px;margin:5px;border:none;border-radius:8px}
    button{cursor:pointer;background:#ff00ff;color:white}
  </style>
</head>
<body>
  <h1>Z-Code</h1>
  <p>GenZ All-in-One Social Media</p>
  <input id="username" placeholder="Enter username">
  <select id="avatar">
    <option value="😎">😎</option>
    <option value="🤖">🤖</option>
    <option value="🎶">🎶</option>
    <option value="🔥">🔥</option>
    <option value="❤️">❤️</option>
  </select>
  <button onclick="login()">Enter</button>
  <p><a href="/admin">Admin Login</a></p>
<script>
  async function login(){
    const username=document.getElementById("username").value;
    const avatar=document.getElementById("avatar").value;
    const res=await fetch("/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,avatar})});
    const user=await res.json();
    localStorage.setItem("user",JSON.stringify(user));
    window.location="/app";
  }
</script>
</body>
</html>
  `);
});

// App Page
app.get("/app", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Z-Code App</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{margin:0;font-family:Poppins,sans-serif;color:#eee;background:linear-gradient(270deg,#111,#222,#333);text-align:center}
    header{padding:10px;background:#ff00ff;color:white}
    .container{display:flex;justify-content:space-around;flex-wrap:wrap;margin:20px}
    .box{background:rgba(255,255,255,0.1);padding:15px;border-radius:10px;width:30%;min-width:250px}
    #chatBox{height:200px;overflow-y:auto;background:black;color:lime;padding:5px;text-align:left}
    input,button{padding:10px;margin:5px;border:none;border-radius:8px}
    button{cursor:pointer;background:#ff00ff;color:white}
  </style>
</head>
<body>
  <header>
    <h1>Z-Code</h1>
    <p id="profile"></p>
  </header>
  <div class="container">
    <div class="box">
      <h3>Users</h3>
      <div id="userList"></div>
    </div>
    <div class="box">
      <h3>Chat</h3>
      <div id="chatBox"></div>
      <input id="chatInput" placeholder="Message...">
      <button onclick="sendMsg()">Send</button>
    </div>
    <div class="box">
      <h3>Your Progress</h3>
      <p id="progressBar">0 / 100</p>
    </div>
  </div>
<script>
  let socket; let currentUser; let chattingWith;

  window.onload=async()=>{
    currentUser=JSON.parse(localStorage.getItem("user"));
    if(!currentUser){window.location="/";return;}
    document.getElementById("profile").innerText=\`\${currentUser.avatar} \${currentUser.username}\`;

    socket=new WebSocket("ws://"+window.location.host);
    socket.onopen=()=>{socket.send(JSON.stringify({type:"register",username:currentUser.username}));};
    socket.onmessage=(msg)=>{
      const data=JSON.parse(msg.data);
      if(data.type==="chat"){
        document.getElementById("chatBox").innerHTML+=\`<p><b>\${data.chat.from}:</b> \${data.chat.text}</p>\`;
      }
    };
    loadUsers(); loadProgress();
  };

  async function loadUsers(){
    const res=await fetch("/users"); const users=await res.json();
    document.getElementById("userList").innerHTML=users.map(u=>\`<p onclick="chatWith('\${u.username}')">\${u.avatar} \${u.username}</p>\`).join("");
  }

  function chatWith(user){chattingWith=user;document.getElementById("chatBox").innerHTML=\`<p>Chatting with \${user}</p>\`;}
  function sendMsg(){
    const text=document.getElementById("chatInput").value;
    if(!chattingWith)return alert("Select a user first");
    socket.send(JSON.stringify({type:"chat",from:currentUser.username,to:chattingWith,text}));
    document.getElementById("chatBox").innerHTML+=\`<p><b>You:</b> \${text}</p>\`;
  }
  async function loadProgress(){
    const res=await fetch("/progress/"+currentUser.username);const data=await res.json();
    document.getElementById("progressBar").innerText=\`\${data.points} / 100\`;
  }
</script>
</body>
</html>
  `);
});

// Admin Page
app.get("/admin", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Z-Code Admin</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{margin:0;font-family:Poppins,sans-serif;text-align:center;color:white;
      background:linear-gradient(270deg,#f00,#ff0,#f0f);background-size:600% 600%;animation:gradient 12s ease infinite}
    @keyframes gradient{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    input,button{padding:10px;margin:5px;border:none;border-radius:8px}
    button{cursor:pointer;background:#000;color:white}
    #adminPanel{margin-top:20px;background:rgba(0,0,0,0.5);padding:15px;border-radius:10px}
  </style>
</head>
<body>
  <h1>Admin Dashboard</h1>
  <input id="adminUser" placeholder="Admin username">
  <input type="password" id="adminPass" placeholder="Password">
  <button onclick="adminLogin()">Login</button>
  <div id="adminPanel" style="display:none;">
    <h3>Manage Users</h3>
    <div id="adminUsers"></div>
  </div>
<script>
  async function adminLogin(){
    const username=document.getElementById("adminUser").value;
    const password=document.getElementById("adminPass").value;
    const res=await fetch("/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
    const data=await res.json();
    if(data.success){document.getElementById("adminPanel").style.display="block";loadAdminUsers();}
    else alert("Invalid login");
  }
  async function loadAdminUsers(){
    const res=await fetch("/users");const users=await res.json();
    document.getElementById("adminUsers").innerHTML=users.map(u=>\`<p>\${u.avatar} \${u.username} - \${u.points} pts</p>\`).join("");
  }
</script>
</body>
</html>
  `);
});

// APIs
app.use(express.json());
app.post("/login",(req,res)=>{
  const {username,avatar}=req.body;
  if(!users[username])users[username]={username,avatar,points:0,chats:[]};
  res.json(users[username]);
});
app.get("/users",(req,res)=>{res.json(Object.values(users));});
app.get("/progress/:username",(req,res)=>{res.json(users[req.params.username]||{});});
app.post("/admin",(req,res)=>{
  const {username,password}=req.body;
  if(admins[username]&&admins[username].password===password)return res.json({success:true});
  res.json({success:false});
});

// WebSocket Chat
wss.on("connection",(ws)=>{
  ws.on("message",(msg)=>{
    const data=JSON.parse(msg);
    if(data.type==="register"){sockets[data.username]=ws;}
    if(data.type==="chat"){
      const {from,to,text}=data;
      if(!users[from]||!users[to])return;
      const chat={from,to,text,time:new Date()};
      users[from].chats.push(chat); users[to].chats.push(chat);
      users[from].points=Math.min(users[from].points+5,100);
      if(sockets[to])sockets[to].send(JSON.stringify({type:"chat",chat}));
    }
  });
  ws.on("close",()=>{for(let u in sockets)if(sockets[u]===ws)delete sockets[u];});
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log("Z-Code running at http://localhost:"+PORT));
