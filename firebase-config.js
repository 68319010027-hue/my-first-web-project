// กรอกค่า config ของโปรเจกต์ Firebase ของคุณที่นี่
// สามารถหาได้จากหน้า Project settings > Your apps ใน Firebase console
// ข้อมูลชุดนี้ออกแบบมาให้เป็น public ได้ (ใช้กับเว็บ front-end)

const firebaseConfig = {
    apiKey: "AIzaSyC_Gccnqvc2BC3kqtdrtRn63c_0ZhVwcus",
    authDomain: "project-93b95.firebaseapp.com",
    projectId: "project-93b95",
    storageBucket: "project-93b95.firebasestorage.app",
    messagingSenderId: "667203456326",
    appId: "1:667203456326:web:fc23c3aef9829f552da947",
    measurementId: "G-53Y7NCCFVK"
};

// ห้ามลบบรรทัดนี้ จำเป็นสำหรับใช้งาน Firestore ทั่วทั้งเว็บ
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

