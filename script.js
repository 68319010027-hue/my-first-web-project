document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll('nav ul li a').forEach(link => {
        if (link.getAttribute('href') === path) link.classList.add('active');
    });

    const addLogForm = document.getElementById('addLogForm');
    const weekNav = document.getElementById('weekNavigation');
    const logDisplayArea = document.getElementById('logDisplayArea');

    // 1. ระบบอัปโหลด
    if (addLogForm) {
        addLogForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const logDate = document.getElementById('logDate').value;
            const logActivity = document.getElementById('logActivity').value;
            const logImageFile = document.getElementById('logImage').files[0];

            const processSave = (imageData) => {
                const logData = { id: Date.now(), date: logDate, activity: logActivity, image: imageData };
                let logs = JSON.parse(localStorage.getItem('internshipLogs')) || [];
                logs.push(logData);
                localStorage.setItem('internshipLogs', JSON.stringify(logs));
                alert("✨ บันทึกสำเร็จ!");
                window.location.href = "daily-log.html";
            };

            if (logImageFile) {
                const reader = new FileReader();
                reader.onload = (event) => processSave(event.target.result);
                reader.readAsDataURL(logImageFile);
            } else { processSave(null); }
        });
    }

    // 2. ระบบจัดการสัปดาห์ และการลบ
    if (weekNav) { renderWeekMenu(); }

    function renderWeekMenu() {
        let logs = JSON.parse(localStorage.getItem('internshipLogs')) || [];
        if (logs.length === 0) {
            logDisplayArea.innerHTML = '<div class="glass-card">ยังไม่มีบันทึกข้อมูล</div>';
            return;
        }

        logs.sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstDate = new Date(logs[0].date);
        const firstMonday = new Date(firstDate);
        const day = firstMonday.getDay();
        firstMonday.setDate(firstMonday.getDate() - (day === 0 ? 6 : day - 1));
        firstMonday.setHours(0,0,0,0);

        const weeksMap = {};
        logs.forEach(log => {
            const current = new Date(log.date);
            const weekNum = Math.floor((current - firstMonday) / (7 * 24 * 60 * 60 * 1000)) + 1;
            if (!weeksMap[weekNum]) weeksMap[weekNum] = [];
            weeksMap[weekNum].push(log);
        });

        weekNav.innerHTML = '';
        Object.keys(weeksMap).sort((a,b) => b-a).forEach(w => {
            const div = document.createElement('div');
            div.className = 'log-nav-item';
            div.innerHTML = `📅 สัปดาห์ที่ ${w}`;
            div.onclick = () => {
                document.querySelectorAll('.log-nav-item').forEach(i => i.classList.remove('active'));
                div.classList.add('active');
                displayLogs(weeksMap[w]);
            };
            weekNav.appendChild(div);
        });
    }

    function displayLogs(weekLogs) {
        weekLogs.sort((a, b) => new Date(a.date) - new Date(b.date));
        const grouped = {};
        weekLogs.forEach(l => {
            if(!grouped[l.date]) grouped[l.date] = [];
            grouped[l.date].push(l);
        });

        logDisplayArea.innerHTML = '';
        Object.keys(grouped).forEach(date => {
            const card = document.createElement('div');
            card.className = 'glass-card fade-in';
            let html = `<h3 style="color:var(--primary); margin-bottom:15px;">🗓️ ${new Date(date).toLocaleDateString('th-TH', {dateStyle:'full'})}</h3>`;
            grouped[date].forEach((item) => {
                html += `
                    <div class="log-entry">
                        <div class="log-header">
                            <span class="badge">บันทึก ID: ${item.id.toString().slice(-4)}</span>
                            <button onclick="deleteLog(${item.id})" class="btn-danger-sm">ลบรายการนี้</button>
                        </div>
                        <p>${item.activity}</p>
                        ${item.image ? `<img src="${item.image}" class="log-image-preview">` : ''}
                    </div>
                `;
            });
            card.innerHTML = html;
            logDisplayArea.appendChild(card);
        });
    }

    window.deleteLog = (id) => {
        if(confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกนี้?')) {
            let logs = JSON.parse(localStorage.getItem('internshipLogs')) || [];
            logs = logs.filter(log => log.id !== id);
            localStorage.setItem('internshipLogs', JSON.stringify(logs));
            renderWeekMenu();
            logDisplayArea.innerHTML = '<div class="glass-card">ลบข้อมูลแล้ว กรุณาเลือกสัปดาห์อีกครั้ง</div>';
        }
    };

    // 3. ระบบลงเวลา (สะสมรอบ)
    const liveClock = document.getElementById('liveClock');
    if (liveClock) {
        setInterval(() => {
            const now = new Date();
            liveClock.textContent = now.toLocaleTimeString('th-TH');
            document.getElementById('currentDateDisplay').textContent = now.toLocaleDateString('th-TH', {dateStyle:'full'});
        }, 1000);
        renderAttendance();
    }

    window.saveTime = (type) => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('th-TH');
        const timeStr = now.toLocaleTimeString('th-TH');
        let history = JSON.parse(localStorage.getItem('attendanceHistory')) || [];

        if (type === 'IN') {
            // เช็คว่ามีรอบที่ยังไม่ Out ค้างอยู่ไหม
            const openSession = history.find(r => r.out === '-');
            if(openSession) {
                alert("คุณยังมีรอบงานที่ยังไม่ได้ Check Out!");
                return;
            }
            history.unshift({ id: Date.now(), date: dateStr, in: timeStr, out: '-' });
        } else {
            const lastSession = history.find(r => r.out === '-');
            if (lastSession) {
                lastSession.out = timeStr;
            } else {
                alert("ไม่พบข้อมูลการ Check In ในขณะนี้!");
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
        body.innerHTML = history.length ? '' : '<tr><td colspan="4">ยังไม่มีประวัติ</td></tr>';
        history.forEach(row => {
            body.innerHTML += `
                <tr>
                    <td>${row.date}</td>
                    <td style="color:var(--success); font-weight:600;">${row.in}</td>
                    <td style="color:var(--danger); font-weight:600;">${row.out}</td>
                    <td><span class="badge">${row.out !== '-' ? 'จบงาน' : 'กำลังงาน'}</span></td>
                </tr>
            `;
        });
    }
});