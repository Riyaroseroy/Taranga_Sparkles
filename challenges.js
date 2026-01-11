let challengeTimer = null;
let challengeSeconds = 0;

let activeChallenge = {
  label: "Bath in 10 Minutes",
  limitSeconds: 600
};

function createChallenge() {
  const label = document.getElementById("challengeLabel").value.trim();
  const mins = Number(document.getElementById("challengeTime").value);

  if (!label || mins <= 0) {
    alert("Enter valid challenge name and time");
    return;
  }

  activeChallenge.label = label;
  activeChallenge.limitSeconds = mins * 60;

  document.getElementById("activeChallengeName").textContent =
    `${label} (${mins} min)`;

  resetChallenge();
}

function startChallenge() {
  if (challengeTimer) return;

  challengeSeconds = 0;
  updateTimer();

  challengeTimer = setInterval(() => {
    challengeSeconds++;
    updateTimer();

    if (challengeSeconds > activeChallenge.limitSeconds) {
      stopChallenge(false);
    }
  }, 1000);
}

function stopChallenge(success = true) {
  clearInterval(challengeTimer);
  challengeTimer = null;

  const passed = success && challengeSeconds <= activeChallenge.limitSeconds;
  document.getElementById("challengeStatus").textContent =
    passed ? "🎉 Challenge Passed!" : "❌ Challenge Failed";

  if (passed) {
    const key = `challengeSuccess_${currentUser}`;
    localStorage.setItem(key, (Number(localStorage.getItem(key)) || 0) + 1);
  }
}

function updateTimer() {
  const m = Math.floor(challengeSeconds / 60);
  const s = challengeSeconds % 60;
  document.getElementById("challengeTimer").textContent =
    `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function resetChallenge() {
  clearInterval(challengeTimer);
  challengeTimer = null;
  challengeSeconds = 0;
  document.getElementById("challengeTimer").textContent = "00:00";
  document.getElementById("challengeStatus").textContent = "";
}

function getChallengeCount() {
  return Number(localStorage.getItem(`challengeSuccess_${currentUser}`) || 0);
}
