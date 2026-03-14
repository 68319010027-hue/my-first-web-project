document.addEventListener('DOMContentLoaded', () => {
    // --- ส่วนเพิ่มใหม่: ดึงข้อมูลจาก data.json มาใส่ LocalStorage หากยังไม่มีข้อมูล ---
    if (!localStorage.getItem('internshipLogs') || !localStorage.getItem('attendanceHistory')) {
        fetch('data.json')
            .then(response => response.json())
            .then(data => {
                if (!localStorage.getItem('internshipLogs')) {
                    localStorage.setItem('internshipLogs', JSON.stringify(data.internshipLogs));
                }
                if (!localStorage.getItem('attendanceHistory')) {
                    localStorage.setItem('attendanceHistory', JSON.stringify(data.attendanceHistory));
                }
                // รีโหลดหน้าเพื่อให้ข้อมูลที่ดึงมาแสดงผลทันที
                location.reload();
            })
            .catch(error => console.error('Error loading JSON:', error));
    }

    // 1. ระบบ Active Menu (โค้ดเดิมของคุณ)
    const path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll('nav ul li a').forEach(link => {
        if (link.getAttribute('href') === path) link.classList.add('active');
    });

    // 2. ระบบบันทึกข้อมูล (อัปเดตให้ redirect ไปหน้าดูบันทึก)
    const addLogForm = document.getElementById('addLogForm');
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
                window.location.href = "daily-log.html"; // ย้ายหน้าไปที่ดูบันทึกทันที
            };

            if (logImageFile) {
                const reader = new FileReader();
                reader.onload = (event) => processSave(event.target.result);
                reader.readAsDataURL(logImageFile);
            } else { processSave(null); }
        });
    }

    // 3. ระบบแสดงผลสัปดาห์ (หน้า daily-log.html)
    const weekNav = document.getElementById('weekNavigation');
    const logDisplayArea = document.getElementById('logDisplayArea');

    if (weekNav) { 
        renderWeekMenu(); 
    }

    function renderWeekMenu() {
        let logs = JSON.parse(localStorage.getItem('internshipLogs')) || [];
        if (logs.length === 0) {
            logDisplayArea.innerHTML = '<div class="glass-card" style="text-align:center;">ยังไม่มีบันทึกข้อมูล</div>';
            return;
        }

        // เรียงวันที่
        logs.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // จัดกลุ่มตามสัปดาห์ (ตรรกะเดิมของคุณ)
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

    // ฟังก์ชันลบบันทึก
    window.deleteLog = (id) => {
        if(confirm('ยืนยันการลบบันทึก?')) {
            let logs = JSON.parse(localStorage.getItem('internshipLogs')) || [];
            logs = logs.filter(l => l.id !== id);
            localStorage.setItem('internshipLogs', JSON.stringify(logs));
            renderWeekMenu();
            logDisplayArea.innerHTML = '<div class="glass-card" style="text-align:center;">ลบข้อมูลเรียบร้อยแล้ว</div>';
        }
    };

    // 4. ระบบลงเวลา (หน้า attendance.html)
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
            const openSession = history.find(r => r.out === '-');
            if(openSession) { alert("ยังไม่ได้ Check Out!"); return; }
            history.unshift({ id: Date.now(), date: dateStr, in: timeStr, out: '-' });
        } else {
            const lastSession = history.find(r => r.out === '-');
            if (lastSession) { lastSession.out = timeStr; } 
            else { alert("ยังไม่ได้ Check In!"); return; }
        }
        localStorage.setItem('attendanceHistory', JSON.stringify(history));
        renderAttendance();
    };

    function renderAttendance() {
        const body = document.getElementById('attendanceBody');
        if (!body) return;
        const history = JSON.parse(localStorage.getItem('attendanceHistory')) || [];
        body.innerHTML = history.length ? '' : '<tr><td colspan="4">ไม่มีประวัติ</td></tr>';
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

    // ฟังก์ชันแสดงรายการ Log (ตรรกะเดิมของคุณ)
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
                            <button onclick="deleteLog(${item.id})" class="btn-danger-sm">ลบ</button>
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
});