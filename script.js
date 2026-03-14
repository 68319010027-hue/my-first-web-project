const button = document.getElementById('colorButton');

button.addEventListener('click', () => {
    // สุ่มสีพื้นหลัง
    const randomColor = Math.floor(Math.random()*16777215).toString(16);
    document.body.style.backgroundColor = "#" + randomColor;
    console.log("เปลี่ยนสีเป็น: #" + randomColor);
});