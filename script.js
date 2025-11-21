/* Current logged user h uske liye */
const loggedUser = JSON.parse(localStorage.getItem('loggedUser'));
const CURRENT_USER = loggedUser ? loggedUser.username : null;

/* Constants (localStorage keys) */
const USERS_KEY = 'set_users_v2';
const LOGGED_KEY = 'loggedUser';
const EXP_KEY = `expenses_${CURRENT_USER}`;
const SAL_KEY = `salary_${CURRENT_USER}`;
const THEME_KEY = `theme_${CURRENT_USER}`;
const BUDGET_KEY = `budgets_${CURRENT_USER}`;
const GOAL_KEY = `goal_${CURRENT_USER}`;

/* DOM elements */
const welcomeText = document.getElementById('welcomeText');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggle = document.getElementById('themeToggle');
const resetBtn = document.getElementById('resetBtn');

const expenseForm = document.getElementById('expenseForm');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const addBtn = document.getElementById('addBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const clearAllBtn = document.getElementById('clearAll');

const filterCategory = document.getElementById('filterCategory');
const filterMonth = document.getElementById('filterMonth');
const applyFilter = document.getElementById('applyFilter');
const resetFilter = document.getElementById('resetFilter');

const expenseTableBody = document.querySelector('#expenseTable tbody');
const exportCsvBtn = document.getElementById('exportCsv');
const searchInput = document.getElementById('searchInput');

const salaryInput = document.getElementById('salaryInput');
const goalInput = document.getElementById('goalInput');
const totalExpenseEl = document.getElementById('totalExpense');
const thisMonthEl = document.getElementById('thisMonth');
const savingsEl = document.getElementById('savings');
const topCategoryEl = document.getElementById('topCategory');

const budgetsForm = document.getElementById('budgetsForm');
const saveBudgetsBtn = document.getElementById('saveBudgets');
const clearBudgetsBtn = document.getElementById('clearBudgets');

const aiTipsEl = document.getElementById('aiTips');
const showMoreTipsBtn = document.getElementById('showMoreTips');

const pieCanvas = document.getElementById('pieChart');
const categoryBarCanvas = document.getElementById('categoryBarChart');
const monthlyLineCanvas = document.getElementById('monthlyLineChart');
const dailyLineCanvas = document.getElementById('dailyLineChart');

/* State */
let expenses = [];
let editingId = null;
let budgets = {}; // category -> limit
let pieChart = null;
let categoryBarChart = null;
let monthlyLineChart = null;
let dailyLineChart = null;

/* Authentication check  */
(function checkAuth() {
  const logged = JSON.parse(localStorage.getItem(LOGGED_KEY) || 'null');
  if (!logged) {
    window.location.href = './index.html';
    return;
  }
  welcomeText.textContent = `Welcome, ${logged.username} — You are welcome to Smart Expense Tracker`;
})();

/* Load initial state */
function loadState() {
  expenses = JSON.parse(localStorage.getItem(EXP_KEY) || '[]');
  budgets = JSON.parse(localStorage.getItem(BUDGET_KEY) || '{}');

  const salary = localStorage.getItem(SAL_KEY);
  if (salary) salaryInput.value = salary;

  const goal = localStorage.getItem(GOAL_KEY);
  if (goal) goalInput.value = goal;

  // theme
  const theme = localStorage.getItem(THEME_KEY) || 'light';
  setTheme(theme);

  // build budgets UI inputs
  renderBudgetInputs();
}
loadState();

/*  Helpers: save  */
function saveExpenses() {
  localStorage.setItem(EXP_KEY, JSON.stringify(expenses));
}
function saveSalary(){ localStorage.setItem(SAL_KEY, salaryInput.value || ''); }
function saveGoal(){ localStorage.setItem(GOAL_KEY, goalInput.value || ''); }
function saveBudgets(){ localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets)); }
function setTheme(theme){
  if (theme === 'dark') { document.body.classList.add('dark'); themeToggle.checked = true; }
  else { document.body.classList.remove('dark'); themeToggle.checked = false; }
  localStorage.setItem(THEME_KEY, theme);
}

/* Budget inputs renderer */
function renderBudgetInputs() {
  const categories = Array.from(categoryInput.querySelectorAll('option')).map(o => o.value);
  budgetsForm.innerHTML = '';
  categories.forEach(cat => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.style.marginBottom = '8px';
    div.innerHTML = `
      <div style="flex:1">
        <label class="small muted">${cat}</label>
        <input type="number" data-budget-cat="${cat}" min="0" value="${budgets[cat] || ''}" placeholder="Enter ₹" />
      </div>
    `;
    budgetsForm.appendChild(div);
  });
}

/* Render expenses table with filters/search */
function renderExpenses() {
  expenseTableBody.innerHTML = '';
  // apply filters
  const catFilter = filterCategory.value;
  const monthFilter = filterMonth.value; // 'All', 'this', 'last'
  const searchQ = (searchInput.value || '').toLowerCase();
  const minAmt = Number(document.getElementById("minAmount").value || 0);
  const maxAmt = Number(document.getElementById("maxAmount").value || Infinity);


  // sort by date desc
  const rows = expenses.slice().sort((a,b) => new Date(b.date) - new Date(a.date));

  for (const exp of rows) {
    // category filter
    if (catFilter !== 'All' && exp.category !== catFilter) continue;

    // month filter
    if (monthFilter === 'this') {
      const now = new Date();
      const key = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      if (!exp.date.startsWith(key)) continue;
    } else if (monthFilter === 'last') {
      const now = new Date();
      const lm = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const key = `${lm.getFullYear()}-${String(lm.getMonth()+1).padStart(2,'0')}`;
      if (!exp.date.startsWith(key)) continue;
    }

    // search
    const combined = `${exp.date} ${exp.category} ${exp.amount}`.toLowerCase();
    if (searchQ && !combined.includes(searchQ)) continue;

    // amount range filter
    if (Number(exp.amount) < minAmt || Number(exp.amount) > maxAmt) continue;

    const tr = document.createElement('tr');

    const tdDate = document.createElement('td'); tdDate.textContent = exp.date; tr.appendChild(tdDate);
    const tdCat = document.createElement('td'); tdCat.textContent = exp.category; tr.appendChild(tdCat);
    const tdAmt = document.createElement('td'); tdAmt.textContent = `₹${Number(exp.amount).toLocaleString()}`; tr.appendChild(tdAmt);

    const tdAct = document.createElement('td');
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit'; editBtn.className='btn outline small';
    editBtn.addEventListener('click', ()=> startEdit(exp.id));
    tdAct.appendChild(editBtn);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete'; delBtn.className='btn outline small';
    delBtn.style.marginLeft='6px';
    delBtn.addEventListener('click', ()=> {
      if (confirm('Delete this expense?')) { deleteExpense(exp.id); }
    });
    tdAct.appendChild(delBtn);

    // Quick warning if over budget category
    const catBudget = budgets[exp.category];
    if (catBudget) {
      // compute category total for this month
      const monthKey = exp.date.slice(0,7);
      const catMonthTotal = expenses.filter(e => e.category===exp.category && e.date.startsWith(monthKey)).reduce((s,e)=>s+Number(e.amount),0);
      if (catMonthTotal > catBudget) {
        const warn = document.createElement('div');
        warn.style.color = 'var(--danger)';
        warn.style.fontSize='12px';
        warn.textContent = 'Budget exceeded';
        tdAct.appendChild(warn);
      }
    }

    tr.appendChild(tdAct);
    expenseTableBody.appendChild(tr);
  }

  updateCalculations();
  updateCharts();
  updateProjectionCard();
  generateAiTipsAdvanced();
}

/*   SMART TOAST NOTIFICATION  */
function notify(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
  }, 2500);

  setTimeout(() => toast.remove(), 3000);
}


/* Add / Edit / Delete */
function addExpense(amount, category, dateStr) {
  if (!amount || amount <= 0) { 
    alert('Enter valid amount'); 
    return; 
  }
  if (!dateStr) { 
    alert('Enter date'); 
    return; 
  }

  if (editingId) {
    // update existing
    const idx = expenses.findIndex(e => e.id === editingId);
    if (idx !== -1) {
      expenses[idx].amount = Number(amount);
      expenses[idx].category = category;
      expenses[idx].date = dateStr;

      notify("Expense updated!", "success");   //correct notify
       
      editingId = null;
      addBtn.textContent = 'Add Expense';
      cancelEditBtn.style.display = 'none';
    }
  } else {
    const exp = { 
      id: Date.now() + Math.random(), 
      amount: Number(amount), 
      category, 
      date: dateStr 
    };

    expenses.push(exp);
    notify("Expense added successfully!", "success");   //correcct notify
    
    const catBudget = budgets[category];
    if (catBudget) {
      const monthKey = dateStr.slice(0, 7);

      const catTotal = expenses
        .filter(e => e.category === category && e.date.startsWith(monthKey))
        .reduce((s, e) => s + Number(e.amount), 0);

      if (catTotal > catBudget) {
        notify(`${category} budget limit exceeded!`, "warning");   // correct warning
      }
    }
  }
  
  saveExpenses();
  renderExpenses();
  expenseForm.reset();
}

function startEdit(id) {
  const e = expenses.find(x => x.id === id);
  if (!e) return;
  editingId = id;
  amountInput.value = e.amount;
  categoryInput.value = e.category;
  dateInput.value = e.date;
  addBtn.textContent = 'Save';
  cancelEditBtn.style.display = 'inline-block';
  window.scrollTo({top:0, behavior:'smooth'});
}

cancelEditBtn.addEventListener('click', ()=> {
  editingId = null; expenseForm.reset(); addBtn.textContent='Add Expense'; cancelEditBtn.style.display='none';
});

function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses();
  renderExpenses();
}

/* Calculations & Summary */
function calculateTotals() {
  const total = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const thisMonthTotal = expenses.filter(e=>e.date && e.date.startsWith(thisKey)).reduce((s,e)=>s+Number(e.amount||0),0);

  const catTotals = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category]||0) + Number(e.amount||0); });

  return { totalExpense: total, thisMonth: thisMonthTotal, categoryTotals: catTotals };
}

function updateCalculations() {
  const { totalExpense, thisMonth, categoryTotals } = calculateTotals();
  const salary = Number(salaryInput.value || 0);
  const goal = Number(goalInput.value || 0);
  const savings = salary - thisMonth;

  totalExpenseEl.textContent = `₹${totalExpense.toLocaleString()}`;
  thisMonthEl.textContent = `₹${thisMonth.toLocaleString()}`;
  savingsEl.textContent = `₹${savings.toLocaleString()}`;

  // top category
  let top = '—';
  let topVal = 0;
  for (const k in categoryTotals) {
    if (categoryTotals[k] > topVal) { topVal = categoryTotals[k]; top = `${k} (₹${topVal.toLocaleString()})`; }
  }
  topCategoryEl.textContent = top;

  // persist salary & goal
  saveSalary(); saveGoal();
}


/* FEATURE — AI Smart Suggestions v2  */
let latestTips = [];

function getMonthKey(dateStr){
  return dateStr.slice(0,7);
}

function sum(arr){ return arr.reduce((a,b)=>a+b,0); }

function generateAiSuggestionsV2() {
  const salary = Number(salaryInput.value || 0);
  const goal = Number(goalInput.value || 0);

  if (!expenses.length) {
    aiTipsEl.innerHTML = "No expenses yet — add something!";
    showMoreTipsBtn.style.display = "none";
    return;
  }

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  //  BASIC TOTALS 
  const thisMonthExpenses = expenses.filter(e => e.date.startsWith(monthKey));
  const thisMonthTotal = sum(thisMonthExpenses.map(e=>Number(e.amount)));
  const totalAll = sum(expenses.map(e=>Number(e.amount)));

  const suggestions = [];

  // (1) Salary usage logic
  if (salary > 0) {
    const used = Math.round((thisMonthTotal/salary)*100);

    if (thisMonthTotal > salary) {
      suggestions.push(`⚠️ You already crossed your salary limit this month!`);
    } 
    else if (used > 85) {
      suggestions.push(`⚠️ You have used ${used}% of your salary.`);
    }
    else {
      suggestions.push(`✅ Salary usage: ${used}%. Good control.`);
    }

    // prediction
    const today = now.getDate();
    const avg = thisMonthTotal / today;
    const remaining = salary - thisMonthTotal;
    const daysLeft = Math.floor(remaining / avg);

    if (daysLeft <= 7) {
      suggestions.push(`🔮 At your current speed, you have around ${daysLeft} days of budget left.`);
    } else {
      suggestions.push(`🔮 Estimated ${daysLeft} days left at current pace.`);
    }
  }

  // (2) Category pattern analysis 
  const catTotals = {};
  thisMonthExpenses.forEach(e=>{
    catTotals[e.category] = (catTotals[e.category]||0)+Number(e.amount);
  });

  const topCat = Object.keys(catTotals).sort((a,b)=>catTotals[b]-catTotals[a])[0];
  if (topCat) {
    suggestions.push(`📌 Highest category this month: ${topCat} (₹${catTotals[topCat].toLocaleString()})`);
  }

  // (3) Budget warnings
  for (const cat in budgets) {
    const limit = Number(budgets[cat] || 0);
    if (!limit) continue;

    const totalCat = sum(thisMonthExpenses.filter(e=>e.category===cat).map(e=>Number(e.amount)));
    const usedPct = Math.round((totalCat/limit)*100);

    if (usedPct >= 100) {
      suggestions.push(`🚨 ${cat} exceeded its budget!`);
    }
    else if (usedPct >= 80) {
      suggestions.push(`⚠️ ${cat} budget at ${usedPct}% — be careful.`);
    }
  }

  // (4) Goal advice 
  if (goal > 0 && salary > 0) {
    const saving = salary - thisMonthTotal;

    if (saving >= goal) {
      suggestions.push(`🏆 You achieved your saving goal!`);
    } else {
      const need = goal - saving;
      suggestions.push(`🎯 You need ₹${need} more to reach your goal.`);
    }
  }

  // DISPLAY TOP 3 
  latestTips = [...suggestions];
  const t3 = suggestions.slice(0,3);

  aiTipsEl.innerHTML = t3.map(t=>`<div>${t}</div>`).join("");
  showMoreTipsBtn.style.display = suggestions.length > 3 ? "inline-block" : "none";
}

showMoreTipsBtn.addEventListener("click", ()=>{
  aiTipsEl.innerHTML = latestTips.map(t=>`<div>${t}</div>`).join("");
  showMoreTipsBtn.style.display = "none";
});

/*       AI Tips       */
function generateAiTipsAdvanced() {
  if (!expenses.length) {
    aiTipsEl.innerHTML = "No expenses yet — add something!";
    showMoreTipsBtn.style.display = "none";
    return;
  }

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const salary = Number(salaryInput.value || 0);
  const goal = Number(goalInput.value || 0);

  const thisMonthExpenses = expenses.filter(e => e.date.startsWith(monthKey));
  const thisMonthTotal = thisMonthExpenses.reduce((s,e)=>s+Number(e.amount),0);

  const categories = {};
  thisMonthExpenses.forEach(e => {
    categories[e.category] = (categories[e.category] || 0) + Number(e.amount);
  });

  const tips = [];

  /* Salary Analysis  */
  if (salary > 0) {
    const used = Math.round((thisMonthTotal / salary) * 100);

    if (used >= 100) tips.push(`⚠ You have crossed your salary limit this month.`);
    else if (used >= 85) tips.push(`⚠ You have used ${used}% of your salary. Control spending.`);
    else tips.push(`👍 You used only ${used}% of your salary. Good control!`);

    const today = now.getDate();
    const avgPerDay = thisMonthTotal / today;
    const remaining = salary - thisMonthTotal;
    const daysLeft = Math.max(1, Math.floor(remaining / avgPerDay));

    tips.push(`📅 At the current speed, your money will last ~${daysLeft} more days.`);
  }

  /*  Category Analysis  */
  const topCat = Object.keys(categories).sort((a,b)=>categories[b]-categories[a])[0];
  if (topCat) {
    tips.push(`📌 Highest spending: ${topCat} (₹${categories[topCat]})`);
  }

  /*  Budget Cross Check  */
  for (const cat in budgets) {
    const limit = Number(budgets[cat] || 0);
    if (!limit) continue;

    const used = categories[cat] || 0;
    const pct = Math.round((used/limit)*100);

    if (pct >= 100) tips.push(`🚨 ${cat} budget exceeded!`);
    else if (pct >= 80) tips.push(`⚠ ${cat} budget at ${pct}% — reduce spending.`);
  }

  /*  Goal Advice  */
  if (goal > 0 && salary > 0) {
    const saving = salary - thisMonthTotal;
    if (saving >= goal) {
      tips.push(`🏆 You achieved your monthly saving goal!`);
    } else {
      tips.push(`🎯 You need ₹${goal - saving} more to achieve your saving goal.`);
    }
  }

  /* Final Output (Top 3 only)  */
  const top3 = tips.slice(0,3);
  latestTips = [...tips];

  aiTipsEl.innerHTML = top3.map(t => `<div>${t}</div>`).join("");
  showMoreTipsBtn.style.display = tips.length > 3 ? "inline-block" : "none";
}


/*  SAVINGS & FUTURE PROJECTION (offline smart)   */
let projectionChart = null;
function calculateSavingsProjection() {

    const salary = Number(salaryInput.value || 0);
    if (!salary) return { avg: 0, projected: 0, days: 0, months: [] };

    // group expense by month
    const monthlyMap = {};
    expenses.forEach(e => {
        const key = e.date.slice(0, 7);
        monthlyMap[key] = (monthlyMap[key] || 0) + Number(e.amount);
    });

    const allMonths = Object.values(monthlyMap);
    const avgMonthly = allMonths.length ? Math.round(allMonths.reduce((a,b)=>a+b, 0) / allMonths.length) : 0;

    // projected savings for next 6 months
    const monthlySaving = salary - avgMonthly;
    const projected6m = monthlySaving * 6;

    // survival days = salary / (avg daily spending)
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
    const thisMonthTotal = monthlyMap[monthKey] || 0;
    const avgDaily = thisMonthTotal / today.getDate();
    const survivalDays = avgDaily > 0 ? Math.floor(salary / avgDaily) : 30;

    // next 6 month labels
    const labels = [];
    const now = new Date();
    for (let i=1; i<=6; i++){
        const d = new Date(now.getFullYear(), now.getMonth()+i, 1);
        labels.push(`${d.toLocaleString("en", { month: "short" })} '${String(d.getFullYear()).slice(2)}`);
    }

    const projectionValues = labels.map((_,i)=>monthlySaving * (i+1));

    return {
        avg: avgMonthly,
        projected: projected6m,
        days: survivalDays,
        labels,
        projectionValues
    };
}

function updateProjectionCard() {
    const data = calculateSavingsProjection();

    document.getElementById("avgMonthlySpend").textContent = `₹${data.avg.toLocaleString()}`;
    document.getElementById("projectedSavings").textContent = `₹${data.projected.toLocaleString()}`;
    document.getElementById("survivalDays").textContent = data.days + " days";

    const ctx = document.getElementById("projectionChart");

    if (projectionChart) projectionChart.destroy();

    projectionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: "Projected Savings",
                data: data.projectionValues,
                borderColor: "rgba(16,185,129,0.9)",
                backgroundColor: "rgba(16,185,129,0.15)",
                borderWidth: 2,
                tension: 0.35,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}


/* Charts (pie + monthly bar) */
function updateCharts() {
  //  Category totals & labels 
  const { categoryTotals } = calculateTotals();
  const catLabels = Object.keys(categoryTotals);
  const catData = catLabels.map(l => categoryTotals[l] || 0);

  //  PIE CHART 
  if (!pieChart) {
    pieChart = new Chart(pieCanvas, {
      type: 'pie',
      data: {
        labels: catLabels,
        datasets: [{
          data: catData,
          backgroundColor: catLabels.map((_, i) => {
            const palette = [
              'rgba(59,130,246,0.85)',
              'rgba(16,185,129,0.85)',
              'rgba(234,88,12,0.85)',
              'rgba(168,85,247,0.85)',
              'rgba(14,165,233,0.85)',
              'rgba(244,63,94,0.85)',
              'rgba(120,120,120,0.85)'
            ];
            return palette[i % palette.length];
          })
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  } else {
    pieChart.data.labels = catLabels;
    pieChart.data.datasets[0].data = catData;
    pieChart.update();
  }


  // MONTHLY TREND 
  const now = new Date();
  const last6 = [];
  const map = {};

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}`;
    last6.push(key);
    map[key] = 0;
  }

  expenses.forEach(e => {
    const key = e.date.slice(0, 7);
    if (map[key] !== undefined) map[key] += Number(e.amount);
  });

  if (monthlyLineChart) monthlyLineChart.destroy();
  monthlyLineChart = new Chart(monthlyLineCanvas, {
    type: 'line',
    data: {
      labels: last6.map(k => {
        const [y, m] = k.split('-');
        return `${m}/${y.slice(2)}`;
      }),
      datasets: [{
        label: 'Monthly Spend',
        data: last6.map(k => map[k]),
        borderWidth: 2,
        tension: 0.35,
        fill: false,
        borderColor: 'rgba(59,130,246,0.9)',
        backgroundColor: 'rgba(59,130,246,0.2)'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  //  DAILY TREND 
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, "0")}`;
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const dailyMap = {};
  const dayLabels = [];
  for (let d = 1; d <= days; d++) {
    const key = `${monthKey}-${String(d).padStart(2, "0")}`;
    dailyMap[key] = 0;
    dayLabels.push(String(d));
  }

  expenses.forEach(e => {
    if (e.date.startsWith(monthKey)) {
      dailyMap[e.date] += Number(e.amount);
    }
  });

  if (dailyLineChart) dailyLineChart.destroy();
  dailyLineChart = new Chart(dailyLineCanvas, {
    type: 'line',
    data: {
      labels: dayLabels,
      datasets: [{
        label: 'Daily Spend',
        data: Object.values(dailyMap),
        borderWidth: 1.5,
        tension: 0.3,
        fill: true,
        borderColor: 'rgba(16,185,129,0.9)',
        backgroundColor: 'rgba(16,185,129,0.12)'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}


/* Export CSV */
function exportCSV() {
  if (!expenses.length) { alert('No expenses to export'); return; }
  const header = ['id','date','category','amount'];
  const rows = expenses.map(e => [e.id, e.date, e.category, e.amount]);
  const csv = [header, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `expenses_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}


  /* PDF Export (jsPDF + html2canvas) */
async function generatePDFReport() {
  try {
    // show small loading in AI tips area
    const prev = aiTipsEl.innerHTML;
    aiTipsEl.innerHTML = `<div style="display:flex;align-items:center;gap:8px"><div class="ai-loading"></div><div>Preparing PDF…</div></div>`;

    // basic metadata
    const user = CURRENT_USER || 'user';
    const now = new Date();
    const shortDate = now.toISOString().slice(0,10).replace(/-/g,'/');
    const title = `Expense_Report_${user}_${now.toISOString().slice(0,10)}`;

    // get totals & calculations
    const { totalExpense, thisMonth, categoryTotals } = calculateTotals();
    const salary = Number(salaryInput.value || 0);
    const goal = Number(goalInput.value || 0);

    // pick number of items from dropdown
    const pdfCountSel = document.getElementById('pdfCount');
    let count = pdfCountSel ? pdfCountSel.value : '10';
    let itemsToInclude = [];
    if (count === 'all') itemsToInclude = expenses.slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
    else itemsToInclude = expenses.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, Number(count));

    // capture charts as images (try canvas toDataURL — Chart.js canvases)
    const pieImg = pieCanvas ? pieCanvas.toDataURL('image/png', 1.0) : null;
    const monthlyImg = monthlyLineCanvas ? monthlyLineCanvas.toDataURL('image/png', 1.0) : null;
    const dailyImg = dailyLineCanvas ? dailyLineCanvas.toDataURL('image/png', 1.0) : null;

    // also capture AI tips box (DOM) using html2canvas (optional)
    let aiTipsImg = null;
    try {
      const el = document.getElementById('aiTips');
      if (el) {
        const canvas = await html2canvas(el, { backgroundColor: null, scale: 1.5 });
        aiTipsImg = canvas.toDataURL('image/png');
      }
    } catch(e) {
      // non-fatal
      console.warn('ai capture failed', e);
    }

    // create PDF (landscape A4)
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 36;
    let y = margin;

    // Header
    doc.setFontSize(18);
    doc.text('Smart Expense Tracker — Report', margin, y);
    doc.setFontSize(10);
    doc.text(`User: ${user}    Date: ${shortDate}`, margin, y + 18);
    y += 36;

    // Summary box
    doc.setFontSize(11);
    doc.text(`Total Expense: ₹${Number(totalExpense).toLocaleString()}`, margin, y);
    doc.text(`This month: ₹${Number(thisMonth).toLocaleString()}`, margin + 220, y);
    doc.text(`Salary: ₹${salary.toLocaleString()}   Goal: ₹${goal.toLocaleString()}`, margin + 420, y);
    y += 18;

    // Category totals (small)
    doc.setFontSize(10);
    doc.text('Category totals:', margin, y);
    const catEntries = Object.keys(categoryTotals);
    let cx = margin;
    let offset = 14;
    catEntries.forEach((c, idx) => {
      const txt = `${c}: ₹${categoryTotals[c].toLocaleString()}`;
      doc.text(txt, cx, y + offset);
      cx += 180;
      if (cx > pageW - 200) { cx = margin; offset += 12; }
    });
    y += offset + 6;

    // add charts row (three charts)
    const chartH = 140;
    const chartW = Math.min(320, (pageW - margin*2 - 16)/3);
    const leftX = margin;

    if (pieImg) { doc.addImage(pieImg, 'PNG', leftX, y, chartW, chartH); }
    if (monthlyImg) { doc.addImage(monthlyImg, 'PNG', leftX + chartW + 8, y, chartW, chartH); }
    if (dailyImg) { doc.addImage(dailyImg, 'PNG', leftX + (chartW+8)*2, y, chartW, chartH); }
    y += chartH + 12;

    // include aiTips image if available
    if (aiTipsImg) {
      const w = Math.min(pageW - margin*2, 520);
      doc.addImage(aiTipsImg, 'PNG', margin, y, w, 80);
      y += 80 + 12;
    }

    // Add table of recent expenses (simple)
    doc.setFontSize(12);
    doc.text('Recent expenses', margin, y);
    y += 12;
    doc.setFontSize(10);
    const tableStartY = y;
    const rowH = 14;
    doc.setDrawColor(180);
    // table header
    doc.text('Date', margin, y);
    doc.text('Category', margin + 120, y);
    doc.text('Amount (₹)', margin + 300, y);
    y += rowH;
    // items
    itemsToInclude.forEach(it => {
      if (y > doc.internal.pageSize.getHeight() - margin - 60) {
        doc.addPage();
        y = margin;
      }
      doc.text(it.date, margin, y);
      doc.text(it.category, margin + 120, y);
      doc.text(`₹${Number(it.amount).toLocaleString()}`, margin + 300, y);
      y += rowH;
    });

    // Footer note
    const bottom = doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(9);
    doc.text('Generated by Smart Expense Tracker — frontend-only report', margin, bottom);

    // Save
    doc.save(`${title}.pdf`);

    // restore AI tips
    aiTipsEl.innerHTML = prev;
    notify('PDF exported', 'success');
  } catch (err) {
    console.error('PDF export failed', err);
    aiTipsEl.innerHTML = 'Failed to create PDF';
    notify('PDF export failed', 'error');
  }
}

/* wire button */
const exportPdfBtn = document.getElementById('exportPdf');
if (exportPdfBtn) exportPdfBtn.addEventListener('click', generatePDFReport);


/* Reset app (clear everything except users and logged user maybe) */
resetBtn.addEventListener('click', ()=> {
  if (!confirm('This will clear all expenses, budgets and settings. Continue?')) return;
  localStorage.removeItem(EXP_KEY);
  localStorage.removeItem(BUDGET_KEY);
  localStorage.removeItem(SAL_KEY);
  localStorage.removeItem(GOAL_KEY);
  localStorage.removeItem(THEME_KEY);
  expenses = []; budgets = {};
  renderBudgetInputs();
  renderExpenses();
  alert('App reset done.');
});

/* Clear all expenses button  */
clearAllBtn.addEventListener('click', ()=> {
  if (confirm('Delete ALL expenses?')) {
    expenses = [];
    saveExpenses();
    renderExpenses();
  }
});

/*  Save budgets from inputs  */
saveBudgetsBtn.addEventListener('click', ()=> {
  const inputs = budgetsForm.querySelectorAll('input[data-budget-cat]');
  inputs.forEach(inp => {
    const cat = inp.getAttribute('data-budget-cat');
    budgets[cat] = Number(inp.value) || 0;
  });
  saveBudgets();
  alert('Budgets saved.');
  renderExpenses();
});
clearBudgetsBtn.addEventListener('click', ()=> {
  budgets = {}; saveBudgets(); renderBudgetInputs(); renderExpenses();
});

/* Event listeners */
expenseForm.addEventListener('submit', (e)=> {
  e.preventDefault();
  addExpense(amountInput.value, categoryInput.value, dateInput.value);
});
applyFilter.addEventListener('click', ()=> renderExpenses());
resetFilter.addEventListener('click', ()=> { 
  filterCategory.value = 'All';
  filterMonth.value = 'All';
  document.getElementById("minAmount").value = "";
  document.getElementById("maxAmount").value = "";
  searchInput.value = "";
  renderExpenses();
});

exportCsvBtn.addEventListener('click', exportCSV);
searchInput.addEventListener('input', ()=> renderExpenses());
filterCategory.addEventListener('change', ()=> renderExpenses());
filterMonth.addEventListener('change', ()=> renderExpenses());

salaryInput.addEventListener('input', ()=> { 
  saveSalary(); 
  renderExpenses();
  updateProjectionCard(); 
});
goalInput.addEventListener('input', ()=> { 
  saveGoal(); 
  renderExpenses();
  updateProjectionCard(); 
});

themeToggle.addEventListener('change', ()=> setTheme(themeToggle.checked ? 'dark' : 'light'));

logoutBtn.addEventListener('click', ()=> {
  if (confirm('Logout?')) { localStorage.removeItem(LOGGED_KEY); window.location.href='index.html'; }
});


window.addEventListener("load", () => {
  renderExpenses();
  updateProjectionCard();
});


/* On page load: ensure budget inputs created & initial charts updated */
window.addEventListener('load', ()=> {
  renderBudgetInputs();
  // fill budgets input values if any
  const inputs = budgetsForm.querySelectorAll('input[data-budget-cat]');
  inputs.forEach(inp => {
    const cat = inp.getAttribute('data-budget-cat');
    inp.value = budgets[cat] || '';
  });
  // set date default to today for quick add
  const today = new Date().toISOString().slice(0,10);
  dateInput.value = today;

  updateProjectionCard();
});

/* Logout safeguard: if logged out elsewhere redirect */
setInterval(()=> {
  if (!localStorage.getItem(LOGGED_KEY)) window.location.href='index.html';
}, 3000);

/* Helpful console notes */
console.log('Smart Expense Tracker ready. LocalStorage keys used:', EXP_KEY, BUDGET_KEY, SAL_KEY, GOAL_KEY, THEME_KEY);