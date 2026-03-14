// ================= INITIAL & STORAGE =================
async function initData() {
    // ถ้ายังไม่มีข้อมูลในเครื่อง ให้ไปดึงจาก data.json มาเป็นค่าเริ่มต้น
    if (!localStorage.getItem("internData")) {
        try {
            const response = await fetch('data.json');
            if (response.ok) {
                const initialData = await response.json();
                saveData(initialData);
                // สั่ง Render ใหม่หลังจากโหลดเสร็จ
                renderAttendance();
                renderWeeks();
            }
        } catch (error) {
            console.error("ไม่สามารถโหลด data.json ได้:", error);
        }
    }
}

function getData() {
    return JSON.parse(localStorage.getItem("internData")) || { attendance: [], logs: [] };
}

function saveData(data) {
    localStorage.setItem("internData", JSON.stringify(data));
}

// เรียกใช้งานทันทีที่โหลดไฟล์นี้
initData();

// ================= CLOCK =================
function updateClock() {
    const now = new Date();
    const time = now.getHours().toString().padStart(2, "0") + ":" +
                 now.getMinutes().toString().padStart(2, "0") + ":" +
                 now.getSeconds().toString().padStart(2, "0");
    const date = now.getDate() + "/" + (now.getMonth() + 1) + "/" + now.getFullYear();

    const clock = document.getElementById("liveClock");
    const dateDisplay = document.getElementById("currentDateDisplay");

    if (clock) clock.innerText = time;
    if (dateDisplay) dateDisplay.innerText = date;
}
setInterval(updateClock, 1000);

// ================= ATTENDANCE =================
function saveTime(type) {
    let data = getData();
    const today = new Date().toISOString().split("T")[0];
    const time = new Date().toLocaleTimeString();

    const todayRecords = data.attendance.filter(a => a.date === today);
    const last = todayRecords[todayRecords.length - 1];

    if (type === "IN") {
        if (last && !last.out) { alert("ยังไม่ได้ Check out"); return; }
        data.attendance.push({ id: Date.now(), date: today, in: time, out: null });
    } else if (type === "OUT") {
        if (!last || last.out) { alert("ต้อง Check in ก่อน"); return; }
        last.out = time;
    }

    saveData(data);
    renderAttendance();
}

function renderAttendance() {
    const table = document.getElementById("attendanceBody");
    if (!table) return;
    const data = getData();
    table.innerHTML = "";
    data.attendance.forEach(item => {
        const status = item.out ? "เสร็จงาน" : "กำลังทำงาน";
        table.innerHTML += `
        <tr>
            <td>${item.date}</td>
            <td>${item.in}</td>
            <td>${item.out || "-"}</td>
            <td><span class="badge">${status}</span></td>
        </tr>`;
    });
}

// ================= DAILY LOG =================
const form = document.getElementById("addLogForm");
if (form) {
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        const date = document.getElementById("logDate").value;
        const activity = document.getElementById("logActivity").value;
        const file = document.getElementById("logImage").files[0];
        const reader = new FileReader();

        reader.onload = function() {
            let data = getData();
            data.logs.push({
                id: Date.now(),
                date: date,
                activity: activity,
                image: file ? reader.result : null
            });
            saveData(data);
            alert("บันทึกสำเร็จ! ข้อมูลถูกเก็บไว้ในเบราว์เซอร์แล้ว");
            form.reset();
        };

        if (file) reader.readAsDataURL(file);
        else reader.onload();
    });
}

function deleteLog(id) {
    if (!confirm("ต้องการลบรายการนี้หรือไม่?")) return;
    let data = getData();
    data.logs = data.logs.filter(log => log.id !== id);
    saveData(data);
    renderWeeks();
}

// ================= LOGIC: WEEK & RENDER =================
function getWeekNumber(startDate, currentDate) {
    const start = new Date(startDate);
    const curr = new Date(currentDate);
    start.setHours(0,0,0,0);
    curr.setHours(0,0,0,0);
    const diffDays = Math.floor((curr - start) / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
}

function groupLogsByWeek() {
    const data = getData();
    const weeks = {};
    if (data.logs.length === 0) return weeks;
    const sortedLogs = [...data.logs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const startDate = sortedLogs[0].date;

    data.logs.forEach(log => {
        const week = getWeekNumber(startDate, log.date);
        if (!weeks[week]) weeks[week] = [];
        weeks[week].push(log);
    });
    return weeks;
}

let currentWeek = null;
function renderWeeks() {
    const nav = document.getElementById("weekNavigation");
    if (!nav) return;
    const weeks = groupLogsByWeek();
    nav.innerHTML = "";
    const keys = Object.keys(weeks);
    keys.forEach(w => {
        const div = document.createElement("div");
        div.className = `log-nav-item ${currentWeek == w ? 'active' : ''}`;
        div.innerText = "สัปดาห์ที่ " + w;
        div.onclick = () => { currentWeek = w; renderLogs(w); renderWeeks(); };
        nav.appendChild(div);
    });
    if (!currentWeek && keys.length > 0) {
        currentWeek = keys[keys.length - 1];
        renderLogs(currentWeek);
    }
}

function formatThaiDate(dateStr) {
    const d = new Date(dateStr);
    const months = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
    return `📅 วัน${new Intl.DateTimeFormat('th-TH', {weekday:'long'}).format(d)}ที่ ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()+543}`;
}

function renderLogs(week) {
    const area = document.getElementById("logDisplayArea");
    if (!area) return;
    const weeks = groupLogsByWeek();
    const logs = weeks[week] || [];
    area.innerHTML = logs.length ? "" : "<p>ไม่มีข้อมูลในสัปดาห์นี้</p>";

    let grouped = {};
    logs.forEach(l => { if (!grouped[l.date]) grouped[l.date] = []; grouped[l.date].push(l); });
    
    Object.keys(grouped).sort((a,b)=>new Date(a)-new Date(b)).forEach(date => {
        let html = `<div class="glass-card"><h3>${formatThaiDate(date)}</h3>`;
        grouped[date].forEach(log => {
            html += `
            <div class="task-entry" style="position:relative; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <button class="btn-delete" onclick="deleteLog(${log.id})">✖</button>
                <p>${log.activity}</p>
                ${log.image ? `<img src="${log.image}" style="max-width:100%; border-radius:10px; margin-top:10px;">` : ""}
            </div>`;
        });
        html += `</div>`;
        area.innerHTML += html;
    });
}

// ================= DATA IMPORT/EXPORT =================
function exportData() {
    const data = getData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.json";
    a.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            saveData(importedData);
            alert("อัปเดตข้อมูลจากไฟล์สำเร็จ!");
            location.reload();
        } catch (err) { alert("ไฟล์ JSON ไม่ถูกต้อง"); }
    };
    reader.readAsText(file);
}

// Initial renders
renderAttendance();
renderWeeks();