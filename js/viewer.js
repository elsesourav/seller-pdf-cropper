const pdfViewer = document.getElementById("pdf-viewer");
const backBtn = document.getElementById("backBtn");
const downloadBtn = document.getElementById("downloadBtn");
const viewerFileName = document.getElementById("viewerFileName");

const pdfDataUrl = sessionStorage.getItem("pdfDataUrl");
const fileName = sessionStorage.getItem("selectedFileName");

if (fileName && fileName !== "No file selected") {
   viewerFileName.textContent = fileName;
}

if (!pdfDataUrl) {
   alert("No PDF found. Please process a PDF first.");
   window.location.href = "./index.html";
} else {
   pdfViewer.src = pdfDataUrl;
}

backBtn.addEventListener("click", function () {
   history.back();
});
