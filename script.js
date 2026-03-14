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
        // เช็กว่าวันนี้มีรายการที่ยังไม่ Check out อยู่หรือไม่
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
        // หา record วันนี้ที่ยังไม่ out
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
        await doc.ref.update({
            out: time
        });
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
            // รวมข้อมูลแล้วเรียงวันที่ + เวลาเข้า ให้เรียงสวย ๆ
            const rows = [];
            snapshot.forEach(doc => {
                rows.push({ id: doc.id, ...doc.data() });
            });

            rows.sort((a, b) => {
                const da = new Date(a.date);
                const dbb = new Date(b.date);
                if (da.getTime() !== dbb.getTime()) {
                    return da - dbb;
                }
                // ถ้าวันเดียวกัน เรียงตามเวลาเข้า (string เวลาไทยก็พอใช้ได้)
                return (a.in || "").localeCompare(b.in || "");
            });

            table.innerHTML = "";
            rows.forEach(item => {
                const status = item.out ? "เสร็จงาน" : "กำลังทำงาน";
                table.innerHTML += `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.in || "-"}</td>
                    <td>${item.out || "-"}</td>
                    <td><span class="badge">${status}</span></td>
                    <td>
                        <button class="btn-danger-sm" onclick="deleteAttendance('${item.id}')">
                            ลบ
                        </button>
                    </td>
                </tr>`;
            });
        });
}
