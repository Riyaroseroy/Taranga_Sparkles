/* =======================
   AUTH CHECK
======================= */
const currentUser = localStorage.getItem("loggedInUser");
if (!currentUser) window.location.href = "login.html";
document.getElementById("usernameDisplay").textContent = currentUser;

/* =======================
   GLOBAL STATE
======================= */
let dataset = [];
let rewardPeriodDays = 7;
let usageChart = null;

/* =======================
   LOAD CSV
======================= */
fetch("smart_resource_usage_dataset.csv")
  .then(res => res.text())
  .then(text => dataset = parseCSV(text))
  .catch(err => console.error("CSV load error", err));

function parseCSV(data) {
  const lines = data.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = values[i].trim());
    return obj;
  });
}

/* =======================
   DATE UTILS
======================= */
function getLatestDate() {
  return new Date(Math.max(...dataset.map(d => new Date(d.date))));
}

/* =======================
   HOME PAGE LOGIC
======================= */
function showUsage(type) {
  if (!dataset.length) return alert("Data loading...");

  const hour = new Date().getHours();
  const userData = dataset.filter(
    d => d.user_id === currentUser && Number(d.hour) === hour
  );
  const allUser = dataset.filter(d => d.user_id === currentUser);

  let current = 0, avg = 0;

  if (type === "water") {
    current = userData.reduce((s,d)=>s+Number(d.water_liters),0);
    avg = allUser.reduce((s,d)=>s+Number(d.water_liters),0) / allUser.length;
  } else {
    current = userData.reduce((s,d)=>s+Number(d.electricity_kwh),0);
    avg = allUser.reduce((s,d)=>s+Number(d.electricity_kwh),0) / allUser.length;
  }

  const quote = current <= avg
    ? "🌱 Great! Usage is under control."
    : "🚨 Alert! Usage is higher than normal.";

  document.getElementById("usageBox").innerHTML = `
    <h2>${type === "water" ? "💧 Water" : "⚡ Electricity"} Usage</h2>
    <p><b>Current Hour:</b> ${current.toFixed(2)}</p>
    <p><b>Your Average:</b> ${avg.toFixed(2)}</p>
    <p>${quote}</p>
  `;
}

/* =======================
   REWARDS LOGIC
======================= */
function getTotalUsage(user, type, days) {
  const latest = getLatestDate();
  const cutoff = new Date(latest);
  cutoff.setDate(cutoff.getDate() - days);

  return dataset
    .filter(d => d.user_id === user && new Date(d.date) >= cutoff)
    .reduce((s,d)=>s+Number(type==="water"?d.water_liters:d.electricity_kwh),0);
}

function generateLeaderboard(type, days) {
  const users = [...new Set(dataset.map(d => d.user_id))];
  return users
    .map(u => ({ user: u, total: getTotalUsage(u,type,days) }))
    .sort((a,b)=>a.total-b.total);
}

function getImprovement(user, type, days) {
  const latest = getLatestDate();
  const recentStart = new Date(latest);
  recentStart.setDate(recentStart.getDate() - days);
  const prevStart = new Date(recentStart);
  prevStart.setDate(prevStart.getDate() - days);

  const recent = dataset.filter(d =>
    d.user_id===user && new Date(d.date)>=recentStart
  );
  const prev = dataset.filter(d =>
    d.user_id===user &&
    new Date(d.date)>=prevStart &&
    new Date(d.date)<recentStart
  );

  const r = recent.reduce((s,d)=>s+Number(type==="water"?d.water_liters:d.electricity_kwh),0);
  const p = prev.reduce((s,d)=>s+Number(type==="water"?d.water_liters:d.electricity_kwh),0);

  if (p === 0) return 0;
  return ((p - r) / p) * 100;
}

function getVariance(user, type, days) {
  const latest = getLatestDate();
  const cutoff = new Date(latest);
  cutoff.setDate(cutoff.getDate() - days);

  const vals = dataset
    .filter(d=>d.user_id===user && new Date(d.date)>=cutoff)
    .map(d=>Number(type==="water"?d.water_liters:d.electricity_kwh));

  const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
  return vals.reduce((s,v)=>s+Math.pow(v-avg,2),0)/vals.length;
}

function setRewardPeriod(days) {
  rewardPeriodDays = days;
  setTab("rewards");
}

/* =======================
   NAVIGATION
======================= */
function setTab(tab) {
  const box = document.getElementById("usageBox");

  if (tab === "home") {
    box.innerHTML = "<h2>🏠 Home</h2><p>Select Water or Electricity</p>";
  }

  if (tab === "rewards") {
    const label = rewardPeriodDays === 7 ? "Weekly" : "Monthly";
    const water = generateLeaderboard("water", rewardPeriodDays);
    const power = generateLeaderboard("electricity", rewardPeriodDays);

    const users = [...new Set(dataset.map(d => d.user_id))];
    const mostImproved = users.map(u=>({u,v:getImprovement(u,"water",rewardPeriodDays)}))
      .sort((a,b)=>b.v-a.v)[0];

    const mostConsistent = users.map(u=>({u,v:getVariance(u,"water",rewardPeriodDays)}))
      .sort((a,b)=>a.v-b.v)[0];

    box.innerHTML = `
      <h2>🏆 ${label} Rewards</h2>
      <button onclick="setRewardPeriod(7)">Weekly</button>
      <button onclick="setRewardPeriod(30)">Monthly</button>

      <h3>💧 Water Savers</h3>
      <ol>${water.slice(0,3).map(u=>`<li>${u.user} — ${u.total.toFixed(1)} L</li>`).join("")}</ol>

      <h3>⚡ Energy Savers</h3>
      <ol>${power.slice(0,3).map(u=>`<li>${u.user} — ${u.total.toFixed(1)} kWh</li>`).join("")}</ol>

      <h3>📉 Most Improved</h3>
      <p>${mostImproved.u} — ${mostImproved.v.toFixed(1)}%</p>

      <h3>🧘 Most Consistent</h3>
      <p>${mostConsistent.u}</p>
    `;
  }

  if (tab === "usage") {
    box.innerHTML = `
      <h2> Usage Statistics</h2>

      <div id="usageAlert" style="font-weight:bold;margin:10px 0;"></div>

      <button onclick="renderUsageChart('water','day')">Water (Day)</button>
      <button onclick="renderUsageChart('water','week')">Water (Week)</button>
      <button onclick="renderUsageChart('water','month')"> Water (Month)</button>

      <br><br>

      <button onclick="renderUsageChart('electricity','day')"> Electricity (Day)</button>
      <button onclick="renderUsageChart('electricity','week')"> Electricity (Week)</button>
      <button onclick="renderUsageChart('electricity','month')"> Electricity (Month)</button>

      <canvas id="usageChart" height="120"></canvas>
    `;
  }

  if (tab === "challenges") {
    const completed = getChallengeCount();

    box.innerHTML = `
      <h2>🔥 Challenges</h2>

      <input id="challengeLabel" placeholder="Challenge name" />
      <input id="challengeTime" type="number" placeholder="Time (minutes)" />

      <button onclick="createChallenge()">➕ Set Challenge</button>

      <h3 id="activeChallengeName">Bath in 10 Minutes (10 min)</h3>

      <div style="font-size:2rem;">
        ⏱️ <span id="challengeTimer">00:00</span>
      </div>

      <button onclick="startChallenge()">▶ Start</button>
      <button onclick="stopChallenge()">⏹ Stop</button>

      <p id="challengeStatus"></p>
      <p>Completed: <b>${completed}</b></p>
    `;
  }
}

/* =======================
   NORMAL USAGE THRESHOLD
======================= */
function getNormalThreshold(type, range) {
  const userData = dataset.filter(d => d.user_id === currentUser);

  if (range === "day") {
    const hourly = userData.map(d =>
      Number(type==="water"?d.water_liters:d.electricity_kwh)
    );
    const avg = hourly.reduce((a,b)=>a+b,0) / hourly.length;
    return avg * 1.2;
  }

  const dailyTotals = {};
  userData.forEach(d => {
    if (!dailyTotals[d.date]) dailyTotals[d.date] = 0;
    dailyTotals[d.date] += Number(type==="water"?d.water_liters:d.electricity_kwh);
  });

  const vals = Object.values(dailyTotals);
  const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
  return avg * 1.2;
}

/* =======================
   GRAPH RENDERING + ALERT
======================= */
function renderUsageChart(type, range) {
  const ctx = document.getElementById("usageChart").getContext("2d");
  if (usageChart) usageChart.destroy();

  const userData = dataset.filter(d => d.user_id === currentUser);
  const latestDate = getLatestDate();

  let labels=[], values=[];

  if (range==="day") {
    const dayData = userData.filter(d =>
      new Date(d.date).toDateString() === latestDate.toDateString()
    ).sort((a,b)=>a.hour-b.hour);

    labels = dayData.map(d=>`${d.hour}:00`);
    values = dayData.map(d=>Number(type==="water"?d.water_liters:d.electricity_kwh));
  }

  if (range==="week" || range==="month") {
    const days = range==="week"?6:29;
    for (let i=days;i>=0;i--) {
      const day = new Date(latestDate);
      day.setDate(day.getDate()-i);
      labels.push(day.toLocaleDateString());
      values.push(
        userData.filter(d=>new Date(d.date).toDateString()===day.toDateString())
          .reduce((s,d)=>s+Number(type==="water"?d.water_liters:d.electricity_kwh),0)
      );
    }
  }

  const threshold = getNormalThreshold(type, range);
  const exceeded = values.some(v=>v>threshold);

  document.getElementById("usageAlert").innerHTML = exceeded
    ? "🚨 ALERT: Usage exceeds your normal pattern."
    : "✅ Usage is within normal range.";
  document.getElementById("usageAlert").style.color = exceeded?"red":"green";

  usageChart = new Chart(ctx,{
    type:"line",
    data:{
      labels,
      datasets:[{
        label:`${type.toUpperCase()} Usage`,
        data:values,
        fill:true,
        borderWidth:2,
        tension:0.3,
        borderColor: exceeded?"red":"green",
        backgroundColor: exceeded?"rgba(255,0,0,0.2)":"rgba(0,128,0,0.2)"
      }]
    },
    options:{responsive:true,scales:{y:{beginAtZero:true}}}
  });
}
