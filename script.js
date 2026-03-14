document.addEventListener('DOMContentLoaded', () => {
    const addLogForm = document.getElementById('addLogForm');
    const logsContainer = document.getElementById('logsContainer');

    // โหลดบันทึกที่มีอยู่จาก Local Storage (ถ้ามี)
    loadLogs();

    if (addLogForm) {
        addLogForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const logDate = document.getElementById('logDate').value;
            const logActivity = document.getElementById('logActivity').value;
            const logImage = document.getElementById('logImage').files[0];

            if (logDate && logActivity) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const logData = {
                        date: logDate,
                        activity: logActivity,
                        image: event.target.result // เก็บรูปภาพเป็น Base64 string
                    };
                    saveLog(logData);
                    addLogToDOM(logData);
                    addLogForm.reset(); // ล้างฟอร์ม
                };

                if (logImage) {
                    reader.readAsDataURL(logImage); // อ่านไฟล์รูปภาพ
                } else {
                    // ถ้าไม่มีรูปภาพ
                    const logData = {
                        date: logDate,
                        activity: logActivity,
                        image: null
                    };
                    saveLog(logData);
                    addLogToDOM(logData);
                    addLogForm.reset();
                }
            }
        });
    }

    function saveLog(logData) {
        let logs = JSON.parse(localStorage.getItem('internshipLogs')) || [];
        logs.push(logData);
        // เรียงลำดับตามวันที่ (ใหม่สุดอยู่บน)
        logs.sort((a, b) => new Date(b.date) - new Date(a.date));
        localStorage.setItem('internshipLogs', JSON.stringify(logs));
    }

    function loadLogs() {
        if (logsContainer) {
            logsContainer.innerHTML = ''; // ล้างเนื้อหาเดิม
            const logs = JSON.parse(localStorage.getItem('internshipLogs')) || [];
            logs.forEach(addLogToDOM);
        }
    }

    function addLogToDOM(logData) {
        if (logsContainer) {
            const logItem = document.createElement('div');
            logItem.classList.add('log-item');

            const dateElement = document.createElement('h4');
            dateElement.textContent = formatDate(logData.date);
            logItem.appendChild(dateElement);

            const activityElement = document.createElement('p');
            activityElement.textContent = logData.activity;
            logItem.appendChild(activityElement);

            if (logData.image) {
                const imageElement = document.createElement('img');
                imageElement.src = logData.image;
                imageElement.alt = `รูปภาพประกอบวันที่ ${logData.date}`;
                imageElement.classList.add('log-image-preview');
                logItem.appendChild(imageElement);
            }

            logsContainer.appendChild(logItem);
        }
    }

    // ฟังก์ชันช่วยจัดรูปแบบวันที่
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('th-TH', options);
    }
});