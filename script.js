document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. โหลดข้อมูลเริ่มต้น ---
    async function initData() {
        if (!localStorage.getItem('dataInitialized')) {
            try {
                const response = await fetch('data.json');
                const data = await response.json();
                localStorage.setItem('internshipLogs', JSON.stringify(data.internshipLogs || []));
                localStorage.setItem('attendanceHistory', JSON.stringify(data.attendanceHistory || []));
                localStorage.setItem('dataInitialized', 'true');
            } catch (e) { console.error("Load error:", e); }
        }
    }
    await initData();

    // --- 2. Active Menu ---
    const path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll('nav ul li a').forEach(link => {
        if (link.getAttribute('href') === path) link.classList.add('active');
    });

    // --- 3. บันทึกกิจกรรม (upload.html) ---
    const addLogForm = document.getElementById('addLogForm');
    if (addLogForm) {
        addLogForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const logDate = document.getElementById('logDate').value;
            const logActivity = document.getElementById('logActivity').value;
            const logImageFile = document.getElementById('logImage').files[0];

            const saveAction = (imgBase64) => {
                const logs = JSON.parse(localStorage.getItem('internshipLogs')) || [];
                logs.push({ id: Date.now(), date: logDate, activity: logActivity, image: imgBase64 });
                localStorage.setItem('internshipLogs', JSON.stringify(logs));
                alert("บันทึกสำเร็จ!");
                window.location.href = "daily-log.html";
            };

            if (logImageFile) {
                const reader = new FileReader();
                reader.onload = (ev) => saveAction(ev.target.result);
                reader.readAsDataURL(logImageFile);
            } else { saveAction(null); }
        });
    }

    // --- 4. แสดงผลและลบข้อมูล (daily-log.html) ---
    const weekNav = document.getElementById('weekNavigation');
    if (weekNav) { renderLogs(); }

    function renderLogs() {
        const logs = JSON.parse(localStorage.getItem('internshipLogs')) || [];
        if (logs.length === 0) {
            document.getElementById('logDisplayArea').innerHTML = "<p>ยังไม่มีข้อมูลบันทึก</p>";
            return;
        }

        // หาความต่างของสัปดาห์ (เริ่มสัปดาห์ที่บันทึกครั้งแรกเป็นสัปดาห์ที่ 1)
        const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstDate = new Date(sortedLogs[0].date);

        const weeksMap = {};
        logs.forEach(log => {
            const currentDate = new Date(log.date);
            const diffTime = Math.abs(currentDate - firstDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const weekNum = Math.floor(diffDays / 7) + 1; // เริ่มที่ 1
            
            if (!weeksMap[weekNum]) weeksMap[weekNum] = [];
            weeksMap[weekNum].push(log);
        });

        weekNav.innerHTML = Object.keys(weeksMap).map(w => 
            `<div class="log-nav-item" onclick="displayWeek(${w})">สัปดาห์ที่ ${w}</div>`
        ).join('');

        window.displayWeek = (w) => {
            const area = document.getElementById('logDisplayArea');
            area.innerHTML = weeksMap[w].map(item => `
                <div class="glass-card fade-in" style="margin-bottom:20px; position:relative;">
                    <button onclick="deleteLog(${item.id})" style="position:absolute; right:15px; top:15px; background:red; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">ลบ</button>
                    <h4 style="color:var(--primary)">${new Date(item.date).toLocaleDateString('th-TH', {dateStyle:'full'})}</h4>
                    <p>${item.activity}</p>
                    ${item.image ? `<img src="${item.image}" style="width:100%; border-radius:10px; margin-top:15px;">` : ''}
                </div>
            `).join('');
        };
        displayWeek(Object.keys(weeksMap)[0]);
    }

    window.deleteLog = (id) => {
        if(confirm("ยืนยันการลบข้อมูลนี้หรือไม่?")) {
            let logs = JSON.parse(localStorage.getItem('internshipLogs')) || [];
            logs = logs.filter(l => l.id !== id);
            localStorage.setItem('internshipLogs', JSON.stringify(logs));
            renderLogs();
        }
    };

    // --- 5. ระบบลงเวลา (attendance.html) ---
    const clock = document.getElementById('liveClock');
    if (clock) {
        setInterval(() => {
            clock.textContent = new Date().toLocaleTimeString('th-TH');
            document.getElementById('currentDateDisplay').textContent = new Date().toLocaleDateString('th-TH', {dateStyle:'full'});
        }, 1000);
        renderAttendance();
    }

    window.saveTime = (type) => {
        let history = JSON.parse(localStorage.getItem('attendanceHistory')) || [];
        const now = new Date();
        const dateStr = now.toLocaleDateString('th-TH');
        const timeStr = now.toLocaleTimeString('th-TH');

        if (type === 'IN') {
            history.unshift({ id: Date.now(), date: dateStr, in: timeStr, out: '-', status: 'กำลังงาน' });
        } else {
            if (history[0] && history[0].out === '-') {
                history[0].out = timeStr;
                history[0].status = 'จบงาน';
            }
        }
        localStorage.setItem('attendanceHistory', JSON.stringify(history));
        renderAttendance();
    };

    function renderAttendance() {
        const body = document.getElementById('attendanceBody');
        if (!body) return;
        const history = JSON.parse(localStorage.getItem('attendanceHistory')) || [];
        
        // จัดการปุ่ม Check-in / Check-out
        const btnIn = document.getElementById('btnIn');
        const btnOut = document.getElementById('btnOut');
        const isWorking = history.length > 0 && history[0].out === '-';

        if(btnIn && btnOut) {
            btnIn.disabled = isWorking;
            btnOut.disabled = !isWorking;
            btnIn.style.opacity = isWorking ? "0.5" : "1";
            btnOut.style.opacity = !isWorking ? "0.5" : "1";
        }

        body.innerHTML = history.map(h => `
            <tr>
                <td>${h.date}</td>
                <td><span class="badge" style="background:#dcfce7; color:#166534">${h.in}</span></td>
                <td><span class="badge" style="background:#fee2e2; color:#991b1b">${h.out}</span></td>
                <td>${h.status}</td>
            </tr>
        `).join('');
    }

    window.exportData = () => {
        const allData = {
            internshipLogs: JSON.parse(localStorage.getItem('internshipLogs')),
            attendanceHistory: JSON.parse(localStorage.getItem('attendanceHistory'))
        };
        const blob = new Blob([JSON.stringify(allData, null, 2)], {type : 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'data.json';
        a.click();
    };
});