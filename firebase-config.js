// ค่า config จาก Firebase Console > Project settings > Your apps
// ใช้กับโปรเจกต์ project-93b95

const firebaseConfig = {
    apiKey: "AIzaSyC_Gccnqvc2BC3kqtdrtRn63c_0ZhVwcus",
    authDomain: "project-93b95.firebaseapp.com",
    projectId: "project-93b95",
    storageBucket: "project-93b95.firebasestorage.app",
    messagingSenderId: "667203456326",
    appId: "1:667203456326:web:fc23c3aef9829f552da947",
    measurementId: "G-53Y7NCCFVK"
};

// ต้องโหลด firebase-app-compat.js และ firebase-firestore-compat.js ก่อนไฟล์นี้
if (typeof firebase !== "undefined") {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    window.db = db;
} else {
    console.error("Firebase SDK ยังไม่โหลด โปรดตรวจสอบลำดับ script ใน HTML");
}
