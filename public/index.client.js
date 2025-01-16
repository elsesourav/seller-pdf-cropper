const fileInput = document.getElementById("file-upload");
const fileNameDisplay = document.getElementById("selectedFileName");
const form = document.querySelector("form");
const customAlert = document.getElementById("customAlert");
const alertOverlay = document.getElementById("alertOverlay");
const alertMessage = document.getElementById("alertMessage");
const serialInputContainer = document.getElementById("serialInputContainer");
const productNameContainer = document.getElementById("productNameContainer");
const serialNumberCheckbox = document.getElementById("serialNumber");
const typeSelect = document.querySelector('input[name="cropType"]:checked');

// Handle serial number checkbox change
serialNumberCheckbox.addEventListener("change", function () {
   serialInputContainer.classList.toggle("hidden", !this.checked);
});

// Handle type select change
document.querySelectorAll('input[name="cropType"]').forEach(function (radio) {
   radio.addEventListener("change", function () {
      localStorage.setItem("selectedType", this.value);
      productNameContainer.classList.toggle("hidden", this.value === "type2");
   });
});

// Initialize visibility on page load
serialInputContainer.classList.toggle("hidden", !serialNumberCheckbox.checked);

// Set initial radio button state from localStorage
const savedType = localStorage.getItem("selectedType") || "type1";
const radioToSelect = document.querySelector(`input[name="cropType"][value="${savedType}"]`);
if (radioToSelect) {
    radioToSelect.checked = true;
    productNameContainer.classList.toggle("hidden", savedType === "type2");
}

// Load saved states
serialNumberCheckbox.checked =
   localStorage.getItem("showSerialNumber") !== "false";
productNameContainer.querySelector('input[type="checkbox"]').checked =
   localStorage.getItem("showProductName") === "true";

// Save state when serial number checkbox changes
serialNumberCheckbox.addEventListener("change", function () {
   localStorage.setItem("showSerialNumber", this.checked);
});

// Save state when product name checkbox changes
productNameContainer
   .querySelector('input[type="checkbox"]')
   .addEventListener("change", function () {
      localStorage.setItem("showProductName", this.checked);
   });

// Custom alert function
function showAlert(message) {
   alertMessage.textContent = message;
   alertOverlay.classList.add("show");
   customAlert.classList.add("show");
   // Focus the OK button for better accessibility
   document.querySelector(".alert-button").focus();
}

function closeAlert() {
   customAlert.classList.remove("show");
   alertOverlay.classList.remove("show");
   // Return focus to the file input after transition
   setTimeout(() => {
      fileInput.focus();
   }, 300);
}

// Close alert on overlay click
alertOverlay.addEventListener("click", closeAlert);

// Close alert on Escape key
document.addEventListener("keydown", function (e) {
   if (e.key === "Escape") closeAlert();
});

// Restore filename display when page loads
window.addEventListener("pageshow", function (event) {
   if (fileInput.files.length > 0) {
      fileNameDisplay.textContent = fileInput.files[0].name;
   }
});

// Prevent default form submission and use fetch instead
form.addEventListener("submit", async function (e) {
   e.preventDefault();

   // Check if file is selected
   if (!fileInput.files.length) {
      showAlert("Please select a PDF file first!");
      return false;
   }

   // Check if file is PDF
   const file = fileInput.files[0];
   if (!file.type.includes("pdf")) {
      showAlert("Please select a PDF file only!");
      return false;
   }

   const formData = new FormData(this);

   try {
      const response = await fetch("/upload", {
         method: "POST",
         body: formData,
      });

      if (response.redirected) {
         window.location.href = response.url;
      }
   } catch (err) {
      console.error("Error:", err);
      showAlert("Error processing the PDF file. Please try again.");
   }
});

fileInput.addEventListener("change", function () {
   const fileName = this.files[0]?.name || "No file selected";
   fileNameDisplay.textContent = fileName;
});
