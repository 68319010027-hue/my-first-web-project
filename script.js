document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. โหลดข้อมูล (โหลดจาก data.json เฉพาะครั้งแรกที่เข้าเว็บเท่านั้น) ---
    async function initDatabase() {
        // เช็คว่าเคยดึงข้อมูลจากไฟล์มาลงเครื่องหรือยัง
        if (!localStorage.getItem('db_initialized')) {
            try {
                const response = await fetch('data.json');
                const serverData = await response.json();
                
                // เก็บข้อมูลลงเครื่องผู้ใช้
                localStorage.setItem('internshipLogs', JSON.stringify(serverData.internshipLogs || []));
                localStorage.setItem('attendanceHistory', JSON.stringify(serverData.attendanceHistory || []));
                
                // มาร์คไว้ว่าโหลดแล้ว ครั้งหน้าจะไม่โหลดทับข้อมูลที่ผู้ใช้กดไว้
                localStorage.setItem('db_initialized', 'true');
                console.log("Database initialized from data.json");
            } catch (e) {
                console.error("Error loading data.json:", e);
            }
        }
    }

    await initDatabase();

    // --- 2. ระบบลงเวลา (attendance.html) ---
    const clock = document.getElementById('liveClock');
    if (clock) {
        // ทำให้นาฬิกาเดินวินาทีต่อวินาที
        setInterval(() => {
            clock.textContent = new Date().toLocaleTimeString('th-TH');
            const dateDisplay = document.getElementById('currentDateDisplay');
            if(dateDisplay) dateDisplay.textContent = new Date().toLocaleDateString('th-TH', {dateStyle:'full'});
        }, 1000);
        
        renderAttendance();
    }

    window.saveTime = (type) => {
        let history = JSON.parse(localStorage.getItem('attendanceHistory')) || [];
        const now = new Date();
        const dateStr = now.toLocaleDateString('th-TH');
        const timeStr = now.toLocaleTimeString('th-TH');

        if (type === 'IN') {
            // เช็คว่ากด Check-in ซ้อนไหม
            if (history.length > 0 && history[0].out === '-') {
                alert("คุณยังไม่ได้ Check-out ของเดิม!");
                return;
            }
            history.unshift({ id: Date.now(), date: dateStr, in: timeStr, out: '-', status: 'กำลังงาน' });
        } else {
            // เช็คว่ามีรายการที่รอ Check-out ไหม
            if (history.length > 0 && history[0].out === '-') {
                history[0].out = timeStr;
                history[0].status = 'จบงาน';
            } else {
                alert("กรุณา Check-in ก่อน!");
                return;
            }
        }
        localStorage.setItem('attendanceHistory', JSON.stringify(history));
        renderAttendance();
    };

    function renderAttendance() {
        const body = document.getElementById('attendanceBody');
        if (!body) return;
        
        const history = JSON.parse(localStorage.getItem('attendanceHistory')) || [];
        const btnIn = document.getElementById('btnIn');
        const btnOut = document.getElementById('btnOut');
        
        // ตรวจสอบว่าปัจจุบันกำลังทำงานอยู่หรือไม่
        const isWorking = history.length > 0 && history[0].out === '-';

        if(btnIn && btnOut) {
            btnIn.disabled = isWorking;
            btnOut.disabled = !isWorking;
            btnIn.style.opacity = isWorking ? "0.4" : "1";
            btnOut.style.opacity = !isWorking ? "0.4" : "1";
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

    // --- 3. จัดการหน้า ดูบันทึก (daily-log.html) ---
    const logArea = document.getElementById('logDisplayArea');
    const weekNav = document.getElementById('weekNavigation');
    if (logArea && weekNav) {
        renderLogs();
    }

    function renderLogs() {
        const logs = JSON.parse(localStorage.getItem('internshipLogs')) || [];
        if (logs.length === 0) {
            logArea.innerHTML = "<p>ยังไม่มีบันทึกข้อมูล</p>";
            return;
        }

        logs.sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstDate = new Date(logs[0].date);
        const weeksGroup = {};

        logs.forEach(log => {
            const currentDate = new Date(log.date);
            const diffDays = Math.floor((currentDate - firstDate) / (1000 * 60 * 60 * 24));
            const weekNum = Math.floor(diffDays / 7) + 1;
            if (!weeksGroup[weekNum]) weeksGroup[weekNum] = {};
            if (!weeksGroup[weekNum][log.date]) weeksGroup[weekNum][log.date] = [];
            weeksGroup[weekNum][log.date].push(log);
        });

        weekNav.innerHTML = Object.keys(weeksGroup).map(w => 
            `<div class="log-nav-item" id="btn-w-${w}" onclick="displayWeek(${w})">สัปดาห์ที่ ${w}</div>`
        ).join('');

        window.displayWeek = (w) => {
            document.querySelectorAll('.log-nav-item').forEach(el => el.classList.remove('active'));
            document.getElementById(`btn-w-${w}`).classList.add('active');

            const weekData = weeksGroup[w];
            const sortedDates = Object.keys(weekData).sort((a, b) => new Date(b) - new Date(a));

            logArea.innerHTML = sortedDates.map(date => `
                <div class="glass-card fade-in" style="margin-bottom:20px; border-left: 5px solid var(--primary);">
                    <h3 style="border-bottom:1px solid #eee; padding-bottom:10px;">📅 ${new Date(date).toLocaleDateString('th-TH', {dateStyle:'full'})}</h3>
                    ${weekData[date].map((t, i) => `
                        <div style="margin-top:15px; padding-left:10px; position: relative;">
                            <button onclick="deleteLog(${t.id})" style="position:absolute; right:0; top:0; background:none; border:none; color:red; cursor:pointer;">✕</button>
                            <span class="badge">งานที่ ${i+1}</span>
                            <p style="margin-top:5px; white-space:pre-line;">${t.activity}</p>
                            ${t.image ? `<img src="${t.image}" style="width:100%; border-radius:10px; margin-top:10px;">` : ''}
                        </div>
                    `).join('<hr style="margin:15px 0; opacity:0.1;">')}
                </div>
            `).join('');
        };
        displayWeek(Object.keys(weeksGroup).pop());
    }

    window.deleteLog = (id) => {
        if (confirm("ลบรายการนี้?")) {
            let logs = JSON.parse(localStorage.getItem('internshipLogs')) || [];
            logs = logs.filter(l => l.id !== id);
            localStorage.setItem('internshipLogs', JSON.stringify(logs));
            renderLogs();
        }
    };

    // --- 4. เพิ่มงานใหม่ (upload.html) ---
    const addLogForm = document.getElementById('addLogForm');
    if (addLogForm) {
        addLogForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('logDate').value;
            const activity = document.getElementById('logActivity').value;
            const file = document.getElementById('logImage').files[0];

            const save = (img) => {
                const logs = JSON.parse(localStorage.getItem('internshipLogs')) || [];
                logs.push({ id: Date.now(), date, activity, image: img });
                localStorage.setItem('internshipLogs', JSON.stringify(logs));
                alert("บันทึกแล้ว!"); window.location.href="daily-log.html";
            };
            if(file) { const r = new FileReader(); r.onload=e=>save(e.target.result); r.readAsDataURL(file); }
            else save(null);
        });
    }

    // --- 5. Export เพื่ออัปเดตไฟล์ GitHub ---
    window.exportData = () => {
        const data = {
            internshipLogs: JSON.parse(localStorage.getItem('internshipLogs')),
            attendanceHistory: JSON.parse(localStorage.getItem('attendanceHistory'))
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'data.json'; a.click();
    };
});