// ================= GLOBAL STATE (FIREBASE) =================
let allLogs = [];
let currentWeek = null;

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
updateClock();
setInterval(updateClock, 1000);

// ================= ATTENDANCE (FIRESTORE) =================
async function saveTime(type) {
    if (!window.db) {
        alert("ยังไม่สามารถเชื่อมต่อฐานข้อมูลได้");
        return;
    }
    try {
        var today = new Date().toISOString().split("T")[0];
        var time = new Date().toLocaleTimeString();
        var ref = db.collection("attendance");

        if (type === "IN") {
            var snap = await ref
                .where("date", "==", today)
                .where("out", "==", null)
                .limit(1)
                .get();

            if (!snap.empty) {
                alert("ยังไม่ได้ Check out");
                return;
            }

            await ref.add({
                date: today,
                in: time,
                out: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            if (window.showToast) showToast("Check In สำเร็จ");
        } else if (type === "OUT") {
            snap = await ref
                .where("date", "==", today)
                .where("out", "==", null)
                .limit(1)
                .get();

            if (snap.empty) {
                alert("ต้อง Check in ก่อน");
                return;
            }

            var doc = snap.docs[0];
            await doc.ref.update({ out: time });
            if (window.showToast) showToast("Check Out สำเร็จ");
        }
    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาด: " + (err.message || "ไม่สามารถบันทึกได้"));
    }
}

async function deleteAttendance(id) {
    if (!confirm("ต้องการลบรายการลงเวลานี้หรือไม่?")) return;
    if (!window.db) return;
    try {
        await db.collection("attendance").doc(id).delete();
    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาด: " + (err.message || "ลบไม่สำเร็จ"));
    }
}

function listenAttendance() {
    const table = document.getElementById("attendanceBody");
    if (!table || !window.db) return;

    db.collection("attendance")
        .orderBy("date")
        .onSnapshot(snapshot => {
            const rows = [];
            snapshot.forEach(doc => {
                rows.push({ id: doc.id, ...doc.data() });
            });

            rows.sort((a, b) => {
                const da = new Date(a.date);
                const dbb = new Date(b.date);
                if (da.getTime() !== dbb.getTime()) return da - dbb;
                return (a.in || "").localeCompare(b.in || "");
            });

            table.innerHTML = "";
            rows.forEach(item => {
                const status = item.out ? "เสร็จงาน" : "กำลังทำงาน";
                const inVal = item.in || "-";
                const outVal = item.out || "-";
                const id = item.id;
                table.innerHTML += "<tr><td>" + item.date + "</td><td>" + inVal + "</td><td>" + outVal + "</td><td><span class=\"badge\">" + status + "</span></td><td><button class=\"btn-danger-sm\" onclick=\"deleteAttendance('" + id + "')\">ลบ</button></td></tr>";
            });
        });
}

// ================= DAILY LOG (FIRESTORE) =================
// ย่อ/บีบอัดรูปให้ไม่เกินขีดจำกัด Firestore (~1 MB ต่อฟิลด์)
function compressImageForFirestore(file) {
    return new Promise(function (resolve) {
        if (!file || !file.type.startsWith("image/")) {
            resolve(null);
            return;
        }
        var maxSize = 900000;
        var reader = new FileReader();
        reader.onload = function (e) {
            var dataUrl = e.target.result;
            if (dataUrl.length <= maxSize) {
                resolve(dataUrl);
                return;
            }
            var img = new Image();
            img.onload = function () {
                var canvas = document.createElement("canvas");
                var ctx = canvas.getContext("2d");
                var w = img.width;
                var h = img.height;
                var maxW = 800;
                if (w > maxW) {
                    h = (h * maxW) / w;
                    w = maxW;
                }
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);
                var quality = 0.7;
                var result = canvas.toDataURL("image/jpeg", quality);
                while (result.length > maxSize && quality > 0.2) {
                    quality -= 0.1;
                    result = canvas.toDataURL("image/jpeg", quality);
                }
                if (result.length > maxSize) {
                    result = canvas.toDataURL("image/jpeg", 0.2);
                }
                resolve(result);
            };
            img.onerror = function () { resolve(null); };
            img.src = dataUrl;
        };
        reader.onerror = function () { resolve(null); };
        reader.readAsDataURL(file);
    });
}

const form = document.getElementById("addLogForm");
if (form) {
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const date = document.getElementById("logDate").value;
        const activity = document.getElementById("logActivity").value;
        const file = document.getElementById("logImage").files[0];

        (async function () {
            if (!window.db) {
                alert("ยังไม่สามารถเชื่อมต่อฐานข้อมูลได้");
                return;
            }

            var imageData = null;
            if (file) {
                imageData = await compressImageForFirestore(file);
                if (file.size > 0 && !imageData) {
                    alert("ไม่สามารถอ่านไฟล์รูปได้ กรุณาเลือกรูปใหม่");
                    return;
                }
            }

            try {
                await db.collection("logs").add({
                    date: date,
                    activity: activity,
                    image: imageData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                if (window.showToast) showToast("บันทึกสำเร็จ! ข้อมูลถูกเก็บไว้บนระบบกลางแล้ว");
                else alert("บันทึกสำเร็จ! ข้อมูลถูกเก็บไว้บนระบบกลางแล้ว");
                form.reset();
            } catch (err) {
                console.error(err);
                alert("เกิดข้อผิดพลาด: " + (err.message || "บันทึกไม่สำเร็จ"));
            }
        })();
    });
}

async function deleteLog(id) {
    if (!confirm("ต้องการลบรายการนี้หรือไม่?")) return;
    if (!window.db) return;
    try {
        await db.collection("logs").doc(id).delete();
    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาด: " + (err.message || "ลบไม่สำเร็จ"));
    }
}

// ================= LOGIC: WEEK & RENDER =================
function getWeekNumber(startDate, currentDate) {
    const start = new Date(startDate);
    const curr = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    curr.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((curr - start) / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
}

function groupLogsByWeek() {
    const weeks = {};
    if (allLogs.length === 0) return weeks;
    const sortedLogs = [...allLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const startDate = sortedLogs[0].date;

    allLogs.forEach(log => {
        const week = getWeekNumber(startDate, log.date);
        if (!weeks[week]) weeks[week] = [];
        weeks[week].push(log);
    });
    return weeks;
}

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
    const months = [
        "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
        "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
    ];
    return `📅 วัน${new Intl.DateTimeFormat('th-TH', { weekday: 'long' }).format(d)}ที่ ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function renderLogs(week) {
    const area = document.getElementById("logDisplayArea");
    if (!area) return;
    const weeks = groupLogsByWeek();
    const logs = weeks[week] || [];
    area.innerHTML = logs.length ? "" : "<p>ไม่มีข้อมูลในสัปดาห์นี้</p>";

    let grouped = {};
    logs.forEach(l => {
        if (!grouped[l.date]) grouped[l.date] = [];
        grouped[l.date].push(l);
    });

    Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b)).forEach(date => {
        let html = `<div class="glass-card"><h3>${formatThaiDate(date)}</h3>`;
        grouped[date].forEach(log => {
            html += `
            <div class="task-entry" style="position:relative; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <button class="btn-delete" onclick="deleteLog('${log.id}')">✖</button>
                <p>${log.activity}</p>
                ${log.image ? `<img src="${log.image}" style="max-width:100%; border-radius:10px; margin-top:10px;">` : ""}
            </div>`;
        });
        html += `</div>`;
        area.innerHTML += html;
    });
}

// ================= DATA IMPORT/EXPORT (FIRESTORE) =================
async function exportData() {
    if (!window.db) {
        alert("ยังไม่สามารถเชื่อมต่อฐานข้อมูลได้");
        return;
    }
    const attSnap = await db.collection("attendance").orderBy("date").get();
    const logSnap = await db.collection("logs").orderBy("date").get();

    const data = {
        attendance: attSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        logs: logSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.json";
    a.click();
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!window.db) {
                alert("ยังไม่สามารถเชื่อมต่อฐานข้อมูลได้");
                return;
            }
            const batch = db.batch();

            if (Array.isArray(importedData.attendance)) {
                importedData.attendance.forEach(item => {
                    const ref = item.id
                        ? db.collection("attendance").doc(item.id)
                        : db.collection("attendance").doc();
                    batch.set(ref, {
                        date: item.date,
                        in: item.in || item.checkIn || null,
                        out: item.out || item.checkOut || null,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
            }

            if (Array.isArray(importedData.logs)) {
                importedData.logs.forEach(item => {
                    const ref = item.id
                        ? db.collection("logs").doc(item.id)
                        : db.collection("logs").doc();
                    batch.set(ref, {
                        date: item.date,
                        activity: item.activity,
                        image: item.image || null,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
            }

            await batch.commit();
            alert("อัปเดตข้อมูลจากไฟล์สำเร็จ!");
        } catch (err) {
            alert("ไฟล์ JSON ไม่ถูกต้อง");
        }
    };
    reader.readAsText(file);
}

// ================= REALTIME LISTENERS =================
function listenLogs() {
    const area = document.getElementById("logDisplayArea");
    const nav = document.getElementById("weekNavigation");
    if ((!area && !nav) || !window.db) return;

    db.collection("logs")
        .orderBy("date")
        .onSnapshot(snapshot => {
            allLogs = [];
            snapshot.forEach(doc => {
                allLogs.push({ id: doc.id, ...doc.data() });
            });
            renderWeeks();
        });
}

// ================= DASHBOARD =================
function getThisWeekStart() {
    var d = new Date();
    var day = d.getDay();
    var diff = d.getDate() - (day === 0 ? 7 : day) + 1;
    var monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().split("T")[0];
}

function listenDashboard() {
    var totalAtt = document.getElementById("dashboardAttendanceTotal");
    var totalLogs = document.getElementById("dashboardLogsTotal");
    var weekAtt = document.getElementById("dashboardAttendanceThisWeek");
    var weekLogs = document.getElementById("dashboardLogsThisWeek");
    if (!totalAtt && !totalLogs && !weekAtt && !weekLogs) return;
    if (!window.db) return;

    var weekStart = getThisWeekStart();

    function setEl(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    db.collection("attendance").onSnapshot(function (snap) {
        var total = snap.size;
        var thisWeek = 0;
        snap.forEach(function (doc) {
            var date = doc.data().date;
            if (date && date >= weekStart) thisWeek++;
        });
        setEl("dashboardAttendanceTotal", total);
        setEl("dashboardAttendanceThisWeek", thisWeek);
    });

    db.collection("logs").onSnapshot(function (snap) {
        var total = snap.size;
        var thisWeek = 0;
        snap.forEach(function (doc) {
            var date = doc.data().date;
            if (date && date >= weekStart) thisWeek++;
        });
        setEl("dashboardLogsTotal", total);
        setEl("dashboardLogsThisWeek", thisWeek);
    });
}

// เริ่ม listeners เมื่อ Firebase พร้อม (รองรับกรณีโหลดไม่พร้อมกัน)
function startFirestoreListeners() {
    if (window.db) {
        listenAttendance();
        listenLogs();
        listenDashboard();
        return true;
    }
    return false;
}

if (!startFirestoreListeners()) {
    var retry = setInterval(function () {
        if (startFirestoreListeners()) clearInterval(retry);
    }, 100);
    setTimeout(function () { clearInterval(retry); }, 3000);
}

// ================= NAV (Mobile menu – ใช้ทุกหน้า) =================
(function () {
    function initNav() {
        var toggle = document.getElementById("navToggle");
        var menu = document.getElementById("navMenu");
        var overlay = document.getElementById("navOverlay");
        if (!toggle || !menu) return;

        function open() {
            menu.classList.add("is-open");
            if (overlay) overlay.classList.add("is-open");
            toggle.setAttribute("aria-expanded", "true");
            toggle.setAttribute("aria-label", "ปิดเมนู");
        }
        function close() {
            menu.classList.remove("is-open");
            if (overlay) overlay.classList.remove("is-open");
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "เปิดเมนู");
        }

        toggle.addEventListener("click", function () {
            if (menu.classList.contains("is-open")) close(); else open();
        });
        if (overlay) overlay.addEventListener("click", close);
        menu.querySelectorAll("a").forEach(function (a) {
            a.addEventListener("click", close);
        });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initNav);
    } else {
        initNav();
    }
})();

// ================= ลูกเล่น: ปุ่มกลับขึ้นบน + แจ้งเตือนสั้นๆ =================
(function () {
    function initBackToTop() {
        var btn = document.createElement("button");
        btn.className = "back-to-top";
        btn.setAttribute("aria-label", "กลับขึ้นด้านบน");
        btn.innerHTML = "<svg fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 10l7-7m0 0l7 7m-7-7v18\"/></svg>";
        btn.onclick = function () {
            window.scrollTo({ top: 0, behavior: "smooth" });
        };
        document.body.appendChild(btn);

        function onScroll() {
            if (window.scrollY > 400) btn.classList.add("visible");
            else btn.classList.remove("visible");
        }
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }

    window.showToast = function (message) {
        var el = document.createElement("div");
        el.setAttribute("role", "status");
        el.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:12px 20px;border-radius:12px;font-size:0.95rem;z-index:9999;box-shadow:0 10px 40px rgba(0,0,0,0.2);animation:fadeIn 0.3s ease;";
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(function () {
            el.style.opacity = "0";
            el.style.transition = "opacity 0.3s";
            setTimeout(function () { el.remove(); }, 300);
        }, 2500);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initBackToTop);
    } else {
        initBackToTop();
    }
})();
