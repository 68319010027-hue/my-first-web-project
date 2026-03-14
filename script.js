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

function listenAttendance() {
    const table = document.getElementById("attendanceBody");
    if (!table || !window.db) return;

    db.collection("attendance")
        .orderBy("date")
        .onSnapshot(snapshot => {
            table.innerHTML = "";
            snapshot.forEach(doc => {
                const item = doc.data();
                const status = item.out ? "เสร็จงาน" : "กำลังทำงาน";
                table.innerHTML += `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.in || "-"}</td>
                    <td>${item.out || "-"}</td>
                    <td><span class="badge">${status}</span></td>
                </tr>`;
            });
        });
}
