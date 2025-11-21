/* Get current user */
const logged = JSON.parse(localStorage.getItem("loggedUser"));
if (!logged) window.location.href = "index.html";

const CURRENT_USER = logged.username;

/* Get user-specific keys */
const EXP_KEY = `expenses_${CURRENT_USER}`;
const SAL_KEY = `salary_${CURRENT_USER}`;
const GOAL_KEY = `goal_${CURRENT_USER}`;
const META_KEY = `meta_${CURRENT_USER}`;

/* DOM */
const userEl = document.getElementById("p_username");
const joinedEl = document.getElementById("p_joined");
const salaryEl = document.getElementById("p_salary");
const goalEl = document.getElementById("p_goal");
const totalEl = document.getElementById("p_total_exp");
const monthEl = document.getElementById("p_month_exp");
const topCatEl = document.getElementById("p_top_cat");

/* Load profile data */
function loadProfile() {
  userEl.textContent = CURRENT_USER;

  let meta = JSON.parse(localStorage.getItem(META_KEY) || "{}");
  if (!meta.joined) {
    meta.joined = new Date().toISOString().slice(0, 10);
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }
  joinedEl.textContent = meta.joined;

  salaryEl.value = localStorage.getItem(SAL_KEY) || "";
  goalEl.value = localStorage.getItem(GOAL_KEY) || "";

  const expenses = JSON.parse(localStorage.getItem(EXP_KEY) || "[]");

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  totalEl.textContent = "₹" + total.toLocaleString();

  // This Month
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, "0")}`;
  const monthTotal = expenses
    .filter(e => e.date.startsWith(key))
    .reduce((s, e) => s + Number(e.amount), 0);

  monthEl.textContent = "₹" + monthTotal.toLocaleString();

  // Top category
  const catTotals = {};
  expenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
  });

  let top = "—";
  let max = 0;
  for (const c in catTotals) {
    if (catTotals[c] > max) {
      max = catTotals[c];
      top = `${c} (₹${max.toLocaleString()})`;
    }
  }
  topCatEl.textContent = top;
}

loadProfile();

/* Save finance settings */
document.getElementById("saveFinance").addEventListener("click", () => {
  localStorage.setItem(SAL_KEY, salaryEl.value);
  localStorage.setItem(GOAL_KEY, goalEl.value);
  alert("Saved!");
});

/* Change password */
document.getElementById("changePass").addEventListener("click", () => {
  const oldP = prompt("Enter old password:");
  const newP = prompt("Enter new password:");

  if (!oldP || !newP) return;

  let users = JSON.parse(localStorage.getItem("set_users_v2") || "{}");

  if (users[CURRENT_USER] !== btoa(oldP)) {
    alert("Wrong old password!");
    return;
  }

  users[CURRENT_USER] = btoa(newP);
  localStorage.setItem("set_users_v2", JSON.stringify(users));

  alert("Password changed!");
});

/* Delete account */
document.getElementById("deleteAcc").addEventListener("click", () => {
  if (!confirm("Are you sure? This will delete all your data.")) return;

  let users = JSON.parse(localStorage.getItem("set_users_v2") || "{}");
  delete users[CURRENT_USER];

  localStorage.setItem("set_users_v2", JSON.stringify(users));

  localStorage.removeItem(`expenses_${CURRENT_USER}`);
  localStorage.removeItem(`salary_${CURRENT_USER}`);
  localStorage.removeItem(`budgets_${CURRENT_USER}`);
  localStorage.removeItem(`goal_${CURRENT_USER}`);
  localStorage.removeItem(`theme_${CURRENT_USER}`);
  localStorage.removeItem(`meta_${CURRENT_USER}`);

  localStorage.removeItem("loggedUser");

  window.location.href = "index.html";
});