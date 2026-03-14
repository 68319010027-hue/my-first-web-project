// ================= CLOCK =================
function updateClock(){

    const now = new Date()

    const time =
        now.getHours().toString().padStart(2,"0")+":"+
        now.getMinutes().toString().padStart(2,"0")+":"+
        now.getSeconds().toString().padStart(2,"0")

    const date =
        now.getDate()+"/"+
        (now.getMonth()+1)+"/"+
        now.getFullYear()

    const clock = document.getElementById("liveClock")
    const dateDisplay = document.getElementById("currentDateDisplay")

    if(clock) clock.innerText = time
    if(dateDisplay) dateDisplay.innerText = date
}

setInterval(updateClock,1000)


// ================= STORAGE =================
function getData(){

    return JSON.parse(localStorage.getItem("internData")) || {
        attendance:[],
        logs:[],
        startDate:null
    }

}

function saveData(data){

    localStorage.setItem("internData",JSON.stringify(data))

}


// ================= ATTENDANCE =================
function saveTime(type){

    let data = getData()

    const today = new Date().toISOString().split("T")[0]
    const time = new Date().toLocaleTimeString()

    const todayRecords = data.attendance.filter(a=>a.date===today)
    const last = todayRecords[todayRecords.length-1]


    // CHECK IN
    if(type==="IN"){

        if(last && !last.out){
            alert("ยังไม่ได้ Check out")
            return
        }

        data.attendance.push({
            id:Date.now(),
            date:today,
            in:time,
            out:null
        })

    }


    // CHECK OUT
    if(type==="OUT"){

        if(!last || last.out){
            alert("ต้อง Check in ก่อน")
            return
        }

        last.out = time

    }

    saveData(data)

    renderAttendance()

}


// ================= RENDER ATTENDANCE =================
function renderAttendance(){

    const table = document.getElementById("attendanceBody")

    if(!table) return

    const data = getData()

    table.innerHTML=""

    data.attendance.forEach(item=>{

        const status = item.out ? "เสร็จงาน" : "กำลังทำงาน"

        table.innerHTML+=`
        <tr>
            <td>${item.date}</td>
            <td>${item.in}</td>
            <td>${item.out || "-"}</td>
            <td>${status}</td>
        </tr>
        `

    })

}

renderAttendance()


// ================= ADD DAILY LOG =================
const form = document.getElementById("addLogForm")

if(form){

form.addEventListener("submit",function(e){

    e.preventDefault()

    const date = document.getElementById("logDate").value
    const activity = document.getElementById("logActivity").value
    const imageInput = document.getElementById("logImage")

    const file = imageInput.files[0]

    const reader = new FileReader()

    reader.onload=function(){

        const img = file ? reader.result : null

        let data = getData()

        if(!data.startDate) data.startDate = date

        data.logs.push({
            id:Date.now(),
            date:date,
            activity:activity,
            image:img
        })

        saveData(data)

        alert("บันทึกสำเร็จ")

        form.reset()

    }

    if(file) reader.readAsDataURL(file)
    else reader.onload()

})

}


// ================= DELETE LOG =================
function deleteLog(id){

    if(!confirm("ต้องการลบรายการนี้หรือไม่?")) return

    let data = getData()

    data.logs = data.logs.filter(log=>log.id!==id)

    saveData(data)

    renderWeeks()

    if(currentWeek) renderLogs(currentWeek)

}


// ================= WEEK CALC =================
function getWeekNumber(startDate,currentDate){

    const start = new Date(startDate)
    const current = new Date(currentDate)

    start.setHours(0,0,0,0)
    current.setHours(0,0,0,0)

    const diffTime = current-start
    const diffDays = Math.floor(diffTime/(1000*60*60*24))

    const week = Math.floor(diffDays/7)+1

    return week

}


// ================= GROUP LOG =================
function groupLogsByWeek(){

    const data = getData()

    const weeks={}

    data.logs.forEach(log=>{

        const week = getWeekNumber(data.startDate,log.date)

        if(!weeks[week]) weeks[week]=[]

        weeks[week].push(log)

    })

    return weeks

}


// ================= WEEK NAV =================
let currentWeek=null

function renderWeeks(){

    const nav = document.getElementById("weekNavigation")

    if(!nav) return

    const weeks = groupLogsByWeek()

    nav.innerHTML=""

    Object.keys(weeks).forEach(w=>{

        const div=document.createElement("div")

        div.className="log-nav-item"

        div.innerText="Week "+w

        div.onclick=()=>{

            currentWeek=w
            renderLogs(w)

        }

        nav.appendChild(div)

    })

}

renderWeeks()


// ================= RENDER LOGS =================
function renderLogs(week){

    const area = document.getElementById("logDisplayArea")

    if(!area) return

    const weeks = groupLogsByWeek()

    const logs = weeks[week]

    area.innerHTML=""

    let grouped={}

    logs.forEach(l=>{

        if(!grouped[l.date]) grouped[l.date]=[]

        grouped[l.date].push(l)

    })


    Object.keys(grouped).forEach(date=>{

        let html=`
        <div class="glass-card">
        <h3>${date}</h3>
        `

        grouped[date].forEach(log=>{

            html+=`
            <div class="task-entry" style="position:relative;margin-top:15px">

            <button class="btn-delete"
            onclick="deleteLog(${log.id})">✖</button>

            <p>${log.activity}</p>

            ${
                log.image
                ? `<img src="${log.image}" style="max-width:300px;margin-top:10px;border-radius:10px;">`
                : ""
            }

            </div>
            `

        })

        html+="</div>"

        area.innerHTML+=html

    })

}


// ================= EXPORT JSON =================
function exportData(){

    const data = getData()

    const blob = new Blob(
        [JSON.stringify(data,null,2)],
        {type:"application/json"}
    )

    const a=document.createElement("a")

    a.href = URL.createObjectURL(blob)

    a.download="intern-data.json"

    a.click()

}