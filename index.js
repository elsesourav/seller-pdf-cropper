import express from "express";
import fs from "fs";
import multer from "multer";
import path, { dirname } from "path";
import { PDFDocument } from "pdf-lib";
import pkg from "pdfjs-dist/build/pdf.js";
import { fileURLToPath } from "url";
const { getDocument } = pkg;

import {
   drawText,
   getProductInfo,
   getSKUsToProductInfo,
   filterProductInformation,
   getProductQuantity,
   getDimensions,
} from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Initialize PDF.js
const pdfjsLib = { getDocument };

const pdfWorkerPath = new URL(
   "pdfjs-dist/build/pdf.worker.js",
   import.meta.url
).toString();
pdfjsLib.GlobalWorkerOptions = { workerSrc: pdfWorkerPath };

// Load products.json
const productsPath = path.join(__dirname, "products.json");
let PRODUCTS = {};
try {
   const productsData = fs.readFileSync(productsPath, "utf8");
   PRODUCTS = JSON.parse(productsData);
} catch (error) {
   console.log("Error loading PRODUCTS.json:", error);
}

// Set up Multer for file uploads
const upload = multer({
   storage: multer.memoryStorage(),
   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Middleware to serve static files
app.use(express.static("public"));

// Add this map to track files
const cropFiles = {
   type1: null,
   type2: null,
};

// Handle PDF upload and cropping
app.post("/upload", upload.single("pdf"), async (req, res) => {
   try {
      const inputPdfBytes = req.file.buffer;
      const originalFilename = req.file.originalname;

      const pdfDoc = await PDFDocument.load(inputPdfBytes);

      const page = pdfDoc.getPage(0);
      const { width } = page.getSize();

      // Get crop type from form
      const cropType = req.body.cropType;
      const dimensions = getDimensions(width)[cropType];

      // Get showSerialNumber and startSerial from form
      const showSerialNumber = req.body.showSerialNumber === "on";
      const startSerial = parseInt(req.body.startSerial) || 1;
      // Get showProductName from form
      const showProductName = req.body.showProductName === "on";

      // Load PDF for text extraction
      const pdfData = new Uint8Array(req.file.buffer);
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdfDocument = await loadingTask.promise;

      const isBill = dimensions.type === 2;
      const baseFontSize = 6;
      const size = baseFontSize * (isBill ? 1.5 : 1);
      const serialFontX =
         dimensions.left + (isBill ? 10 : dimensions.width - 14);
      const serialFontY = dimensions.bottom + 1 * (isBill ? 8 : 1);
      const productFontX = dimensions.left + 10;
      const productFontY = serialFontY;

      // Process each page
      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
         // for (let i = 2; i < 4; i++) {
         const page = pdfDoc.getPage(i);

         // Handle cropping
         page.setCropBox(
            dimensions.left,
            dimensions.bottom,
            dimensions.width,
            dimensions.height
         );

         if (showProductName && !isBill) {
            // Handle text extraction (must use pdfjs-dist)
            const textPage = await pdfDocument.getPage(i + 1);
            const textContent = await textPage.getTextContent();

            // const textItems = textContent.items.map((item) => item.str);
            // const productInfo = getProductInfo(textItems);

            const tempText = textContent.items.map((item) => item.str).join("");
            const text = filterProductInformation(tempText);
            const productSKU = getProductInfo(text);
            const quantity = getProductQuantity(text);

            // console.log(text);
            // console.log(productSKU);
            // console.log(quantity);

            if (productSKU.length > 0 && quantity.length > 0) {
               const { name, isMakeable } = getSKUsToProductInfo(
                  productSKU,
                  quantity,
                  PRODUCTS
               );

               if (isMakeable) {
                  drawText(
                     page,
                     productFontX,
                     productFontY,
                     size,
                     name,
                     baseFontSize,
                     1,
                     0.4
                  );
               }
            }
         }

         // Handle serial number
         if (showSerialNumber) {
            const serialNumber = startSerial + i;
            drawText(
               page,
               serialFontX,
               serialFontY,
               size,
               serialNumber.toString(),
               baseFontSize
            );
         }
      }
      const pdfBytes = await pdfDoc.save();

      // Save in current directory with fixed names based on crop type
      const outputFileName = `cropped_${cropType}.pdf`;
      const outputFilePath = path.join(__dirname, outputFileName);

      fs.writeFileSync(outputFilePath, pdfBytes);
      cropFiles[cropType] = outputFilePath; // Store the file path
      console.log(`Cropped PDF saved as ${outputFilePath}`);

      // Redirect to upload.html with parameters
      res.redirect(
         303,
         `/upload.html?filename=${outputFileName}&originalName=${encodeURIComponent(
            originalFilename
         )}`
      );
   } catch (err) {
      console.error(err);
      res.status(500).send("Error cropping PDF.");
   }
});

// Update the file serving route
app.get("/:filename", (req, res) => {
   const filename = req.params.filename;
   const type = filename.includes("type1") ? "type1" : "type2";
   const filePath = cropFiles[type];

   if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send("File not found.");
   }

   res.set({
      "Content-Disposition": "inline",
      "Content-Type": "application/pdf",
   });

   res.sendFile(filePath, (err) => {
      if (err) {
         console.error(err);
         res.status(404).send("Error sending file.");
      }
   });
});

// Start the server
app.listen(PORT, () => {
   console.log(`Server running at http://localhost:${PORT}`);
});
