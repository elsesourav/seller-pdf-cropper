// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const filename = urlParams.get("filename");
const originalName = urlParams.get("originalName");

// Set filename and PDF source
document.getElementById("filename").textContent =
   originalName || filename;
document.getElementById("pdfFrame").src = `/${filename}`;

function goBack() {
   // Use history.back() with a small delay to ensure proper state restoration
   setTimeout(() => {
      history.back();
   }, 50);
}

// Prevent page caching to ensure fresh state
window.addEventListener("unload", function () {});