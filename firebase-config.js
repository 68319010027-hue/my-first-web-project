<<<<<<< HEAD
// ค่า config จาก Firebase Console > Project settings > Your apps
// ใช้กับโปรเจกต์ project-93b95
=======
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile | InternPro</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600&display=swap" rel="stylesheet">
</head>
<body>
    <nav>
        <div class="container nav-flex">
            <a href="index.html" class="logo">INTERN<span>PRO</span></a>
            <ul>
                <li><a href="index.html">หน้าหลัก</a></li>
                <li><a href="daily-log.html">ดูบันทึก</a></li>
                <li><a href="upload.html">อัปโหลดงาน</a></li>
                <li><a href="attendance.html">ลงเวลาทำงาน</a></li>
                <li><a href="profile.html" class="active">ข้อมูลส่วนตัว</a></li>
            </ul>
        </div>
    </nav>
>>>>>>> 0cadf7ebadb8dce92d2102ea8cf4112ab035f284

    <main class="container fade-in">
        <div class="profile-grid">
            <div class="glass-card profile-card">
                <img src="img/1.jpg" alt="Student 1" class="profile-img">
                <h3 style="color:var(--primary);">นายพัชรพล ไวโสภา</h3>
                <span class="badge">68319010027</span>
                <ul class="info-list">
                    <li><b>แผนก:</b> IT</li>
                    <li><b>วิทยาลัย:</b> เทคนิคเลย</li>
                    <li><b>อีเมล:</b> film145.film@gmail.com</li>
                </ul>
            </div>
            <div class="glass-card profile-card">
                <img src="img/2.jpg" alt="Student 2" class="profile-img">
                <h3 style="color:var(--primary);">นายสุเมธ แสงนา</h3>
                <span class="badge">68319010032</span>
                <ul class="info-list">
                    <li><b>แผนก:</b> IT</li>
                    <li><b>วิทยาลัย:</b> เทคนิคเลย</li>
                    <li><b>อีเมล:</b> sumet@example.com</li>
                </ul>
            </div>
        </div>
    </main>

<<<<<<< HEAD
// ต้องโหลด firebase-app-compat.js และ firebase-firestore-compat.js ก่อนไฟล์นี้
if (typeof firebase !== "undefined") {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    window.db = db;
} else {
    console.error("Firebase SDK ยังไม่โหลด โปรดตรวจสอบลำดับ script ใน HTML");
}
=======
    <script src="https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore-compat.js"></script>
    <script src="firebase-config.js"></script>
    <script src="script.js"></script>
</body>
</html>
>>>>>>> 0cadf7ebadb8dce92d2102ea8cf4112ab035f284
