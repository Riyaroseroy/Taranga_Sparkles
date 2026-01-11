const users = {
  user1: "password1",
  user2: "password2",
  user3: "password3",
  user4: "password4",
  user5: "password5",
  user6: "password6",
  user7: "password7",
  user8: "password8",
  user9: "password9",
  user10: "password10"
};

function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("errorMsg");

  if (users[username] && users[username] === password) {
    // Store logged-in user
    localStorage.setItem("loggedInUser", username);

    // Redirect to dashboard
    window.location.href = "index.html";
  } else {
    errorMsg.textContent = "Invalid username or password";
  }
}
