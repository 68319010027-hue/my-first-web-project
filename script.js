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

    const today = new Date().toISOString().split("T")[0];
    const time = new Date().toLocaleTimeString();
    const ref = db.collection("attendance");

    if (type === "IN") {
        const snap = await ref
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
    } else if (type === "OUT") {
        const snap = await ref
            .where("date", "==", today)
            .where("out", "==", null)
            .limit(1)
            .get();

        if (snap.empty) {
            alert("ต้อง Check in ก่อน");
            return;
        }

        const doc = snap.docs[0];
        await doc.ref.update({ out: time });
    }
}

async function deleteAttendance(id) {
    if (!confirm("ต้องการลบรายการลงเวลานี้หรือไม่?")) return;
    if (!window.db) return;
    await db.collection("attendance").doc(id).delete();
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
                    result = canvas.toDataURL("image/jpeg", 0.2");
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

            await db.collection("logs").add({
                date: date,
                activity: activity,
                image: imageData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert("บันทึกสำเร็จ! ข้อมูลถูกเก็บไว้บนระบบกลางแล้ว");
            form.reset();
        })();
    });
}

async function deleteLog(id) {
    if (!confirm("ต้องการลบรายการนี้หรือไม่?")) return;
    if (!window.db) return;
    await db.collection("logs").doc(id).delete();
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

// เริ่ม listeners เมื่อ Firebase พร้อม (รองรับกรณีโหลดไม่พร้อมกัน)
function startFirestoreListeners() {
    if (window.db) {
        listenAttendance();
        listenLogs();
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
