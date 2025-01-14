const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { PDFDocument, rgb } = require("pdf-lib");
const path = require("path");
const pdfjsLib = require("pdfjs-dist");
const app = express();
const PORT = 3000;

// Load products.json
const productsPath = path.join(__dirname, 'products.json');
let products = {};
try {
  const productsData = fs.readFileSync(productsPath, 'utf8');
  products = JSON.parse(productsData);
} catch (error) {
  console.log('Error loading products.json:', error);
}

for (const key in products) {
   const value = products[key];
   const name = value.NEW_SKU_ID.split("__")[0];
   if (name !== value.NAME) {
      console.log(`${key}: ${name} => ${value.SKU_ID}`);
   }
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

function getFontSize(text, fontSize = 7) {
   const textWidth = (fontSize - 2) * text.length;
   return textWidth;
}

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

      // Define crop dimensions for different types
      const sideMargin = 30;
      const cropDimensions = {
         type1: {
            bottom: 459, // + 40
            left: 188,
            width: 219,
            height: 356, // 58
            type: 1,
         },
         type2: {
            bottom: 70,
            left: sideMargin,
            width: width - 2 * sideMargin,
            height: 390,
            type: 2,
         },
      };

      const dimensions = cropDimensions[cropType];

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
      const serialFontX = dimensions.left + (isBill ? 10 : dimensions.width - 14);
      const serialFontY = dimensions.bottom + 1 * (isBill ? 8 : 1);
      const productFontX = dimensions.left + 10;
      const productFontY = serialFontY;
      const white = rgb(1, 1, 1);
      const black = rgb(0, 0, 0);

      // Process each page
      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
         const page = pdfDoc.getPage(i);

         // Handle cropping
         page.setCropBox(
            dimensions.left,
            dimensions.bottom,
            dimensions.width,
            dimensions.height
         );

         // Handle text extraction (must use pdfjs-dist)
         const textPage = await pdfDocument.getPage(i + 1);
         const textContent = await textPage.getTextContent();
         const extractedText = textContent.items
            .map((item) => item.str)
            .join("");

         // Process extracted text
         const startIndex = extractedText.indexOf("QTY1");
         const endIndex = extractedText.indexOf("FMP");
         if (startIndex !== -1 && endIndex !== -1) {
            const text = extractedText.substring(startIndex + 4, endIndex);
            const lastNumber = parseInt(text.match(/\d+(?!.*\d)/));
            let sku = text.split("|")[0]?.trim().toUpperCase();
            sku = products[sku] ? products[sku].NEW_SKU_ID.toUpperCase() : sku;
            const newSku = sku?.split("__");
            const name = newSku?.[0]?.split("-");
            const newName = name?.length > 1 ? `*${name[name.length - 1]}` : newSku?.[0];
            const type = newSku[2] == "PIECE" ? "P" : newSku[2];
            const quantityAndType = `${newSku[1]} ${type}`;
            const multiple = lastNumber > 1 ? ` *${lastNumber}` : "";
            const NAME = `${newName}  ${quantityAndType}${multiple}`;

            // Handle serial number
            if (showSerialNumber) {
               const serialNumber = startSerial + i;
               page.drawRectangle({
                  x: serialFontX - 0.5,
                  y: serialFontY,
                  width: getFontSize(serialNumber.toString(), baseFontSize),
                  height: size,
                  color: white,
               });

               page.drawText(serialNumber.toString(), {
                  x: serialFontX,
                  y: serialFontY,
                  size: size,
                  color: black,
               });
            }

            // Handle product name
            if (showProductName && newSku.length > 2 && !isBill) {
               const productFontSize = baseFontSize - 0.3;
               page.drawRectangle({
                  x: productFontX - 1,
                  y: productFontY,
                  width: getFontSize(NAME, productFontSize),
                  height: size,
                  color: white,
               });

               page.drawText(NAME, {
                  x: productFontX,
                  y: productFontY,
                  size: size,
                  color: black,
               });
            }
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
      res.redirect(303, `/upload.html?filename=${outputFileName}&originalName=${encodeURIComponent(originalFilename)}`);
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
