pdfjsLib.GlobalWorkerOptions.workerSrc = "./js/libs/pdf.worker.min.js";

const fileInput = document.getElementById("file-upload");
const fileNameDisplay = document.getElementById("selectedFileName");
const form = document.getElementById("pdfForm");
const customAlert = document.getElementById("customAlert");
const alertOverlay = document.getElementById("alertOverlay");
const alertMessage = document.getElementById("alertMessage");
const serialInputContainer = document.getElementById("serialInputContainer");
const productNameContainer = document.getElementById("productNameContainer");
const serialNumberCheckbox = document.getElementById("serialNumber");

console.log("Using embedded JSON data");

serialNumberCheckbox.addEventListener("change", (e) => {
   serialInputContainer.classList.toggle("hidden", !e.target.checked);
});

fileInput.addEventListener("change", () => {
   fileNameDisplay.textContent =
      fileInput?.files?.[0].name || "No file selected";
});

document.querySelectorAll(`input[name="crop"]`).forEach((radio) => {
   radio.addEventListener("change", () => {
      localStorage.setItem("selectedType", radio.value);
      productNameContainer.classList.toggle("hidden", radio.value === "type2");
   });
});

serialInputContainer.classList.toggle("hidden", !serialNumberCheckbox.checked);

const savedType = localStorage.getItem("selectedType") || "type1";
const radioToSelect = document.querySelector(
   `input[name="crop"][value="${savedType}"]`
);
if (radioToSelect) {
   radioToSelect.checked = true;
   productNameContainer.classList.toggle("hidden", savedType === "type2");
}

serialNumberCheckbox.checked =
   localStorage.getItem("showSerialNumber") !== "false";
productNameContainer.querySelector('input[type="checkbox"]').checked =
   localStorage.getItem("showProductName") === "true";

serialNumberCheckbox.addEventListener("change", (e) => {
   localStorage.setItem("showSerialNumber", e.target.checked);
});

productNameContainer
   .querySelector('input[type="checkbox"]')
   .addEventListener("change", (e) => {
      localStorage.setItem("showProductName", e.target.checked);
   });

function showAlert(message) {
   alertMessage.textContent = message;
   alertOverlay.classList.add("show");
   customAlert.classList.add("show");
   document.querySelector(".alert-button").focus();
}

function closeAlert() {
   customAlert.classList.remove("show");
   alertOverlay.classList.remove("show");
   setTimeout(() => {
      fileInput.focus();
   }, 300);
}

let CHANGES_SKU = {};
onload = async () => {
   try {
      CHANGES_SKU = {
         ...(await GET_JSON_FILE("./changes/sku.sbarui.json")),
         ...(await GET_JSON_FILE("./changes/sku.purav.json")),
      };
   } catch (error) {
      console.log(error);
   }
};

alertOverlay.addEventListener("click", closeAlert);

document.addEventListener("keydown", (e) => {
   if (e.key === "Escape") closeAlert();
});

async function processPDF(file) {
   try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfBytes = new Uint8Array(arrayBuffer);

      const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);

      const type = document.querySelector(`input[name="crop"]:checked`).value;

      const page = pdfDoc.getPages()[0];
      const { width } = page.getSize();
      const dimensions = getDimensions(width)[type];

      const showSerialNumber = document.getElementById("serialNumber").checked;
      const startSerial =
         parseInt(document.getElementById("startSerial").value) || 1;

      const showProductName =
         document.getElementById("showProductName").checked;

      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdfDocument = await loadingTask.promise;

      const isBill = dimensions.type === 2;
      const baseFontSize = 7;
      const size = baseFontSize * (isBill ? 1.5 : 1);
      const serialFontX =
         dimensions.left + (isBill ? 10 : dimensions.width - 14);
      const serialFontY = dimensions.bottom + 1 * (isBill ? 8 : 1);
      const productFontX = dimensions.left + 10;
      const productFontY = serialFontY;

      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
         const page = pdfDoc.getPages()[i];

         page.setCropBox(
            dimensions.left,
            dimensions.bottom,
            dimensions.width,
            dimensions.height
         );

         if (showProductName && !isBill) {
            const textPage = await pdfDocument.getPage(i + 1);
            const textContent = await textPage.getTextContent();

            const tempText = textContent.items.map((item) => item.str).join("");
            const text = filterProductInformation(tempText);
            const productSKU = getProductInfo(text);
            const quantity = getProductQuantity(text);

            if (productSKU.length > 0 && quantity.length > 0) {
               const { name, isMakeable } = getSKUsToProductInfo(
                  productSKU,
                  quantity,
                  CHANGES_SKU
               );

               if (isMakeable) {
                  drawText(
                     page,
                     productFontX,
                     productFontY,
                     size - 1,
                     name,
                     baseFontSize,
                     1
                  );
               }
            }
         }

         if (showSerialNumber) {
            const serialNumber = startSerial + i;
            drawText(
               page,
               serialFontX,
               serialFontY,
               size,
               serialNumber.toString(),
               size
            );
         }
      }

      const processedPdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([processedPdfBytes], {
         type: "application/pdf",
      });

      currentPdfBlob = pdfBlob;

      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      reader.onloadend = () => {
         const pdfViewer = document.getElementById("pdf-viewer");
         const viewerFileName = document.getElementById("viewerFileName");
         const pdfViewerModal = document.getElementById("pdfViewerModal");

         const blobUrl = URL.createObjectURL(pdfBlob);
         pdfViewer.src = blobUrl;

         if (fileInput.files[0]) {
            viewerFileName.textContent = fileInput.files[0].name;
         }

         const cleanupBlobUrl = () => {
            URL.revokeObjectURL(blobUrl);
            pdfViewerModal.removeEventListener("hidden", cleanupBlobUrl);
         };
         pdfViewerModal.addEventListener("hidden", cleanupBlobUrl);

         // Show the modal
         pdfViewerModal.classList.add("show");
      };
   } catch (error) {
      console.error("Error processing PDF:", error);
      showAlert("Error processing the PDF file. Please try again.");
   }
}

// Initialize modal functionality
const pdfViewerModal = document.getElementById("pdfViewerModal");
const closeModal = document.getElementById("closeModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
let currentPdfBlob = null;

// Function to close the PDF viewer modal
function closePdfViewerModal() {
   pdfViewerModal.classList.remove("show");
   document.getElementById("pdf-viewer").src = "";
   currentPdfBlob = null;
   pdfViewerModal.dispatchEvent(new CustomEvent('hidden'));
}

// Event listener for the close buttons
closeModal.addEventListener("click", closePdfViewerModal);
closeModalBtn.addEventListener("click", closePdfViewerModal);

// Close modal when clicking outside the content
pdfViewerModal.addEventListener("click", (e) => {
   if (e.target === pdfViewerModal) {
      closePdfViewerModal();
   }
});

// Close modal with Escape key
document.addEventListener("keydown", (e) => {
   if (e.key === "Escape" && pdfViewerModal.classList.contains("show")) {
      closePdfViewerModal();
   }
});

// Download PDF button functionality
downloadPdfBtn.addEventListener("click", () => {
   if (currentPdfBlob && fileInput.files[0]) {
      const fileName = fileInput.files[0].name.replace(
         ".pdf",
         "_processed.pdf"
      );
      const url = URL.createObjectURL(currentPdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
   }
});

window.addEventListener("load", () => {
   // Clear any previous session data
   sessionStorage.removeItem("isNavigatingBack");
   sessionStorage.removeItem("pdfDataUrl");
   sessionStorage.removeItem("selectedFileName");

   fileNameDisplay.textContent = "No file selected";
});

form.addEventListener("submit", async (e) => {
   e.preventDefault();

   if (!fileInput.files.length) {
      showAlert("Please select a PDF file first!");
      return false;
   }

   const file = fileInput.files[0];
   if (!file.type.includes("pdf")) {
      showAlert("Please select a PDF file only!");
      return false;
   }

   await processPDF(file);
});

window.closeAlert = closeAlert;
